
import { MenuConfig } from './types';

/**
 * Encodes a MenuConfig object into a compressed, URL-safe Base64 string.
 * Uses CompressionStream (Gzip) to handle large payloads (like images).
 */
export const encodeMenuConfig = async (config: MenuConfig): Promise<string> => {
  try {
    const jsonString = JSON.stringify(config);
    const blob = new Blob([jsonString]);
    
    // Create a compression stream
    const compressedStream = blob.stream().pipeThrough(new CompressionStream('gzip'));
    const compressedBuffer = await new Response(compressedStream).arrayBuffer();
    
    // Convert Buffer to Base64
    const bytes = new Uint8Array(compressedBuffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    // Make it URL-safe (replace + with -, / with _, and remove padding)
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (error) {
    console.error("Failed to encode menu config:", error);
    throw new Error("Menu configuration is too large to share via link.");
  }
};

/**
 * Decodes a compressed, URL-safe Base64 string back into a MenuConfig object.
 */
export const decodeMenuConfig = async (encoded: string): Promise<MenuConfig | null> => {
  try {
    // Restore standard Base64 characters from URL-safe variants
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    
    // Convert binary string to Uint8Array
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    // Decompress the data
    const stream = new Response(bytes).body?.pipeThrough(new DecompressionStream('gzip'));
    if (!stream) return null;
    
    const jsonString = await new Response(stream).text();
    const config = JSON.parse(jsonString);
    
    // Basic validation
    if (config && typeof config === 'object' && 'items' in config && 'title' in config) {
      return config as MenuConfig;
    }
    return null;
  } catch (error) {
    console.error("Failed to decode shared menu:", error);
    return null;
  }
};

/**
 * Updates the URL hash with the encoded config.
 */
export const updateUrlHash = (encoded: string) => {
  // We use the hash to store the state so it doesn't get sent to the server
  window.location.hash = encoded;
};
