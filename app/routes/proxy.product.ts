import type { ActionFunctionArgs } from "@remix-run/node";
import { shopify } from "../shopify.server";

const SHOP_DOMAIN = "platinumshop.it";

// simple concurrency limiter (no external deps)
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

// retry helper
const retry = async (fn: any, retries = 3) => {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((r) => setTimeout(r, 500));
    return retry(fn, retries - 1);
  }
};

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

  // ─────────────────────────────────────────────
  // 1. FETCH PRODUCT + METAFIELD (IDEMPOTENCY)
  // ─────────────────────────────────────────────
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
              }
            }
          }
        }

        variants(first: 100) {
          edges {
            node {
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

  // ✅ SKIP if already processed
  if (product.metafield?.value === "true") {
    return Response.json({ success: true, skipped: true });
  }

  // ─────────────────────────────────────────────
  // 2. DEDUPLICATE IMAGES
  // ─────────────────────────────────────────────
  const seen = new Set<string>();
  const images: { url: string }[] = [];

  product.media?.edges?.forEach(({ node }: any) => {
    if (node.image?.url && !seen.has(node.image.url)) {
      seen.add(node.image.url);
      images.push({ url: node.image.url });
    }
  });

  product.variants?.edges?.forEach(({ node }: any) => {
    if (node.image?.url && !seen.has(node.image.url)) {
      seen.add(node.image.url);
      images.push({ url: node.image.url });
    }
  });

  // ─────────────────────────────────────────────
  // 3. PROCESS IMAGES (CONCURRENT + SAFE)
  // ─────────────────────────────────────────────
  const processImage = async (img: { url: string }) => {
    const cfUrl = `https://${SHOP_DOMAIN}/cdn-cgi/image/format=avif,quality=60,metadata=none/${encodeURIComponent(img.url)}`;

    // fetch AVIF
    const cfRes = await retry(() => fetch(cfUrl));
    if (!cfRes.ok) throw new Error(`CF failed ${cfRes.status}`);

    const buffer = Buffer.from(await cfRes.arrayBuffer());
    const filename = `avif-${numericId}-${Math.random().toString(36).slice(2)}.avif`;

    // staged upload
    const stagedRes = await retry(() =>
      admin.graphql(
        `mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
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
    if (!target) throw new Error("Staged upload failed");

    // upload file
    const form = new FormData();
    target.parameters.forEach((p: any) => form.append(p.name, p.value));
    form.append("file", new Blob([buffer], { type: "image/avif" }));

    await retry(() =>
      fetch(target.url, {
        method: "POST",
        body: form,
      })
    );

    // attach to product
    const mediaRes = await retry(() =>
      admin.graphql(
        `mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
          productCreateMedia(productId: $productId, media: $media) {
            media {
              ... on MediaImage {
                id
              }
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
                alt: `${product.title} AVIF`,
              },
            ],
          },
        }
      )
    );

    const mediaJson = await mediaRes.json();
    if (mediaJson.data?.productCreateMedia?.userErrors?.length) {
      throw new Error("Media creation failed");
    }

    return true;
  };

  // limit concurrency (IMPORTANT)
  await asyncPool(3, images, processImage);

  // ─────────────────────────────────────────────
  // 4. MARK AS DONE (IDEMPOTENCY FLAG)
  // ─────────────────────────────────────────────
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