
import { Connection } from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';
import { TokenCreationResult, EventDetails } from './types';
import { createTokenWithMetadata } from './factory/tokenFactory';

/**
 * Creates a token with metadata using Token-2022 program
 */
export const createToken = async (
  eventDetails: EventDetails,
  walletAddress: string,
  connection: Connection,
  signTransaction: SignerWalletAdapter['signTransaction']
): Promise<TokenCreationResult> => {
  console.log('Creating token with metadata for event:', eventDetails.title);
  console.log('Using wallet:', walletAddress);

  return await createTokenWithMetadata(
    eventDetails,
    walletAddress,
    connection,
    signTransaction
  );
};
