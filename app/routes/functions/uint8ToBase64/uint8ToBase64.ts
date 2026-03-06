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
    const binary = atob(base64); // decode base64 to binary string
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