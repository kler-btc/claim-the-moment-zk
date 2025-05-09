
import { PublicKey } from '@solana/web3.js';
import { TokenMetadata } from './types';

/**
 * Calculates the required size for token metadata
 * @param metadata The token metadata
 * @returns The size in bytes required for the metadata
 */
export const calculateMetadataSize = (metadata: TokenMetadata): number => {
  // For SPL Token-2022 with metadata extension, we need precise size allocation
  
  // BASE MINT SIZE MUST BE EXACTLY CORRECT
  const BASE_MINT_SIZE = 82;
  
  // METADATA POINTER extension size needs to be precise
  const METADATA_POINTER_EXTENSION_SIZE = 34; // 1 (type) + 1 (length) + 32 (authority)
  
  // Size for metadata fields - known required sizes from SPL-Token-Metadata spec
  const METADATA_HEADER_SIZE = 1 + 32 + 4; // TLV header size + mint pubkey
  
  // String data storage in Token-2022 metadata:
  // Each string has 4 bytes for length prefix + actual UTF-8 bytes
  const nameSize = 4 + Buffer.from(metadata.name || "").length;
  const symbolSize = 4 + Buffer.from(metadata.symbol || "").length;
  const uriSize = 4 + Buffer.from(metadata.uri || "").length;
  
  // Additional metadata fields size
  let additionalSize = 0;
  if (metadata.additionalMetadata && metadata.additionalMetadata.length > 0) {
    // Count 4 bytes for the number of additional fields
    additionalSize = 4;
    
    for (const [key, value] of metadata.additionalMetadata) {
      // Each key and value has 4 bytes for length + actual bytes
      additionalSize += 4 + Buffer.from(key).length;
      additionalSize += 4 + Buffer.from(value).length;
    }
  }
  
  // Calculate total size needed for metadata plus account data
  const totalMetadataSize = METADATA_HEADER_SIZE + nameSize + symbolSize + uriSize + additionalSize;
  
  // Add extra padding - critical for account creation
  // The Solana runtime requires the account to be exactly the right size
  const totalSize = BASE_MINT_SIZE + METADATA_POINTER_EXTENSION_SIZE + totalMetadataSize + 1024; // Added generous padding
  
  console.log(`Mint base size: ${BASE_MINT_SIZE}`);
  console.log(`MetadataPointer extension size: ${METADATA_POINTER_EXTENSION_SIZE}`);
  console.log(`Metadata content size: ${totalMetadataSize}`);
  console.log(`Total calculated mint account size: ${totalSize} bytes`);
  
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
