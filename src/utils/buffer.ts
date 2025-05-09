
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

  // Implement Buffer-compatible methods
  toJSON(): { type: string; data: number[] } {
    return {
      type: 'Buffer',
      data: Array.from(this.data)
    };
  }

  equals(otherBuffer: BufferPolyfill | Uint8Array): boolean {
    const other = otherBuffer instanceof BufferPolyfill ? otherBuffer.bytes : otherBuffer;
    
    if (this.data.length !== other.length) {
      return false;
    }
    
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] !== other[i]) {
        return false;
      }
    }
    
    return true;
  }

  // Add additional Buffer-compatible methods as needed
  
  // Array-like indexed access
  [index: number]: number;
  
  // Allow length property
  get length(): number {
    return this.data.length;
  }
}

// This helper function creates a buffer that will be compatible with @solana/web3.js
export function createBuffer(data: number[] | string | Uint8Array | BufferPolyfill): Buffer | Uint8Array {
  if (typeof Buffer !== 'undefined') {
    // Node.js environment - use real Buffer
    if (data instanceof BufferPolyfill) {
      return Buffer.from(data.bytes);
    }
    return Buffer.from(data instanceof Uint8Array ? data : 
                       typeof data === 'string' ? new TextEncoder().encode(data) : 
                       data);
  } else {
    // Browser environment - create Uint8Array to use instead of Buffer
    const bufferData = data instanceof BufferPolyfill ? data.bytes :
                      data instanceof Uint8Array ? data :
                      typeof data === 'string' ? new TextEncoder().encode(data) :
                      new Uint8Array(data);
    
    return bufferData;
  }
}

// Create a global Buffer polyfill in browser environments
if (typeof window !== 'undefined' && typeof (window as any).Buffer === 'undefined') {
  (window as any).Buffer = {
    from: (data: number[] | string | Uint8Array, encoding?: string) => {
      return createBuffer(data);
    },
    alloc: (size: number) => {
      return new Uint8Array(size);
    },
    isBuffer: (obj: any) => {
      return obj instanceof Uint8Array || 
             (obj && typeof obj === 'object' && obj.buffer instanceof ArrayBuffer);
    }
  };
}
