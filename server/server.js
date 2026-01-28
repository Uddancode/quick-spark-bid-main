import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:8080",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:8080",
  credentials: true
}));
app.use(express.json());

// Store active bid locks per item to handle race conditions
const bidLocks = new Map();

/**
 * REST API: GET /items
 * Returns a list of auction items (title, starting price, current bid, auction end time).
 *
 * For demo purposes, this endpoint also keeps auctions "ongoing":
 * - If an item's auction_end_time is already in the past, we push it 60 minutes into the future.
 * - This makes sure the frontend always sees active auctions it can bid on.
 */
app.get('/items', async (req, res) => {
  try {
    // Fetch all items
    const { data, error } = await supabase
      .from('auction_items')
      .select('id, title, description, image_url, starting_price, current_bid, current_bidder_id, auction_end_time, created_at, updated_at, bid_version')
      .order('auction_end_time', { ascending: true });

    if (error) {
      console.error('Error fetching items:', error);
      return res.status(500).json({ error: 'Failed to fetch auction items' });
    }

    let items = data || [];

    // Detect auctions that have already ended
    const now = Date.now();
    const endedIds = items
      .filter((item) => new Date(item.auction_end_time).getTime() <= now)
      .map((item) => item.id);

    // If any have ended, push their end time 60 minutes into the future
    if (endedIds.length > 0) {
      const newEndTime = new Date(now + 60 * 60 * 1000).toISOString();
      const { error: updateError } = await supabase
        .from('auction_items')
        .update({ auction_end_time: newEndTime, updated_at: new Date().toISOString() })
        .in('id', endedIds);

      if (updateError) {
        console.error('Error auto-extending auctions:', updateError);
      } else {
        // Re-fetch items so the response includes the updated end times
        const { data: refreshed, error: refetchError } = await supabase
          .from('auction_items')
          .select('id, title, description, image_url, starting_price, current_bid, current_bidder_id, auction_end_time, created_at, updated_at, bid_version')
          .order('auction_end_time', { ascending: true });

        if (refetchError) {
          console.error('Error refetching items after auto-extend:', refetchError);
        } else if (refreshed) {
          items = refreshed;
        }
      }
    }

    res.json(items);
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * REST API: GET /server-time
 * Returns server time for countdown synchronization
 */
app.get('/server-time', (req, res) => {
  res.json({ serverTime: new Date().toISOString() });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Subscribe to Supabase realtime changes for auction items
  const channel = supabase
    .channel(`auction-updates-${socket.id}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'auction_items',
      },
      (payload) => {
        // Broadcast UPDATE_BID event to all connected clients
        io.emit('UPDATE_BID', {
          item: payload.new,
          timestamp: new Date().toISOString()
        });
      }
    )
    .subscribe();

  /**
   * Socket Event: BID_PLACED
   * Client sends a bid. Server validates it is higher than current bid 
   * and that the auction hasn't ended. Handles race conditions.
   */
  socket.on('BID_PLACED', async (data) => {
    const { itemId, bidderId, amount, expectedVersion } = data;

    if (!itemId || !bidderId || amount === undefined || expectedVersion === undefined) {
      socket.emit('BID_ERROR', {
        error: 'Missing required fields: itemId, bidderId, amount, expectedVersion'
      });
      return;
    }

    // Get or create lock for this item
    if (!bidLocks.has(itemId)) {
      bidLocks.set(itemId, Promise.resolve());
    }

    // Queue bid processing to prevent race conditions
    const lockPromise = bidLocks.get(itemId).then(async () => {
      try {
        // Call the database function that handles race condition prevention
        const { data: result, error } = await supabase.rpc('place_bid', {
          p_item_id: itemId,
          p_bidder_id: bidderId,
          p_amount: amount,
          p_expected_version: expectedVersion
        });

        if (error) {
          throw error;
        }

        const bidResult = result;

        if (!bidResult.success) {
          // Bid failed - send error to the specific client
          socket.emit('BID_ERROR', {
            error: bidResult.error || 'Bid failed',
            itemId
          });
          return;
        }

        // Bid successful - fetch updated item and broadcast to all clients
        const { data: updatedItem, error: fetchError } = await supabase
          .from('auction_items')
          .select('*')
          .eq('id', itemId)
          .single();

        if (fetchError || !updatedItem) {
          console.error('Error fetching updated item:', fetchError);
          return;
        }

        // Broadcast UPDATE_BID to all connected clients
        io.emit('UPDATE_BID', {
          item: updatedItem,
          timestamp: new Date().toISOString()
        });

        // Send success confirmation to the bidder
        socket.emit('BID_SUCCESS', {
          itemId,
          newBid: amount,
          newVersion: bidResult.new_version
        });

      } catch (error) {
        console.error('Error processing bid:', error);
        socket.emit('BID_ERROR', {
          error: error.message || 'Failed to process bid',
          itemId
        });
      }
    });

    // Update lock promise for next bid
    bidLocks.set(itemId, lockPromise);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    // Clean up Supabase channel
    supabase.removeChannel(channel);
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io server ready`);
  console.log(`🔗 REST API: http://localhost:${PORT}/items`);
});
