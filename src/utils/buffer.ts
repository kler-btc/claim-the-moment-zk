
/**
 * Buffer polyfill for browser environments
 */
export class BufferPolyfill {
  static from(data: any, encoding?: string): Uint8Array {
    if (Array.isArray(data)) {
      return new Uint8Array(data);
    }
    
    if (typeof data === 'string') {
      const encoder = new TextEncoder();
      return encoder.encode(data);
    }
    
    return new Uint8Array(data);
  }
}

/**
 * Creates a proper buffer from various input types
 */
export const createBuffer = (data: any): Uint8Array => {
  return BufferPolyfill.from(data);
};

/**
 * Safely converts a Uint8Array to a Buffer if needed
 */
export const ensureBuffer = (data: Uint8Array): Buffer | Uint8Array => {
  // In browser environments, we use Uint8Array
  return data;
};
