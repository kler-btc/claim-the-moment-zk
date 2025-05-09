
import { PublicKey } from '@solana/web3.js';
import { TokenMetadata } from './types';

/**
 * Calculates the required size for token metadata
 * @param metadata The token metadata
 * @returns The size in bytes required for the metadata
 */
export const calculateMetadataSize = (metadata: TokenMetadata): number => {
  // For SPL Token-2022 with metadata extension, we need precise size allocation
  
  // 1. Base mint account size with no extensions
  const BASE_MINT_SIZE = 82;
  
  // 2. MetadataPointer extension overhead
  // TLV header (type, length) + authority + padding
  const METADATA_POINTER_EXTENSION_SIZE = 1 + 2 + 33;
  
  // 3. Metadata fields size
  // Using maximum sizes to ensure enough space
  const MAX_NAME_LENGTH = 32;
  const MAX_SYMBOL_LENGTH = 10;
  const MAX_URI_LENGTH = 200;
  
  // 4. Total metadata size with padding for TLV headers and extra fields
  const METADATA_SIZE = 8 + MAX_NAME_LENGTH + 4 + MAX_SYMBOL_LENGTH + 4 + MAX_URI_LENGTH + 100;
  
  // For additional metadata fields, add extra space
  let ADDITIONAL_METADATA_SIZE = 0;
  if (metadata.additionalMetadata && metadata.additionalMetadata.length > 0) {
    ADDITIONAL_METADATA_SIZE = 200; // Conservative allocation
  }
  
  // Calculate total size with generous padding
  const totalSize = BASE_MINT_SIZE + METADATA_POINTER_EXTENSION_SIZE + METADATA_SIZE + ADDITIONAL_METADATA_SIZE + 1000;
  
  console.log(`Calculated mint account size: ${totalSize} bytes`);
  
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
