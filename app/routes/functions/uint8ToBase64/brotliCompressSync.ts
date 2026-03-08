import { pack,unpack } from "msgpackr";
import { brotliCompressSync, brotliDecompressSync } from "zlib";
import { base64ToUint8Array } from "./uint8ToBase64";


function minimizeProducts(products: any[]) {
    return products.map(p => ({
      i: p.id,
      t: p.title,
      d: p.descreption,
      v: p.vendor,
      h: p.handel,
      im: p.image,
      inv: p.totalInventory,
      tr: p.tracksInventory,
      min: p.min_amount,
      max: p.max_amount,
      c: p.currencyCode,
      tg: p.tags
    }));
  }
export function ultraCompress(payload: any): string {

  const minimized = {
    s: payload.shop,
    sid: payload.sessionId,
    t: payload.accessToken,
    p: minimizeProducts(payload.products)
  };

  // MessagePack serialization
  const packed = pack(minimized);

  // Brotli compression
  const compressed = brotliCompressSync(packed, {
    params: {
      1: 11 // max compression
    }
  });

  return compressed.toString("base64");
}










function restoreProducts(products: any[]) {
  return products.map(p => ({
    id: p.i,
    title: p.t,
    descreption: p.d,
    vendor: p.v,
    handel: p.h,
    image: p.im,
    totalInventory: p.inv,
    tracksInventory: p.tr,
    min_amount: p.min,
    max_amount: p.max,
    currencyCode: p.c,
    tags: p.tg
  }));
}

export function ultraDecompress(base64: string) {

    const buffer = base64ToUint8Array(base64);

    const decompressed = brotliDecompressSync(buffer);

  const unpacked = unpack(decompressed);

  return {
    shop: unpacked.s,
    sessionId: unpacked.sid,
    accessToken: unpacked.t,
    products: restoreProducts(unpacked.p)
  };
}