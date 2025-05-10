
/**
 * Format a date string or Date object into a human-readable format
 */
export function formatDate(date: string | Date): string {
  if (!date) return 'Unknown';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(dateObj);
}

/**
 * Format a wallet address to a shortened display format
 */
export function formatWalletAddress(address: string): string {
  if (!address || address.length < 10) return address || 'Unknown';
  
  return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
}

/**
 * Format a transaction ID to a shortened display format
 */
export function formatTransactionId(txId: string): string {
  if (!txId || txId.length < 10) return txId || 'Unknown';
  
  return `${txId.substring(0, 6)}...${txId.substring(txId.length - 4)}`;
}
