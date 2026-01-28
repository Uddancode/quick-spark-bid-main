# Setup Instructions

## Quick Start

### Prerequisites
- Node.js 20+ installed
- npm or bun installed
- Supabase project set up (database migrations already included)

### Step 1: Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd server
npm install
cd ..
```

### Step 2: Configure Environment

Ensure your `.env` file has:
```env
VITE_SUPABASE_URL="your-supabase-url"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key"
VITE_API_URL="http://localhost:3001"
SUPABASE_SERVICE_KEY="your-supabase-service-key"
```

### Step 3: Run the Application

**Option A: Run separately (Recommended for development)**

Terminal 1 - Backend:
```bash
cd server
npm start
```

Terminal 2 - Frontend:
```bash
npm run dev
```

**Option B: Docker Compose**
```bash
docker-compose up --build
```

## Verification

1. Backend should be running on `http://localhost:3001`
   - Test: `curl http://localhost:3001/items`
   - Should return JSON array of auction items

2. Frontend should be running on `http://localhost:8080`
   - Open in browser and verify auction items load

3. Socket.io connection:
   - Open browser console
   - Should see Socket.io connection established
   - Place a bid and verify real-time updates

## Testing Race Conditions

1. Open multiple browser tabs/windows
2. Sign in with different users (or same user)
3. Try placing bids simultaneously on the same item
4. Only the first bid should succeed, others should show "Outbid" error

## Troubleshooting

**Backend won't start:**
- Check `.env` file has all required variables
- Ensure Supabase URL and keys are correct
- Check port 3001 is not already in use

**Frontend can't connect to backend:**
- Verify `VITE_API_URL` in `.env` matches backend URL
- Check CORS settings in `server/server.js`
- Ensure backend is running before starting frontend

**Socket.io connection fails:**
- Check browser console for CORS errors
- Verify `FRONTEND_URL` in backend `.env` matches frontend URL
- Ensure both services are running
