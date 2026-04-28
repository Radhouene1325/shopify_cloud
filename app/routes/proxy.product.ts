import type { ActionFunctionArgs } from "@remix-run/node";
import { shopify } from "../shopify.server";

const SHOP_DOMAIN = "platinumshop.it";

// ─────────────────────────────
// small utils
// ─────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const retry = async (fn: any, retries = 3) => {
  try {
    return await fn();
  } catch (e) {
    if (retries <= 0) throw e;
    await sleep(500);
    return retry(fn, retries - 1);
  }
};

const asyncPool = async (limit: number, array: any[], iteratorFn: any) => {
  const ret: any[] = [];
  const executing: any[] = [];

  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);

    if (limit <= array.length) {
      const e: any = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }

  return Promise.allSettled(ret);
};

// ─────────────────────────────
// action
// ─────────────────────────────
export const action = async ({ request, context }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { admin } = await shopify(context).authenticate.admin(request);
  const { productId } = await request.json();

  if (!productId) {
    return new Response("Missing productId", { status: 400 });
  }

  const numericId = String(productId).replace(/\D/g, "");
  const gid = `gid://shopify/Product/${numericId}`;

  // ─────────────────────────────
  // 1) fetch product (with metafield for idempotency)
  // ─────────────────────────────
  const query = `
    query getProduct($id: ID!) {
      product(id: $id) {
        id
        title

        metafield(namespace: "custom", key: "avif_done") {
          value
        }

        media(first: 50) {
          edges {
            node {
              ... on MediaImage {
                id
                image { url }
                alt
              }
            }
          }
        }

        variants(first: 100) {
          edges {
            node {
              id
              image { url id }
            }
          }
        }
      }
    }
  `;

  const res = await admin.graphql(query, { variables: { id: gid } });
  const json = await res.json();
  const product = json.data?.product;

  if (!product) {
    return new Response("Product not found", { status: 404 });
  }

  // skip if already processed
  if (product.metafield?.value === "true") {
    return Response.json({ success: true, skipped: true });
  }

  // ─────────────────────────────
  // 2) dedupe images
  // ─────────────────────────────
  const seen = new Set<string>();
  const images: { url: string }[] = [];

  product.media.edges.forEach(({ node }: any) => {
    if (node.image?.url && !seen.has(node.image.url)) {
      seen.add(node.image.url);
      images.push({ url: node.image.url });
    }
  });

  product.variants.edges.forEach(({ node }: any) => {
    if (node.image?.url && !seen.has(node.image.url)) {
      seen.add(node.image.url);
      images.push({ url: node.image.url });
    }
  });

  // mapping old → new
  const replacements: { oldUrl: string; newId: string }[] = [];

  // ─────────────────────────────
  // 3) process images
  // ─────────────────────────────
  const processImage = async (img: { url: string }) => {
    const cfUrl = `https://${SHOP_DOMAIN}/cdn-cgi/image/format=avif,quality=60,metadata=none/${encodeURIComponent(img.url)}`;

    const cfRes = await retry(() => fetch(cfUrl));
    if (!cfRes.ok) throw new Error("Cloudflare failed");

    const buffer = Buffer.from(await cfRes.arrayBuffer());
    const filename = `avif-${numericId}-${Math.random().toString(36).slice(2)}.avif`;

    // staged upload
    const stagedRes = await retry(() =>
      admin.graphql(
        `mutation ($input: [StagedUploadInput!]!) {
          stagedUploadsCreate(input: $input) {
            stagedTargets {
              url
              resourceUrl
              parameters { name value }
            }
            userErrors { message }
          }
        }`,
        {
          variables: {
            input: [
              {
                filename,
                mimeType: "image/avif",
                resource: "IMAGE",
                httpMethod: "POST",
                fileSize: buffer.byteLength.toString(),
              },
            ],
          },
        }
      )
    );

    const stagedJson = await stagedRes.json();
    const target = stagedJson.data?.stagedUploadsCreate?.stagedTargets?.[0];
    if (!target) throw new Error("staged upload failed");

    // upload bytes
    const form = new FormData();
    target.parameters.forEach((p: any) => form.append(p.name, p.value));
    form.append("file", new Blob([buffer], { type: "image/avif" }));

    await retry(() => fetch(target.url, { method: "POST", body: form }));

    // attach media
    const mediaRes = await retry(() =>
      admin.graphql(
        `mutation ($productId: ID!, $media: [CreateMediaInput!]!) {
          productCreateMedia(productId: $productId, media: $media) {
            media {
              ... on MediaImage { id }
            }
            userErrors { message }
          }
        }`,
        {
          variables: {
            productId: gid,
            media: [
              {
                originalSource: target.resourceUrl,
                mediaContentType: "IMAGE",
                alt: `${product.title} [AVIF]`,
              },
            ],
          },
        }
      )
    );

    const mediaJson = await mediaRes.json();
    const newId = mediaJson.data?.productCreateMedia?.media?.[0]?.id;
    if (!newId) throw new Error("media create failed");

    replacements.push({
      oldUrl: img.url,
      newId,
    });
  };

  await asyncPool(3, images, processImage);

  // ─────────────────────────────
  // 4) reassign variant images
  // ─────────────────────────────
  for (const v of product.variants.edges) {
    const variant = v.node;
    if (!variant.image?.url) continue;

    const match = replacements.find(r => r.oldUrl === variant.image.url);
    if (!match) continue;

    await retry(() =>
      admin.graphql(
        `mutation ($input: ProductVariantInput!) {
          productVariantUpdate(input: $input) {
            productVariant { id }
            userErrors { message }
          }
        }`,
        {
          variables: {
            input: {
              id: variant.id,
              imageId: match.newId,
            },
          },
        }
      )
    );
  }

  // ─────────────────────────────
  // 5) reorder (put AVIF first)
  // ─────────────────────────────
  await admin.graphql(
    `mutation ($id: ID!, $mediaIds: [ID!]!) {
      productReorderMedia(id: $id, mediaIds: $mediaIds) {
        userErrors { message }
      }
    }`,
    {
      variables: {
        id: gid,
        mediaIds: replacements.map(r => r.newId),
      },
    }
  );


  await admin.graphql(
    `mutation {
      metafieldsSet(metafields: [{
        ownerId: "${gid}",
        namespace: "custom",
        key: "avif_done",
        type: "single_line_text_field",
        value: "true"
      }]) {
        userErrors { message }
      }
    }`
  );

  return Response.json({
    success: true,
    processed: images.length,
  });
};