
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
  // 100k microLamports ~= 0.0001 SOL per cu = 0.14 SOL max
  const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 100000
  });
  
  // Use our updated function to calculate adequate space
  const totalSize = calculateMetadataSize(metadata);
  console.log(`Token-2022 mint+metadata size: ${totalSize} bytes`);
  
  // Build instructions with precise instruction ordering
  return {
    computeBudgetIx,
    priorityFeeIx,
    createAccountIx: SystemProgram.createAccount({
      fromPubkey: walletPubkey,
      newAccountPubkey: mint,
      space: totalSize,
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
