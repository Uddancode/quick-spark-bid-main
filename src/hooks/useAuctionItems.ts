import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuctionItem, PlaceBidResult } from '@/types/auction';
import { useToast } from '@/hooks/use-toast';
import { getSocket } from '@/lib/socket';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useAuctionItems() {
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [flashingItemId, setFlashingItemId] = useState<string | null>(null);
  const { toast } = useToast();

  // REST API: GET /items
  const fetchItems = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/items`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch items'}`);
      }
      const data = await response.json();
      setItems(data || []);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      const errorMessage = error instanceof Error 
        ? error.message.includes('Failed to fetch') || error.message.includes('NetworkError')
          ? 'Backend server is not running. Please start it with: cd server && npm start'
          : error.message
        : 'Failed to load auction items';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchItems();

    // Socket.io: Listen for UPDATE_BID events
    const socket = getSocket();

    const handleUpdateBid = (data: { item: AuctionItem; timestamp: string }) => {
      const updatedItem = data.item;
      setItems((current) =>
        current.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        )
      );
      // Trigger flash animation
      setFlashingItemId(updatedItem.id);
      setTimeout(() => setFlashingItemId(null), 600);
    };

    socket.on('UPDATE_BID', handleUpdateBid);

    return () => {
      socket.off('UPDATE_BID', handleUpdateBid);
    };
  }, [fetchItems]);

  // Socket.io: BID_PLACED event
  const placeBid = useCallback(
    async (itemId: string, amount: number, expectedVersion: number) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to place a bid',
          variant: 'destructive',
        });
        return { success: false, error: 'Not authenticated' };
      }

      return new Promise<PlaceBidResult>((resolve) => {
        const socket = getSocket();

        // Set up one-time listeners
        const handleSuccess = (data: { itemId: string; newBid: number; newVersion: number }) => {
          if (data.itemId === itemId) {
            socket.off('BID_SUCCESS', handleSuccess);
            socket.off('BID_ERROR', handleError);
            toast({
              title: 'Bid Placed!',
              description: `Your bid of $${amount.toFixed(2)} was accepted`,
            });
            resolve({ success: true, new_bid: data.newBid, new_version: data.newVersion });
          }
        };

        const handleError = (data: { error: string; itemId?: string }) => {
          if (!data.itemId || data.itemId === itemId) {
            socket.off('BID_SUCCESS', handleSuccess);
            socket.off('BID_ERROR', handleError);
            toast({
              title: 'Bid Failed',
              description: data.error || 'Failed to place bid',
              variant: 'destructive',
            });
            resolve({ success: false, error: data.error || 'Failed to place bid' });
          }
        };

        socket.once('BID_SUCCESS', handleSuccess);
        socket.once('BID_ERROR', handleError);

        // Emit BID_PLACED event
        socket.emit('BID_PLACED', {
          itemId,
          bidderId: session.session.user.id,
          amount,
          expectedVersion,
        });
      });
    },
    [toast]
  );

  return { items, isLoading, placeBid, flashingItemId };
}
