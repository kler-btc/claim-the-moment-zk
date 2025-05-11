
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
 * FIXED VERSION: Using reliable fixed sizes and proper initialization order
 */
export const buildTokenCreationInstructions = (
  mint: PublicKey,
  walletPubkey: PublicKey,
  metadata: TokenMetadata,
  decimals: number = 0
) => {
  // Set compute budget for Token-2022 operations
  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: 400000 // Reduced but sufficient
  });
  
  // Set priority fee to improve chances of confirmation
  const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 50000 // Reduced but still effective
  });
  
  // Use fixed reliable size
  const accountSize = 2048; // 2KB allocation
  console.log(`Using fixed account size of ${accountSize} bytes for Token-2022 mint account`);
  
  // Build instructions with precise ordering
  return {
    computeBudgetIx,
    priorityFeeIx,
    createAccountIx: SystemProgram.createAccount({
      fromPubkey: walletPubkey,
      newAccountPubkey: mint,
      space: accountSize,
      lamports: 0, // Will be updated with actual rent exemption
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
    // This will be used in a separate transaction
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
