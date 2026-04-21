import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useActionData, useState } from "@remix-run/react";
import { shopify } from "../shopify.server";
import sharp from "sharp";

// ─── HELPERS ───────────────────────────────────────────────────────────────

async function fetchAllProducts(admin) {
  let allProducts = [];
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await admin.graphql(`
      #graphql
      query GetProductsWithImages($cursor: String) {
        products(first: 50, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              images(first: 20) {
                edges {
                  node {
                    id
                    url
                    altText
                    width
                    height
                  }
                }
              }
              variants(first: 20) {
                edges {
                  node {
                    id
                    title
                    image {
                      id
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
    `, {
      variables: { cursor },
    });

    const data = await response.json();
    const { edges, pageInfo } = data.data.products;

    allProducts = [...allProducts, ...edges];
    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  }

  return allProducts;
}

// ─── Compress image with Sharp ─────────────────────────────────────────────

async function compressToWebP(imageUrl, quality = 90) {
  const res = await fetch(imageUrl);
  const arrayBuffer = await res.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);

  const compressedBuffer = await sharp(inputBuffer)
    .webp({ quality, effort: 6, lossless: false })
    .toBuffer();

  return { inputBuffer, compressedBuffer };
}

// ─── Staged Upload to Shopify CDN ──────────────────────────────────────────

async function uploadToShopifyCDN(admin, compressedBuffer) {
  const filename = `optimized-${Date.now()}.webp`;

  const stagedRes = await admin.graphql(`
    #graphql
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
        userErrors { field message }
      }
    }
  `, {
    variables: {
      input: [{
        filename,
        mimeType: "image/webp",
        resource: "IMAGE",
        fileSize: String(compressedBuffer.length),
      }],
    },
  });

  const stagedData = await stagedRes.json();
  const target = stagedData.data.stagedUploadsCreate.stagedTargets[0];

  // Upload buffer to CDN
  const uploadForm = new FormData();
  target.parameters.forEach(({ name, value }) => uploadForm.append(name, value));
  uploadForm.append(
    "file",
    new Blob([compressedBuffer], { type: "image/webp" }),
    filename
  );

  await fetch(target.url, { method: "POST", body: uploadForm });

  return target.resourceUrl;
}

// ─── LOADER ────────────────────────────────────────────────────────────────

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const { admin } = await shopify(context).authenticate.admin(request);
  const products = await fetchAllProducts(admin);
  return json({ products });
};

// ─── ACTION ────────────────────────────────────────────────────────────────

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { admin } = await shopify(context).authenticate.admin(request);
  const formData = await request.formData();

  const intent = formData.get("intent"); // "product_image" | "variant_image"
  const imageUrl = formData.get("imageUrl");
  const altText = formData.get("altText") || "";

  // Compress
  const { inputBuffer, compressedBuffer } = await compressToWebP(imageUrl);

  // Upload to CDN
  const resourceUrl = await uploadToShopifyCDN(admin, compressedBuffer);

  const savings = `${(
    ((inputBuffer.length - compressedBuffer.length) / inputBuffer.length) * 100
  ).toFixed(1)}%`;

  // ── Case 1: Product image update ──────────────────────────────────────
  if (intent === "product_image") {
    const productId = formData.get("productId");
    const imageId = formData.get("imageId");

    const updateRes = await admin.graphql(`
      #graphql
      mutation productImageUpdate($productId: ID!, $image: ImageInput!) {
        productImageUpdate(productId: $productId, image: $image) {
          image {
            id
            url
            altText
          }
          userErrors { field message }
        }
      }
    `, {
      variables: {
        productId,
        image: { id: imageId, src: resourceUrl, altText },
      },
    });

    const updateData = await updateRes.json();
    const errors = updateData.data.productImageUpdate.userErrors;

    if (errors.length > 0) return json({ success: false, errors });

    return json({
      success: true,
      type: "product_image",
      image: updateData.data.productImageUpdate.image,
      savings,
      originalSize: `${(inputBuffer.length / 1024).toFixed(1)} KB`,
      compressedSize: `${(compressedBuffer.length / 1024).toFixed(1)} KB`,
    });
  }

  // ── Case 2: Variant image update ──────────────────────────────────────
  if (intent === "variant_image") {
    const variantId = formData.get("variantId");

    const updateRes = await admin.graphql(`
      #graphql
      mutation productVariantUpdate($input: ProductVariantInput!) {
        productVariantUpdate(input: $input) {
          productVariant {
            id
            title
            image {
              id
              url
              altText
            }
          }
          userErrors { field message }
        }
      }
    `, {
      variables: {
        input: {
          id: variantId,
          imageSrc: resourceUrl,
        },
      },
    });

    const updateData = await updateRes.json();
    const errors = updateData.data.productVariantUpdate.userErrors;

    if (errors.length > 0) return json({ success: false, errors });

    return json({
      success: true,
      type: "variant_image",
      variant: updateData.data.productVariantUpdate.productVariant,
      savings,
      originalSize: `${(inputBuffer.length / 1024).toFixed(1)} KB`,
      compressedSize: `${(compressedBuffer.length / 1024).toFixed(1)} KB`,
    });
  }

  return json({ success: false, errors: [{ message: "Unknown intent" }] });
};

// ─── UI ────────────────────────────────────────────────────────────────────

export default function ImageOptimizer() {
  const { products } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const [loadingId, setLoadingId] = useState(null);

  const handleOptimize = (fields) => {
    setLoadingId(fields.imageId || fields.variantId);
    const formData = new FormData();
    Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
    submit(formData, { method: "post" });
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Inter, sans-serif", maxWidth: "1100px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.6rem" }}>🖼️ Bulk Image Optimizer</h1>
      <p style={{ color: "#555" }}>
        Fetches <strong>all products</strong> (paginated), compresses images to{" "}
        <strong>WebP quality 90</strong>, and saves via Shopify mutation.
      </p>

      {/* Action Result Banner */}
      {actionData && (
        <div style={{
          padding: "1rem",
          marginBottom: "1.5rem",
          borderRadius: "8px",
          background: actionData.success ? "#e6f4ea" : "#fce8e6",
          border: `1px solid ${actionData.success ? "#34a853" : "#ea4335"}`,
        }}>
          {actionData.success ? (
            <>
              ✅ <strong>Optimized!</strong> &nbsp;
              {actionData.originalSize} → {actionData.compressedSize} &nbsp;
              <strong>({actionData.savings} saved)</strong>
            </>
          ) : (
            <>❌ Error: {actionData.errors?.map(e => e.message).join(", ")}</>
          )}
        </div>
      )}

      {/* Product List */}
      {products.map(({ node: product }) => (
        <div key={product.id} style={{
          marginBottom: "2rem",
          border: "1px solid #e0e0e0",
          borderRadius: "10px",
          padding: "1.25rem",
        }}>
          <h2 style={{ margin: "0 0 0.25rem" }}>{product.title}</h2>
          <code style={{ fontSize: "0.75rem", color: "#888" }}>{product.id}</code>

          {/* Product Images */}
          {product.images.edges.length > 0 && (
            <>
              <h3 style={{ marginTop: "1rem" }}>📷 Product Images</h3>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                {product.images.edges.map(({ node: img }) => (
                  <div key={img.id} style={{ textAlign: "center", width: "130px" }}>
                    <img
                      src={img.url}
                      alt={img.altText || ""}
                      width={120}
                      height={120}
                      style={{ objectFit: "cover", borderRadius: "6px", border: "1px solid #ddd" }}
                    />
                    <div style={{ fontSize: "0.7rem", color: "#666", margin: "4px 0" }}>
                      {img.width}×{img.height}
                    </div>
                    <button
                      disabled={loadingId === img.id}
                      onClick={() => handleOptimize({
                        intent: "product_image",
                        productId: product.id,
                        imageId: img.id,
                        imageUrl: img.url,
                        altText: img.altText || "",
                      })}
                      style={{
                        padding: "5px 10px",
                        background: loadingId === img.id ? "#aaa" : "#008060",
                        color: "#fff",
                        border: "none",
                        borderRadius: "5px",
                        cursor: loadingId === img.id ? "not-allowed" : "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      {loadingId === img.id ? "⏳ Processing..." : "⚡ Optimize"}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Variant Images */}
          {product.variants.edges.some(({ node: v }) => v.image) && (
            <>
              <h3 style={{ marginTop: "1rem" }}>🎨 Variant Images</h3>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                {product.variants.edges
                  .filter(({ node: v }) => v.image)
                  .map(({ node: variant }) => (
                    <div key={variant.id} style={{ textAlign: "center", width: "130px" }}>
                      <p style={{ fontSize: "0.75rem", margin: "0 0 4px", fontWeight: 600 }}>
                        {variant.title}
                      </p>
                      <img
                        src={variant.image.url}
                        alt={variant.image.altText || ""}
                        width={110}
                        height={110}
                        style={{ objectFit: "cover", borderRadius: "6px", border: "1px solid #ddd" }}
                      />
                      <div style={{ fontSize: "0.7rem", color: "#666", margin: "4px 0" }}>
                        {variant.image.width}×{variant.image.height}
                      </div>
                      <button
                        disabled={loadingId === variant.id}
                        onClick={() => handleOptimize({
                          intent: "variant_image",
                          variantId: variant.id,
                          imageUrl: variant.image.url,
                          altText: variant.image.altText || "",
                        })}
                        style={{
                          padding: "5px 10px",
                          background: loadingId === variant.id ? "#aaa" : "#5c6ac4",
                          color: "#fff",
                          border: "none",
                          borderRadius: "5px",
                          cursor: loadingId === variant.id ? "not-allowed" : "pointer",
                          fontSize: "0.8rem",
                        }}
                      >
                        {loadingId === variant.id ? "⏳ Processing..." : "⚡ Optimize"}
                      </button>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
