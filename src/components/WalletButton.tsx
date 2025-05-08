
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { cn } from '@/lib/utils';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';
import '../styles/wallet-button.css';

export const WalletButton = ({ className }: { className?: string }) => {
  const { wallet, connected } = useWallet();

  return (
    <div className={cn('wallet-button', className)}>
      <WalletMultiButton className="wallet-button-inner" />
    </div>
  );
};
