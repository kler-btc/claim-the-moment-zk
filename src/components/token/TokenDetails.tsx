
import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type TokenDetailsBaseProps = {
  title: string;
  symbol?: string;
  mintAddress?: string | null;
  transactionId?: string | null;
  poolTransactionId?: string | null;
  variant: 'compact' | 'full';
};

type FullVariantProps = TokenDetailsBaseProps & {
  variant: 'full';
  date?: string;
  time?: string;
  location?: string;
  attendeeCount?: number;
  description?: string;
};

type CompactVariantProps = TokenDetailsBaseProps & {
  variant: 'compact';
};

type TokenDetailsProps = FullVariantProps | CompactVariantProps;

const TokenDetails = (props: TokenDetailsProps) => {
  const { title, symbol, mintAddress, transactionId, poolTransactionId, variant } = props;

  const copyToClipboard = (text: string | undefined | null, label: string) => {
    if (!text) return;
    
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard!`);
    });
  };

  const getExplorerUrl = (address: string, type: 'tx' | 'address') => {
    return `https://explorer.solana.com/${type}/${address}?cluster=devnet`;
  };

  return (
    <div className="space-y-3">
      <div className={`p-4 bg-muted rounded-md ${variant === 'full' ? 'space-y-3' : ''}`}>
        {/* Title and Symbol */}
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">{title}</h4>
          {symbol && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{symbol}</span>}
        </div>
        
        {/* Mint Address */}
        {mintAddress && (
          <div className="grid grid-cols-[1fr,auto] gap-2 items-center">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Mint Address</p>
              <p className="text-xs font-mono truncate">{mintAddress}</p>
            </div>
            <div className="flex gap-1">
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7"
                onClick={() => copyToClipboard(mintAddress, 'Mint address')}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                asChild
              >
                <a 
                  href={getExplorerUrl(mintAddress, 'address')}
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>
        )}
        
        {/* Transaction ID */}
        {transactionId && (
          <div className="grid grid-cols-[1fr,auto] gap-2 items-center">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Transaction</p>
              <p className="text-xs font-mono truncate">{transactionId}</p>
            </div>
            <div className="flex gap-1">
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7"
                onClick={() => copyToClipboard(transactionId, 'Transaction ID')}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                asChild
              >
                <a 
                  href={getExplorerUrl(transactionId, 'tx')}
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>
        )}
        
        {/* Pool Transaction ID */}
        {poolTransactionId && (
          <div className="grid grid-cols-[1fr,auto] gap-2 items-center">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Pool Transaction</p>
              <p className="text-xs font-mono truncate">{poolTransactionId}</p>
            </div>
            <div className="flex gap-1">
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7"
                onClick={() => copyToClipboard(poolTransactionId, 'Pool Transaction ID')}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                asChild
              >
                <a 
                  href={getExplorerUrl(poolTransactionId, 'tx')}
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>
        )}
        
        {/* Full variant additional details */}
        {variant === 'full' && (
          <>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {props.date && (
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm">{props.date}</p>
                </div>
              )}
              
              {props.time && (
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="text-sm">{props.time}</p>
                </div>
              )}
            </div>
            
            {props.location && (
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm">{props.location}</p>
              </div>
            )}
            
            {props.attendeeCount && (
              <div>
                <p className="text-xs text-muted-foreground">Token Supply</p>
                <p className="text-sm">{props.attendeeCount}</p>
              </div>
            )}
            
            {props.description && (
              <div>
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-sm">{props.description}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TokenDetails;
