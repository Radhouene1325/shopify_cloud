import Pako from "pako";

 export function uint8ToBase64(u8Arr: Uint8Array) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < u8Arr.length; i += chunkSize) {
      const chunk = u8Arr.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(binary);
  }


export function base64ToUint8Array(base64: string): Uint8Array {
    // Convert URL-safe Base64 to standard Base64
    const b64 = base64.replace(/-/g, '+').replace(/_/g, '/');
    
    // Pad with '=' if needed
    const pad = b64.length % 4;
    const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
  
    const binary = atob(padded);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  export function decompressPayload(base64Payload: string) {
    const compressedBytes = base64ToUint8Array(base64Payload);
    const jsonStr = Pako.ungzip(compressedBytes, { to: "string" });
    return JSON.parse(jsonStr);
  }