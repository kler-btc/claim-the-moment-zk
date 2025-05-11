
import { TokenMetadata } from './types';

/**
 * Calculate the size needed for token metadata plus mint account
 * 
 * FIXED VERSION: Uses a much larger fixed size to avoid InvalidAccountData errors
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
  
  // Calculate total size with very generous padding to avoid issues
  const calculatedSize = BASE_MINT_SIZE + nameSize + symbolSize + uriSize + additionalSize;
  
  // Log the detailed breakdown
  console.log(`Base mint size: ${BASE_MINT_SIZE}, metadata fields: ${nameSize + symbolSize + uriSize}, additional: ${additionalSize}`);
  
  // Return a fixed large size instead of calculated
  // This is the key fix for InvalidAccountData errors - this value should be high enough for any metadata
  const fixedLargeSize = 120000; // 120 KB allocation
  
  console.log(`Total calculated size: ${calculatedSize}, but using fixed size: ${fixedLargeSize}`);
  
  return fixedLargeSize;
};
