import { render, screen, waitFor } from '@testing-library/react'
import AuthGuard from '../AuthGuard'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('AuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPush.mockClear()
    mockLocalStorage.getItem.mockClear()
  })

  it('shows loading initially', () => {
    mockLocalStorage.getItem.mockReturnValue(null)

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    expect(screen.getByText('Loading...')).toBeTruthy()
  })

  it('redirects to home when no token', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('redirects when role does not match required role', async () => {
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return 'valid-token'
      if (key === 'role') return 'user'
      return null
    })

    render(
      <AuthGuard requiredRole="admin">
        <div>Protected Content</div>
      </AuthGuard>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('renders children when authenticated and role matches', async () => {
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return 'valid-token'
      if (key === 'role') return 'admin'
      return null
    })

    render(
      <AuthGuard requiredRole="admin">
        <div>Protected Content</div>
      </AuthGuard>
    )

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeTruthy()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('renders children when authenticated without required role', async () => {
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return 'valid-token'
      if (key === 'role') return 'user'
      return null
    })

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeTruthy()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })
})