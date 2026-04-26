import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import AddressAutocomplete from '../AddressAutocomplete'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Create a proper Response-like object
const createMockResponse = (data: any, ok = true) => ({
  ok,
  json: () => Promise.resolve(data),
})

describe('AddressAutocomplete', () => {
  const mockOnChange = jest.fn()
  const mockOnPlaceSelect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders input with correct props', () => {
    render(
      <AddressAutocomplete
        value="Test Address"
        onChange={mockOnChange}
        onPlaceSelect={mockOnPlaceSelect}
        placeholder="Enter location"
      />
    )

    const input = screen.getByPlaceholderText('Enter location')
    expect(input).toBeTruthy()
    expect((input as HTMLInputElement).value).toBe('Test Address')
  })

  it('calls onChange when input value changes', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse([]))

    render(
      <AddressAutocomplete
        value=""
        onChange={mockOnChange}
        onPlaceSelect={mockOnPlaceSelect}
      />
    )

    const input = screen.getByRole('textbox')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Riyadh' } })
    })

    expect(mockOnChange).toHaveBeenCalledWith('Riyadh')
  })

  it('does not fetch suggestions for input less than 3 characters', () => {
    render(
      <AddressAutocomplete
        value=""
        onChange={mockOnChange}
        onPlaceSelect={mockOnPlaceSelect}
      />
    )

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Ri' } })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('fetches suggestions for input with 3 or more characters', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse([
      {
        display_name: 'Riyadh, Saudi Arabia',
        lat: '24.7136',
        lon: '46.6753',
        place_id: 1,
      },
    ]))

    render(
      <AddressAutocomplete
        value=""
        onChange={mockOnChange}
        onPlaceSelect={mockOnPlaceSelect}
      />
    )

    const input = screen.getByRole('textbox')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Riyadh' } })
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=Riyadh')
      )
    })
  })

  it('displays suggestions when available', async () => {
    const mockSuggestions = [
      {
        display_name: 'Riyadh, Riyadh Province, Saudi Arabia',
        lat: '24.7136',
        lon: '46.6753',
        place_id: 1,
      },
    ]

    mockFetch.mockResolvedValueOnce(createMockResponse(mockSuggestions))

    render(
      <AddressAutocomplete
        value=""
        onChange={mockOnChange}
        onPlaceSelect={mockOnPlaceSelect}
      />
    )

    const input = screen.getByRole('textbox')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Riyadh' } })
    })

    await waitFor(() => {
      expect(screen.getByText('Riyadh')).toBeTruthy()
    })
  })

  it('calls onPlaceSelect when suggestion is clicked', async () => {
    const mockSuggestions = [
      {
        display_name: 'Riyadh, Riyadh Province, Saudi Arabia',
        lat: '24.7136',
        lon: '46.6753',
        place_id: 1,
      },
    ]

    mockFetch.mockResolvedValueOnce(createMockResponse(mockSuggestions))

    render(
      <AddressAutocomplete
        value=""
        onChange={mockOnChange}
        onPlaceSelect={mockOnPlaceSelect}
      />
    )

    const input = screen.getByRole('textbox')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Riyadh' } })
    })

    await waitFor(() => {
      const suggestion = screen.getByText('Riyadh')
      fireEvent.click(suggestion)
    })

    expect(mockOnPlaceSelect).toHaveBeenCalledWith(
      24.7136,
      46.6753,
      'Riyadh, Riyadh Province, Saudi Arabia'
    )
    expect(mockOnChange).toHaveBeenCalledWith('Riyadh, Riyadh Province, Saudi Arabia')
  })

  it('shows loading indicator while searching', async () => {
    mockFetch.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve(createMockResponse([])), 100))
    )

    render(
      <AddressAutocomplete
        value=""
        onChange={mockOnChange}
        onPlaceSelect={mockOnPlaceSelect}
      />
    )

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Riyadh' } })

    // Should show loading spinner
    await waitFor(() => {
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeTruthy()
    })
  })

  it('shows no results message when no suggestions found', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse([]))

    const { rerender } = render(
      <AddressAutocomplete
        value=""
        onChange={mockOnChange}
        onPlaceSelect={mockOnPlaceSelect}
      />
    )

    const input = screen.getByRole('textbox')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'NonExistentPlace123' } })
    })

    // Update the component with the new value
    rerender(
      <AddressAutocomplete
        value="NonExistentPlace123"
        onChange={mockOnChange}
        onPlaceSelect={mockOnPlaceSelect}
      />
    )

    // Wait for the fetch to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    // Check if the "No addresses found" message appears
    await waitFor(() => {
      expect(screen.getByText('No addresses found')).toBeTruthy()
    })
  })
})