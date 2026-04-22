// import { encode } from '@jsquash/webp';

// export async function compressToWebP(imageUrl, quality = 85) {
//   const res = await fetch(imageUrl);

//   if (!res.ok) {
//     throw new Error("Failed to fetch image");
//   }

//   const arrayBuffer = await res.arrayBuffer();
//   const input = new Uint8Array(arrayBuffer);

//   // ✅ encode to webp
//   const output = await encode(input, { quality });

//   return {
//     inputBuffer: input,
//     compressedBuffer: output,
//   };
// }

// app/utils/compress.server.js

export async function compressToWebP(imageUrl, quality = 85) {
  // 🚀 Shopify CDN already supports transformations
  // format=webp is automatic fallback-safe

  const optimizedUrl = `${imageUrl}${
    imageUrl.includes("?") ? "&" : "?"
  }format=webp&quality=${quality}`;

  return {
    inputBuffer: null,              // no need anymore
    compressedBuffer: null,         // no binary processing
    optimizedUrl,                   // ✅ THIS is what you use
  };
}