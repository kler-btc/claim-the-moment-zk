
import Dexie, { Table } from 'dexie';

// Define interfaces for our database schema
export interface EventRecord {
  id: string;
  title: string;
  symbol: string;
  location: string;
  date: string;
  time: string;
  description: string;
  attendeeCount: number;
  decimals: number;
  imageUrl: string;
  createdAt: string;
  creator: string;
  mintAddress: string;
  transactionId: string;
}

export interface PoolRecord {
  id?: number;
  eventId: string;
  mintAddress: string;
  poolAddress: string;
  merkleRoot: string;
  transactionId: string;
  createdAt: string;
}

export interface ClaimRecord {
  id?: number;
  eventId: string;
  walletAddress: string;
  transactionId?: string;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: string;
  error?: string;
}

// Define the database
class AppDatabase extends Dexie {
  events!: Table<EventRecord>;
  pools!: Table<PoolRecord>;
  claims!: Table<ClaimRecord>;

  constructor() {
    super('cPOPDatabase');
    this.version(1).stores({
      events: 'id, mintAddress, creator, createdAt',
      pools: '++id, eventId, mintAddress, poolAddress, createdAt',
      claims: '++id, eventId, walletAddress, createdAt, status'
    });
  }
}

export const db = new AppDatabase();

// Helper functions for data access
export const eventService = {
  async saveEvent(eventData: EventRecord): Promise<string> {
    await db.events.put(eventData);
    return eventData.id;
  },

  async getEventById(eventId: string): Promise<EventRecord | undefined> {
    return await db.events.get(eventId);
  },

  async getAllEvents(): Promise<EventRecord[]> {
    return await db.events.toArray();
  },

  async getEventsByCreator(creatorAddress: string): Promise<EventRecord[]> {
    return await db.events.where('creator').equals(creatorAddress).toArray();
  }
};

export const poolService = {
  async savePool(poolData: PoolRecord): Promise<number> {
    return await db.pools.add(poolData);
  },

  async getPoolByEventId(eventId: string): Promise<PoolRecord | undefined> {
    return await db.pools.where('eventId').equals(eventId).first();
  },

  async getPoolByMintAddress(mintAddress: string): Promise<PoolRecord | undefined> {
    return await db.pools.where('mintAddress').equals(mintAddress).first();
  }
};

export const claimService = {
  async saveClaim(claimData: ClaimRecord): Promise<number> {
    return await db.claims.add(claimData);
  },

  async getClaimsByEventId(eventId: string): Promise<ClaimRecord[]> {
    return await db.claims.where('eventId').equals(eventId).toArray();
  },

  async getClaimsByWallet(walletAddress: string): Promise<ClaimRecord[]> {
    return await db.claims.where('walletAddress').equals(walletAddress).toArray();
  },

  async hasWalletClaimedEvent(eventId: string, walletAddress: string): Promise<boolean> {
    const count = await db.claims
      .where({eventId, walletAddress})
      .filter(claim => claim.status === 'confirmed')
      .count();
    return count > 0;
  },

  async updateClaimStatus(id: number, status: 'pending' | 'confirmed' | 'failed', transactionId?: string, error?: string): Promise<void> {
    await db.claims.update(id, { 
      status, 
      transactionId,
      error
    });
  }
};
