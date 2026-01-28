# Live Bidding Platform

A real-time auction platform built with Node.js, Socket.io, React, and Supabase.

## Features

- ✅ **REST API** - `GET /items` endpoint for fetching auction items
- ✅ **Real-Time Bidding** - Socket.io events (`BID_PLACED`, `UPDATE_BID`)
- ✅ **Race Condition Handling** - Optimistic locking prevents concurrent bid conflicts
- ✅ **Server-Synced Timers** - Countdown timers synchronized with server time
- ✅ **Visual Feedback** - Green flash animations, winning/outbid badges
- ✅ **Docker Support** - Easy deployment with Docker Compose

## Architecture

### Backend (Node.js + Socket.io)
- **Express.js** server for REST API
- **Socket.io** for real-time bidirectional communication
- **Supabase** for database and authentication
- Race condition handling via optimistic locking

### Frontend (React)
- **React** + **TypeScript** + **Vite**
- **Socket.io Client** for real-time updates
- **Tailwind CSS** + **shadcn/ui** for styling
- Server-synced countdown timers

## Prerequisites

- Node.js 20+
- npm or bun
- Docker & Docker Compose (optional)

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL="your-supabase-url"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key"
VITE_API_URL="http://localhost:3001"
SUPABASE_SERVICE_KEY="your-supabase-service-key"
```

## Local Development

### Option 1: Run Both Services Separately

**Terminal 1 - Backend:**
```bash
cd server
npm install
npm start
# Server runs on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
npm install
npm run dev
# Frontend runs on http://localhost:8080
```

### Option 2: Docker Compose (Recommended)

```bash
docker-compose up --build
```

This will start:
- Backend server on `http://localhost:3001`
- Frontend on `http://localhost:8080`

## API Endpoints

### REST API

- `GET /items` - Returns list of auction items
- `GET /server-time` - Returns server time for synchronization

### Socket.io Events

**Client → Server:**
- `BID_PLACED` - Place a bid
  ```javascript
  socket.emit('BID_PLACED', {
    itemId: string,
    bidderId: string,
    amount: number,
    expectedVersion: number
  });
  ```

**Server → Client:**
- `UPDATE_BID` - Broadcasts new highest bid to all clients
  ```javascript
  socket.on('UPDATE_BID', (data) => {
    // data.item - updated auction item
    // data.timestamp - update timestamp
  });
  ```

- `BID_SUCCESS` - Confirms successful bid to the bidder
- `BID_ERROR` - Sends error message if bid fails

## Race Condition Handling

The system uses optimistic locking to prevent race conditions:

1. Each auction item has a `bid_version` field
2. Clients send the expected version when placing a bid
3. Server checks if version matches before accepting bid
4. If version mismatch, bid is rejected with "Outbid" error
5. Database uses `FOR UPDATE` row locking for atomicity

## Docker Deployment

### Build and Run with Docker Compose

```bash
docker-compose up --build -d
```

### Build Individual Services

**Frontend only:**
```bash
docker build -t auction-frontend .
docker run -p 8080:80 auction-frontend
```

**Backend only:**
```bash
docker build -f Dockerfile.backend -t auction-backend .
docker run -p 3001:3001 --env-file .env auction-backend
```

## Project Structure

```
.
├── server/                 # Backend server
│   ├── server.js          # Express + Socket.io server
│   └── package.json       # Backend dependencies
├── src/                    # Frontend React app
│   ├── components/        # React components
│   ├── hooks/             # Custom hooks
│   │   ├── useAuctionItems.ts  # Uses REST API + Socket.io
│   │   └── useServerTime.ts    # Uses REST API
│   └── lib/
│       └── socket.ts      # Socket.io client setup
├── Dockerfile              # Frontend Docker image
├── Dockerfile.backend      # Backend Docker image
└── docker-compose.yml      # Multi-container setup
```

## Testing

Test the race condition handling by opening multiple browser tabs and placing bids simultaneously. Only the first bid should succeed, others should receive "Outbid" errors.

## License

MIT
