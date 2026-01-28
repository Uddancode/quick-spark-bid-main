export interface AuctionItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  starting_price: number;
  current_bid: number;
  current_bidder_id: string | null;
  auction_end_time: string;
  created_at: string;
  updated_at: string;
  bid_version: number;
}

export interface Bid {
  id: string;
  item_id: string;
  bidder_id: string;
  amount: number;
  created_at: string;
}

export interface PlaceBidResult {
  success: boolean;
  error?: string;
  new_bid?: number;
  new_version?: number;
}

export type BidStatus = 'none' | 'winning' | 'outbid';
