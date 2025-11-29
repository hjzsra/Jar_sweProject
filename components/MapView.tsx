// Interactive map component for ride tracking
'use client'

import { useEffect, useRef, useState } from 'react'

interface MapViewProps {
  center?: { lat: number; lng: number }
  markers?: Array<{
    position: { lat: number; lng: number }
    title: string
    type: 'pickup' | 'dropoff' | 'driver'
  }>
  showRoute?: boolean
  onLocationSelect?: (lat: number, lng: number, address?: string) => void
  height?: string
}

export default function MapView({
  center = { lat: 24.7136, lng: 46.6753 }, // Riyadh default
  markers = [],
  showRoute = false,
  onLocationSelect,
  height = '400px',
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [googleMaps, setGoogleMaps] = useState<any>(null)

  useEffect(() => {
    // Load Google Maps script
    if (!window.google) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&libraries=places`
      script.async = true
      script.defer = true
      script.onload = initializeMap
      document.head.appendChild(script)
    } else {
      initializeMap()
    }
  }, [])

  useEffect(() => {
    if (map && googleMaps) {
      updateMapMarkers()
      if (showRoute && markers.length >= 2) {
        drawRoute()
      }
    }
  }, [markers, map, googleMaps, showRoute])

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return

    const google = window.google
    setGoogleMaps(google)

    const mapInstance = new google.maps.Map(mapRef.current, {
      center,
      zoom: 13,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
      ],
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
    })

    if (onLocationSelect) {
      mapInstance.addListener('click', async (e: any) => {
        const lat = e.latLng.lat()
        const lng = e.latLng.lng()

        // Reverse geocode to get address
        const geocoder = new google.maps.Geocoder()
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          if (status === 'OK' && results[0]) {
            onLocationSelect(lat, lng, results[0].formatted_address)
          } else {
            onLocationSelect(lat, lng)
          }
        })
      })
    }

    setMap(mapInstance)
  }

  const updateMapMarkers = () => {
    if (!map || !googleMaps) return

    // Clear existing markers
    const existingMarkers = (map as any).markers || []
    existingMarkers.forEach((marker: any) => marker.setMap(null))

    // Add new markers
    const newMarkers = markers.map((markerData) => {
      const icon = {
        url: getMarkerIcon(markerData.type),
        scaledSize: new googleMaps.maps.Size(40, 40),
      }

      const marker = new googleMaps.maps.Marker({
        position: markerData.position,
        map,
        title: markerData.title,
        icon,
      })

      return marker
    })

    ;(map as any).markers = newMarkers

    // Fit bounds if multiple markers
    if (markers.length > 1) {
      const bounds = new googleMaps.maps.LatLngBounds()
      markers.forEach((marker) => bounds.extend(marker.position))
      map.fitBounds(bounds)
    } else if (markers.length === 1) {
      map.setCenter(markers[0].position)
      map.setZoom(15)
    }
  }

  const drawRoute = () => {
    if (!map || !googleMaps || markers.length < 2) return

    const directionsService = new googleMaps.maps.DirectionsService()
    const directionsRenderer = new googleMaps.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#4A90E2',
        strokeWeight: 4,
      },
    })

    const pickup = markers.find((m) => m.type === 'pickup')
    const dropoff = markers.find((m) => m.type === 'dropoff')

    if (pickup && dropoff) {
      directionsService.route(
        {
          origin: pickup.position,
          destination: dropoff.position,
          travelMode: googleMaps.maps.TravelMode.DRIVING,
        },
        (result: any, status: any) => {
          if (status === 'OK') {
            directionsRenderer.setDirections(result)
          }
        }
      )
    }
  }

  const getMarkerIcon = (type: 'pickup' | 'dropoff' | 'driver') => {
    const icons = {
      pickup: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxNSIgZmlsbD0iIzUwQzg3OCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIi8+PHRleHQgeD0iMjAiIHk9IjI1IiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIj5QPC90ZXh0Pjwvc3ZnPg==',
      dropoff: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxNSIgZmlsbD0iI0U3NGMzQyIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIi8+PHRleHQgeD0iMjAiIHk9IjI1IiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIj5EPC90ZXh0Pjwvc3ZnPg==',
      driver: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxNSIgZmlsbD0iIzRBOTBFMiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIi8+PHRleHQgeD0iMjAiIHk9IjI1IiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIj7wn5qXPC90ZXh0Pjwvc3ZnPg==',
    }
    return icons[type]
  }

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-gray-300">
      <div ref={mapRef} style={{ width: '100%', height }} />
      {!map && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100"
          style={{ height }}
        >
          <div className="text-secondary">Loading map...</div>
        </div>
      )}
    </div>
  )
}
