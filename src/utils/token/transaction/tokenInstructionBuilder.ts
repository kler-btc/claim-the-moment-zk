
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
 * FIXED VERSION: Separate instruction building for two-transaction approach
 */
export const buildTokenCreationInstructions = (
  mint: PublicKey,
  walletPubkey: PublicKey,
  metadata: TokenMetadata,
  decimals: number = 0
) => {
  // Set high compute budget for Token-2022 operations
  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: 1400000
  });
  
  // Set higher priority fee to improve chances of confirmation
  const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 250000
  });
  
  // Use more conservative size for account creation
  const accountSize = 10000; // 10 KB allocation
  console.log(`Using account size of ${accountSize} bytes for Token-2022 mint account`);
  
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
