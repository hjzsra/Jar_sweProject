# Student Ride Sharing Platform

A minimalist ride-sharing platform designed for students, where students can be drivers or passengers.

## Features

- **User Authentication**: University email verification with OTP
- **Driver Verification**: License verification through Ministry of Transport API
- **Gender Matching**: Male/female can only book with same gender
- **Real-time Features**: Live chat, nearby drivers, ride tracking
- **Payment Methods**: Cash or Apple Pay
- **Pre-booking**: Schedule rides in advance
- **Cost Splitting**: Automatic cost splitting between passengers
- **Rating System**: Rate rides and drivers
- **Admin Dashboard**: Full access to database and management

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Socket.io for chat
- **Authentication**: JWT tokens

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database and API credentials
```

3. Set up database:
```bash
npx prisma migrate dev
npx prisma generate
```

4. Run development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

- `/app` - Next.js app directory (pages and layouts)
- `/components` - React components
- `/lib` - Utility functions and API helpers
- `/prisma` - Database schema and migrations
- `/public` - Static assets
- `/api` - API route handlers (in app/api)

## API Endpoints

See individual API route files for documentation.

