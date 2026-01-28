-- Create auction_items table
CREATE TABLE public.auction_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  starting_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  current_bid DECIMAL(10,2) NOT NULL DEFAULT 0,
  current_bidder_id UUID REFERENCES auth.users(id),
  auction_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  bid_version INTEGER NOT NULL DEFAULT 0
);

-- Create bids table for history
CREATE TABLE public.bids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES public.auction_items(id) ON DELETE CASCADE NOT NULL,
  bidder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- Public read access for auction items
CREATE POLICY "Anyone can view auction items"
ON public.auction_items FOR SELECT
USING (true);

-- Public read access for bids
CREATE POLICY "Anyone can view bids"
ON public.bids FOR SELECT
USING (true);

-- Authenticated users can insert bids
CREATE POLICY "Authenticated users can insert bids"
ON public.bids FOR INSERT
WITH CHECK (auth.uid() = bidder_id);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;

-- Create function to handle atomic bid placement with race condition prevention
CREATE OR REPLACE FUNCTION public.place_bid(
  p_item_id UUID,
  p_bidder_id UUID,
  p_amount DECIMAL,
  p_expected_version INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_bid DECIMAL;
  v_auction_end TIMESTAMP WITH TIME ZONE;
  v_current_version INTEGER;
  v_result JSONB;
BEGIN
  -- Lock the row to prevent concurrent modifications
  SELECT current_bid, auction_end_time, bid_version
  INTO v_current_bid, v_auction_end, v_current_version
  FROM public.auction_items
  WHERE id = p_item_id
  FOR UPDATE;
  
  -- Check if item exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;
  
  -- Check if auction has ended
  IF v_auction_end < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction has ended');
  END IF;
  
  -- Check version for optimistic locking (race condition prevention)
  IF v_current_version != p_expected_version THEN
    RETURN jsonb_build_object('success', false, 'error', 'Outbid! Someone placed a bid before you.');
  END IF;
  
  -- Check if bid is higher than current bid
  IF p_amount <= v_current_bid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bid must be higher than current bid');
  END IF;
  
  -- Update the item with new bid and increment version
  UPDATE public.auction_items
  SET current_bid = p_amount,
      current_bidder_id = p_bidder_id,
      bid_version = bid_version + 1,
      updated_at = NOW()
  WHERE id = p_item_id;
  
  -- Insert bid record
  INSERT INTO public.bids (item_id, bidder_id, amount)
  VALUES (p_item_id, p_bidder_id, p_amount);
  
  RETURN jsonb_build_object('success', true, 'new_bid', p_amount, 'new_version', v_current_version + 1);
END;
$$;

-- Create function to get server time for synced countdowns
CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE sql
STABLE
AS $$
  SELECT NOW();
$$;

-- Insert sample auction items
INSERT INTO public.auction_items (title, description, image_url, starting_price, current_bid, auction_end_time) VALUES
('Vintage Watch', 'A beautiful vintage timepiece from the 1960s', 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=400', 100.00, 100.00, NOW() + INTERVAL '2 hours'),
('Gaming Console', 'Latest generation gaming console, brand new', 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400', 300.00, 300.00, NOW() + INTERVAL '1 hour 30 minutes'),
('Art Painting', 'Original abstract oil painting on canvas', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400', 500.00, 500.00, NOW() + INTERVAL '45 minutes'),
('Rare Sneakers', 'Limited edition collector sneakers, size 10', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', 200.00, 200.00, NOW() + INTERVAL '3 hours'),
('Diamond Ring', '1 carat diamond engagement ring', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400', 2000.00, 2000.00, NOW() + INTERVAL '5 hours'),
('Antique Camera', 'Leica film camera from 1975', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400', 800.00, 800.00, NOW() + INTERVAL '30 minutes');