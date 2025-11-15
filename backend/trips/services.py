import logging
from typing import Dict, List, Optional, Tuple
from math import radians, sin, cos, asin, sqrt
from datetime import timedelta

import googlemaps
from django.conf import settings
from django.contrib.gis.geos import Point

from .models import Trip, TripRequest, ZoneMap, UserLocation

logger = logging.getLogger(_name_)


class GoogleMapsService:
    def _init_(self):
        self.client = googlemaps.Client(key=settings.GOOGLE_MAPS_API_KEY)

    @classmethod
    def geocode_address(cls, address: str) -> Dict:
        service = cls()
        result = service.client.geocode(address)
        if not result:
            raise ValueError("Address not found")
        location = result[0]["geometry"]["location"]
        return {
            "latitude": location["lat"],
            "longitude": location["lng"],
            "formatted_address": result[0]["formatted_address"],
            "place_id": result[0]["place_id"],
        }

    @classmethod
    def reverse_geocode(cls, latitude: float, longitude: float) -> Dict:
        service = cls()
        result = service.client.reverse_geocode((latitude, longitude))
        if not result:
            raise ValueError("Location not found")
        addr = result[0]
        city = None
        zone = None
        for comp in addr["address_components"]:
            if "locality" in comp["types"]:
                city = comp["long_name"]
            elif "sublocality" in comp["types"] or "neighborhood" in comp["types"]:
                zone = comp["long_name"]
        return {
            "formatted_address": addr["formatted_address"],
            "city": city,
            "zone": zone,
            "place_id": addr["place_id"],
        }

    @classmethod
    def calculate_distance(
        cls, origin: Tuple[float, float], destination: Tuple[float, float]
    ) -> Dict:
        service = cls()
        result = service.client.distance_matrix(
            origins=[origin], destinations=[destination], mode="driving"
        )
        element = result["rows"][0]["elements"][0]
        if element["status"] != "OK":
            raise ValueError("Route not found")
        return {
            "distance_meters": element["distance"]["value"],
            "distance_text": element["distance"]["text"],
            "duration_seconds": element["duration"]["value"],
            "duration_text": element["duration"]["text"],
        }

    @classmethod
    def get_directions(
        cls,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        waypoints: Optional[List[Tuple[float, float]]] = None,
    ) -> Dict:
        service = cls()
        result = service.client.directions(
            origin=origin,
            destination=destination,
            waypoints=waypoints,
            mode="driving",
        )
        if not result:
            raise ValueError("No route found")
        route = result[0]
        leg = route["legs"][0]
        return {
            "distance_meters": leg["distance"]["value"],
            "duration_seconds": leg["duration"]["value"],
            "start_address": leg["start_address"],
            "end_address": leg["end_address"],
            "polyline": route["overview_polyline"]["points"],
            "steps": [
                {
                    "instruction": step["html_instructions"],
                    "distance": step["distance"]["value"],
                    "duration": step["duration"]["value"],
                }
                for step in leg["steps"]
            ],
        }


class LocationService:
    @staticmethod
    def validate_location_in_saudi_arabia(lat: float, lng: float) -> bool:
        return 16 <= lat <= 32 and 34 <= lng <= 56

    @staticmethod
    def calculate_zone_from_location(location: Point) -> Optional[str]:
        zones = ZoneMap.objects.filter(boundary__contains=location, is_active=True)
        if zones.exists():
            return zones.first().name
        return None

    @staticmethod
    def check_location_permission(user) -> Dict:
        try:
            loc = UserLocation.objects.get(user=user)
            return {
                "has_permission": loc.location_permission_granted,
                "permission_type": loc.location_permission_type,
                "last_update": loc.last_location_update,
            }
        except UserLocation.DoesNotExist:
            return {
                "has_permission": False,
                "permission_type": "DENIED",
                "last_update": None,
            }

    @staticmethod
    def get_estimated_arrival_time(driver_loc: Point, passenger_loc: Point) -> Dict:
        try:
            result = GoogleMapsService.calculate_distance(
                origin=(driver_loc.y, driver_loc.x),
                destination=(passenger_loc.y, passenger_loc.x),
            )
            return {
                "eta_seconds": result["duration_seconds"],
                "eta_text": result["duration_text"],
                "distance_meters": result["distance_meters"],
                "distance_text": result["distance_text"],
            }
        except Exception:
            return {
                "eta_seconds": None,
                "eta_text": "Unknown",
                "distance_meters": None,
                "distance_text": "Unknown",
            }


class TripService:
    @staticmethod
    def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * asin(sqrt(a))
        return 6371 * c

    @staticmethod
    def search_available_trips(
        pickup_lat,
        pickup_lng,
        dropoff_lat,
        dropoff_lng,
        departure_time,
        max_distance_km=5,
    ):
        time_start = departure_time - timedelta(hours=2)
        time_end = departure_time + timedelta(hours=2)

        trips = (
            Trip.objects.filter(
                status="scheduled",
                available_seats__gt=0,
                scheduled_departure_time__range=(time_start, time_end),
            )
            .select_related("driver", "driver__driver_profile")
        )

        matches = []
        for trip in trips:
            pickup_dist = TripService.calculate_distance(
                pickup_lat,
                pickup_lng,
                float(trip.pickup_latitude),
                float(trip.pickup_longitude),
            )
            dropoff_dist = TripService.calculate_distance(
                dropoff_lat,
                dropoff_lng,
                float(trip.dropoff_latitude),
                float(trip.dropoff_longitude),
            )
            if pickup_dist <= max_distance_km and dropoff_dist <= max_distance_km:
                trip.pickup_distance = round(pickup_dist, 2)
                trip.dropoff_distance = round(dropoff_dist, 2)
                matches.append(trip)

        matches.sort(key=lambda t: t.pickup_distance)
        return matches

    @staticmethod
    def match_pending_requests(trip: Trip):
        max_dist = 5
        time_start = trip.scheduled_departure_time - timedelta(hours=2)
        time_end = trip.scheduled_departure_time + timedelta(hours=2)

        requests = TripRequest.objects.filter(
            status="searching",
            requested_departure_time__range=(time_start, time_end),
        )

        matched = []
        for req in requests:
            pickup_dist = TripService.calculate_distance(
                float(req.pickup_latitude),
                float(req.pickup_longitude),
                float(trip.pickup_latitude),
                float(trip.pickup_longitude),
            )
            dropoff_dist = TripService.calculate_distance(
                float(req.dropoff_latitude),
                float(req.dropoff_longitude),
                float(trip.dropoff_latitude),
                float(trip.dropoff_longitude),
            )
            if pickup_dist <= max_dist and dropoff_dist <= max_dist:
                req.matched_trip = trip
                req.status = "matched"
                req.save()
                matched.append(req)

        return matched