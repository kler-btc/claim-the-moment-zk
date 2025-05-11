
import React, { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { UnsafeBurnerWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

// Only import the wallets you need to avoid conflicts
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';

// Import styles
import '@solana/wallet-adapter-react-ui/styles.css';

// Define config types
interface WalletContextProviderProps {
  children: ReactNode;
  network?: WalletAdapterNetwork;
  endpoint?: string;
}

export const WalletContextProvider: FC<WalletContextProviderProps> = ({ 
  children,
  network = WalletAdapterNetwork.Devnet,
  endpoint = 'https://devnet.helius-rpc.com/?api-key=4c484c87-40c1-4b40-9b2c-1e7f8b1f8b1f'
}) => {
  // Use memo to prevent unnecessary re-renders
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new UnsafeBurnerWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default WalletContextProvider;
