
import { PublicKey } from '@solana/web3.js';
import { TokenMetadata } from './types';

/**
 * Calculates the required size for token metadata
 * @param metadata The token metadata
 * @returns The size in bytes required for the metadata
 */
export const calculateMetadataSize = (metadata: TokenMetadata): number => {
  // For SPL Token-2022 with metadata extension, we need precise size allocation
  
  // BASE_MINT_SIZE for Token-2022 standard mint
  const BASE_MINT_SIZE = 82;
  
  // Metadata pointer extension size
  const METADATA_POINTER_SIZE = 33; // 1 (type) + 32 (authority)
  
  // Size for metadata - Token-2022 uses specific TLV format
  // Each string field requires 4 bytes for length + actual string bytes
  const nameSize = 4 + Buffer.from(metadata.name || "").length;
  const symbolSize = 4 + Buffer.from(metadata.symbol || "").length;
  const uriSize = 4 + Buffer.from(metadata.uri || "").length;
  
  // Additional metadata fields size calculation
  let additionalMetadataSize = 4; // Size for number of additional fields
  if (metadata.additionalMetadata && metadata.additionalMetadata.length > 0) {
    for (const [key, value] of metadata.additionalMetadata) {
      // Each key-value pair requires size for both strings
      additionalMetadataSize += 4 + Buffer.from(key).length;
      additionalMetadataSize += 4 + Buffer.from(value).length;
    }
  }
  
  // Add header size for metadata TLV format
  const METADATA_HEADER_SIZE = 2 + 32; // type + length + mint pubkey
  
  // Calculate total size with proper alignment and padding
  // Token-2022 metadata needs to be properly sized
  const totalMetadataSize = METADATA_HEADER_SIZE + nameSize + symbolSize + uriSize + additionalMetadataSize;
  
  // Add padding to ensure account has sufficient space (critical for Token-2022)
  // Exact sizing is important to avoid InvalidAccountData errors
  return BASE_MINT_SIZE + METADATA_POINTER_SIZE + totalMetadataSize + 128; // Add some extra padding for safety
};

/**
 * Serializes the token metadata for space calculation
 * @param metadata The token metadata
 * @returns The serialized metadata
 */
export const serializeMetadata = (metadata: TokenMetadata): Uint8Array => {
  // For implementation simplicity, we convert to JSON
  const jsonString = JSON.stringify({
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
    additionalMetadata: metadata.additionalMetadata || []
  });
  
  // Convert to UTF-8 bytes
  return new TextEncoder().encode(jsonString);
};

// Constants for metadata layout
export const METADATA_TYPE_SIZE = 1;
export const METADATA_LENGTH_SIZE = 4;
