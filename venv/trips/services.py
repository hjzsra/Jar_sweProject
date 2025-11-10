import GoogleMaps
from django.conf import settings
from django.contrib.gis.geos import point
from typing import Dict , List , optional import logging

logger = logging.getLogger(__name__)

class GoogleMapsService:
  def __init__(self):
        self.client = googlemaps.Client(key=settings.GOOGLE_MAPS_API_KEY)
    
    @classmethod
    def geocode_address(cls, address: str) -> Dict:
    service = cls()
        
        try:
            result = service.client.geocode(address)
            
            if not result:
                raise ValueError("Address not found")
            
            location = result[0]['geometry']['location']
            
            return {
                'latitude': location['lat'],
                'longitude': location['lng'],
                'formatted_address': result[0]['formatted_address'],
                'place_id': result[0]['place_id']
            }
        except Exception as e:
            logger.error(f"Geocoding error for address '{address}': {str(e)}")
            raise
    
    @classmethod
    def reverse_geocode(cls, latitude: float, longitude: float) -> Dict:
     service = cls()
        
        try:
            result = service.client.reverse_geocode((latitude, longitude))
            
            if not result:
                raise ValueError("Location not found")
            
            address_data = result[0]
        city = None
            zone = None
            
            for component in address_data['address_components']:
                if 'locality' in component['types']:
                    city = component['long_name']
                elif 'sublocality' in component['types'] or 'neighborhood' in component['types']:
                    zone = component['long_name']
            
            return {
                'formatted_address': address_data['formatted_address'],
                'city': city,
                'zone': zone,
                'place_id': address_data['place_id']
            }
        except Exception as e:
            logger.error(f"Reverse geocoding error for ({latitude}, {longitude}): {str(e)}")
            raise
    
    @classmethod
    def calculate_distance(cls, origin: tuple, destination: tuple) -> Dict:
       service = cls()
        
        try:
            result = service.client.distance_matrix(
                origins=[origin],
                destinations=[destination],
                mode='driving'
            )
            
            element = result['rows'][0]['elements'][0]
            
            if element['status'] != 'OK':
                raise ValueError("Route not found")
            
            return {
                'distance_meters': element['distance']['value'],
                'distance_text': element['distance']['text'],
                'duration_seconds': element['duration']['value'],
                'duration_text': element['duration']['text']
            }
        except Exception as e:
            logger.error(f"Distance calculation error: {str(e)}")
            raise
    
    @classmethod
    def get_directions(cls, origin: tuple, destination: tuple, 
                      waypoints: Optional[List[tuple]] = None) -> Dict:
     service = cls()
        
        try:
            result = service.client.directions(
                origin=origin,
                destination=destination,
                waypoints=waypoints,
                mode='driving'
            )
            
            if not result:
                raise ValueError("No route found")
            
            route = result[0]
            leg = route['legs'][0]
            
            return {
                'distance_meters': leg['distance']['value'],
                'duration_seconds': leg['duration']['value'],
                'start_address': leg['start_address'],
                'end_address': leg['end_address'],
                'polyline': route['overview_polyline']['points'],
                'steps': [
                    {
                        'instruction': step['html_instructions'],
                        'distance': step['distance']['value'],
                        'duration': step['duration']['value']
                    }
                    for step in leg['steps']
                ]
            }
        except Exception as e:
            logger.error(f"Directions error: {str(e)}")
            raise


class LocationService:
     @staticmethod
    def validate_location_in_saudi_arabia(latitude: float, longitude: float) -> bool:
   return (16 <= latitude <= 32 and 34 <= longitude <= 56)
    
    @staticmethod
    def calculate_zone_from_location(location: Point) -> Optional[str]:
     from .models import ZoneMap
        
        zones = ZoneMap.objects.filter(
            boundary__contains=location,
            is_active=True
        )
        
        if zones.exists():
            return zones.first().name
        return None
    
    @staticmethod
    def check_location_permission(user) -> Dict:
      from .models import UserLocation
        
        try:
            user_location = UserLocation.objects.get(user=user)
            return {
                'has_permission': user_location.location_permission_granted,
                'permission_type': user_location.location_permission_type,
                'last_update': user_location.last_location_update
            }
        except UserLocation.DoesNotExist:
            return {
                'has_permission': False,
                'permission_type': 'DENIED',
                'last_update': None
            }
    
    @staticmethod
    def get_estimated_arrival_time(driver_location: Point, 
                                   passenger_location: Point) -> Dict:
     try:
            result = GoogleMapsService.calculate_distance(
                origin=(driver_location.y, driver_location.x),
                destination=(passenger_location.y, passenger_location.x)
            )
            
            return {
                'eta_seconds': result['duration_seconds'],
                'eta_text': result['duration_text'],
                'distance_meters': result['distance_meters'],
                'distance_text': result['distance_text']
            }
        except Exception as e:
            logger.error(f"ETA calculation error: {str(e)}")
            return {
                'eta_seconds': None,
                'eta_text': 'Unknown',
                'distance_meters': None,
                'distance_text': 'Unknown'
            }                                                         
