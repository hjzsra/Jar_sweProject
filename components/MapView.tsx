// Interactive map component for ride tracking using Leaflet
'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css' // IMPORTANT: Import Leaflet CSS

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

// --- 1. Custom Icons ---
// We convert your SVG strings into Leaflet Icons
const createIcon = (url: string) =>
  new L.Icon({
    iconUrl: url,
    iconSize: [40, 40],
    iconAnchor: [20, 20], // Center the icon
    popupAnchor: [0, -20],
  })

// --- 2. Map Controller Component ---
// Leaflet MapContainer props are immutable. We use this child component
// to listen to props changes (like markers) and move the camera programmatically.
function MapController({ center, markers }: { center: { lat: number; lng: number }, markers: MapViewProps['markers'] }) {
  const map = useMap()

  useEffect(() => {
    if (markers && markers.length > 1) {
      // Fit bounds if multiple markers exist
      const bounds = L.latLngBounds(markers.map(m => [m.position.lat, m.position.lng]))
      map.fitBounds(bounds, { padding: [50, 50] })
    } else {
      // Otherwise fly to center
      map.flyTo([center.lat, center.lng], 13)
    }
  }, [center, markers, map])

  return null
}

// --- 3. Location Selector Component ---
// Handles clicks on the map to reverse geocode
function LocationSelector({ onSelect }: { onSelect: MapViewProps['onLocationSelect'] }) {
  useMapEvents({
    click: async (e) => {
      if (!onSelect) return
      const { lat, lng } = e.latlng
      
      // Basic Nominatim Reverse Geocoding (Free, OpenStreetMap)
      // Note: For production, consider using a dedicated geocoding service to avoid rate limits
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        const data = await response.json()
        onSelect(lat, lng, data.display_name || 'Unknown Location')
      } catch (error) {
        onSelect(lat, lng)
      }
    },
  })
  return null
}

export default function MapView({
  center = { lat: 24.7136, lng: 46.6753 }, // Riyadh
  markers = [],
  showRoute = false,
  onLocationSelect,
  height = '400px',
}: MapViewProps) {
  
  // Prepare route positions for the Polyline
  const routePositions = useMemo(() => {
    if (!showRoute || markers.length < 2) return []
    // Sort markers or find specific pickup/dropoff logic here if needed.
    // Currently connects them in order of the array.
    return markers.map(m => [m.position.lat, m.position.lng] as [number, number])
  }, [markers, showRoute])

  // Fix for Next.js Leaflet SSR issue (window is not defined)
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => { setIsMounted(true) }, [])

  const ICONS = useMemo(() => ({
    pickup: createIcon('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxNSIgZmlsbD0iIzUwQzg3OCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIi8+PHRleHQgeD0iMjAiIHk9IjI1IiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIj5QPC90ZXh0Pjwvc3ZnPg=='),
    dropoff: createIcon('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxNSIgZmlsbD0iI0U3NGMzQyIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIi8+PHRleHQgeD0iMjAiIHk9IjI1IiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIj5EPC90ZXh0Pjwvc3ZnPg=='),
    driver: createIcon('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxNSIgZmlsbD0iIzRBOTBFMiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIi8+PHRleHQgeD0iMjAiIHk9IjI1IiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIj7wn5qXPC90ZXh0Pjwvc3ZnPg=='),
  }), [])

  if (!isMounted) {
    return (
      <div className="w-full bg-gray-100 flex items-center justify-center text-gray-500" style={{ height }}>
        Loading Map...
      </div>
    )
  }

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-gray-300">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        style={{ height, width: '100%' }}
        scrollWheelZoom={true} // Enable zoom on scroll
      >
        {/* OpenStreetMap Tile Layer (Free) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Handlers for map movement and clicks */}
        <MapController center={center} markers={markers} />
        {onLocationSelect && <LocationSelector onSelect={onLocationSelect} />}

        {/* Render Markers */}
        {markers.map((marker, idx) => (
          <Marker
            key={`${marker.type}-${idx}`}
            position={[marker.position.lat, marker.position.lng]}
            icon={ICONS[marker.type]}
          >
            <Popup>{marker.title}</Popup>
          </Marker>
        ))}

        {/* Render Route Line */}
        {showRoute && routePositions.length > 1 && (
          <Polyline
            positions={routePositions}
            pathOptions={{ color: '#4A90E2', weight: 4, dashArray: '10, 10' }} // Dashed line to indicate straight path
          />
        )}
      </MapContainer>
    </div>
  )
}