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

// export async function compressToWebP(imageUrl, quality = 85) {
//   // 🚀 Shopify CDN already supports transformations
//   // format=webp is automatic fallback-safe

//   const optimizedUrl = `${imageUrl}${
//     imageUrl.includes("?") ? "&" : "?"
//   }format=webp&quality=${quality}`;

//   return {
//     inputBuffer: null,              // no need anymore
//     compressedBuffer: null,         // no binary processing
//     optimizedUrl,                   // ✅ THIS is what you use
//   };
// }


// export async function compressToWebP(imageUrl: string, quality = 85) {
//   // Fetch compressed binary from Cloudflare CDN
//   const res = await fetch(imageUrl, {
//     cf: {
//        image: {
//         format: "webp",
//         quality,
//         width: 800, // ✅ critical for real optimization
//         fit: "scale-down",
//       },
//     },
//   } as any);
//  console.log("status:", res.status);
//   console.log("content-type:", res.headers.get("content-type"));
//   console.log("tested",res.ok)

//   if (!res.ok) {
//     // Fallback: return original
//     const fallback = await fetch(imageUrl);
//     const buffer = Buffer.from(await fallback.arrayBuffer());
//     console.log("buffer is here ",buffer)
//     console.log("fallback",fallback)
//     return {
//       compressedBuffer: buffer,
//       inputBuffer: buffer,
//       optimizedUrl: imageUrl,
//     };
//   }

//   const compressedBuffer = Buffer.from(await res.arrayBuffer());

//   // Also get original size for comparison
//   const originalRes    = await fetch(imageUrl);
//   const inputBuffer    = Buffer.from(await originalRes.arrayBuffer());
// console.log("compressedBuffer",compressedBuffer)
// console.log("inputBuffer",inputBuffer)
//   return {
//     compressedBuffer,   // ✅ real compressed binary
//     inputBuffer,        // original for size comparison
//     optimizedUrl: null, // not needed — we upload the buffer
//   };
// }


export async function compressToWebP(imageUrl, quality = 85) {
  const res = await fetch(imageUrl, {
    cf: {
      image: {
        format: "webp",
        quality,
        width: 2000, // 🔥 HD (not 4K but high quality)
        fit: "scale-down",
      },
    },
  });

  if (!res.ok) {
    throw new Error("Cloudflare optimization failed");
  }

  const buffer = new Uint8Array(await res.arrayBuffer());

  return buffer;
}