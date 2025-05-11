
import { TokenMetadata } from './types';

/**
 * Calculate the size needed for token metadata plus mint account
 * 
 * Updated to be much more generous with space to avoid InvalidAccountData errors
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
  // Token-2022 needs significantly more space than typical SPL tokens
  const calculatedSize = BASE_MINT_SIZE + nameSize + symbolSize + uriSize + additionalSize;
  
  // Add enormous padding to ensure we never run into space issues
  // This is safe because rent is returned on account close
  const generousPadding = 84000; // Allocate a full 82 KB which should be plenty for any metadata
  
  console.log(`Base mint size: ${BASE_MINT_SIZE}, metadata fields: ${nameSize + symbolSize + uriSize}, additional: ${additionalSize}`);
  console.log(`Total calculated size with padding: ${calculatedSize + generousPadding}`);
  
  return calculatedSize + generousPadding;
};
