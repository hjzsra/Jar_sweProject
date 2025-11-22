'use client'

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { LatLngExpression } from 'leaflet'
import { useRef } from 'react'

// Fix for default icon issue with webpack
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});


interface MapEventsProps {
  onLocationSelect: (location: { lat: number; lng: number }) => void
}

const MapEvents = ({ onLocationSelect }: MapEventsProps) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng)
    },
  })
  return null
}

interface MapComponentProps {
  position: LatLngExpression
  onLocationSelect: (location: { lat: number; lng: number }) => void
  markerPosition?: { lat: number; lng: number }
  zoom?: number
}

const MapComponent = ({ position, onLocationSelect, markerPosition, zoom = 13 }: MapComponentProps) => {
  const mapRef = useRef(null)

  return (
    <MapContainer center={position} zoom={zoom} ref={mapRef} style={{ height: '400px', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {markerPosition && <Marker position={markerPosition}></Marker>}
      <MapEvents onLocationSelect={onLocationSelect} />
    </MapContainer>
  )
}

export default MapComponent;