
import { 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  ComputeBudgetProgram 
} from '@solana/web3.js';
import { 
  createInitializeMintInstruction, 
  ExtensionType, 
  getMintLen, 
  createInitializeMetadataPointerInstruction, 
  TOKEN_2022_PROGRAM_ID 
} from '@solana/spl-token';
import { createInitializeInstruction } from '@solana/spl-token';
import { TokenMetadata } from '../types';
import { calculateMetadataSize } from '../tokenMetadataUtils';

/**
 * Builds the transaction instructions for token creation
 * FIXED VERSION: Uses much higher fixed size and compute budget
 */
export const buildTokenCreationInstructions = (
  mint: PublicKey,
  walletPubkey: PublicKey,
  metadata: TokenMetadata,
  decimals: number = 0
) => {
  // CRITICAL: Set higher compute budget for Token-2022 operations
  // 1.4M units is the maximum allowed compute limit
  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: 1400000
  });
  
  // Set higher priority fee to improve chances of confirmation
  const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 250000 // Increased to ensure priority processing
  });
  
  // Use our fixed large size to avoid InvalidAccountData errors
  const totalSize = 120000; // Using consistent 120 KB allocation
  console.log(`Using fixed account size of ${totalSize} bytes for Token-2022 mint+metadata`);
  
  // Build instructions with precise instruction ordering
  return {
    computeBudgetIx,
    priorityFeeIx,
    createAccountIx: SystemProgram.createAccount({
      fromPubkey: walletPubkey,
      newAccountPubkey: mint,
      space: totalSize, // Using fixed large size
      lamports: 0, // This will be updated with the actual rent exemption
      programId: TOKEN_2022_PROGRAM_ID
    }),
    initMetadataPointerIx: createInitializeMetadataPointerInstruction(
      mint,
      walletPubkey,
      mint, // Metadata pointer to self
      TOKEN_2022_PROGRAM_ID
    ),
    initMintIx: createInitializeMintInstruction(
      mint,
      decimals, // For event tokens, usually 0 decimals
      walletPubkey,
      null, // No freeze authority
      TOKEN_2022_PROGRAM_ID
    ),
    initMetadataIx: createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mint,
      metadata: mint,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      mintAuthority: walletPubkey,
      updateAuthority: walletPubkey
    })
  };
};
