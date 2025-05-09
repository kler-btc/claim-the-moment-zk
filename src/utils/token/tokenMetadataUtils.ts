
import { PublicKey } from '@solana/web3.js';
import { TokenMetadata } from './types';

/**
 * Calculates the required size for token metadata
 * @param metadata The token metadata
 * @returns The size in bytes required for the metadata
 */
export const calculateMetadataSize = (metadata: TokenMetadata): number => {
  // Calculate the size based on the metadata fields
  const nameSize = metadata.name.length;
  const symbolSize = metadata.symbol.length;
  const uriSize = metadata.uri.length;
  
  // Base size for fixed fields
  let totalSize = 32 + // mint pubkey
                 4 + nameSize + // name (string length + chars)
                 4 + symbolSize + // symbol (string length + chars)
                 4 + uriSize; // uri (string length + chars)
  
  // Add space for additional metadata if present
  if (metadata.additionalMetadata && metadata.additionalMetadata.length > 0) {
    for (const [key, value] of metadata.additionalMetadata) {
      totalSize += 4 + key.length + 4 + value.length; // Each entry has 2 strings
    }
    // Account for the array length field
    totalSize += 4;
  }
  
  // Add some buffer to ensure we have enough space
  totalSize += 100;
  
  return totalSize;
}

/**
 * Serializes the token metadata for space calculation
 * This is a replacement for the missing 'pack' function
 * @param metadata The token metadata
 * @returns The serialized metadata
 */
export const serializeMetadata = (metadata: TokenMetadata): Uint8Array => {
  // For implementation simplicity, we just convert to JSON and use that
  // This isn't the actual binary format used by Token-2022, but works for size estimation
  const jsonString = JSON.stringify({
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
    additionalMetadata: metadata.additionalMetadata || []
  });
  
  // Convert to UTF-8 bytes
  return new TextEncoder().encode(jsonString);
}

// Constants for metadata layout (estimated values)
export const METADATA_TYPE_SIZE = 1;
export const METADATA_LENGTH_SIZE = 4;
