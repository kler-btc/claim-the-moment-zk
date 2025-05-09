
/**
 * A browser-compatible Buffer polyfill using Uint8Array
 */

export class BufferPolyfill {
  private data: Uint8Array;

  constructor(input?: number | number[] | Uint8Array) {
    if (typeof input === 'number') {
      // Create buffer with length
      this.data = new Uint8Array(input);
    } else if (Array.isArray(input)) {
      // Create from array of numbers
      this.data = new Uint8Array(input);
    } else if (input instanceof Uint8Array) {
      // Create from existing Uint8Array
      this.data = input;
    } else {
      // Default to empty buffer
      this.data = new Uint8Array(0);
    }
  }

  static from(data: number[] | string, encoding?: string): BufferPolyfill {
    if (Array.isArray(data)) {
      return new BufferPolyfill(data);
    } else if (typeof data === 'string') {
      // Convert string to byte array
      const encoder = new TextEncoder();
      return new BufferPolyfill(encoder.encode(data));
    }
    return new BufferPolyfill();
  }

  // Get underlying Uint8Array
  get bytes(): Uint8Array {
    return this.data;
  }

  // Convert to Buffer for Solana compatibility
  toBuffer(): Buffer {
    return Buffer.from(this.data);
  }

  // Make it array-like
  [index: number]: number;

  // Allow length property
  get length(): number {
    return this.data.length;
  }
}

// Create a helper function to convert BufferPolyfill or Uint8Array to Buffer
export function toBuffer(data: BufferPolyfill | Uint8Array | number[]): Buffer {
  if (data instanceof BufferPolyfill) {
    return Buffer.from(data.bytes);
  } else if (data instanceof Uint8Array) {
    return Buffer.from(data);
  } else if (Array.isArray(data)) {
    return Buffer.from(data);
  }
  return Buffer.from([]);
}

// Create a factory function to mimic Node's Buffer.from()
export function createBuffer(data: number[] | string | Uint8Array, encoding?: string): Uint8Array {
  if (typeof data === 'string') {
    const encoder = new TextEncoder();
    return encoder.encode(data);
  } else if (Array.isArray(data)) {
    return new Uint8Array(data);
  } else {
    return data;
  }
}
