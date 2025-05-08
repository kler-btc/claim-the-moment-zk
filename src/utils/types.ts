// Event details interface
export interface EventDetails {
  title: string;
  location: string;
  date: string;
  time: string;
  description: string;
  attendeeCount: number;
  symbol: string;
  decimals: number;
  imageUrl: string;
}

// Compression result interface
export interface CompressionResult {
  eventId: string;
  claimUrl: string;
  qrCodeData: string;
  mintAddress: string | null;
  merkleRoot: string | null;
  transactionId: string | null;
}

export enum TokenCreationStep {
  CREATE_TOKEN = 'create_token',
  CREATE_POOL = 'create_pool',
  GENERATE_QR = 'generate_qr',
  COMPLETE = 'complete'
}
