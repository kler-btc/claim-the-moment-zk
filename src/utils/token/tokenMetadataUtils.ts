
import { PublicKey } from '@solana/web3.js';
import { TokenMetadata } from './types';

/**
 * Calculates the required size for token metadata
 * @param metadata The token metadata
 * @returns The size in bytes required for the metadata
 */
export const calculateMetadataSize = (metadata: TokenMetadata): number => {
  // In Token-2022, the account layout is very specific
  // We need to ensure we have enough space for all extensions
  
  // Base size for a mint account with no extensions
  const BASE_MINT_SIZE = 82;
  
  // Size needed for MetadataPointer extension (type, length, and AuthorityInfo)
  const METADATA_POINTER_SIZE = 1 + 2 + 32 + 1;
  
  // Size for the actual metadata (calculated from fields)
  const nameSize = metadata.name.length;
  const symbolSize = metadata.symbol.length;
  const uriSize = metadata.uri.length;
  
  // Calculate additional metadata size
  let additionalMetadataSize = 0;
  if (metadata.additionalMetadata && metadata.additionalMetadata.length > 0) {
    for (const [key, value] of metadata.additionalMetadata) {
      additionalMetadataSize += key.length + value.length + 8; // 8 bytes for length prefixes
    }
    // Account for the array length field
    additionalMetadataSize += 4;
  }
  
  // The Token Metadata layout has specific size requirements
  // We need to add the size for TlvIndices, type, length fields, etc.
  const METADATA_HEADER_SIZE = 20; // Approximate size for headers
  const metadataContentSize = nameSize + symbolSize + uriSize + additionalMetadataSize;
  
  // Total size with generous padding to ensure we have enough space
  const totalSize = BASE_MINT_SIZE + METADATA_POINTER_SIZE + METADATA_HEADER_SIZE + metadataContentSize + 2048;
  
  console.log(`Calculated mint account size components:
    Base Mint Size: ${BASE_MINT_SIZE}
    MetadataPointer Size: ${METADATA_POINTER_SIZE}
    Metadata Header Size: ${METADATA_HEADER_SIZE}
    Name Size: ${nameSize}
    Symbol Size: ${symbolSize}
    URI Size: ${uriSize}
    Additional Metadata Size: ${additionalMetadataSize}
    Extra Padding: 2048
    Total Size: ${totalSize}
  `);
  
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
