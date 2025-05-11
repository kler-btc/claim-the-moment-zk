
import { TokenMetadata } from './types';

/**
 * Calculate the size needed for token metadata plus mint account
 * 
 * FIXED VERSION: Uses a more conservative approach to avoid InvalidAccountData errors
 */
export const calculateMetadataSize = (metadata: TokenMetadata): number => {
  // Base mint size with the MetadataPointer extension
  const BASE_MINT_SIZE = 82; // Token-2022 mint with metadata pointer extension
  
  // Calculate the size for each metadata field
  const nameSize = metadata.name.length;
  const symbolSize = metadata.symbol.length;
  const uriSize = metadata.uri.length;
  
  // Calculate additional metadata size
  let additionalSize = 0;
  if (metadata.additionalMetadata && metadata.additionalMetadata.length > 0) {
    metadata.additionalMetadata.forEach(([key, value]) => {
      additionalSize += key.length + value.length + 8; // Key length + value length + overhead
    });
  }
  
  // Calculate total size with padding
  const calculatedSize = BASE_MINT_SIZE + nameSize + symbolSize + uriSize + additionalSize + 1024; // Add 1KB padding
  
  // Log the detailed breakdown
  console.log(`Base mint size: ${BASE_MINT_SIZE}, metadata fields: ${nameSize + symbolSize + uriSize}, additional: ${additionalSize}`);
  console.log(`Total calculated size: ${calculatedSize}`);
  
  // Return a more conservative size - 10KB should be sufficient for most metadata
  // This is still much smaller than the previous 120KB approach but should work reliably
  const conservativeSize = 10000; // 10 KB allocation
  
  console.log(`Using conservative size of ${conservativeSize} bytes`);
  
  return conservativeSize;
};
