
// Event details interface
export interface EventDetails {
  title: string;
  location: string;
  date: string;
  time: string;
  description: string;
  attendeeCount: number;
}

// Compression result interface
export interface CompressionResult {
  eventId: string;
  claimUrl: string;
  merkleRoot?: string;
  qrCodeData?: string;
  mintAddress?: string;
}
