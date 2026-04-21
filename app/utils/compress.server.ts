// app/utils/compress.server.js
import { ImagePool } from "@squoosh/lib";

export async function compressToWeb(imageUrl) {
  const res = await fetch(imageUrl);
  const arrayBuffer = await res.arrayBuffer();

  const imagePool = new ImagePool(1);
  const image = imagePool.ingestImage(arrayBuffer);

  await image.decoded; // Wait for decode

  await image.encode({
    webp: {
      quality: 90,
      lossless: 0,
      method: 4,
    },
  });

  const { binary } = await image.encodedWith.webp;
  await imagePool.close();

  return {
    inputBuffer: Buffer.from(arrayBuffer),
    compressedBuffer: Buffer.from(binary),
  };
}
