from celery import shared_task
from django.contrib.gis.geos import Point, LineString
from django.utils import timezone
from django.contrib.gis.measure import D
from datetime import timedelta
import logging

from .models import UserLocation, LocationHistory, Trip
from .services import LocationService
# Assuming you have a notifications app with this task
# from notifications.tasks import send_route_deviation_alert
from user_auth.models import User


logger = logging.getLogger(__name__)


@shared_task
def process_location_update(user_id: int, latitude: float, longitude: float,
                           accuracy: float = None, speed: float = None):
    try:
        user = User.objects.get(id=user_id)
        user_location, _ = UserLocation.objects.get_or_create(user=user)
        location_point = Point(longitude, latitude)

        LocationHistory.objects.create(
            user=user,
            location=location_point,
            accuracy=accuracy,
            speed=speed
        )
        zone_name = LocationService.calculate_zone_from_location(location_point)
        if zone_name:
            user_location.zone_name = zone_name
            user_location.save()
        active_trip = Trip.objects.filter(
            driver=user,
            status__in=['STARTED', 'PICKUP']
        ).first()

        if active_trip:
            check_route_deviation.delay(active_trip.id, latitude, longitude)

        logger.info(f"Location updated for user {user_id}")

    except User.DoesNotExist:
        logger.error(f"User with id {user_id} not found.")
    except Exception as e:
        logger.error(f"Error processing location update: {str(e)}")


@shared_task
def check_route_deviation(trip_id: int, current_lat: float, current_lon: float):
    try:
        trip = Trip.objects.get(id=trip_id)
        current_location = Point(current_lon, current_lat, srid=4326)
        
        expected_route = LineString(
            [trip.pickup_location, trip.dropoff_location],
            srid=4326
        )
        distance_from_route = current_location.distance(expected_route) * 100000 # Approx conversion to meters
        DEVIATION_THRESHOLD = 500 # meters

        if distance_from_route > DEVIATION_THRESHOLD:
            trip.route_deviation_count += 1
            trip.save()
            LocationHistory.objects.create(
                user=trip.driver,
                location=current_location,
                trip=trip,
                is_deviation=True,
                deviation_distance=distance_from_route
            )
            # send_route_deviation_alert.delay(
            #     trip_id=trip_id,
            #     deviation_distance=distance_from_route
            # )

            logger.warning(f"Route deviation detected for trip {trip_id}: {distance_from_route}m")

    except Trip.DoesNotExist:
        logger.error(f"Trip with id {trip_id} not found for deviation check.")
    except Exception as e:
        logger.error(f"Error checking route deviation: {str(e)}")


@shared_task
def cleanup_old_location_history():
    cutoff_date = timezone.now() - timedelta(days=30)
    deleted_count, _ = LocationHistory.objects.filter(
        recorded_at__lt=cutoff_date
    ).delete()
    logger.info(f"Cleaned up {deleted_count} old location history records")
    return deleted_count