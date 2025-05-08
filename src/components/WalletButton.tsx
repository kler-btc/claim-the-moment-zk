
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const WalletButton = ({ className }: { className?: string }) => {
  const { wallet, connected } = useWallet();

  return (
    <div className={cn('wallet-button', className)}>
      <WalletMultiButton className="wallet-button-inner" />
      <style jsx global>{`
        .wallet-adapter-button {
          background: linear-gradient(45deg, #9945FF 0%, #14F195 100%);
          border-radius: 0.375rem;
          padding: 0.5rem 1rem;
          transition: all 0.2s ease-in-out;
          color: white;
          font-weight: 600;
          height: 40px;
        }
        .wallet-adapter-button:hover {
          opacity: 0.9;
          transform: translateY(-2px);
        }
        .wallet-adapter-dropdown {
          font-family: inherit;
        }
      `}</style>
    </div>
  );
};
