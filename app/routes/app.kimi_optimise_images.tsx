import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import {
    Form,
    useLoaderData,
    useActionData,
    useNavigate,
    useNavigation,
    useRevalidator,
} from "@remix-run/react";
import { useEffect, useState } from "react";
import { shopify } from "../shopify.server";




interface GraphQLError {
    message: string;
    extensions?: Record<string, any>;
}

interface GraphQLResponse<T = any> {
    data?: T;
    errors?: GraphQLError[];
}

export async function safeGraphql<T = any>(
    admin: any,
    query: string,
    variables: Record<string, any> = {},
    retries = 5
): Promise<GraphQLResponse<T>> {
    try {
        const response = await admin.graphql(query, { variables });
        const json: GraphQLResponse<T> = await response.json();

        if (json.errors?.some((e) => e.message.includes("Throttled"))) {
            if (retries > 0) {
                const delay = 500 * Math.pow(2, 5 - retries);
                await new Promise((r) => setTimeout(r, delay));
                return safeGraphql(admin, query, variables, retries - 1);
            }
        }

        if (json.errors) {
            throw new Error(JSON.stringify(json.errors));
        }

        return json;
    } catch (err) {
        if (retries > 0) {
            const delay = 500 * Math.pow(2, 5 - retries);
            await new Promise((r) => setTimeout(r, delay));
            return safeGraphql(admin, query, variables, retries - 1);
        }
        throw err;
    }
}










export interface CompressionResult {
    compressedBuffer: Uint8Array;
    contentType: string;
    originalSize: number;
    compressedSize: number;
}

/**
 * Rileva formato immagine dall'URL Shopify
 */
export function detectImageFormat(imageUrl: string): string {
    try {
        const url = new URL(imageUrl);
        const ext = url.pathname.split(".").pop()?.toLowerCase();
        if (ext === "png") return "PNG";
        if (ext === "jpg" || ext === "jpeg") return "JPEG";
        if (ext === "webp") return "WebP";
        return "Original";
    } catch {
        return "Original";
    }
}



export function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
export function calculateReduction(original: number, optimized: number): string {
    if (original === 0) return "0%";
    const reduction = ((original - optimized) / original) * 100;
    return reduction.toFixed(1) + "%";
}

/**
 * Comprime immagine via Cloudflare Image Resizing
 * Updated to use /cdn-cgi/image/ endpoint
 */
// export async function compressToWebP(
//     imageUrl: string,
//     URL:string,
    
// ): Promise<CompressionResult> {
//     // Fetch original size via HEAD request
//     let quality = 85
//     const headRes = await fetch(imageUrl, { method: "HEAD" });
//     const originalSize = Number(headRes.headers.get("content-length")) || 0;

//     // Your domain with Image Resizing enabled
//     const workerDomain = URL; 
//     console.log('url is her ',URL)
//     const params = `width=2000,quality=${quality},format=webp,fit=scale-down`;
//     const resizedUrl = `${workerDomain}/cdn-cgi/image/${params}/${encodeURIComponent(imageUrl)}`;

//     const response = await fetch(resizedUrl);
//     if (!response.ok) {
//         throw new Error(`Cloudflare image optimization failed: ${response.status}`);
//     }

//     const contentType = response.headers.get("content-type") || "image/webp";

//     if (!contentType.includes("webp")) {
//         console.warn(
//             `[Image Optimizer] ATTENZIONE: Content-Type è ${contentType}, non image/webp. ` +
//             `Cloudflare Image Resizing potrebbe non essere attivo sul dominio.`
//         );
//     }

//     const arrayBuffer = await response.arrayBuffer();
//     const compressedBuffer = new Uint8Array(arrayBuffer);

//     return {
//         compressedBuffer,
//         contentType,
//         originalSize,
//         compressedSize: compressedBuffer.byteLength,
//     };
// }
export async function compressToWebP(
    imageUrl: string,
    quality = 100
): Promise<CompressionResult> {
    // Fetch original size via HEAD request
    const headRes = await fetch(imageUrl, { method: "HEAD" });
    const originalSize = Number(headRes.headers.get("content-length")) || 0;

    // Option A: Custom domain with Cloudflare Image Resizing (RECOMMENDED)
    // const workerDomain = "https://images.yourdomain.com";
    
    // Option B: Shopify native CDN optimization (FALLBACK - no WebP conversion, just resize)
    // Shopify CDN supports: ?format=webp&width=2000&quality=85
    
    // For now, let's use Shopify's native params as a working solution:
    const separator = imageUrl.includes('?') ? '&' : '?';
    const resizedUrl = `${imageUrl}${separator}format=webp&width=2000&quality=${quality}`;

    console.log("[Image Optimizer] Using Shopify CDN URL:", resizedUrl);

    const response = await fetch(resizedUrl);
    
    if (!response.ok) {
        const errorText = await response.text().catch(() => "No details");
        throw new Error(`Image optimization failed: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get("content-type") || "image/webp";
    const arrayBuffer = await response.arrayBuffer();
    const compressedBuffer = new Uint8Array(arrayBuffer);

    return {
        compressedBuffer,
        contentType,
        originalSize,
        compressedSize: compressedBuffer.byteLength,
    };
}

/**
 * Upload buffer a Shopify CDN via Staged Upload
 */
export async function uploadToShopifyCDN(
    admin: any,
    compressedBuffer: Uint8Array,
    filename?: string
): Promise<string> {
    const name = filename || `optimized-${Date.now()}.webp`;

    const stagedRes = await safeGraphql(admin, `
    mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          url
          resourceUrl
          parameters { name value }
        }
        userErrors { field message }
      }
    }
  `, {
        input: [
            {
                filename: name,
                mimeType: "image/webp",
                resource: "IMAGE",
                fileSize: String(compressedBuffer.byteLength),
                httpMethod: "POST",
            },
        ],
    });

    const target = stagedRes.data?.stagedUploadsCreate?.stagedTargets?.[0];
    const errors = stagedRes.data?.stagedUploadsCreate?.userErrors;

    if (errors?.length) {
        throw new Error(errors.map((e: any) => e.message).join(", "));
    }
    if (!target) {
        throw new Error("Nessun target ricevuto da stagedUploadsCreate");
    }

    const formData = new FormData();
    target.parameters.forEach((param: any) => {
        formData.append(param.name, param.value);
    });

    const blob = new Blob([compressedBuffer as any], { type: "image/webp" });
    formData.append("file", blob, name);

    const uploadRes = await fetch(target.url, {
        method: "POST",
        body: formData,
    });

    if (!uploadRes.ok) {
        const text = await uploadRes.text().catch(() => "Unknown error");
        throw new Error(`Shopify CDN upload failed: ${uploadRes.status} - ${text}`);
    }

    return target.resourceUrl;
}







const PAGE_SIZE = 10;

// ─── TYPES ────────────────────────────────────────────────────────────────

interface ImageData {
    url: string;
    altText?: string;
    width?: number;
    height?: number;
}

interface ComparisonData {
    before: {
        url: string;
        width?: number;
        height?: number;
        format: string;
        size: number;        // ← bytes
        sizeFormatted: string;
    };
    after: {
        url: string;
        width?: number;
        height?: number;
        format: string;
        size: number;        // ← bytes
        sizeFormatted: string;
    };
    reductionPercent: string;
    reductionBytes: number;
}

interface ActionData {
    success: boolean;
    type?: "product_image" | "variant_image";
    comparison?: ComparisonData;
    errors?: Array<{ field?: string; message: string }>;
    error?: string;
}

interface LoaderData {
    products: Array<{
        cursor: string;
        node: {
            id: string;
            title: string;
            media: {
                edges: Array<{
                    node: {
                        id: string;
                        mediaContentType: string;
                        image?: ImageData;
                    };
                }>;
            };
            variants: {
                edges: Array<{
                    node: {
                        id: string;
                        title: string;
                        image?: ImageData;
                    };
                }>;
            };
        };
    }>;
    pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor?: string;
        endCursor?: string;
    };
}

// ─── GRAPHQL ──────────────────────────────────────────────────────────────

const PRODUCTS_QUERY = `
  query GetProductsWithImages($first: Int, $last: Int, $after: String, $before: String) {
    products(first: $first, last: $last, after: $after, before: $before) {
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
          media(first: 20) {
            edges {
              node {
                id
                mediaContentType
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
          variants(first: 50) {
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
`;

// ─── LOADER ───────────────────────────────────────────────────────────────

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
    const { admin } = await shopify(context).authenticate.admin(request);

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const dir = url.searchParams.get("dir") || "next";

    const variables: Record<string, any> =
        dir === "prev" && cursor
            ? { last: PAGE_SIZE, before: cursor }
            : { first: PAGE_SIZE, after: cursor || null };

    const data = await safeGraphql(admin, PRODUCTS_QUERY, variables);

    return json<LoaderData>({
        products: data.data.products.edges,
        pageInfo: data.data.products.pageInfo,
    });
};

// ─── ACTION ───────────────────────────────────────────────────────────────

export const action = async ({ request, context }: ActionFunctionArgs) => {
    const { admin } = await shopify(context).authenticate.admin(request);
    const formData = await request.formData();
const URL=context.cloudflare.env.SHOPIFY_APP_URL
    const intent = formData.get("intent") as string;
    const imageUrl = formData.get("imageUrl") as string;
    const altText = (formData.get("altText") as string) || "";
    const productId = formData.get("productId") as string;

    // Metadata originali per confronto
    const originalWidth = Number(formData.get("originalWidth")) || undefined;
    const originalHeight = Number(formData.get("originalHeight")) || undefined;
    const originalFormat = detectImageFormat(imageUrl);

    if (!intent || !imageUrl || !productId) {
        return json<ActionData>({ success: false, error: "Missing required fields" });
    }

    try {
        // 1. Cloudflare compression (updated with /cdn-cgi/image/ endpoint)
        const { compressedBuffer, originalSize, compressedSize } = await compressToWebP(imageUrl,URL);

        // 2. Upload Shopify CDN
        const resourceUrl = await uploadToShopifyCDN(admin, compressedBuffer);

        // ─── PRODUCT IMAGE ─────────────────────────────────────
        if (intent === "product_image") {
            const oldMediaId = formData.get("imageId") as string;

            const createRes = await safeGraphql(admin, `
        mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
          productCreateMedia(productId: $productId, media: $media) {
            media {
              id
              alt
              ... on MediaImage {
                image {
                  url
                  altText
                  width
                  height
                }
              }
            }
            mediaUserErrors { field message }
          }
        }
      `, {
                productId,
                media: [
                    {
                        mediaContentType: "IMAGE",
                        originalSource: resourceUrl,
                        alt: altText,
                    },
                ],
            });

            const newMedia = createRes.data?.productCreateMedia?.media?.[0];
            const errors = createRes.data?.productCreateMedia?.mediaUserErrors;

            if (errors?.length) {
                return json<ActionData>({ success: false, errors });
            }
            if (!newMedia) {
                return json<ActionData>({ success: false, error: "Failed to create media" });
            }

            // Cleanup old media (best effort)
            if (oldMediaId) {
                try {
                    await safeGraphql(admin, `
            mutation productDeleteMedia($productId: ID!, $mediaIds: [ID!]!) {
              productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
                deletedMediaIds
                userErrors { field message }
              }
            }
          `, { productId, mediaIds: [oldMediaId] });
                } catch (e) {
                    console.warn("[Optimizer] Cleanup old product media failed:", e);
                }
            }

            return json<ActionData>({
                success: true,
                type: "product_image",
                comparison: {
                    before: {
                        url: imageUrl,
                        width: originalWidth,
                        height: originalHeight,
                        format: originalFormat,
                        size: originalSize,
                        sizeFormatted: formatBytes(originalSize),
                    },
                    after: {
                        url: newMedia.image?.url || resourceUrl,
                        width: newMedia.image?.width || originalWidth,
                        height: newMedia.image?.height || originalHeight,
                        format: "WebP",
                        size: compressedSize,
                        sizeFormatted: formatBytes(compressedSize),
                    },
                    reductionPercent: calculateReduction(originalSize, compressedSize),
                    reductionBytes: originalSize - compressedSize,
                },
            });
        }

        // ─── VARIANT IMAGE ─────────────────────────────────────
        if (intent === "variant_image") {
            const variantId = formData.get("variantId") as string;
            const oldMediaId = formData.get("imageId") as string;

            if (!variantId) {
                return json<ActionData>({ success: false, error: "Missing variantId" });
            }

            const createRes = await safeGraphql(admin, `
        mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
          productCreateMedia(productId: $productId, media: $media) {
            media {
              id
              ... on MediaImage {
                image { url width height }
              }
            }
            mediaUserErrors { field message }
          }
        }
      `, {
                productId,
                media: [
                    {
                        mediaContentType: "IMAGE",
                        originalSource: resourceUrl,
                        alt: altText,
                    },
                ],
            });

            const newMediaId = createRes.data?.productCreateMedia?.media?.[0]?.id;
            const newMediaImage = createRes.data?.productCreateMedia?.media?.[0]?.image;
            const errors = createRes.data?.productCreateMedia?.mediaUserErrors;

            if (errors?.length) {
                return json<ActionData>({ success: false, errors });
            }
            if (!newMediaId) {
                return json<ActionData>({ success: false, error: "Failed to create media" });
            }

            const updateRes = await safeGraphql(admin, `
        mutation productVariantsBulkUpdate(
          $productId: ID!
          $variants: [ProductVariantsBulkInput!]!
        ) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants {
              id
              title
              image {
                url
                altText
                width
                height
              }
            }
            userErrors { field message }
          }
        }
      `, {
                productId,
                variants: [{ id: variantId, mediaId: [newMediaId] }],
            });

            const updateErrors = updateRes.data?.productVariantsBulkUpdate?.userErrors;
            if (updateErrors?.length) {
                return json<ActionData>({ success: false, errors: updateErrors });
            }

            const updatedVariant = updateRes.data?.productVariantsBulkUpdate?.productVariants?.[0];

            // Cleanup old media (best effort)
            if (oldMediaId) {
                try {
                    await safeGraphql(admin, `
            mutation productDeleteMedia($productId: ID!, $mediaIds: [ID!]!) {
              productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
                deletedMediaIds
                userErrors { field message }
              }
            }
          `, { productId, mediaIds: [oldMediaId] });
                } catch (e) {
                    console.warn("[Optimizer] Cleanup old variant media failed:", e);
                }
            }

            return json<ActionData>({
                success: true,
                type: "variant_image",
                comparison: {
                    before: {
                        url: imageUrl,
                        width: originalWidth,
                        height: originalHeight,
                        format: originalFormat,
                        size: originalSize,
                        sizeFormatted: formatBytes(originalSize),
                    },
                    after: {
                        url: updatedVariant?.image?.url || newMediaImage?.url || resourceUrl,
                        width: updatedVariant?.image?.width || newMediaImage?.width || originalWidth,
                        height: updatedVariant?.image?.height || newMediaImage?.height || originalHeight,
                        format: "WebP",
                        size: compressedSize,
                        sizeFormatted: formatBytes(compressedSize),
                    },
                    reductionPercent: calculateReduction(originalSize, compressedSize),
                    reductionBytes: originalSize - compressedSize,
                },
            });
        }

        return json<ActionData>({ success: false, error: "Unknown intent" });
    } catch (err: any) {
        console.error("[Image Optimizer] Action error:", err);
        return json<ActionData>({
            success: false,
            error: err.message || "Internal server error",
        });
    }
};

// ─── UI ───────────────────────────────────────────────────────────────────

export default function ImageOptimizer() {
    const { products, pageInfo } = useLoaderData<LoaderData>();
    const actionData = useActionData<ActionData>();
    const navigate = useNavigate();
    const navigation = useNavigation();
    const revalidator = useRevalidator();

    const [lastComparison, setLastComparison] = useState<ComparisonData | null>(null);

    // Salva confronto e avvia refresh
    useEffect(() => {
        if (actionData?.success && actionData.comparison) {
            setLastComparison(actionData.comparison);
            if (revalidator.state === "idle") {
                revalidator.revalidate();
            }
        }
    }, [actionData, revalidator]);

    const isSubmitting = navigation.state === "submitting";
    const activeFormData = isSubmitting ? navigation.formData : null;
    const optimizingId = activeFormData
        ? (activeFormData.get("imageId") as string) ||
        (activeFormData.get("variantId") as string)
        : null;

    const goNext = () => {
        if (!pageInfo.hasNextPage || !pageInfo.endCursor) return;
        navigate(`?cursor=${pageInfo.endCursor}&dir=next`);
    };

    const goPrev = () => {
        if (!pageInfo.hasPreviousPage || !pageInfo.startCursor) return;
        navigate(`?cursor=${pageInfo.startCursor}&dir=prev`);
    };

    return (
        <div
            style={{
                padding: "2rem",
                fontFamily: "Inter, system-ui, sans-serif",
                maxWidth: "1200px",
                margin: "0 auto",
            }}
        >
            <header style={{ marginBottom: "2rem" }}>
                <h1 style={{ fontSize: "1.75rem", margin: "0 0 0.5rem" }}>
                    🖼️ Bulk Image Optimizer
                </h1>
                <p style={{ color: "#666", margin: 0 }}>
                    Cloudflare WebP • Shopify CDN • GraphQL Admin API 2025-01
                </p>
            </header>

            {/* ── BEFORE / AFTER COMPARISON ── */}
            {(actionData?.comparison || lastComparison) && (
                <div
                    style={{
                        marginBottom: "2rem",
                        border: "2px solid #34a853",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        background: "#f6ffed",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <span style={{ fontSize: "1.25rem" }}>✅</span>
                        <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#1e8e3e" }}>
                            Image Successfully Transformed
                        </h2>
                    </div>

                    {/* Stats bar */}
                    {(() => {
                        const data = actionData?.comparison || lastComparison;
                        if (!data) return null;
                        return (
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "center",
                                    gap: "2rem",
                                    marginBottom: "1.25rem",
                                    padding: "0.75rem",
                                    background: "#fff",
                                    borderRadius: "8px",
                                    fontSize: "0.85rem",
                                }}
                            >
                                <div style={{ textAlign: "center" }}>
                                    <div style={{ color: "#666" }}>Original size</div>
                                    <div style={{ fontWeight: 700, color: "#ea4335" }}>{data.before.sizeFormatted}</div>
                                </div>
                                <div style={{ textAlign: "center" }}>
                                    <div style={{ color: "#666" }}>Optimized</div>
                                    <div style={{ fontWeight: 700, color: "#34a853" }}>{data.after.sizeFormatted}</div>
                                </div>
                                <div style={{ textAlign: "center" }}>
                                    <div style={{ color: "#666" }}>Saved</div>
                                    <div style={{ fontWeight: 700, color: "#1a73e8" }}>
                                        {formatBytes(data.reductionBytes)} ({data.reductionPercent})
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto 1fr",
                            gap: "1rem",
                            alignItems: "center",
                        }}
                    >
                        {/* BEFORE */}
                        <div
                            style={{
                                textAlign: "center",
                                padding: "1rem",
                                background: "#fff",
                                borderRadius: "10px",
                                border: "2px solid #ea4335",
                            }}
                        >
                            <div
                                style={{
                                    display: "inline-block",
                                    background: "#ea4335",
                                    color: "#fff",
                                    padding: "2px 10px",
                                    borderRadius: "12px",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    marginBottom: "0.75rem",
                                    textTransform: "uppercase",
                                }}
                            >
                                Before
                            </div>
                            <img
                                src={(actionData?.comparison || lastComparison)?.before.url}
                                alt="Before"
                                style={{
                                    width: "100%",
                                    maxWidth: "180px",
                                    height: "140px",
                                    objectFit: "cover",
                                    borderRadius: "8px",
                                    display: "block",
                                    margin: "0 auto 0.75rem",
                                }}
                            />
                            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#333" }}>
                                {(actionData?.comparison || lastComparison)?.before.format}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#666" }}>
                                {(actionData?.comparison || lastComparison)?.before.width &&
                                    (actionData?.comparison || lastComparison)?.before.height
                                    ? `${(actionData?.comparison || lastComparison)?.before.width}×${(actionData?.comparison || lastComparison)?.before.height
                                    }px`
                                    : "Dimensions unknown"}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#ea4335", fontWeight: 600, marginTop: "2px" }}>
                                {(actionData?.comparison || lastComparison)?.before.sizeFormatted}
                            </div>
                        </div>

                        {/* ARROW */}
                        <div style={{ textAlign: "center", fontSize: "1.5rem", color: "#34a853" }}>
                            ➜
                            <div style={{ fontSize: "0.7rem", color: "#666", marginTop: "4px", fontWeight: 600 }}>
                                {(() => {
                                    const data = actionData?.comparison || lastComparison;
                                    return data ? `${data.reductionPercent} smaller` : "Optimized";
                                })()}
                            </div>
                        </div>

                        {/* AFTER */}
                        <div
                            style={{
                                textAlign: "center",
                                padding: "1rem",
                                background: "#fff",
                                borderRadius: "10px",
                                border: "2px solid #34a853",
                            }}
                        >
                            <div
                                style={{
                                    display: "inline-block",
                                    background: "#34a853",
                                    color: "#fff",
                                    padding: "2px 10px",
                                    borderRadius: "12px",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    marginBottom: "0.75rem",
                                    textTransform: "uppercase",
                                }}
                            >
                                After
                            </div>
                            <img
                                src={(actionData?.comparison || lastComparison)?.after.url}
                                alt="After"
                                style={{
                                    width: "100%",
                                    maxWidth: "180px",
                                    height: "140px",
                                    objectFit: "cover",
                                    borderRadius: "8px",
                                    display: "block",
                                    margin: "0 auto 0.75rem",
                                }}
                            />
                            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#333" }}>
                                {(actionData?.comparison || lastComparison)?.after.format}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#666" }}>
                                {(actionData?.comparison || lastComparison)?.after.width &&
                                    (actionData?.comparison || lastComparison)?.after.height
                                    ? `${(actionData?.comparison || lastComparison)?.after.width}×${(actionData?.comparison || lastComparison)?.after.height
                                    }px`
                                    : "Dimensions unknown"}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#34a853", fontWeight: 600, marginTop: "2px" }}>
                                {(actionData?.comparison || lastComparison)?.after.sizeFormatted}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setLastComparison(null)}
                        style={{
                            marginTop: "1rem",
                            padding: "6px 14px",
                            background: "#fff",
                            border: "1px solid #ccc",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            color: "#666",
                        }}
                    >
                        Dismiss
                    </button>
                </div>
            )}
            {/* ── ERROR BANNER ── */}
            {actionData && !actionData.success && (
                <div
                    style={{
                        padding: "1rem 1.25rem",
                        marginBottom: "1.5rem",
                        borderRadius: "8px",
                        background: "#fce8e6",
                        border: "1px solid #ea4335",
                        fontSize: "0.9rem",
                    }}
                >
                    ❌ <strong>Error:</strong>{" "}
                    {actionData.errors?.map((e) => e.message).join(", ") ||
                        actionData.error ||
                        "Unknown"}
                </div>
            )}

            {/* ── PAGINATION ── */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "1rem",
                    margin: "1.5rem 0",
                }}
            >
                <button
                    onClick={goPrev}
                    disabled={!pageInfo.hasPreviousPage || isSubmitting}
                    style={paginationBtn(!pageInfo.hasPreviousPage || isSubmitting)}
                >
                    ← Previous
                </button>
                <span style={{ fontSize: "0.85rem", color: "#666" }}>
                    {products.length} products
                </span>
                <button
                    onClick={goNext}
                    disabled={!pageInfo.hasNextPage || isSubmitting}
                    style={paginationBtn(!pageInfo.hasNextPage || isSubmitting)}
                >
                    Next →
                </button>
            </div>

            {/* ── PRODUCTS ── */}
            <div style={{ display: "grid", gap: "1.5rem" }}>
                {products.map(({ node: product }) => {
                    const mediaImages =
                        product.media?.edges?.filter(
                            ({ node: m }) => m.mediaContentType === "IMAGE"
                        ) || [];

                    const variantsWithImage =
                        product.variants?.edges?.filter(({ node: v }) => v.image) || [];

                    return (
                        <div
                            key={product.id}
                            style={{
                                border: "1px solid #e5e5e5",
                                borderRadius: "12px",
                                padding: "1.5rem",
                                background: "#fafafa",
                            }}
                        >
                            <div style={{ marginBottom: "1rem" }}>
                                <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem" }}>
                                    {product.title}
                                </h2>
                                <code
                                    style={{
                                        fontSize: "0.75rem",
                                        color: "#999",
                                        background: "#f0f0f0",
                                        padding: "2px 6px",
                                        borderRadius: "4px",
                                    }}
                                >
                                    {product.id}
                                </code>
                            </div>

                            {/* Product Images */}
                            {mediaImages.length > 0 && (
                                <section style={{ marginBottom: "1.5rem" }}>
                                    <h3
                                        style={{
                                            fontSize: "0.8rem",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em",
                                            color: "#666",
                                            margin: "0 0 0.75rem",
                                        }}
                                    >
                                        📷 Product Images
                                    </h3>
                                    <div
                                        style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}
                                    >
                                        {mediaImages.map(({ node: media }) => {
                                            const img = media.image;
                                            const isLoading = optimizingId === media.id;

                                            return (
                                                <div
                                                    key={media.id}
                                                    style={{ textAlign: "center", width: "140px" }}
                                                >
                                                    <img
                                                        src={img?.url}
                                                        alt={img?.altText || ""}
                                                        width={130}
                                                        height={130}
                                                        style={imgStyle}
                                                        loading="lazy"
                                                    />
                                                    <div
                                                        style={{
                                                            fontSize: "0.7rem",
                                                            color: "#888",
                                                            margin: "4px 0",
                                                        }}
                                                    >
                                                        {img?.width}×{img?.height}
                                                    </div>
                                                    <Form method="post">
                                                        <input type="hidden" name="intent" value="product_image" />
                                                        <input type="hidden" name="productId" value={product.id} />
                                                        <input type="hidden" name="imageId" value={media.id} />
                                                        <input type="hidden" name="imageUrl" value={img?.url || ""} />
                                                        <input type="hidden" name="altText" value={img?.altText || ""} />
                                                        <input type="hidden" name="originalWidth" value={img?.width || ""} />
                                                        <input type="hidden" name="originalHeight" value={img?.height || ""} />
                                                        <button
                                                            type="submit"
                                                            disabled={isLoading}
                                                            style={btnStyle("#008060", isLoading)}
                                                        >
                                                            {isLoading ? "⏳ Processing…" : "⚡ Optimize"}
                                                        </button>
                                                    </Form>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {/* Variant Images */}
                            {variantsWithImage.length > 0 && (
                                <section>
                                    <h3
                                        style={{
                                            fontSize: "0.8rem",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em",
                                            color: "#666",
                                            margin: "0 0 0.75rem",
                                        }}
                                    >
                                        🎨 Variant Images
                                    </h3>
                                    <div
                                        style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}
                                    >
                                        {variantsWithImage.map(({ node: variant }) => {
                                            const isLoading = optimizingId === variant.id;
                                            const mediaImageId = variant.image?.id?.replace(
                                                "gid://shopify/ProductImage/",
                                                "gid://shopify/MediaImage/"
                                            );

                                            return (
                                                <div
                                                    key={variant.id}
                                                    style={{ textAlign: "center", width: "140px" }}
                                                >
                                                    <p
                                                        style={{
                                                            fontSize: "0.8rem",
                                                            margin: "0 0 6px",
                                                            fontWeight: 600,
                                                            color: "#333",
                                                        }}
                                                    >
                                                        {variant.title}
                                                    </p>
                                                    <img
                                                        src={variant.image?.url}
                                                        alt={variant.image?.altText || ""}
                                                        width={130}
                                                        height={130}
                                                        style={imgStyle}
                                                        loading="lazy"
                                                    />
                                                    <div
                                                        style={{
                                                            fontSize: "0.7rem",
                                                            color: "#888",
                                                            margin: "4px 0",
                                                        }}
                                                    >
                                                        {variant.image?.width}×{variant.image?.height}
                                                    </div>
                                                    <Form method="post">
                                                        <input type="hidden" name="intent" value="variant_image" />
                                                        <input type="hidden" name="productId" value={product.id} />
                                                        <input type="hidden" name="variantId" value={variant.id} />
                                                        <input type="hidden" name="imageId" value={mediaImageId || ""} />
                                                        <input type="hidden" name="imageUrl" value={variant.image?.url || ""} />
                                                        <input type="hidden" name="altText" value={variant.image?.altText || ""} />
                                                        <input type="hidden" name="originalWidth" value={variant.image?.width || ""} />
                                                        <input type="hidden" name="originalHeight" value={variant.image?.height || ""} />
                                                        <button
                                                            type="submit"
                                                            disabled={isLoading}
                                                            style={btnStyle("#5c6ac4", isLoading)}
                                                        >
                                                            {isLoading ? "⏳ Processing…" : "⚡ Optimize"}
                                                        </button>
                                                    </Form>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Bottom Pagination */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "1rem",
                    margin: "1.5rem 0",
                }}
            >
                <button
                    onClick={goPrev}
                    disabled={!pageInfo.hasPreviousPage || isSubmitting}
                    style={paginationBtn(!pageInfo.hasPreviousPage || isSubmitting)}
                >
                    ← Previous
                </button>
                <span style={{ fontSize: "0.85rem", color: "#666" }}>
                    {products.length} products
                </span>
                <button
                    onClick={goNext}
                    disabled={!pageInfo.hasNextPage || isSubmitting}
                    style={paginationBtn(!pageInfo.hasNextPage || isSubmitting)}
                >
                    Next →
                </button>
            </div>
        </div>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const btnStyle = (bg: string, disabled: boolean): React.CSSProperties => ({
    padding: "6px 14px",
    background: disabled ? "#bbb" : bg,
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "0.8rem",
    fontWeight: 500,
    marginTop: "8px",
    transition: "opacity 0.2s",
    opacity: disabled ? 0.7 : 1,
    width: "100%",
});

const imgStyle: React.CSSProperties = {
    objectFit: "cover",
    borderRadius: "8px",
    border: "1px solid #e0e0e0",
    display: "block",
    background: "#f5f5f5",
};

const paginationBtn = (disabled: boolean): React.CSSProperties => ({
    padding: "8px 20px",
    background: disabled ? "#e0e0e0" : "#008060",
    color: disabled ? "#999" : "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
    fontSize: "0.9rem",
});