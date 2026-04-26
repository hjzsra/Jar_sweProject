# Setup Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- Email account for OTP (Gmail recommended)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/student_ride_sharing?schema=public"

# JWT Secret (generate a strong random string)
JWT_SECRET="your-secret-key-change-this-in-production"

# Email configuration for OTP
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"

# Ministry of Transport API (mock endpoint - replace with real API)
MOT_API_URL="https://api.ministry-of-transport.example.com/verify"
MOT_API_KEY="your-api-key"

# Next.js
NEXTAUTH_URL="http://localhost:3000"
```

**Note for Gmail:**
- Enable 2-factor authentication
- Generate an App Password: https://myaccount.google.com/apppasswords
- Use the app password in `EMAIL_PASS`

### 3. Set Up Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database with admin user
npm run db:seed
```

**Default Admin Credentials:**
- Email: `admin@studentrides.com`
- Password: `admin123`
- ⚠️ **Change this password immediately in production!**

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── rides/         # Ride management
│   │   ├── user/          # User features
│   │   ├── driver/        # Driver features
│   │   ├── admin/         # Admin features
│   │   ├── chat/          # Chat messages
│   │   └── support/       # Support tickets
│   ├── user/              # User pages
│   ├── driver/            # Driver pages
│   ├── admin/             # Admin pages
│   └── support/           # Support page
├── components/            # React components
├── lib/                   # Utility functions
├── prisma/                # Database schema
└── public/                # Static assets
```

## Key Features

### Authentication
- **Users**: University email with OTP verification
- **Drivers**: License verification through MOT API
- **Admin**: Email/password login

### User Features
- Profile management
- Wallet (Apple Pay integration)
- Trip history
- Book rides (immediate or pre-booked)
- See nearby drivers
- Rate rides and drivers
- Contact support

### Driver Features
- Accept/reject ride requests
- Update location
- Confirm arrival and trip end
- Chat with riders
- View ride history

### Admin Features
- Dashboard with statistics
- View all rides
- Manage database

## API Documentation

All API routes are in `/app/api/`. Each route file contains comments explaining its purpose.

### Authentication Endpoints
- `POST /api/auth/user/register` - User registration
- `POST /api/auth/user/verify-otp` - Verify OTP
- `POST /api/auth/user/login` - User login
- `POST /api/auth/driver/register` - Driver registration
- `POST /api/auth/driver/login` - Driver login
- `POST /api/auth/admin/login` - Admin login

### Ride Endpoints
- `POST /api/rides/create` - Create ride request
- `GET /api/rides/nearby-drivers` - Get nearby drivers
- `POST /api/rides/driver/accept` - Accept ride
- `POST /api/rides/driver/reject` - Reject ride
- `POST /api/rides/driver/arrived` - Confirm arrival
- `POST /api/rides/driver/start` - Start trip
- `POST /api/rides/driver/end` - End trip
- `POST /api/rides/user/reject` - User reject ride
- `POST /api/rides/rate` - Rate ride and driver

### User Endpoints
- `GET /api/user/profile` - Get profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/trip-history` - Get trip history
- `GET /api/user/wallet` - Get wallet balance
- `POST /api/user/wallet` - Add funds

### Driver Endpoints
- `GET /api/driver/requests` - Get ride requests
- `POST /api/driver/update-location` - Update location

### Chat Endpoints
- `GET /api/chat/messages` - Get messages
- `POST /api/chat/messages` - Send message

### Support Endpoints
- `POST /api/support/contact` - Create support ticket

### Admin Endpoints
- `GET /api/admin/dashboard` - Get dashboard data

## Notes

### Gender Matching
- Male users can only book with male drivers
- Female users can only book with female drivers
- This is enforced in the API

### Cost Splitting
- Currently supports single passenger per ride
- Cost is calculated based on distance ($1 per km)
- To support multiple passengers, modify the schema to add a RidePassengers table

### Ministry of Transport API
- Currently uses a mock implementation
- Replace `lib/mot-api.ts` with real API integration in production

### Apple Pay
- Currently simulates wallet transactions
- Integrate with Apple Pay API in production

## Production Deployment

1. Set strong `JWT_SECRET`
2. Use production database
3. Configure real email service
4. Integrate real MOT API
5. Set up SSL/HTTPS
6. Change default admin password
7. Set up proper error logging
8. Configure environment variables securely

## Support

For issues or questions, check the code comments or contact the development team.

