// Address Autocomplete component using Nominatim (OpenStreetMap)
'use client'

import { useEffect, useRef, useState } from 'react'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onPlaceSelect: (lat: number, lng: number, address: string) => void
  placeholder?: string
  className?: string
}

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
  place_id: number
}

export default function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Enter address',
  className = 'input',
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  // Handle input changes and fetch suggestions
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    if (newValue.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsSearching(true)
    
    try {
      // Use Nominatim API for geocoding (OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          newValue
        )}&countrycodes=sa&limit=5&addressdetails=1`
      )
      
      if (response.ok) {
        const data: NominatimResult[] = await response.json()
        setSuggestions(data)
        setShowSuggestions(true)
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      setSuggestions([])
    } finally {
      setIsSearching(false)
    }
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: NominatimResult) => {
    const lat = parseFloat(suggestion.lat)
    const lng = parseFloat(suggestion.lon)
    const address = suggestion.display_name

    onChange(address)
    onPlaceSelect(lat, lng, address)
    setShowSuggestions(false)
    setSuggestions([])
  }

  // Hide suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      
      {/* Loading indicator */}
      {isSearching && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.place_id}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
              onClick={() => handleSuggestionSelect(suggestion)}
            >
              <div className="text-sm font-medium text-gray-900">
                {suggestion.display_name.split(',')[0]}
              </div>
              <div className="text-xs text-gray-500">
                {suggestion.display_name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results message */}
      {showSuggestions && suggestions.length === 0 && value.length >= 3 && !isSearching && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
          <div className="text-sm text-gray-500">No addresses found</div>
        </div>
      )}
    </div>
  )
}