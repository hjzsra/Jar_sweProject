import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminDashboard from './page';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// 1. Mock the dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
}));

// Mock the AuthGuard to simply render children instantly
// This isolates the Dashboard logic from the Auth logic
jest.mock('../../components/AuthGuard', () => {
  return ({ children }: { children: React.ReactNode }) => <div data-testid="auth-guard">{children}</div>;
});

describe('AdminDashboard', () => {
  const mockRouterPush = jest.fn();
  
  // Sample data to return from the API
  const mockDashboardData = {
    stats: {
      totalUsers: 100,
      totalDrivers: 50,
      totalRides: 500,
      activeRides: 5,
      totalRevenue: 1250.50,
      openSupportTickets: 2
    },
    recentRides: [
      {
        id: '123456789',
        driver: { firstName: 'John', lastName: 'Doe' },
        passenger: { firstName: 'Jane', lastName: 'Smith' },
        pickupAddress: '123 Main St',
        dropoffAddress: '456 Market St',
        cost: 25.00,
        status: 'completed',
        createdAt: '2023-10-01T10:00:00Z'
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockRouterPush });
    
    // Mock LocalStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        removeItem: jest.fn(),
      },
      writable: true
    });
  });

  test('renders loading state initially', () => {
    // Return a promise that never resolves immediately to keep it in loading state
    (api.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    
    render(<AdminDashboard />);
    
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  test('renders dashboard data successfully after API load', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockDashboardData });

    render(<AdminDashboard />);

    // Wait for the Loading text to disappear
    await waitFor(() => expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument());

    // Check Stats
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument(); // totalUsers
    expect(screen.getByText('$1250.50')).toBeInTheDocument(); // revenue

    // Check Table Data
    expect(screen.getByText('John Doe')).toBeInTheDocument(); // driver
    expect(screen.getByText('Jane Smith')).toBeInTheDocument(); // passenger
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
  });

  test('handles API error gracefully', async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error('API Failure'));

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load dashboard data');
    });
    
    // Even on error, loading should stop (though UI might be empty based on your current code)
    expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
  });

  test('displays "No recent rides" when list is empty', async () => {
    (api.get as jest.Mock).mockResolvedValue({ 
      data: { ...mockDashboardData, recentRides: [] } 
    });

    render(<AdminDashboard />);

    await waitFor(() => expect(screen.getByText('No recent rides')).toBeInTheDocument());
  });

  test('handles logout correctly', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockDashboardData });
    render(<AdminDashboard />);

    // Wait for load
    await waitFor(() => screen.getByText('Logout'));

    // Click Logout
    fireEvent.click(screen.getByText('Logout'));

    // Assertions
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('token');
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('role');
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('admin');
    expect(mockRouterPush).toHaveBeenCalledWith('/');
  });
});