
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
  
  // Base size for fixed fields - these are minimums from SPL token spec
  let totalSize = 82; // Standard mint size
  
  // Add size for metadata fields (name, symbol, uri)
  totalSize += nameSize + symbolSize + uriSize;
  
  // Add space for additional metadata if present
  if (metadata.additionalMetadata && metadata.additionalMetadata.length > 0) {
    for (const [key, value] of metadata.additionalMetadata) {
      totalSize += key.length + value.length + 8; // 8 bytes for length prefixes
    }
    // Account for the array length field
    totalSize += 4;
  }
  
  // Add padding for alignment + safety buffer - crucial for proper account sizing
  // This is needed because Token-2022 has specific layout requirements
  const paddingSize = 1024; // Using a generous padding to avoid layout issues
  totalSize += paddingSize;
  
  console.log(`Metadata size calculation: Base: 82, Fields: ${nameSize + symbolSize + uriSize}, Additional: ${totalSize - 82 - (nameSize + symbolSize + uriSize) - paddingSize}, Padding: ${paddingSize}`);
  
  return totalSize;
}

/**
 * Serializes the token metadata for space calculation
 * This is a replacement for the missing 'pack' function
 * @param metadata The token metadata
 * @returns The serialized metadata
 */
export const serializeMetadata = (metadata: TokenMetadata): Uint8Array => {
  // For implementation simplicity, we convert to JSON and use that
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
