
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
  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: 1400000 // Maximum allowed compute
  });
  
  // Set higher priority fee to improve chances of confirmation
  const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 50000
  });
  
  // Calculate space correctly for Token-2022 with metadata
  const extensions = [ExtensionType.MetadataPointer];
  const baseMintLen = getMintLen(extensions);
  console.log(`Base mint size with MetadataPointer extension: ${baseMintLen}`);
  
  // Calculate total size needed with padding
  const totalSize = calculateMetadataSize(metadata);
  console.log(`Total calculated size needed for mint+metadata: ${totalSize}`);
  
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
      decimals,
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
