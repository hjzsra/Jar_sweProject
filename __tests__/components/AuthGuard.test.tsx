// AuthGuard component tests
import React from 'react'
import { render, screen } from '@testing-library/react'
import AuthGuard from '@/components/AuthGuard'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => '/test-path',
}))

describe('AuthGuard Component', () => {
  const mockChildren = <div>Protected Content</div>

  it('should render children when user is authenticated', () => {
    // Mock localStorage to simulate authenticated user
    Storage.prototype.getItem = jest.fn(() => 'mock-token')

    render(
      <AuthGuard>
        {mockChildren}
      </AuthGuard>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('should redirect when user is not authenticated', () => {
    // Mock localStorage to simulate no token
    Storage.prototype.getItem = jest.fn(() => null)

    const mockPush = jest.fn()
    jest.spyOn(require('next/navigation'), 'useRouter').mockImplementation(() => ({
      push: mockPush,
    }))

    render(
      <AuthGuard>
        {mockChildren}
      </AuthGuard>
    )

    // Should not render children
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
})