import { Loader2, Gavel, Zap, Shield, Clock } from 'lucide-react';
import { Header } from '@/components/Header';
import { AuctionCard } from '@/components/AuctionCard';
import { useAuth } from '@/hooks/useAuth';
import { useAuctionItems } from '@/hooks/useAuctionItems';
import { useServerTime } from '@/hooks/useServerTime';

const Index = () => {
  const { user, isLoading: authLoading, signIn, signUp, signOut } = useAuth();
  const { items, isLoading: itemsLoading, placeBid, flashingItemId } = useAuctionItems();
  const { getServerTime, isLoading: timeLoading } = useServerTime();

  const isLoading = authLoading || itemsLoading || timeLoading;

  const handlePlaceBid = async (itemId: string, amount: number, version: number) => {
    await placeBid(itemId, amount, version);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        user={user}
        isLoading={authLoading}
        onSignIn={signIn}
        onSignUp={signUp}
        onSignOut={signOut}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-slide-up">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
            Live Auctions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Compete in real-time to win exclusive items. Every second counts.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-sm">
              <Zap className="w-4 h-4 text-primary" />
              <span>Real-Time Bidding</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-sm">
              <Shield className="w-4 h-4 text-primary" />
              <span>Race Condition Protected</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-sm">
              <Clock className="w-4 h-4 text-primary" />
              <span>Server-Synced Timers</span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading auctions...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Gavel className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Active Auctions</h3>
            <p className="text-muted-foreground">
              Check back later for new items!
            </p>
          </div>
        ) : (
          /* Auction Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <AuctionCard
                  item={item}
                  userId={user?.id ?? null}
                  getServerTime={getServerTime}
                  onPlaceBid={handlePlaceBid}
                  isFlashing={flashingItemId === item.id}
                />
              </div>
            ))}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-16 text-center text-sm text-muted-foreground">
          <p>
            💡 <strong>Tip:</strong> Sign in to place bids. Race conditions are
            handled server-side with optimistic locking.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
