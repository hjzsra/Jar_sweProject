// Google Places Autocomplete component
'use client'

import { useEffect, useRef, useState } from 'react'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onPlaceSelect: (lat: number, lng: number, address: string) => void
  placeholder?: string
  className?: string
}

export default function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Enter address',
  className = 'input',
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [autocomplete, setAutocomplete] = useState<any>(null)

  useEffect(() => {
    if (!inputRef.current) return

    // Wait for Google Maps to load
    const initAutocomplete = () => {
      if (!window.google) {
        setTimeout(initAutocomplete, 100)
        return
      }

      const autocompleteInstance = new window.google.maps.places.Autocomplete(
        inputRef.current!,
        {
          componentRestrictions: { country: 'sa' }, // Restrict to Saudi Arabia
          fields: ['formatted_address', 'geometry', 'name'],
        }
      )

      autocompleteInstance.addListener('place_changed', () => {
        const place = autocompleteInstance.getPlace()

        if (place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          const address = place.formatted_address || place.name || ''

          onChange(address)
          onPlaceSelect(lat, lng, address)
        }
      })

      setAutocomplete(autocompleteInstance)
    }

    initAutocomplete()
  }, [])

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  )
}
