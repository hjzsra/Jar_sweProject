import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'

// Mock React.useState
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn(),
}))

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...props }: any) => (
    <div data-testid="map-container" {...props}>
      {children}
    </div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children, ...props }: any) => (
    <div data-testid="marker" data-position={JSON.stringify(props.position)} data-icon={props.icon}>
      {children}
    </div>
  ),
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
  Polyline: ({ positions, pathOptions }: any) => (
    <div
      data-testid="polyline"
      data-positions={JSON.stringify(positions)}
      data-path-options={JSON.stringify(pathOptions)}
    />
  ),
  useMap: jest.fn(),
  useMapEvents: jest.fn(),
}))

// Mock leaflet
jest.mock('leaflet', () => ({
  Icon: jest.fn().mockImplementation((options) => ({ ...options, _isIcon: true })),
  latLngBounds: jest.fn().mockImplementation((coords) => ({
    _coords: coords,
    _isBounds: true,
  })),
}))

// Mock fetch for geocoding
const mockFetch = jest.fn()
global.fetch = mockFetch

// Create a proper Response-like object
const createMockResponse = (data: any, ok = true) => ({
  ok,
  json: () => Promise.resolve(data),
})

describe('MapView', () => {
  const mockUseMap = require('react-leaflet').useMap
  const mockUseMapEvents = require('react-leaflet').useMapEvents
  const originalUseState = React.useState
  const MapView = require('../MapView').default

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset useMap mock
    mockUseMap.mockReturnValue({
      fitBounds: jest.fn(),
      flyTo: jest.fn(),
    })
    // Reset useMapEvents mock
    mockUseMapEvents.mockReturnValue(null)
    // Reset useState to return mounted
    ;(React.useState as jest.Mock).mockReturnValue([true, jest.fn()])
  })

  it('renders loading state initially', () => {
    ;(React.useState as jest.Mock).mockReturnValue([false, jest.fn()])

    render(<MapView />)

    expect(screen.getByText('Loading Map...')).toBeTruthy()
    const loadingDiv = screen.getByText('Loading Map...').parentElement as HTMLElement
    expect(loadingDiv.style.height).toBe('400px')
  })

  it('renders map with default props after mounting', async () => {
    render(<MapView />)

    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeTruthy()
    })

    const mapContainer = screen.getByTestId('map-container')
    expect(mapContainer.style.height).toBe('400px')
    expect(mapContainer.style.width).toBe('100%')
    expect(mapContainer.getAttribute('center')).toBe('24.7136,46.6753')
    expect(mapContainer.getAttribute('zoom')).toBe('13')
  })

  it('renders markers with different types', async () => {
    const markers = [
      { position: { lat: 24.7136, lng: 46.6753 }, title: 'Pickup Location', type: 'pickup' as const },
      { position: { lat: 24.7236, lng: 46.6853 }, title: 'Dropoff Location', type: 'dropoff' as const },
      { position: { lat: 24.7336, lng: 46.6953 }, title: 'Driver Location', type: 'driver' as const },
    ]

    render(<MapView markers={markers} />)

    await waitFor(() => {
      const markerElements = screen.getAllByTestId('marker')
      expect(markerElements).toHaveLength(3)
    })

    const markersElements = screen.getAllByTestId('marker')
    expect(markersElements[0].getAttribute('data-position')).toBe(JSON.stringify([24.7136, 46.6753]))
    expect(markersElements[1].getAttribute('data-position')).toBe(JSON.stringify([24.7236, 46.6853]))
    expect(markersElements[2].getAttribute('data-position')).toBe(JSON.stringify([24.7336, 46.6953]))

    // Check popups
    const popups = screen.getAllByTestId('popup')
    expect(popups[0].textContent).toBe('Pickup Location')
    expect(popups[1].textContent).toBe('Dropoff Location')
    expect(popups[2].textContent).toBe('Driver Location')
  })

  it('renders route when showRoute is true and has multiple markers', async () => {
    const markers = [
      { position: { lat: 24.7136, lng: 46.6753 }, title: 'Pickup', type: 'pickup' as const },
      { position: { lat: 24.7236, lng: 46.6853 }, title: 'Dropoff', type: 'dropoff' as const },
    ]

    render(<MapView markers={markers} showRoute={true} />)

    await waitFor(() => {
      expect(screen.getByTestId('polyline')).toBeTruthy()
    })

    const polyline = screen.getByTestId('polyline')
    const expectedPositions = [
      [24.7136, 46.6753],
      [24.7236, 46.6853],
    ]
    expect(polyline.getAttribute('data-positions')).toBe(JSON.stringify(expectedPositions))
    expect(polyline.getAttribute('data-path-options')).toBe(JSON.stringify({ color: '#4A90E2', weight: 4, dashArray: '10, 10' }))
  })

  it('does not render route when showRoute is false', async () => {
    const markers = [
      { position: { lat: 24.7136, lng: 46.6753 }, title: 'Pickup', type: 'pickup' as const },
      { position: { lat: 24.7236, lng: 46.6853 }, title: 'Dropoff', type: 'dropoff' as const },
    ]

    render(<MapView markers={markers} showRoute={false} />)

    await waitFor(() => {
      expect(screen.queryByTestId('polyline')).toBeNull()
    })
  })

  it('does not render route with single marker', async () => {
    const markers = [
      { position: { lat: 24.7136, lng: 46.6753 }, title: 'Pickup', type: 'pickup' as const },
    ]

    render(<MapView markers={markers} showRoute={true} />)

    await waitFor(() => {
      expect(screen.queryByTestId('polyline')).toBeNull()
    })
  })

  it('calls onLocationSelect when map is clicked', async () => {
    const mockOnLocationSelect = jest.fn()
    const mockMapEvents = { click: jest.fn() }

    mockUseMapEvents.mockImplementation((events: any) => {
      // Simulate click event
      setTimeout(() => {
        events.click({ latlng: { lat: 24.8, lng: 46.7 } })
      }, 0)
      return null
    })

    mockFetch.mockResolvedValueOnce(createMockResponse({
      display_name: 'Test Location, Riyadh'
    }))

    render(<MapView onLocationSelect={mockOnLocationSelect} />)

    await waitFor(() => {
      expect(mockOnLocationSelect).toHaveBeenCalledWith(24.8, 46.7, 'Test Location, Riyadh')
    })
  })

  it('calls onLocationSelect with fallback when geocoding fails', async () => {
    const mockOnLocationSelect = jest.fn()

    mockUseMapEvents.mockImplementation((events: any) => {
      setTimeout(() => {
        events.click({ latlng: { lat: 24.8, lng: 46.7 } })
      }, 0)
      return null
    })

    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<MapView onLocationSelect={mockOnLocationSelect} />)

    await waitFor(() => {
      expect(mockOnLocationSelect).toHaveBeenCalledWith(24.8, 46.7)
    })
  })

  it('applies custom height prop', async () => {
    render(<MapView height="600px" />)

    await waitFor(() => {
      const mapContainer = screen.getByTestId('map-container')
      expect(mapContainer.style.height).toBe('600px')
    })
  })

  it('renders with custom center', async () => {
    const customCenter = { lat: 25.0, lng: 47.0 }

    render(<MapView center={customCenter} />)

    await waitFor(() => {
      const mapContainer = screen.getByTestId('map-container')
      expect(mapContainer.getAttribute('center')).toBe('25,47')
    })
  })

  it('calls map controller with correct bounds for multiple markers', async () => {
    const markers = [
      { position: { lat: 24.7136, lng: 46.6753 }, title: 'Pickup', type: 'pickup' as const },
      { position: { lat: 24.7236, lng: 46.6853 }, title: 'Dropoff', type: 'dropoff' as const },
    ]

    const mockMap = {
      fitBounds: jest.fn(),
      flyTo: jest.fn(),
    }
    mockUseMap.mockReturnValue(mockMap)

    render(<MapView markers={markers} />)

    await waitFor(() => {
      expect(mockMap.fitBounds).toHaveBeenCalled()
      const boundsArg = mockMap.fitBounds.mock.calls[0][0]
      expect(boundsArg._coords).toEqual([
        [24.7136, 46.6753],
        [24.7236, 46.6853],
      ])
    })
  })

  it('calls map controller flyTo for single marker', async () => {
    const markers = [
      { position: { lat: 24.7136, lng: 46.6753 }, title: 'Pickup', type: 'pickup' as const },
    ]
    const center = { lat: 24.7136, lng: 46.6753 }

    const mockMap = {
      fitBounds: jest.fn(),
      flyTo: jest.fn(),
    }
    mockUseMap.mockReturnValue(mockMap)

    render(<MapView center={center} markers={markers} />)

    await waitFor(() => {
      expect(mockMap.flyTo).toHaveBeenCalledWith([24.7136, 46.6753], 13)
    })
  })

  it('does not render LocationSelector when onLocationSelect is not provided', async () => {
    render(<MapView />)

    await waitFor(() => {
      expect(mockUseMapEvents).not.toHaveBeenCalled()
    })
  })
})