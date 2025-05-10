
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
  let additionalMetadataSize = 8; // Size for number of additional fields (increased for safety)
  if (metadata.additionalMetadata && metadata.additionalMetadata.length > 0) {
    for (const [key, value] of metadata.additionalMetadata) {
      // Each key-value pair requires size for both strings with 4-byte length prefixes
      additionalMetadataSize += 8 + Buffer.from(key).length + Buffer.from(value).length;
    }
  }
  
  // Add header size for metadata TLV format - increased for alignment
  const METADATA_HEADER_SIZE = 8 + 32; // type + length + mint pubkey
  
  // Calculate total size with proper alignment (8-byte alignment for safety)
  const totalMetadataSize = METADATA_HEADER_SIZE + nameSize + symbolSize + uriSize + additionalMetadataSize;
  
  // Add padding to ensure account has sufficient space (critical for Token-2022)
  // Increased padding from 128 to 256 for safety
  const SIZE_WITH_PADDING = BASE_MINT_SIZE + METADATA_POINTER_SIZE + totalMetadataSize + 256; 
  
  // Ensure alignment to 8 bytes (Solana requirement)
  return Math.ceil(SIZE_WITH_PADDING / 8) * 8;
};

/**
 * Serializes the token metadata for space calculation and usage
 * @param metadata The token metadata
 * @returns The serialized metadata as Uint8Array
 */
export const serializeMetadata = (metadata: TokenMetadata): Uint8Array => {
  // Create a properly structured metadata object
  const metadataObj = {
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
    additionalMetadata: metadata.additionalMetadata || []
  };
  
  // Calculate total size needed
  const nameBytes = new TextEncoder().encode(metadataObj.name);
  const symbolBytes = new TextEncoder().encode(metadataObj.symbol);
  const uriBytes = new TextEncoder().encode(metadataObj.uri);
  
  let additionalSize = 0;
  if (metadataObj.additionalMetadata.length > 0) {
    for (const [key, value] of metadataObj.additionalMetadata) {
      additionalSize += new TextEncoder().encode(key).length;
      additionalSize += new TextEncoder().encode(value).length;
      additionalSize += 8; // Length fields
    }
  }
  
  // Total size with header
  const totalSize = 8 + nameBytes.length + 8 + symbolBytes.length + 8 + uriBytes.length + 8 + additionalSize;
  
  // Create buffer with proper size
  const buffer = new Uint8Array(totalSize);
  let offset = 0;
  
  // Helper function to write length-prefixed string
  const writeString = (str: string) => {
    const bytes = new TextEncoder().encode(str);
    // Write length (4 bytes, little endian)
    const view = new DataView(buffer.buffer);
    view.setUint32(offset, bytes.length, true);
    offset += 4;
    
    // Write string bytes
    buffer.set(bytes, offset);
    offset += bytes.length;
    
    // Padding to 4 bytes
    const padding = (4 - (bytes.length % 4)) % 4;
    offset += padding;
  };
  
  // Write name, symbol, uri
  writeString(metadataObj.name);
  writeString(metadataObj.symbol);
  writeString(metadataObj.uri);
  
  // Write additional metadata count
  const view = new DataView(buffer.buffer);
  view.setUint32(offset, metadataObj.additionalMetadata.length, true);
  offset += 4;
  
  // Write additional metadata pairs
  for (const [key, value] of metadataObj.additionalMetadata) {
    writeString(key);
    writeString(value);
  }
  
  return buffer;
};

// Constants for metadata layout
export const METADATA_TYPE_SIZE = 1;
export const METADATA_LENGTH_SIZE = 4;
