
/**
 * A browser-compatible Buffer polyfill using Uint8Array
 * With improved support for Token-2022 transactions
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
      // Convert string to byte array with encoding handling
      if (encoding === 'hex') {
        // Handle hex encoding specifically
        const bytes = new Uint8Array(Math.floor(data.length / 2));
        for (let i = 0; i < bytes.length; i++) {
          const hexByte = data.substring(i * 2, i * 2 + 2);
          bytes[i] = parseInt(hexByte, 16);
        }
        return new BufferPolyfill(bytes);
      } else if (encoding === 'base64') {
        // Handle base64 encoding if in browser
        try {
          const binary = atob(data);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          return new BufferPolyfill(bytes);
        } catch (e) {
          // Fallback to standard encoding if atob fails
          const encoder = new TextEncoder();
          return new BufferPolyfill(encoder.encode(data));
        }
      } else {
        // Default to UTF-8
        const encoder = new TextEncoder();
        return new BufferPolyfill(encoder.encode(data));
      }
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
    // Handle different encodings
    if (encoding === 'hex') {
      return Array.from(this.data)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } else if (encoding === 'base64') {
      try {
        // Use browser's btoa if available
        let binary = '';
        const bytes = new Uint8Array(this.data);
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
      } catch (e) {
        // Fallback if btoa is not available
        const decoder = new TextDecoder();
        return decoder.decode(this.data);
      }
    } else {
      // Default UTF-8
      const decoder = new TextDecoder();
      return decoder.decode(this.data);
    }
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

  // Add improved Buffer-compatible methods for Token transactions
  slice(start?: number, end?: number): BufferPolyfill {
    const slicedData = this.data.slice(start, end);
    return new BufferPolyfill(slicedData);
  }
  
  readUInt32LE(offset: number): number {
    const view = new DataView(this.data.buffer, this.data.byteOffset, this.data.byteLength);
    return view.getUint32(offset, true);
  }
  
  writeUInt32LE(value: number, offset: number): number {
    const view = new DataView(this.data.buffer, this.data.byteOffset, this.data.byteLength);
    view.setUint32(offset, value, true);
    return offset + 4;
  }
  
  // Array-like indexed access
  [index: number]: number;
  
  // Allow length property
  get length(): number {
    return this.data.length;
  }
}

// This helper function creates a buffer that will be compatible with @solana/web3.js
export function createBuffer(data: number[] | string | Uint8Array | BufferPolyfill): Buffer {
  if (typeof Buffer !== 'undefined') {
    // Node.js environment - use real Buffer
    if (data instanceof BufferPolyfill) {
      return Buffer.from(data.bytes);
    }
    return Buffer.from(data instanceof Uint8Array ? data : 
                       typeof data === 'string' ? new TextEncoder().encode(data) : 
                       data);
  } else {
    // Browser environment - we need to return something that will work with TransactionInstruction
    // Cast to Buffer type since we're in browser without real Buffer
    const bufferData = data instanceof BufferPolyfill ? data.bytes :
                       data instanceof Uint8Array ? data :
                       typeof data === 'string' ? new TextEncoder().encode(data) :
                       new Uint8Array(data);
    
    return bufferData as unknown as Buffer;
  }
}

// Create a more compatible global Buffer polyfill in browser environments
// Use window instead of global for browser environments
if (typeof window !== 'undefined' && typeof (window as any).Buffer === 'undefined') {
  (window as any).Buffer = {
    from: (data: number[] | string | Uint8Array, encoding?: string) => {
      let bytes: Uint8Array;
      
      if (typeof data === 'string') {
        if (encoding === 'hex') {
          bytes = new Uint8Array(Math.floor(data.length / 2));
          for (let i = 0; i < bytes.length; i++) {
            const hexByte = data.substring(i * 2, i * 2 + 2);
            bytes[i] = parseInt(hexByte, 16);
          }
        } else if (encoding === 'base64') {
          try {
            const binary = atob(data);
            bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
          } catch (e) {
            bytes = new TextEncoder().encode(data);
          }
        } else {
          bytes = new TextEncoder().encode(data);
        }
      } else if (data instanceof Uint8Array) {
        bytes = data;
      } else {
        bytes = new Uint8Array(data);
      }
      
      // Add required Buffer-compatible methods to the Uint8Array
      const bufferObj = bytes as any;
      bufferObj.toString = function(encoding: string) {
        if (encoding === 'hex') {
          return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        }
        return new TextDecoder().decode(bytes);
      };
      
      return bufferObj as unknown as Buffer;
    },
    
    alloc: (size: number) => {
      const bytes = new Uint8Array(size);
      // Add Buffer-compatible methods
      const bufferObj = bytes as any;
      bufferObj.toString = function(encoding: string) {
        if (encoding === 'hex') {
          return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        }
        return new TextDecoder().decode(bytes);
      };
      
      return bufferObj as unknown as Buffer;
    },
    
    isBuffer: (obj: any) => {
      return obj instanceof Uint8Array || 
             (obj && typeof obj === 'object' && obj.buffer instanceof ArrayBuffer);
    }
  };
}
