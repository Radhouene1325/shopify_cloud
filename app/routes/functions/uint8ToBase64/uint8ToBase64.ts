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

  export function decompressPayload(payload: string | Uint8Array | Buffer) {
    let compressedBytes: Uint8Array;
  
    if (typeof payload === "string") {
      // Convert URL-safe base64 to standard base64
      const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const pad = b64.length % 4;
      const padded = pad ? b64 + "=".repeat(4 - pad) : b64;
  
      // Node.js or browser compatible
      if (typeof Buffer !== "undefined") {
        // Node.js
        compressedBytes = Uint8Array.from(Buffer.from(padded, "base64"));
      } else {
        // Browser
        const binary = atob(padded);
        compressedBytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          compressedBytes[i] = binary.charCodeAt(i);
        }
      }
    } else if (payload instanceof Uint8Array || Buffer.isBuffer(payload)) {
      compressedBytes = new Uint8Array(payload);
    } else {
      throw new Error("Invalid payload type for decompression");
    }
  
    const jsonStr = Pako.ungzip(compressedBytes, { to: "string" });
    return JSON.parse(jsonStr);
  }