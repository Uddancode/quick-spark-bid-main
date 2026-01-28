import { useState } from 'react';
import { Gavel, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CountdownTimer } from '@/components/CountdownTimer';
import { BidBadge } from '@/components/BidBadge';
import { AuctionItem, BidStatus } from '@/types/auction';
import { cn } from '@/lib/utils';

interface AuctionCardProps {
  item: AuctionItem;
  userId: string | null;
  getServerTime: () => Date;
  onPlaceBid: (itemId: string, amount: number, version: number) => Promise<void>;
  isFlashing: boolean;
}

export function AuctionCard({
  item,
  userId,
  getServerTime,
  onPlaceBid,
  isFlashing,
}: AuctionCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [animatePrice, setAnimatePrice] = useState(false);

  const isEnded = new Date(item.auction_end_time).getTime() < getServerTime().getTime();
  
  const bidStatus: BidStatus = !userId
    ? 'none'
    : item.current_bidder_id === userId
    ? 'winning'
    : item.current_bid > item.starting_price
    ? 'outbid'
    : 'none';

  const handleBid = async () => {
    if (!userId || isEnded) return;
    setIsSubmitting(true);
    const newAmount = item.current_bid + 10;
    await onPlaceBid(item.id, newAmount, item.bid_version);
    setIsSubmitting(false);
  };

  // Animate price when bid changes
  if (isFlashing && !animatePrice) {
    setAnimatePrice(true);
    setTimeout(() => setAnimatePrice(false), 300);
  }

  return (
    <div
      className={cn(
        'auction-card group',
        isFlashing && 'animate-bid-flash',
        bidStatus === 'winning' && 'winning',
        bidStatus === 'outbid' && 'outbid'
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={item.image_url || '/placeholder.svg'}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 right-3">
          <BidBadge status={bidStatus} />
        </div>
        {isEnded && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <span className="text-lg font-semibold text-muted-foreground">
              Auction Ended
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground truncate">
            {item.title}
          </h3>
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {item.description}
            </p>
          )}
        </div>

        {/* Price and Timer */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Current Bid
            </p>
            <p
              className={cn(
                'price-display transition-all',
                animatePrice && 'animate-price-pulse',
                bidStatus === 'winning' && 'price-winning',
                bidStatus === 'outbid' && 'price-outbid'
              )}
            >
              ${item.current_bid.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Time Left
            </p>
            <CountdownTimer endTime={item.auction_end_time} getServerTime={getServerTime} />
          </div>
        </div>

        {/* Bid Button */}
        <Button
          onClick={handleBid}
          disabled={!userId || isEnded || isSubmitting}
          className={cn(
            'w-full gap-2 font-semibold transition-all',
            bidStatus === 'winning'
              ? 'bg-winning hover:bg-winning/90'
              : bidStatus === 'outbid'
              ? 'bg-outbid hover:bg-outbid/90'
              : 'bg-primary hover:bg-primary/90'
          )}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Placing Bid...
            </>
          ) : isEnded ? (
            'Auction Ended'
          ) : (
            <>
              <Gavel className="w-4 h-4" />
              Bid +$10
              <TrendingUp className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>

        {/* Starting price reference */}
        <p className="text-xs text-muted-foreground text-center">
          Started at ${item.starting_price.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
