import type { ActionFunctionArgs } from "@remix-run/node";
import { shopify } from "../shopify.server";

// Your shop domain (must be proxied through Cloudflare with Image Resizing enabled)
const SHOP_DOMAIN = "platinumshop.it"; // change to your domain

export const action = async ({ request,context }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { admin } = await shopify(context as any).authenticate.admin(request);
  const { productId } = await request.json();

  if (!productId || !productId.startsWith("gid://shopify/Product/")) {
    return new Response("Invalid productId", { status: 400 });
  }

  // ─── 1. Fetch product images ───
  const query = `
    query getProductImages($id: ID!) {
      product(id: $id) {
        id
        title
        media(first: 50) {
          edges {
            node {
              ... on MediaImage {
                id
                image { url width height }
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

  const res = await admin.graphql(query, { variables: { id: productId } });
  const json = await res.json();
  const product = json.data?.product;

  if (!product) {
    return new Response("Product not found", { status: 404 });
  }

  // Deduplicate URLs
  const seen = new Set<string>();
  const images: { url: string; existingId?: string }[] = [];

  product.media?.edges?.forEach(({ node }: any) => {
    if (node.image?.url && !seen.has(node.image.url)) {
      seen.add(node.image.url);
      images.push({ url: node.image.url, existingId: node.id });
    }
  });

  product.variants?.edges?.forEach(({ node }: any) => {
    if (node.image?.url && !seen.has(node.image.url)) {
      seen.add(node.image.url);
      images.push({ url: node.image.url, existingId: node.image.id });
    }
  });

  const results: any[] = [];

  // ─── 2. Convert via Cloudflare Image Resizing & upload ───
  for (const img of images) {
    try {
      // Cloudflare Image Resizing URL
      const cfUrl = `https://${SHOP_DOMAIN}/cdn-cgi/image/format=avif,quality=75/${encodeURIComponent(img.url)}`;

      const cfRes = await fetch(cfUrl);
      if (!cfRes.ok) throw new Error(`CF resize failed: ${cfRes.status}`);

      const avifBuffer = Buffer.from(await cfRes.arrayBuffer());
      const filename = `avif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.avif`;

      // ─── 2a. Staged upload ───
      const stagedRes = await admin.graphql(
        `mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
          stagedUploadsCreate(input: $input) {
            stagedTargets {
              url
              resourceUrl
              parameters { name value }
            }
            userErrors { field message }
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
                fileSize: avifBuffer.byteLength.toString(),
              },
            ],
          },
        }
      );

      const stagedJson = await stagedRes.json();
      const target = stagedJson.data?.stagedUploadsCreate?.stagedTargets?.[0];

      if (!target) {
        throw new Error(
          `Staged upload failed: ${JSON.stringify(stagedJson.data?.stagedUploadsCreate?.userErrors)}`
        );
      }

      // Upload bytes
      const formData = new FormData();
      target.parameters.forEach((p: any) => formData.append(p.name, p.value));
      formData.append("file", new Blob([avifBuffer], { type: "image/avif" }));

      const uploadRes = await fetch(target.url, { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);

      // ─── 2b. Attach to product ───
      const mediaRes = await admin.graphql(
        `mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
          productCreateMedia(productId: $productId, media: $media) {
            media {
              ... on MediaImage {
                id
                image { url }
              }
            }
            userErrors { field message }
          }
        }`,
        {
          variables: {
            productId,
            media: [
              {
                originalSource: target.resourceUrl,
                mediaContentType: "IMAGE",
                alt: `${product.title} (AVIF)`,
              },
            ],
          },
        }
      );

      const mediaJson = await mediaRes.json();

      if (mediaJson.data?.productCreateMedia?.userErrors?.length > 0) {
        throw new Error(
          JSON.stringify(mediaJson.data.productCreateMedia.userErrors)
        );
      }

      results.push({
        original: img.url,
        newId: mediaJson.data?.productCreateMedia?.media?.[0]?.id,
      });
    } catch (err: any) {
      results.push({ original: img.url, error: err.message });
    }
  }

  return Response.json({ success: true, count: results.length, results });
};