from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.utils import timezone
from datetime import datetime


class SearchNearbyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # Accepts flexible payload from front-end and returns a small list of mock rides
        data = request.data or {}
        # In a real implementation you'd use pickup/dropoff coordinates and a spatial query
        # Here return a deterministic mock set so the front-end can render results.
        mock_trips = [
            {
                'id': 1,
                'driver_name': 'Aisha',
                'pickup_location': data.get('from', 'Campus Gate'),
                'dropoff_location': data.get('to', 'Library'),
                'departure_time': (timezone.now()).isoformat(),
                'available_seats': 3,
                'fare_per_passenger': '5.00',
                'pickup_distance_km': 0.8,
                'dropoff_distance_km': 2.1,
            },
            {
                'id': 2,
                'driver_name': 'Khaled',
                'pickup_location': data.get('from', 'Campus Gate'),
                'dropoff_location': data.get('to', 'Library'),
                'departure_time': (timezone.now()).isoformat(),
                'available_seats': 2,
                'fare_per_passenger': '4.50',
                'pickup_distance_km': 1.2,
                'dropoff_distance_km': 2.4,
            }
        ]

        return Response({'success': True, 'trips': mock_trips}, status=status.HTTP_200_OK)


class PrebookRideView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.data or {}
        date = payload.get('date')
        time_str = payload.get('time')

        if not date or not time_str:
            return Response({'success': False, 'message': 'date and time are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            dt = datetime.fromisoformat(f"{date}T{time_str}")
        except Exception:
            return Response({'success': False, 'message': 'invalid date/time format'}, status=status.HTTP_400_BAD_REQUEST)

        if dt < timezone.now():
            return Response({'success': False, 'message': 'Cannot book for a past date/time'}, status=status.HTTP_400_BAD_REQUEST)

        # Return a simple confirmation
        return Response({'success': True, 'message': 'Ride pre-booked', 'booking_id': 12345}, status=status.HTTP_201_CREATED)


class RequestRideView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.data or {}
        ride_id = payload.get('ride_id')
        if not ride_id:
            return Response({'success': False, 'message': 'ride_id required'}, status=status.HTTP_400_BAD_REQUEST)

        # In a real app you'd create a TripRequest and notify the driver.
        return Response({'success': True, 'message': 'Request sent to driver', 'request_id': 555}, status=status.HTTP_200_OK)
