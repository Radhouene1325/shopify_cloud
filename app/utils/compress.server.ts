import { encode } from '@jsquash/webp';

export async function compressToWebP(imageUrl, quality = 85) {
  const res = await fetch(imageUrl);

  if (!res.ok) {
    throw new Error("Failed to fetch image");
  }

  const arrayBuffer = await res.arrayBuffer();
  const input = new Uint8Array(arrayBuffer);

  // ✅ encode to webp
  const output = await encode(input, { quality });

  return {
    inputBuffer: input,
    compressedBuffer: output,
  };
}