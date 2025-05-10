
import { PublicKey } from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';

// Token-2022 program ID - this is the official program ID
export const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

// Interfaces and types for token operations
export interface TokenMetadata {
  mint: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  additionalMetadata?: [string, string][];
}

export interface TokenCreationResult {
  eventId: string;
  mintAddress: string;
  transactionId: string;
}

export interface TokenPoolResult {
  transactionId: string;
  merkleRoot: string;
  poolAddress: string;
  stateTreeAddress: string;
}

export interface TransactionSigner {
  publicKey: PublicKey;
  signTransaction: SignerWalletAdapter['signTransaction'];
}

// Enhanced compression types
export interface CompressedTokenAccount {
  mint: string;
  owner: string;
  amount: number;
  delegate?: string;
  state?: 'initialized' | 'frozen';
  merkleRoot?: string;
  leafIndex?: number;
  validityProof?: any;
}

export interface CompressionResult {
  eventId: string | null;
  mintAddress: string | null;
  transactionId: string | null;
  merkleRoot: string | null;
  claimUrl?: string;
  qrCodeData?: string;
}

// Re-export EventDetails from utils/types
import { EventDetails } from '@/utils/types';
export type { EventDetails };
