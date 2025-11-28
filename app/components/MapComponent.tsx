'use client'

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L, { LatLngExpression } from 'leaflet'

// Fix for default icon issue with webpack
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
})

interface MapEventsProps {
  onLocationSelect?: (location: { lat: number; lng: number }) => void
  onMapClick?: (latlng: L.LatLng) => void
}

const MapEvents = ({ onLocationSelect, onMapClick }: MapEventsProps) => {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(e.latlng)
      }
      if (onMapClick) {
        onMapClick(e.latlng)
      }
    },
  })
  return null
}

interface MapComponentProps {
  position: LatLngExpression
  zoom?: number
  markers?: { position: [number, number]; popupText: string }[]
  onLocationSelect?: (location: { lat: number; lng: number }) => void
  markerPosition?: { lat: number; lng: number }
  onMapClick?: (latlng: L.LatLng) => void
}

const MapComponent = ({
  position,
  zoom = 13,
  markers = [],
  onLocationSelect,
  markerPosition,
  onMapClick,
}: MapComponentProps) => {
  if (typeof window === 'undefined') {
    return null
  }

  return (
    <MapContainer
      center={position}
      zoom={zoom}
      style={{ height: '400px', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {markers.map((marker, index) => (
        <Marker key={index} position={marker.position}>
          <Popup>{marker.popupText}</Popup>
        </Marker>
      ))}
      {markerPosition && <Marker position={markerPosition}></Marker>}
      <MapEvents onLocationSelect={onLocationSelect} onMapClick={onMapClick} />
    </MapContainer>
  )
}

export default MapComponent