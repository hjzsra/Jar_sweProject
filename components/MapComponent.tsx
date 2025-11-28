'use client'

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default icon issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
})

interface MapProps {
center: [number, number]
zoom?: number
markers?: { position: [number, number]; popupText: string }[]
onMapClick?: (latlng: L.LatLng) => void
}

const MapClickHandler = ({ onMapClick }: { onMapClick: (latlng: L.LatLng) => void }) => {
    useMapEvents({
        click(e) {
            if (onMapClick) {
                onMapClick(e.latlng);
            }
        },
    });
    return null;
}

const MapComponent = ({ center, zoom = 13, markers = [], onMapClick }: MapProps) => {
if (typeof window === 'undefined') {
    return null
}

return (
    <MapContainer
    center={center}
    zoom={zoom}
    style={{ height: '100%', width: '100%' }}
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
    {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
    </MapContainer>
)
}

export default MapComponent