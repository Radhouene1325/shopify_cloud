import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useActionData, useNavigate } from "@remix-run/react";
import { shopify } from "../shopify.server";
import { useState } from "react";
import { compressToWebP } from "@/utils/compress.server";
const PAGE_SIZE = 10;

// ─── HELPERS ───────────────────────────────────────────────────────────────
async function safeGraphql(admin, query, variables = {}, retries = 5) {
  try {
    const res = await admin.graphql(query, { variables });
    const json = await res.json();

    if (json.errors) {
      const isThrottled = json.errors.some(e =>
        e.message.includes("Throttled")
      );

      if (isThrottled && retries > 0) {
        await new Promise(r => setTimeout(r, 500)); // wait 500ms
        return safeGraphql(admin, query, variables, retries - 1);
      }

      throw new Error(JSON.stringify(json.errors));
    }

    return json;
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 500));
      return safeGraphql(admin, query, variables, retries - 1);
    }
    throw err;
  }
}
const PRODUCTS_QUERY = `
 #graphql
query GetProductsWithImages($cursor: String, $first: Int!) {
  products(first: $first, after: $cursor) {
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    edges {
      cursor
      node {
        id
        title
        # ✅ Use media instead of images — returns MediaImage GIDs
        media(first: 5) {
          edges {
            node {
              id                  # gid://shopify/MediaImage/xxx ✅
              mediaContentType    # IMAGE | VIDEO | MODEL_3D
              ... on MediaImage {
                image {
                  url
                  altText
                  width
                  height
                }
              }
            }
          }
        }
        variants(first: 10) {
          edges {
            node {
              id
              title
              image {
                id      # still returns ProductImage GID — don't use for fileDelete
                url
                altText
                width
                height
              }
            }
          }
        }
      }
    }
  }
}

`;



// ─── Compress image with Sharp ─────────────────────────────────────────────



// ─── Staged Upload to Shopify CDN ──────────────────────────────────────────



// ─── LOADER ────────────────────────────────────────────────────────────────

export const loader = async ({ request,context }:LoaderFunctionArgs) => {
  const { admin } = await shopify(context).authenticate.admin(request);

  const url    = new URL(request.url);
  const cursor = url.searchParams.get("cursor") || null;
  const dir    = url.searchParams.get("dir") || "next"; // "next" | "prev"

  // For "previous" page we use `last` + `before` — Shopify pagination standard
  let variables;
  if (dir === "prev" && cursor) {
    variables = { last: PAGE_SIZE, before: cursor };
  } else {
    variables = { first: PAGE_SIZE, after: cursor };
  }

  // Use a unified query that supports both directions
  const query = dir === "prev"
    ? PRODUCTS_QUERY
    : PRODUCTS_QUERY;

  const data = await safeGraphql(admin, query, variables);
  const { edges, pageInfo } = data.data.products;

  return json({
    products:    edges,
    pageInfo,
    currentDir:  dir,
  });
};

// utils/upload.server.ts

export async function uploadToShopifyCDN(admin: any, compressedBuffer: Uint8Array) {
  const filename = `optimized-${Date.now()}.webp`;

  // 1. Create staged upload
  const stagedRes = await admin.graphql(`
    mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          url
          resourceUrl
          parameters {
            name
            value
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: {
      input: [{
        filename,
        mimeType: "image/webp",
        resource: "IMAGE",
        fileSize: String(compressedBuffer.byteLength),
        httpMethod: "POST"
      }],
    },
  });

  const stagedData = await stagedRes.json();

  const errors = stagedData?.data?.stagedUploadsCreate?.userErrors;
  if (errors?.length) {
    throw new Error(errors.map((e: any) => e.message).join(", "));
  }

  const target = stagedData.data.stagedUploadsCreate.stagedTargets[0];

  // 2. Build FormData
  const formData = new FormData();

  target.parameters.forEach(({ name, value }: any) => {
    formData.append(name, value);
  });

  // 3. Attach file (NO Buffer → Blob)
  const file = new Blob([compressedBuffer as any], {
    type: "image/webp",
  });

  formData.append("file", file, filename);

  // 4. Upload
  const uploadRes = await fetch(target.url, {
    method: "POST",
    body: formData,
  });

  if (!uploadRes.ok) {
    throw new Error("Upload to Shopify CDN failed");
  }

  return target.resourceUrl;
}

// ─── ACTION ────────────────────────────────────────────────────────────────

// export const action = async ({ request, context }: ActionFunctionArgs) => {
//   const { admin } = await shopify(context).authenticate.admin(request);
//   const formData = await request.formData();

//   const intent = formData.get("intent"); // "product_image" | "variant_image"
//   const imageUrl = formData.get("imageUrl");
//   const altText = formData.get("altText") || "";

//   // Compress
//   const { inputBuffer, compressedBuffer } = await compressToWebP(imageUrl);

//   // Upload to CDN
//   const resourceUrl = await uploadToShopifyCDN(admin, compressedBuffer);

//   const savings = `${(
//     ((inputBuffer.length - compressedBuffer.length) / inputBuffer.length) * 100
//   ).toFixed(1)}%`;

//   // ── Case 1: Product image update ──────────────────────────────────────
//   if (intent === "product_image") {
//     const productId = formData.get("productId");
//     const imageId = formData.get("imageId");

//     const updateRes = await admin.graphql(`
//       #graphql
//       mutation productImageUpdate($productId: ID!, $image: ImageInput!) {
//         productImageUpdate(productId: $productId, image: $image) {
//           image {
//             id
//             url
//             altText
//           }
//           userErrors { field message }
//         }
//       }
//     `, {
//       variables: {
//         productId,
//         image: { id: imageId, src: resourceUrl, altText },
//       },
//     });

//     const updateData = await updateRes.json();
//     const errors = updateData.data.productImageUpdate.userErrors;

//     if (errors.length > 0) return json({ success: false, errors });

//     return json({
//       success: true,
//       type: "product_image",
//       image: updateData.data.productImageUpdate.image,
//       savings,
//       originalSize: `${(inputBuffer.length / 1024).toFixed(1)} KB`,
//       compressedSize: `${(compressedBuffer.length / 1024).toFixed(1)} KB`,
//     });
//   }

//   // ── Case 2: Variant image update ──────────────────────────────────────
//   if (intent === "variant_image") {
//     const variantId = formData.get("variantId");

//     const updateRes = await admin.graphql(`
//       #graphql
//       mutation productVariantUpdate($input: ProductVariantInput!) {
//         productVariantUpdate(input: $input) {
//           productVariant {
//             id
//             title
//             image {
//               id
//               url
//               altText
//             }
//           }
//           userErrors { field message }
//         }
//       }
//     `, {
//       variables: {
//         input: {
//           id: variantId,
//           imageSrc: resourceUrl,
//         },
//       },
//     });

//     const updateData = await updateRes.json();
//     const errors = updateData.data.productVariantUpdate.userErrors;

//     if (errors.length > 0) return json({ success: false, errors });

//     return json({
//       success: true,
//       type: "variant_image",
//       variant: updateData.data.productVariantUpdate.productVariant,
//       savings,
//       originalSize: `${(inputBuffer.length / 1024).toFixed(1)} KB`,
//       compressedSize: `${(compressedBuffer.length / 1024).toFixed(1)} KB`,
//     });
//   }

//   return json({ success: false, errors: [{ message: "Unknown intent" }] });
// };


// export const action = async ({ request, context }: ActionFunctionArgs) => {
//   const { admin } = await shopify(context).authenticate.admin(request);
//   const formData = await request.formData();

//   const intent   = formData.get("intent") as string;
//   const imageUrl = formData.get("imageUrl") as string;
//   const altText  = (formData.get("altText") as string) || "";
// console.log("intent is here ",intent)
// console.log("imageUrl is here ",imageUrl)
// console.log("altText is here ",altText) 
//   // 🚀 STEP 1: Get optimized CDN URL (Cloudflare WebP)
// const compressedBuffer = await compressToWebP(imageUrl);

// const resourceUrl = await uploadToShopifyCDN(admin, compressedBuffer);  
// console.log("optimiseUrlis her ",resourceUrl)
//   // ── PRODUCT IMAGE ─────────────────────────────────────────────────────
// if (intent === "product_image") {
//   const productId = formData.get("productId") as string;
//   const imageId   = formData.get("imageId") as string;
//   // imageId is now gid://shopify/MediaImage/xxx ✅ — no replace() needed
// console.log('images id ',imageId)
//   // Step 1: Delete via fileDelete
//   const deleteData = await safeGraphql(admin, `
//     #graphql
//     mutation fileDelete($fileIds: [ID!]!) {
//       fileDelete(fileIds: $fileIds) {
//         deletedFileIds
//         userErrors { field message }
//       }
//     }
//   `, {
//     fileIds: [imageId], // ✅ valid MediaImage GID
//   });

//   const deleteErrors = deleteData.data.fileDelete.userErrors;
//   if (deleteErrors.length > 0) {
//     return json({ success: false, errors: deleteErrors });
//   }

//   // Step 2: Add optimized image
//   const addData = await safeGraphql(admin, `
//   #graphql
//   mutation productUpdateMedia($productId: ID!, $media: [UpdateMediaInput!]!) {
//     productUpdateMedia(productId: $productId, media: $media) {
//       media {
//         id
//         alt
//         status
//         ... on MediaImage {
//           image {
//             url
//             altText
//           }
//         }
//       }
//       mediaUserErrors {
//         field
//         message
//       }
//     }
//   }
// `, {
//   productId: productId,
//   media: [{
//     id: imageId,   // ← GID del MediaImage esistente: "gid://shopify/MediaImage/xxx"
//     alt: altText,
//   }],
// });


//   const addErrors = addData.data.productUpdate.userErrors;
//   if (addErrors.length > 0) {
//     return json({ success: false, errors: addErrors });
//   }

//   return json({
//     success: true,
//     type: "product_image",
//     optimization: "CDN WebP · Quality 90",
//   });
// }


//   // ── VARIANT IMAGE ─────────────────────────────────────────────────────
//   if (intent === "variant_image") {
//     const variantId = formData.get("variantId") as string;
//     const productId = formData.get("productId") as string; // ⚠️ required

//     const res = await admin.graphql(`
//       #graphql
//       mutation productVariantsBulkUpdate(
//         $productId: ID!
//         $variants: [ProductVariantsBulkInput!]!
//       ) {
//         productVariantsBulkUpdate(productId: $productId, variants: $variants) {
//           productVariants {
//             id
//             title
//             image {
//               id
//               url
//               altText
//             }
//           }
//           userErrors { field message }
//         }
//       }
//     `, {
//       variables: {
//         productId,
//         variants: [
//           {
//             id: variantId,
//             mediaSrc: [resourceUrl], // ✅ 2026-01 correct field
//           },
//         ],
//       },
//     });

//     const data = await res.json();
//     const errors = data.data.productVariantsBulkUpdate.userErrors;

//     if (errors.length > 0) {
//       return json({ success: false, errors });
//     }

//     return json({
//       success: true,
//       type: "variant_image",
//       variant: data.data.productVariantsBulkUpdate.productVariants,
//       optimization: "CDN (WebP + Quality 90)",
//     });
//   }

//   return json({ success: false });
// };


export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { admin } = await shopify(context).authenticate.admin(request);
  const formData = await request.formData();

  const intent   = formData.get("intent") as string;
  const imageUrl = formData.get("imageUrl") as string;
  const altText  = (formData.get("altText") as string) || "";

  // 🚀 STEP 1: compress (HD WebP)
  const compressedBuffer = await compressToWebP(imageUrl);

  // 🚀 STEP 2: upload to Shopify CDN
  const resourceUrl = await uploadToShopifyCDN(admin, compressedBuffer);

  // ───────────────── PRODUCT IMAGE ─────────────────
  if (intent === "product_image") {
    const productId = formData.get("productId") as string;
    const imageId   = formData.get("imageId") as string;

    const res = await admin.graphql(`
      mutation productUpdateMedia($productId: ID!, $media: [UpdateMediaInput!]!) {
        productUpdateMedia(productId: $productId, media: $media) {
          media {
            id
            alt
            ... on MediaImage {
              image {
                url
                altText
              }
            }
          }
          mediaUserErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        productId,
        media: [
          {
            id: imageId,                // ✅ correct GID
            originalSource: resourceUrl, // 🔥 replace image
            alt: altText,
          },
        ],
      },
    });

    const data = await res.json();
    const errors = data.data.productUpdateMedia.mediaUserErrors;

    if (errors.length > 0) {
      return json({ success: false, errors });
    }

    return json({
      success: true,
      type: "product_image",
      image: data.data.productUpdateMedia.media,
    });
  }

  // ───────────────── VARIANT IMAGE ─────────────────
  if (intent === "variant_image") {
    const variantId = formData.get("variantId") as string;
    const productId = formData.get("productId") as string;

    const res = await admin.graphql(`
      mutation productVariantsBulkUpdate(
        $productId: ID!,
        $variants: [ProductVariantsBulkInput!]!
      ) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants {
            id
            title
            image {
              url
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        productId,
        variants: [
          {
            id: variantId,
            mediaSrc: [resourceUrl], // ✅ correct
          },
        ],
      },
    });

    const data = await res.json();
    const errors = data.data.productVariantsBulkUpdate.userErrors;

    if (errors.length > 0) {
      return json({ success: false, errors });
    }

    return json({
      success: true,
      type: "variant_image",
      variant: data.data.productVariantsBulkUpdate.productVariants,
    });
  }

  return json({ success: false, error: "Unknown intent" });
};


// ─── UI ────────────────────────────────────────────────────────────────────

const btnStyle = (bg: string, disabled: boolean) => ({
  padding: "5px 12px",
  background: disabled ? "#bbb" : bg,
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: "0.78rem",
  marginTop: "6px",
  transition: "background 0.2s",
});

const imgStyle = {
  objectFit: "cover" as const,
  borderRadius: "6px",
  border: "1px solid #ddd",
  display: "block",
};

const paginationBtn = (disabled: boolean) => ({
  padding: "8px 20px",
  background: disabled ? "#e0e0e0" : "#008060",
  color: disabled ? "#999" : "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: 600,
  fontSize: "0.9rem",
});

export default function ImageOptimizer() {
  const { products, pageInfo } = useLoaderData<typeof loader>();
  const actionData             = useActionData();
  const submit                 = useSubmit();
  const navigate               = useNavigate();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // ── Pagination ────────────────────────────────────────────────────────
  const goNext = () => {
    if (!pageInfo.hasNextPage) return;
    navigate(`?cursor=${pageInfo.endCursor}&dir=next`);
  };

  const goPrev = () => {
    if (!pageInfo.hasPreviousPage) return;
    navigate(`?cursor=${pageInfo.startCursor}&dir=prev`);
  };

  // ── Optimize handler ──────────────────────────────────────────────────
  const handleOptimize = (fields: Record<string, string>) => {
    setLoadingId(fields.imageId || fields.variantId);
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
    submit(fd, { method: "post" });
  };

  // ── Pagination Bar ────────────────────────────────────────────────────
  const PaginationBar = () => (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "1rem",
      margin: "1.5rem 0",
    }}>
      <button
        onClick={goPrev}
        disabled={!pageInfo.hasPreviousPage}
        style={paginationBtn(!pageInfo.hasPreviousPage)}
      >
        ← Previous
      </button>

      <span style={{ fontSize: "0.85rem", color: "#666" }}>
        {products.length} products per page
      </span>

      <button
        onClick={goNext}
        disabled={!pageInfo.hasNextPage}
        style={paginationBtn(!pageInfo.hasNextPage)}
      >
        Next →
      </button>
    </div>
  );

  return (
    <div style={{
      padding: "2rem",
      fontFamily: "Inter, sans-serif",
      maxWidth: "1100px",
      margin: "0 auto",
    }}>

      {/* ── Header ── */}
      <h1 style={{ fontSize: "1.6rem", marginBottom: "0.25rem" }}>
        🖼️ Bulk Image Optimizer
      </h1>
      <p style={{ color: "#555", marginBottom: "1rem" }}>
        <strong>{PAGE_SIZE} products per page</strong> · Converts to{" "}
        <strong>WebP quality 90</strong> via Cloudflare · Saves via Shopify mutation
      </p>

      {/* ── Result Banner ── */}
      {actionData && (
        <div style={{
          padding: "0.9rem 1.2rem",
          marginBottom: "1.5rem",
          borderRadius: "8px",
          background: actionData.success ? "#e6f4ea" : "#fce8e6",
          border: `1px solid ${actionData.success ? "#34a853" : "#ea4335"}`,
          fontSize: "0.9rem",
        }}>
          {actionData.success ? (
            <>✅ <strong>Optimized!</strong> · {actionData.optimization}</>
          ) : (
            <>❌ <strong>Error:</strong> {actionData.errors?.map((e: any) => e.message).join(", ")}</>
          )}
        </div>
      )}

      {/* ── Top Pagination ── */}
      <PaginationBar />

      {/* ── Product Cards ── */}
      {products.map(({ node: product }: any) => {

        // ✅ Filter only IMAGE type from media (fixes ProductImage GID issue)
        const mediaImages = product.media.edges.filter(
          ({ node: m }: any) => m.mediaContentType === "IMAGE"
        );

        return (
          <div key={product.id} style={{
            marginBottom: "1.5rem",
            border: "1px solid #e0e0e0",
            borderRadius: "10px",
            padding: "1.25rem",
            background: "#fafafa",
          }}>
            <h2 style={{ margin: "0 0 2px", fontSize: "1.05rem" }}>{product.title}</h2>
            <code style={{ fontSize: "0.7rem", color: "#aaa" }}>{product.id}</code>

            {/* ── Product Images (from media) ── */}
            {mediaImages.length > 0 && (
              <>
                <h3 style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#333" }}>
                  📷 Product Images
                </h3>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  {mediaImages.map(({ node: media }: any) => {
                    const img       = media.image;
                    const isLoading = loadingId === media.id;

                    return (
                      <div key={media.id} style={{ textAlign: "center", width: "130px" }}>
                        <img
                          src={img.url}
                          alt={img.altText || ""}
                          width={120}
                          height={120}
                          style={imgStyle}
                        />
                        <div style={{ fontSize: "0.68rem", color: "#888", margin: "3px 0" }}>
                          {img.width}×{img.height}
                        </div>
                        <button
                          disabled={isLoading}
                          style={btnStyle("#008060", isLoading)}
                          onClick={() => handleOptimize({
                            intent:    "product_image",
                            productId: product.id,
                            imageId:   media.id,        // ✅ gid://shopify/MediaImage/xxx
                            imageUrl:  img.url,
                            altText:   img.altText || "",
                          })}
                        >
                          {isLoading ? "⏳ Processing…" : "⚡ Optimize"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── Variant Images ── */}
            {product.variants.edges.some(({ node: v }: any) => v.image) && (
              <>
                <h3 style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#333" }}>
                  🎨 Variant Images
                </h3>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  {product.variants.edges
                    .filter(({ node: v }: any) => v.image)
                    .map(({ node: variant }: any) => {
                      const isLoading = loadingId === variant.id;

                      // ✅ Convert variant image GID for fileDelete if needed
                      const variantMediaId = variant.image.id.replace(
                        "gid://shopify/ProductImage/",
                        "gid://shopify/MediaImage/"
                      );

                      return (
                        <div key={variant.id} style={{ textAlign: "center", width: "130px" }}>
                          <p style={{ fontSize: "0.75rem", margin: "0 0 4px", fontWeight: 600 }}>
                            {variant.title}
                          </p>
                          <img
                            src={variant.image.url}
                            alt={variant.image.altText || ""}
                            width={110}
                            height={110}
                            style={imgStyle}
                          />
                          <div style={{ fontSize: "0.68rem", color: "#888", margin: "3px 0" }}>
                            {variant.image.width}×{variant.image.height}
                          </div>
                          <button
                            disabled={isLoading}
                            style={btnStyle("#5c6ac4", isLoading)}
                            onClick={() => handleOptimize({
                              intent:    "variant_image",
                              productId: product.id,     // ✅ required for bulk mutation
                              variantId: variant.id,
                              imageId:   variantMediaId, // ✅ converted MediaImage GID
                              imageUrl:  variant.image.url,
                              altText:   variant.image.altText || "",
                            })}
                          >
                            {isLoading ? "⏳ Processing…" : "⚡ Optimize"}
                          </button>
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* ── Bottom Pagination ── */}
      <PaginationBar />
    </div>
  );
}
