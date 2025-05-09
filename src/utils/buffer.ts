
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

  static from(data: number[] | string | Uint8Array, encoding?: string): BufferPolyfill {
    if (Array.isArray(data)) {
      return new BufferPolyfill(data);
    } else if (typeof data === 'string') {
      // Convert string to byte array
      const encoder = new TextEncoder();
      return new BufferPolyfill(encoder.encode(data));
    } else if (data instanceof Uint8Array) {
      return new BufferPolyfill(data);
    }
    return new BufferPolyfill();
  }

  // Get underlying Uint8Array
  get bytes(): Uint8Array {
    return this.data;
  }

  // For compatibility with Buffer methods
  write(string: string, offset?: number): number {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(string);
    const targetOffset = offset || 0;
    
    // Copy bytes to the buffer at specified offset
    for (let i = 0; i < bytes.length; i++) {
      this.data[targetOffset + i] = bytes[i];
    }
    
    return bytes.length;
  }

  toString(encoding?: string): string {
    const decoder = new TextDecoder();
    return decoder.decode(this.data);
  }

  // Array-like indexed access
  [index: number]: number;
  
  // Allow length property
  get length(): number {
    return this.data.length;
  }
}

// Create a helper function to convert BufferPolyfill or Uint8Array to Buffer-like object
export function toBuffer(data: BufferPolyfill | Uint8Array | number[]): Uint8Array {
  if (data instanceof BufferPolyfill) {
    return data.bytes;
  } else if (data instanceof Uint8Array) {
    return data;
  } else if (Array.isArray(data)) {
    return new Uint8Array(data);
  }
  return new Uint8Array();
}

// Create a global Buffer polyfill in browser environments
if (typeof window !== 'undefined' && typeof (window as any).Buffer === 'undefined') {
  (window as any).Buffer = {
    from: (data: number[] | string | Uint8Array, encoding?: string) => {
      const bufferPoly = BufferPolyfill.from(data, encoding);
      return bufferPoly.bytes;
    }
  };
}

// Helper function to create Buffer-like objects
export function createBuffer(data: number[] | string | Uint8Array, encoding?: string): Uint8Array {
  return toBuffer(BufferPolyfill.from(data, encoding));
}
