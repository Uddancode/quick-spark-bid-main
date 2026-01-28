import { Trophy, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BidStatus } from '@/types/auction';

interface BidBadgeProps {
  status: BidStatus;
}

export function BidBadge({ status }: BidBadgeProps) {
  if (status === 'none') return null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide',
        status === 'winning' && 'badge-winning',
        status === 'outbid' && 'badge-outbid'
      )}
    >
      {status === 'winning' ? (
        <>
          <Trophy className="w-3 h-3" />
          Winning
        </>
      ) : (
        <>
          <AlertTriangle className="w-3 h-3" />
          Outbid
        </>
      )}
    </div>
  );
}
