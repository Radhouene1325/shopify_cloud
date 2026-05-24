
// import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
// import {
//     Form,
//     useLoaderData,
//     useActionData,
//     useNavigate,
//     useNavigation,
//     useRevalidator,
// } from "@remix-run/react";
// import { useEffect, useState } from "react";
// import { shopify } from "../shopify.server";

// // ─── TYPES ────────────────────────────────────────────────────────────────

// interface GraphQLError {
//     message: string;
//     extensions?: Record<string, any>;
// }

// interface GraphQLResponse<T = any> {
//     data?: T;
//     errors?: GraphQLError[];
// }

// export async function safeGraphql<T = any>(
//     admin: any,
//     query: string,
//     variables: Record<string, any> = {},
//     retries = 3,
//     baseDelay = 1000
// ): Promise<GraphQLResponse<T>> {
//     try {
//         const response = await admin.graphql(query, { variables });
//         const json: GraphQLResponse<T> = await response.json();

//         const isThrottled = json.errors?.some(
//             (e) => e.message.includes("Throttled") || e.extensions?.code === "THROTTLED"
//         );

//         if (isThrottled && retries > 0) {
//             const delay = baseDelay * Math.pow(2, 3 - retries);
//             await new Promise((r) => setTimeout(r, delay));
//             return safeGraphql(admin, query, variables, retries - 1, baseDelay);
//         }

//         return json;
//     } catch (err) {
//         if (retries > 0) {
//             const delay = baseDelay * Math.pow(2, 3 - retries);
//             await new Promise((r) => setTimeout(r, delay));
//             return safeGraphql(admin, query, variables, retries - 1, baseDelay);
//         }
//         throw err;
//     }
// }

// export interface CompressionResult {
//     compressedBuffer: Uint8Array;
//     contentType: string;
//     format: string;
//     originalSize: number;
//     compressedSize: number;
// }

// export function detectImageFormat(imageUrl: string): string {
//     try {
//         const url = new URL(imageUrl);
//         const ext = url.pathname.split(".").pop()?.toLowerCase();
//         if (ext === "png") return "PNG";
//         if (ext === "jpg" || ext === "jpeg") return "JPEG";
//         if (ext === "webp") return "WebP";
//         if (ext === "avif") return "AVIF";
//         return "Original";
//     } catch {
//         return "Original";
//     }
// }

// export function formatBytes(bytes: number): string {
//     if (bytes === 0) return "0 B";
//     const k = 1024;
//     const sizes = ["B", "KB", "MB", "GB"];
//     const i = Math.floor(Math.log(bytes) / Math.log(k));
//     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
// }

// export function calculateReduction(original: number, optimized: number): string {
//     if (original === 0 || original <= optimized) return "0%";
//     const reduction = ((original - optimized) / original) * 100;
//     return reduction.toFixed(1) + "%";
// }

// export async function compressImage(
//     imageUrl: string,
//     options: {
//         format?: "avif" | "webp";
//         quality?: number;
//         maxWidth?: number;
//         cfImageDomain?: string;
//     } = {}
// ): Promise<CompressionResult> {
//     const {
//         format = "avif",
//         quality = 75,
//         maxWidth = 1600,
//         cfImageDomain,
//     } = options;

//     let originalSize = 0;
//     try {
//         const headRes = await fetch(imageUrl, {
//             method: "HEAD",
//             redirect: "follow",
//         });
//         const cl = headRes.headers.get("content-length");
//         if (cl) originalSize = Number(cl);
//     } catch {
//         // HEAD may fail on some CDNs
//     }

//     let optimizedUrl: string;

//     if (cfImageDomain) {
//         const cfParams = `format=${format},quality=${quality},width=${maxWidth},fit=scale-down`;
//         optimizedUrl = `${cfImageDomain}/cdn-cgi/image/${cfParams}/${encodeURIComponent(imageUrl)}`;
//     } else {
//         const separator = imageUrl.includes("?") ? "&" : "?";
//         optimizedUrl = `${imageUrl}${separator}format=${format}&width=${maxWidth}&quality=${quality}`;
//     }

//     console.log(`[Image Optimizer] Fetching: ${optimizedUrl}`);

//     const response = await fetch(optimizedUrl, {
//         headers: {
//             Accept: `image/${format},image/webp;q=0.9,image/*;q=0.8,*/*;q=0.7`,
//         },
//     });



//     if (!response.ok) {
//         const errorText = await response.text().catch(() => "No details");
//         throw new Error(`Image optimization failed: ${response.status} - ${errorText}`);
//     }

//     const contentType = response.headers.get("content-type") || `image/${format}`;
//     const arrayBuffer = await response.arrayBuffer();
//     const compressedBuffer = new Uint8Array(arrayBuffer);
//     const compressedSize = compressedBuffer.byteLength;



//     const finalFormat = contentType.includes("avif")
//         ? "AVIF"
//         : contentType.includes("webp")
//         ? "WebP"
//         : detectImageFormat(imageUrl);

//     return {
//         compressedBuffer,
//         contentType,
//         format: finalFormat,
//         originalSize: originalSize || compressedSize,
//         compressedSize,
//     };
// }





// export async function uploadToShopifyCDN(
//     admin: any,
//     compressedBuffer: Uint8Array,
//     contentType: string,
//     originalFilename?: string
// ): Promise<string> {
//     const ext = contentType.includes("avif")
//         ? "avif"
//         : contentType.includes("webp")
//         ? "webp"
//         : "jpg";

//     // Preserve original name but force correct extension for the new format
//     let name: string;
//     if (originalFilename) {
//         const baseName = originalFilename.replace(/\.[^/.]+$/, ""); // remove old extension
//         name = `${baseName || "optimized"}.${ext}`;
//     } else {
//         name = `optimized-${Date.now()}.${ext}`;
//     }

//     const stagedRes = await safeGraphql(admin, `
//     mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
//       stagedUploadsCreate(input: $input) {
//         stagedTargets {
//           url
//           resourceUrl
//           parameters { name value }
//         }
//         userErrors { field message }
//       }
//     }
//   `, {
//         input: [
//             {
//                 filename: name,
//                 mimeType: contentType,
//                 resource: "IMAGE",
//                 fileSize: String(compressedBuffer.byteLength),
//                 httpMethod: "POST",
//             },
//         ],
//     });

//     // ... rest of function remains identical ...
//     const target = stagedRes.data?.stagedUploadsCreate?.stagedTargets?.[0];
//     const errors = stagedRes.data?.stagedUploadsCreate?.userErrors;

//     if (errors?.length) {
//         throw new Error(errors.map((e: any) => e.message).join(", "));
//     }
//     if (!target) {
//         throw new Error("No target received from stagedUploadsCreate");
//     }

//     const formData = new FormData();
//     target.parameters.forEach((param: any) => {
//         formData.append(param.name, param.value);
//     });

//     const blob = new Blob([compressedBuffer as any], { type: contentType });
//     formData.append("file", blob, name);

//     const uploadRes = await fetch(target.url, {
//         method: "POST",
//         body: formData,
//     });

//     if (!uploadRes.ok) {
//         const text = await uploadRes.text().catch(() => "Unknown error");
//         throw new Error(`Shopify CDN upload failed: ${uploadRes.status} - ${text}`);
//     }

//     return target.resourceUrl;
// }
// interface ImageData {
//     id?: string;
//     url: string;
//     altText?: string;
//     width?: number;
//     height?: number;
// }

// interface ComparisonData {
//     before: {
//         url: string;
//         width?: number;
//         height?: number;
//         format: string;
//         size: number;
//         sizeFormatted: string;
//     };
//     after: {
//         url: string;
//         width?: number;
//         height?: number;
//         format: string;
//         size: number;
//         sizeFormatted: string;
//     };
//     reductionPercent: string;
//     reductionBytes: number;
// }

// interface ActionData {
//     success: boolean;
//     type?: "product_image" | "variant_image";
//     comparison?: ComparisonData;
//     errors?: Array<{ field?: string; message: string }>;
//     error?: string;
// }

// interface LoaderData {
//     products: Array<{
//         cursor: string;
//         node: {
//             id: string;
//             title: string;
//             media: {
//                 edges: Array<{
//                     node: {
//                         id: string;
//                         mediaContentType: string;
//                         image?: ImageData;
//                     };
//                 }>;
//             };
//             variants: {
//                 edges: Array<{
//                     node: {
//                         id: string;
//                         title: string;
//                         image?: ImageData;
//                     };
//                 }>;
//             };
//         };
//     }>;
//     pageInfo: {
//         hasNextPage: boolean;
//         hasPreviousPage: boolean;
//         startCursor?: string;
//         endCursor?: string;
//     };
// }

// const PAGE_SIZE = 10;

// // ─── GRAPHQL ──────────────────────────────────────────────────────────────

// const PRODUCTS_QUERY = `
//   query GetProductsWithImages($first: Int, $last: Int, $after: String, $before: String) {
//     products(first: $first, last: $last, after: $after, before: $before) {
//       pageInfo {
//         hasNextPage
//         hasPreviousPage
//         startCursor
//         endCursor
//       }
//       edges {
//         cursor
//         node {
//           id
//           title
//           media(first: 20) {
//             edges {
//               node {
//                 id
//                 mediaContentType
//                 ... on MediaImage {
//                   image {
//                     url
//                     altText
//                     width
//                     height
//                   }
//                 }
//               }
//             }
//           }
//           variants(first: 50) {
//             edges {
//               node {
//                 id
//                 title
//                 image {
//                   id
//                   url
//                   altText
//                   width
//                   height
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   }
// `;

// // ─── LOADER ───────────────────────────────────────────────────────────────

// export const loader = async ({ request, context }: LoaderFunctionArgs) => {
//     const { admin } = await shopify(context).authenticate.admin(request);

//     const url = new URL(request.url);
//     const cursor = url.searchParams.get("cursor");
//     const dir = url.searchParams.get("dir") || "next";

//     const variables: Record<string, any> =
//         dir === "prev" && cursor
//             ? { last: PAGE_SIZE, before: cursor }
//             : { first: PAGE_SIZE, after: cursor || null };

//     const data = await safeGraphql(admin, PRODUCTS_QUERY, variables);

//     return json<LoaderData>({
//         products: data.data!.products.edges,
//         pageInfo: data.data!.products.pageInfo,
//     });
// };

// // ─── ACTION ───────────────────────────────────────────────────────────────



// export const action = async ({ request, context }: ActionFunctionArgs) => {
//     const { admin } = await shopify(context).authenticate.admin(request);
//     const formData = await request.formData();

//     const intent = formData.get("intent") as string;
//     const imageUrl = formData.get("imageUrl") as string;

//     // ✅ Preserves original "Testo alternativo"
//     const originalAltText = (formData.get("altText") as string) || "";

//     const productId = formData.get("productId") as string;

//     const originalWidth = Number(formData.get("originalWidth")) || undefined;
//     const originalHeight = Number(formData.get("originalHeight")) || undefined;
//     const originalFormat = detectImageFormat(imageUrl);

//     // ✅ Extract original "nome" (filename) to preserve it
//     const urlObj = new URL(imageUrl);
//     const originalFilename = urlObj.pathname.split("/").pop() || "image";

//     if (!intent || !imageUrl || !productId) {
//         return json<ActionData>({ success: false, error: "Missing required fields" });
//     }

//     try {
//         const cfDomain = (context.cloudflare.env as any).CF_IMAGE_DOMAIN as string | undefined;

//         const {
//             compressedBuffer,
//             contentType,
//             format: compressedFormat,
//             originalSize,
//             compressedSize,
//         } = await compressImage(imageUrl, {
//             format: "avif",
//             quality: 75,
//             maxWidth: 1600,
//             cfImageDomain: cfDomain,
//         });

//         // ✅ Pass original filename so uploadToShopifyCDN can preserve the base name
//         const resourceUrl = await uploadToShopifyCDN(
//             admin,
//             compressedBuffer,
//             contentType,
//             originalFilename
//         );

//         if (intent === "product_image") {
//             const oldMediaId = formData.get("imageId") as string;

//             const createRes = await safeGraphql(admin, `
//         mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
//           productCreateMedia(productId: $productId, media: $media) {
//             media {
//               id
//               alt
//               ... on MediaImage {
//                 image {
//                   url
//                   altText
//                   width
//                   height
//                 }
//               }
//             }
//             mediaUserErrors { field message }
//           }
//         }
//       `, {
//                 productId,
//                 media: [
//                     {
//                         mediaContentType: "IMAGE",
//                         originalSource: resourceUrl,
//                         alt: originalAltText, // ✅ Preserved alt text
//                     },
//                 ],
//             });

//             // ... rest identical ...
//             const newMedia = createRes.data?.productCreateMedia?.media?.[0];
//             const errors = createRes.data?.productCreateMedia?.mediaUserErrors;

//             if (errors?.length) {
//                 return json<ActionData>({ success: false, errors });
//             }
//             if (!newMedia) {
//                 return json<ActionData>({ success: false, error: "Failed to create media" });
//             }

//             if (oldMediaId) {
//                 try {
//                     await safeGraphql(admin, `
//             mutation productDeleteMedia($productId: ID!, $mediaIds: [ID!]!) {
//               productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
//                 deletedMediaIds
//                 userErrors { field message }
//               }
//             }
//           `, { productId, mediaIds: [oldMediaId] });
//                 } catch (e) {
//                     console.warn("[Optimizer] Cleanup old product media failed:", e);
//                 }
//             }

//             return json<ActionData>({
//                 success: true,
//                 type: "product_image",
//                 comparison: {
//                     before: {
//                         url: imageUrl,
//                         width: originalWidth,
//                         height: originalHeight,
//                         format: originalFormat,
//                         size: originalSize,
//                         sizeFormatted: formatBytes(originalSize),
//                     },
//                     after: {
//                         url: newMedia.image?.url || resourceUrl,
//                         width: newMedia.image?.width || originalWidth,
//                         height: newMedia.image?.height || originalHeight,
//                         format: compressedFormat,
//                         size: compressedSize,
//                         sizeFormatted: formatBytes(compressedSize),
//                     },
//                     reductionPercent: calculateReduction(originalSize, compressedSize),
//                     reductionBytes: originalSize - compressedSize,
//                 },
//             });
//         }

//         if (intent === "variant_image") {
//             const variantId = formData.get("variantId") as string;
//             const oldMediaId = formData.get("imageId") as string;

//             if (!variantId) {
//                 return json<ActionData>({ success: false, error: "Missing variantId" });
//             }

//             const createRes = await safeGraphql(admin, `
//         mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
//           productCreateMedia(productId: $productId, media: $media) {
//             media {
//               id
//               ... on MediaImage {
//                 image { url width height }
//               }
//             }
//             mediaUserErrors { field message }
//           }
//         }
//       `, {
//                 productId,
//                 media: [
//                     {
//                         mediaContentType: "IMAGE",
//                         originalSource: resourceUrl,
//                         alt: originalAltText, // ✅ Preserved alt text
//                     },
//                 ],
//             });

//             // ... rest identical ...
//             const newMediaId = createRes.data?.productCreateMedia?.media?.[0]?.id;
//             const newMediaImage = createRes.data?.productCreateMedia?.media?.[0]?.image;
//             const errors = createRes.data?.productCreateMedia?.mediaUserErrors;

//             if (errors?.length) {
//                 return json<ActionData>({ success: false, errors });
//             }
//             if (!newMediaId) {
//                 return json<ActionData>({ success: false, error: "Failed to create media" });
//             }

//             const updateRes = await safeGraphql(admin, `
//         mutation productVariantsBulkUpdate(
//           $productId: ID!
//           $variants: [ProductVariantsBulkInput!]!
//         ) {
//           productVariantsBulkUpdate(productId: $productId, variants: $variants) {
//             productVariants {
//               id
//               title
//               image {
//                 url
//                 altText
//                 width
//                 height
//               }
//             }
//             userErrors { field message }
//           }
//         }
//       `, {
//                 productId,
//                 variants: [{ id: variantId, mediaId: [newMediaId] }],
//             });

//             const updateErrors = updateRes.data?.productVariantsBulkUpdate?.userErrors;
//             if (updateErrors?.length) {
//                 return json<ActionData>({ success: false, errors: updateErrors });
//             }

//             const updatedVariant = updateRes.data?.productVariantsBulkUpdate?.productVariants?.[0];

//             if (oldMediaId) {
//                 try {
//                     await safeGraphql(admin, `
//             mutation productDeleteMedia($productId: ID!, $mediaIds: [ID!]!) {
//               productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
//                 deletedMediaIds
//                 userErrors { field message }
//               }
//             }
//           `, { productId, mediaIds: [oldMediaId] });
//                 } catch (e) {
//                     console.warn("[Optimizer] Cleanup old variant media failed:", e);
//                 }
//             }

//             return json<ActionData>({
//                 success: true,
//                 type: "variant_image",
//                 comparison: {
//                     before: {
//                         url: imageUrl,
//                         width: originalWidth,
//                         height: originalHeight,
//                         format: originalFormat,
//                         size: originalSize,
//                         sizeFormatted: formatBytes(originalSize),
//                     },
//                     after: {
//                         url: updatedVariant?.image?.url || newMediaImage?.url || resourceUrl,
//                         width: updatedVariant?.image?.width || newMediaImage?.width || originalWidth,
//                         height: updatedVariant?.image?.height || newMediaImage?.height || originalHeight,
//                         format: compressedFormat,
//                         size: compressedSize,
//                         sizeFormatted: formatBytes(compressedSize),
//                     },
//                     reductionPercent: calculateReduction(originalSize, compressedSize),
//                     reductionBytes: originalSize - compressedSize,
//                 },
//             });
//         }

//         return json<ActionData>({ success: false, error: "Unknown intent" });
//     } catch (err: any) {
//         console.error("[Image Optimizer] Action error:", err);
//         return json<ActionData>({
//             success: false,
//             error: err.message || "Internal server error",
//         });
//     }
// };

// // ─── UI ───────────────────────────────────────────────────────────────────

// export default function ImageOptimizer() {
//     const { products, pageInfo } = useLoaderData<LoaderData>();
//     const actionData = useActionData<ActionData>();
//     const navigate = useNavigate();
//     const navigation = useNavigation();
//     const revalidator = useRevalidator();

//     const [lastComparison, setLastComparison] = useState<ComparisonData | null>(null);

//     useEffect(() => {
//         if (actionData?.success && actionData.comparison) {
//             setLastComparison(actionData.comparison);
//             if (revalidator.state === "idle") {
//                 revalidator.revalidate();
//             }
//         }
//     }, [actionData, revalidator]);

//     const isSubmitting = navigation.state === "submitting";
//     const activeFormData = isSubmitting ? navigation.formData : null;
//     const optimizingId = activeFormData
//         ? (activeFormData.get("imageId") as string) ||
//           (activeFormData.get("variantId") as string)
//         : null;

//     const goNext = () => {
//         if (!pageInfo.hasNextPage || !pageInfo.endCursor) return;
//         navigate(`?cursor=${pageInfo.endCursor}&dir=next`);
//     };

//     const goPrev = () => {
//         if (!pageInfo.hasPreviousPage || !pageInfo.startCursor) return;
//         navigate(`?cursor=${pageInfo.startCursor}&dir=prev`);
//     };

//     const comparison = actionData?.comparison || lastComparison;

//     return (
//         <div
//             style={{
//                 padding: "2rem",
//                 fontFamily: "Inter, system-ui, sans-serif",
//                 maxWidth: "1200px",
//                 margin: "0 auto",
//             }}
//         >
//             <header style={{ marginBottom: "2rem" }}>
//                 <h1 style={{ fontSize: "1.75rem", margin: "0 0 0.5rem" }}>
//                     🖼️ Bulk Image Optimizer
//                 </h1>
//                 <p style={{ color: "#666", margin: 0 }}>
//                     AVIF • Cloudflare / Shopify CDN • GraphQL Admin API 2025-01
//                 </p>
//             </header>

//             {comparison && (
//                 <div
//                     style={{
//                         marginBottom: "2rem",
//                         border: "2px solid #34a853",
//                         borderRadius: "12px",
//                         padding: "1.5rem",
//                         background: "#f6ffed",
//                     }}
//                 >
//                     <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
//                         <span style={{ fontSize: "1.25rem" }}>✅</span>
//                         <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#1e8e3e" }}>
//                             Image Successfully Optimized
//                         </h2>
//                     </div>

//                     <div
//                         style={{
//                             display: "flex",
//                             justifyContent: "center",
//                             gap: "2rem",
//                             marginBottom: "1.25rem",
//                             padding: "0.75rem",
//                             background: "#fff",
//                             borderRadius: "8px",
//                             fontSize: "0.85rem",
//                         }}
//                     >
//                         <div style={{ textAlign: "center" }}>
//                             <div style={{ color: "#666" }}>Original size</div>
//                             <div style={{ fontWeight: 700, color: "#ea4335" }}>
//                                 {comparison.before.size > 0 ? comparison.before.sizeFormatted : "Unknown"}
//                             </div>
//                         </div>
//                         <div style={{ textAlign: "center" }}>
//                             <div style={{ color: "#666" }}>Optimized</div>
//                             <div style={{ fontWeight: 700, color: "#34a853" }}>
//                                 {comparison.after.sizeFormatted}
//                             </div>
//                         </div>
//                         <div style={{ textAlign: "center" }}>
//                             <div style={{ color: "#666" }}>Saved</div>
//                             <div style={{ fontWeight: 700, color: "#1a73e8" }}>
//                                 {comparison.before.size > 0
//                                     ? `${formatBytes(comparison.reductionBytes)} (${comparison.reductionPercent})`
//                                     : "N/A"}
//                             </div>
//                         </div>
//                     </div>

//                     <div
//                         style={{
//                             display: "grid",
//                             gridTemplateColumns: "1fr auto 1fr",
//                             gap: "1rem",
//                             alignItems: "center",
//                         }}
//                     >
//                         <div
//                             style={{
//                                 textAlign: "center",
//                                 padding: "1rem",
//                                 background: "#fff",
//                                 borderRadius: "10px",
//                                 border: "2px solid #ea4335",
//                             }}
//                         >
//                             <div
//                                 style={{
//                                     display: "inline-block",
//                                     background: "#ea4335",
//                                     color: "#fff",
//                                     padding: "2px 10px",
//                                     borderRadius: "12px",
//                                     fontSize: "0.75rem",
//                                     fontWeight: 700,
//                                     marginBottom: "0.75rem",
//                                     textTransform: "uppercase",
//                                 }}
//                             >
//                                 Before
//                             </div>
//                             <img
//                                 src={comparison.before.url}
//                                 alt="Before"
//                                 style={{
//                                     width: "100%",
//                                     maxWidth: "180px",
//                                     height: "140px",
//                                     objectFit: "cover",
//                                     borderRadius: "8px",
//                                     display: "block",
//                                     margin: "0 auto 0.75rem",
//                                 }}
//                             />
//                             <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#333" }}>
//                                 {comparison.before.format}
//                             </div>
//                             <div style={{ fontSize: "0.75rem", color: "#666" }}>
//                                 {comparison.before.width && comparison.before.height
//                                     ? `${comparison.before.width}×${comparison.before.height}px`
//                                     : "Dimensions unknown"}
//                             </div>
//                             <div style={{ fontSize: "0.75rem", color: "#ea4335", fontWeight: 600, marginTop: "2px" }}>
//                                 {comparison.before.sizeFormatted}
//                             </div>
//                         </div>

//                         <div style={{ textAlign: "center", fontSize: "1.5rem", color: "#34a853" }}>
//                             ➜
//                             <div style={{ fontSize: "0.7rem", color: "#666", marginTop: "4px", fontWeight: 600 }}>
//                                 {comparison.before.size > 0
//                                     ? `${comparison.reductionPercent} smaller`
//                                     : "Optimized"}
//                             </div>
//                         </div>

//                         <div
//                             style={{
//                                 textAlign: "center",
//                                 padding: "1rem",
//                                 background: "#fff",
//                                 borderRadius: "10px",
//                                 border: "2px solid #34a853",
//                             }}
//                         >
//                             <div
//                                 style={{
//                                     display: "inline-block",
//                                     background: "#34a853",
//                                     color: "#fff",
//                                     padding: "2px 10px",
//                                     borderRadius: "12px",
//                                     fontSize: "0.75rem",
//                                     fontWeight: 700,
//                                     marginBottom: "0.75rem",
//                                     textTransform: "uppercase",
//                                 }}
//                             >
//                                 After
//                             </div>
//                             <img
//                                 src={comparison.after.url}
//                                 alt="After"
//                                 style={{
//                                     width: "100%",
//                                     maxWidth: "180px",
//                                     height: "140px",
//                                     objectFit: "cover",
//                                     borderRadius: "8px",
//                                     display: "block",
//                                     margin: "0 auto 0.75rem",
//                                 }}
//                             />
//                             <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#333" }}>
//                                 {comparison.after.format}
//                             </div>
//                             <div style={{ fontSize: "0.75rem", color: "#666" }}>
//                                 {comparison.after.width && comparison.after.height
//                                     ? `${comparison.after.width}×${comparison.after.height}px`
//                                     : "Dimensions unknown"}
//                             </div>
//                             <div style={{ fontSize: "0.75rem", color: "#34a853", fontWeight: 600, marginTop: "2px" }}>
//                                 {comparison.after.sizeFormatted}
//                             </div>
//                         </div>
//                     </div>

//                     <button
//                         onClick={() => setLastComparison(null)}
//                         style={{
//                             marginTop: "1rem",
//                             padding: "6px 14px",
//                             background: "#fff",
//                             border: "1px solid #ccc",
//                             borderRadius: "6px",
//                             cursor: "pointer",
//                             fontSize: "0.8rem",
//                             color: "#666",
//                         }}
//                     >
//                         Dismiss
//                     </button>
//                 </div>
//             )}

//             {actionData && !actionData.success && (
//                 <div
//                     style={{
//                         padding: "1rem 1.25rem",
//                         marginBottom: "1.5rem",
//                         borderRadius: "8px",
//                         background: "#fce8e6",
//                         border: "1px solid #ea4335",
//                         fontSize: "0.9rem",
//                     }}
//                 >
//                     ❌ <strong>Error:</strong>{" "}
//                     {actionData.errors?.map((e) => e.message).join(", ") ||
//                         actionData.error ||
//                         "Unknown"}
//                 </div>
//             )}

//             <div
//                 style={{
//                     display: "flex",
//                     justifyContent: "center",
//                     alignItems: "center",
//                     gap: "1rem",
//                     margin: "1.5rem 0",
//                 }}
//             >
//                 <button
//                     onClick={goPrev}
//                     disabled={!pageInfo.hasPreviousPage || isSubmitting}
//                     style={paginationBtn(!pageInfo.hasPreviousPage || isSubmitting)}
//                 >
//                     ← Previous
//                 </button>
//                 <span style={{ fontSize: "0.85rem", color: "#666" }}>
//                     {products.length} products
//                 </span>
//                 <button
//                     onClick={goNext}
//                     disabled={!pageInfo.hasNextPage || isSubmitting}
//                     style={paginationBtn(!pageInfo.hasNextPage || isSubmitting)}
//                 >
//                     Next →
//                 </button>
//             </div>

//             <div style={{ display: "grid", gap: "1.5rem" }}>
//                 {products.map(({ node: product }) => {
//                     const mediaImages =
//                         product.media?.edges?.filter(
//                             ({ node: m }) => m.mediaContentType === "IMAGE"
//                         ) || [];

//                     const variantsWithImage =
//                         product.variants?.edges?.filter(({ node: v }) => v.image) || [];

//                     return (
//                         <div
//                             key={product.id}
//                             style={{
//                                 border: "1px solid #e5e5e5",
//                                 borderRadius: "12px",
//                                 padding: "1.5rem",
//                                 background: "#fafafa",
//                             }}
//                         >
//                             <div style={{ marginBottom: "1rem" }}>
//                                 <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem" }}>
//                                     {product.title}
//                                 </h2>
//                                 <code
//                                     style={{
//                                         fontSize: "0.75rem",
//                                         color: "#999",
//                                         background: "#f0f0f0",
//                                         padding: "2px 6px",
//                                         borderRadius: "4px",
//                                     }}
//                                 >
//                                     {product.id}
//                                 </code>
//                             </div>

//                             {mediaImages.length > 0 && (
//                                 <section style={{ marginBottom: "1.5rem" }}>
//                                     <h3
//                                         style={{
//                                             fontSize: "0.8rem",
//                                             textTransform: "uppercase",
//                                             letterSpacing: "0.05em",
//                                             color: "#666",
//                                             margin: "0 0 0.75rem",
//                                         }}
//                                     >
//                                         📷 Product Images
//                                     </h3>
//                                     <div
//                                         style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}
//                                     >
//                                         {mediaImages.map(({ node: media }) => {
//                                             const img = media.image;
//                                             const isLoading = optimizingId === media.id;

//                                             return (
//                                                 <div
//                                                     key={media.id}
//                                                     style={{ textAlign: "center", width: "140px" }}
//                                                 >
//                                                     <img
//                                                         src={img?.url}
//                                                         alt={img?.altText || ""}
//                                                         width={130}
//                                                         height={130}
//                                                         style={imgStyle}
//                                                         loading="lazy"
//                                                     />
//                                                     <div
//                                                         style={{
//                                                             fontSize: "0.7rem",
//                                                             color: "#888",
//                                                             margin: "4px 0",
//                                                         }}
//                                                     >
//                                                         {img?.width}×{img?.height}
//                                                     </div>
//                                                     <Form method="post">
//                                                         <input type="hidden" name="intent" value="product_image" />
//                                                         <input type="hidden" name="productId" value={product.id} />
//                                                         <input type="hidden" name="imageId" value={media.id} />
//                                                         <input type="hidden" name="imageUrl" value={img?.url || ""} />
//                                                         <input type="hidden" name="altText" value={img?.altText || ""} />
//                                                         <input type="hidden" name="originalWidth" value={img?.width || ""} />
//                                                         <input type="hidden" name="originalHeight" value={img?.height || ""} />
//                                                         <button
//                                                             type="submit"
//                                                             disabled={isLoading}
//                                                             style={btnStyle("#008060", isLoading)}
//                                                         >
//                                                             {isLoading ? "⏳ Processing…" : "⚡ Optimize"}
//                                                         </button>
//                                                     </Form>
//                                                 </div>
//                                             );
//                                         })}
//                                     </div>
//                                 </section>
//                             )}

//                             {variantsWithImage.length > 0 && (
//                                 <section>
//                                     <h3
//                                         style={{
//                                             fontSize: "0.8rem",
//                                             textTransform: "uppercase",
//                                             letterSpacing: "0.05em",
//                                             color: "#666",
//                                             margin: "0 0 0.75rem",
//                                         }}
//                                     >
//                                         🎨 Variant Images
//                                     </h3>
//                                     <div
//                                         style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}
//                                     >
//                                         {variantsWithImage.map(({ node: variant }) => {
//                                             const isLoading = optimizingId === variant.id;
//                                             const mediaImageId = variant.image?.id?.replace(
//                                                 "gid://shopify/ProductImage/",
//                                                 "gid://shopify/MediaImage/"
//                                             );

//                                             return (
//                                                 <div
//                                                     key={variant.id}
//                                                     style={{ textAlign: "center", width: "140px" }}
//                                                 >
//                                                     <p
//                                                         style={{
//                                                             fontSize: "0.8rem",
//                                                             margin: "0 0 6px",
//                                                             fontWeight: 600,
//                                                             color: "#333",
//                                                         }}
//                                                     >
//                                                         {variant.title}
//                                                     </p>
//                                                     <img
//                                                         src={variant.image?.url}
//                                                         alt={variant.image?.altText || ""}
//                                                         width={130}
//                                                         height={130}
//                                                         style={imgStyle}
//                                                         loading="lazy"
//                                                     />
//                                                     <div
//                                                         style={{
//                                                             fontSize: "0.7rem",
//                                                             color: "#888",
//                                                             margin: "4px 0",
//                                                         }}
//                                                     >
//                                                         {variant.image?.width}×{variant.image?.height}
//                                                     </div>
//                                                     <Form method="post">
//                                                         <input type="hidden" name="intent" value="variant_image" />
//                                                         <input type="hidden" name="productId" value={product.id} />
//                                                         <input type="hidden" name="variantId" value={variant.id} />
//                                                         <input type="hidden" name="imageId" value={mediaImageId || ""} />
//                                                         <input type="hidden" name="imageUrl" value={variant.image?.url || ""} />
//                                                         <input type="hidden" name="altText" value={variant.image?.altText || ""} />
//                                                         <input type="hidden" name="originalWidth" value={variant.image?.width || ""} />
//                                                         <input type="hidden" name="originalHeight" value={variant.image?.height || ""} />
//                                                         <button
//                                                             type="submit"
//                                                             disabled={isLoading}
//                                                             style={btnStyle("#5c6ac4", isLoading)}
//                                                         >
//                                                             {isLoading ? "⏳ Processing…" : "⚡ Optimize"}
//                                                         </button>
//                                                     </Form>
//                                                 </div>
//                                             );
//                                         })}
//                                     </div>
//                                 </section>
//                             )}
//                         </div>
//                     );
//                 })}
//             </div>

//             <div
//                 style={{
//                     display: "flex",
//                     justifyContent: "center",
//                     alignItems: "center",
//                     gap: "1rem",
//                     margin: "1.5rem 0",
//                 }}
//             >
//                 <button
//                     onClick={goPrev}
//                     disabled={!pageInfo.hasPreviousPage || isSubmitting}
//                     style={paginationBtn(!pageInfo.hasPreviousPage || isSubmitting)}
//                 >
//                     ← Previous
//                 </button>
//                 <span style={{ fontSize: "0.85rem", color: "#666" }}>
//                     {products.length} products
//                 </span>
//                 <button
//                     onClick={goNext}
//                     disabled={!pageInfo.hasNextPage || isSubmitting}
//                     style={paginationBtn(!pageInfo.hasNextPage || isSubmitting)}
//                 >
//                     Next →
//                 </button>
//             </div>
//         </div>
//     );
// }

// // ─── Styles ───────────────────────────────────────────────────────────────

// const btnStyle = (bg: string, disabled: boolean): React.CSSProperties => ({
//     padding: "6px 14px",
//     background: disabled ? "#bbb" : bg,
//     color: "#fff",
//     border: "none",
//     borderRadius: "6px",
//     cursor: disabled ? "not-allowed" : "pointer",
//     fontSize: "0.8rem",
//     fontWeight: 500,
//     marginTop: "8px",
//     transition: "opacity 0.2s",
//     opacity: disabled ? 0.7 : 1,
//     width: "100%",
// });

// const imgStyle: React.CSSProperties = {
//     objectFit: "cover",
//     borderRadius: "8px",
//     border: "1px solid #e0e0e0",
//     display: "block",
//     background: "#f5f5f5",
// };

// const paginationBtn = (disabled: boolean): React.CSSProperties => ({
//     padding: "8px 20px",
//     background: disabled ? "#e0e0e0" : "#008060",
//     color: disabled ? "#999" : "#fff",
//     border: "none",
//     borderRadius: "6px",
//     cursor: disabled ? "not-allowed" : "pointer",
//     fontWeight: 600,
//     fontSize: "0.9rem",
// });



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

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface GraphQLError {
    message: string;
    extensions?: Record<string, any>;
}

interface GraphQLResponse<T = any> {
    data?: T;
    errors?: GraphQLError[];
}

interface ImageData {
    id?: string;
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
        size: number;
        sizeFormatted: string;
    };
    after: {
        url: string;
        width?: number;
        height?: number;
        format: string;
        size: number;
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
    products: Array<any>;
    pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor?: string;
        endCursor?: string;
    };
}

interface CompressionResult {
    compressedBuffer: Uint8Array;
    contentType: string;
    format: string;
    originalSize: number;
    compressedSize: number;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export async function safeGraphql<T = any>(
    admin: any,
    query: string,
    variables: Record<string, any> = {},
    retries = 3,
): Promise<GraphQLResponse<T>> {

    try {

        const response = await admin.graphql(query, { variables });
        const json: GraphQLResponse<T> = await response.json();

        const throttled = json.errors?.some(
            (e) =>
                e.message.includes("Throttled") ||
                e.extensions?.code === "THROTTLED"
        );

        if (throttled && retries > 0) {

            await new Promise((r) => setTimeout(r, 1500));

            return safeGraphql(
                admin,
                query,
                variables,
                retries - 1
            );
        }

        return json;

    } catch (e) {

        if (retries > 0) {

            await new Promise((r) => setTimeout(r, 1500));

            return safeGraphql(
                admin,
                query,
                variables,
                retries - 1
            );
        }

        throw e;
    }
}

export function formatBytes(bytes: number): string {

    if (!bytes) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return (
        parseFloat((bytes / Math.pow(k, i)).toFixed(2)) +
        " " +
        sizes[i]
    );
}

export function calculateReduction(
    original: number,
    optimized: number
): string {

    if (!original || original <= optimized) {
        return "0%";
    }

    return (
        (((original - optimized) / original) * 100).toFixed(1) + "%"
    );
}

export function detectImageFormat(url: string): string {

    const ext = url.split(".").pop()?.toLowerCase();

    if (ext === "png") return "PNG";
    if (ext === "jpg" || ext === "jpeg") return "JPEG";
    if (ext === "webp") return "WEBP";
    if (ext === "avif") return "AVIF";

    return "Original";
}

// ─────────────────────────────────────────────────────────────
// COMPRESS IMAGE
// ─────────────────────────────────────────────────────────────

export async function compressImage(
    imageUrl: string,
    options: {
        cfImageDomain: string;
    }
): Promise<CompressionResult> {

    const { cfImageDomain } = options;

    let originalSize = 0;

    try {

        const head = await fetch(imageUrl, {
            method: "HEAD",
        });

        originalSize = Number(
            head.headers.get("content-length") || 0
        );

    } catch { }

    // SUPER AGGRESSIVE AVIF COMPRESSION
    let optimizedUrl =
        `${cfImageDomain}/cdn-cgi/image/` +
        `format=avif,quality=35,width=800,fit=scale-down/` +
        encodeURIComponent(imageUrl);

    let response = await fetch(optimizedUrl, {
        headers: {
            Accept: "image/avif,image/webp,image/*,*/*",
        },
    });

    if (!response.ok) {

        // Fallback to Shopify native CDN with aggressive settings
        const separator = imageUrl.includes("?") ? "&" : "?";
        optimizedUrl = `${imageUrl}${separator}format=avif&width=800`;

        response = await fetch(optimizedUrl, {
            headers: {
                Accept: "image/avif,image/webp,image/*,*/*",
            },
        });

        if (!response.ok) {
            throw new Error(
                `Compression failed ${response.status}`
            );
        }
    }

    const contentType =
        response.headers.get("content-type") ||
        "image/avif";

    const buffer = new Uint8Array(
        await response.arrayBuffer()
    );

    return {
        compressedBuffer: buffer,
        contentType,
        format: "AVIF",
        originalSize,
        compressedSize: buffer.byteLength,
    };
}

// ─────────────────────────────────────────────────────────────
// SHOPIFY UPLOAD
// ─────────────────────────────────────────────────────────────

export async function uploadToShopifyCDN(
    admin: any,
    compressedBuffer: Uint8Array,
    contentType: string,
    originalFilename?: string
): Promise<string> {

    const baseName = originalFilename
        ?.replace(/\.[^/.]+$/, "")
        ?.trim() || `optimized-${Date.now()}`;

    const filename = `${baseName}.avif`;

    const stagedRes = await safeGraphql(admin, `
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
        input: [
            {
                filename,
                mimeType: contentType,
                resource: "IMAGE",
                fileSize: String(compressedBuffer.byteLength),
                httpMethod: "POST",
            },
        ],
    });

    const target =
        stagedRes.data?.stagedUploadsCreate?.stagedTargets?.[0];

    if (!target) {
        throw new Error("No upload target");
    }

    const formData = new FormData();

    target.parameters.forEach((param: any) => {
        formData.append(param.name, param.value);
    });

    formData.append(
        "file",
        new Blob([compressedBuffer as any], {
            type: contentType,
        }),
        filename
    );

    const upload = await fetch(target.url, {
        method: "POST",
        body: formData,
    });

    if (!upload.ok) {

        throw new Error(
            `Upload failed ${upload.status}`
        );
    }

    return target.resourceUrl;
}

// ─────────────────────────────────────────────────────────────
// PRODUCTS QUERY
// ONLY PRODUCTS HAVING QUANTITY = 0
// ─────────────────────────────────────────────────────────────

const PRODUCTS_QUERY = `
query GetProducts(
    $first: Int,
    $after: String,
    $last: Int,
    $before: String
) {

products(
    first: $first,
    after: $after,
    last: $last,
    before: $before,
    query: "inventory_total:0"
) {

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

// ─────────────────────────────────────────────────────────────
// LOADER
// ─────────────────────────────────────────────────────────────

export const loader = async ({
    request,
    context,
}: LoaderFunctionArgs) => {

    const { admin } =
        await shopify(context)
            .authenticate.admin(request);

    const url = new URL(request.url);

    const cursor =
        url.searchParams.get("cursor");

    const dir =
        url.searchParams.get("dir") || "next";

    const variables =
        dir === "prev" && cursor
            ? {
                last: PAGE_SIZE,
                before: cursor,
            }
            : {
                first: PAGE_SIZE,
                after: cursor || null,
            };

    const data = await safeGraphql(
        admin,
        PRODUCTS_QUERY,
        variables
    );

    return json<LoaderData>({
        products: data.data!.products.edges,
        pageInfo: data.data!.products.pageInfo,
    });
};

// ─────────────────────────────────────────────────────────────
// ACTION
// ─────────────────────────────────────────────────────────────

export const action = async ({
    request,
    context,
}: ActionFunctionArgs) => {

    const { admin } =
        await shopify(context)
            .authenticate.admin(request);

    const formData = await request.formData();

    const intent =
        formData.get("intent") as string;

    const imageUrl =
        formData.get("imageUrl") as string;

    const productId =
        formData.get("productId") as string;

    const imageId =
        formData.get("imageId") as string;

    const variantId =
        formData.get("variantId") as string;

    const altText =
        (formData.get("altText") as string) || " ";
console.log("altText",altText)
console.log("imageUrl", imageUrl)
    try {

        const cfDomain =
            (context.cloudflare.env as any)
                .CF_IMAGE_DOMAIN;

        if (!cfDomain) {
            throw new Error(
                "CF_IMAGE_DOMAIN missing"
            );
        }

        const originalFilename =
            imageUrl
                .split("/")
                .pop()
                ?.split("?")[0] || "image";

        const compressed =
            await compressImage(imageUrl, {
                cfImageDomain: cfDomain,
            });

        const resourceUrl =
            await uploadToShopifyCDN(
                admin,
                compressed.compressedBuffer,
                compressed.contentType,
                originalFilename
            );

        const createMedia =
            await safeGraphql(admin, `
mutation productCreateMedia(
    $productId: ID!,
    $media: [CreateMediaInput!]!
) {

productCreateMedia(
    productId: $productId,
    media: $media
) {

media {

id

... on MediaImage {

image {
    url
    altText
    width
    height
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
                productId,
                media: [
                    {
                        mediaContentType: "IMAGE",
                        originalSource: resourceUrl,
                        alt: altText || " ",
                    },
                ],
            });

        const newMedia =
            createMedia.data
                ?.productCreateMedia
                ?.media?.[0];

        if (!newMedia) {

            throw new Error(
                "Failed creating media"
            );
        }

        // FIXED VARIANT UPDATE
        if (
            intent === "variant_image" &&
            variantId
        ) {

            await safeGraphql(admin, `
mutation productVariantsBulkUpdate(
    $productId: ID!,
    $variants: [ProductVariantsBulkInput!]!
) {

productVariantsBulkUpdate(
    productId: $productId,
    variants: $variants
) {

productVariants {
    id
}

userErrors {
    field
    message
}

}

}
`, {
                productId,
                variants: [
                    {
                        id: variantId,
                        mediaId: newMedia.id,
                    },
                ],
            });
        }

//         // DELETE OLD IMAGE
//         if (imageId) {
//             try {
//                 await safeGraphql(admin, `
// mutation productDeleteMedia(
//     $productId: ID!,
//     $mediaIds: [ID!]!
// ) {
// productDeleteMedia(
//     productId: $productId,
//     mediaIds: $mediaIds
// ) {
//     deletedMediaIds
//     userErrors {
//         field
//         message
//     }
// }
// }
// `, {
//                     productId,
//                     mediaIds: [imageId],
//                 });
//             } catch (e) {
//                 console.warn("[Optimizer] Cleanup old media failed:", e);
//             }
//         }

        return json<ActionData>({
            success: true,

            comparison: {

                before: {
                    url: imageUrl,
                    format: detectImageFormat(imageUrl),
                    size: compressed.originalSize,
                    sizeFormatted: formatBytes(
                        compressed.originalSize
                    ),
                },

                after: {
                    url:
                        newMedia.image?.url ||
                        resourceUrl,

                    format: "AVIF",

                    size: compressed.compressedSize,

                    sizeFormatted: formatBytes(
                        compressed.compressedSize
                    ),
                },

                reductionPercent:
                    calculateReduction(
                        compressed.originalSize,
                        compressed.compressedSize
                    ),

                reductionBytes:
                    compressed.originalSize -
                    compressed.compressedSize,
            },
        });

    } catch (e: any) {

        console.error(e);

        return json<ActionData>({
            success: false,
            error: e.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────
// UI
// ─────────────────────────────────────────────────────────────

export default function ImageOptimizer() {

    const {
        products,
        pageInfo,
    } = useLoaderData<LoaderData>();

    const actionData =
        useActionData<ActionData>();

    const navigate = useNavigate();

    const navigation =
        useNavigation();

    const revalidator =
        useRevalidator();

    const [comparison, setComparison] =
        useState<ComparisonData | null>(null);

    useEffect(() => {

        if (
            actionData?.success &&
            actionData.comparison
        ) {

            setComparison(
                actionData.comparison
            );

            revalidator.revalidate();
        }

    }, [actionData]);

    const isSubmitting =
        navigation.state === "submitting";

    const activeForm =
        navigation.formData;

    const optimizingId =
        activeForm?.get("imageId");

    return (

        <div style={{
            padding: "2rem",
            maxWidth: "1400px",
            margin: "0 auto",
            fontFamily: "Inter",
        }}>

            <h1>
                AVIF Image Optimizer
            </h1>

            <p>
                Products with inventory = 0
            </p>

            {comparison && (

                <div style={{
                    background: "#ecfdf3",
                    padding: "1rem",
                    borderRadius: "10px",
                    marginBottom: "2rem",
                    border: "1px solid #16a34a",
                }}>

                    <h3>
                        Optimization Complete
                    </h3>

                    <p>
                        Before:
                        {" "}
                        {comparison.before.sizeFormatted}
                    </p>

                    <p>
                        After:
                        {" "}
                        {comparison.after.sizeFormatted}
                    </p>

                    <p>
                        Saved:
                        {" "}
                        {comparison.reductionPercent}
                    </p>

                </div>
            )}

            <div style={{
                display: "grid",
                gap: "2rem",
            }}>

                {products.map(({ node: product }) => {

                    const media =
                        product.media.edges.filter(
                            (x: any) =>
                                x.node.mediaContentType === "IMAGE" && x.node.image
                        );

                    return (

                        <div
                            key={product.id}
                            style={{
                                border: "1px solid #ddd",
                                borderRadius: "12px",
                                padding: "1.5rem",
                            }}
                        >

                            <h2>
                                {product.title}
                            </h2>

                            <div style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "1rem",
                            }}>

                                {media.map(({ node }: any) => {

                                    const img =
                                        node.image;

                                    const loading =
                                        optimizingId === node.id;

                                    return (

                                        <div
                                            key={node.id}
                                            style={{
                                                width: "160px",
                                                textAlign: "center",
                                            }}
                                        >

                                            <img
                                                src={img?.url}
                                                style={{
                                                    width: "150px",
                                                    height: "150px",
                                                    objectFit: "cover",
                                                    borderRadius: "8px",
                                                }}
                                            />

                                            <p style={{
                                                fontSize: "12px",
                                            }}>
                                                {img?.width}
                                                x
                                                {img?.height}
                                            </p>

                                            <Form method="post">

                                                <input
                                                    type="hidden"
                                                    name="intent"
                                                    value="product_image"
                                                />

                                                <input
                                                    type="hidden"
                                                    name="productId"
                                                    value={product.id}
                                                />

                                                <input
                                                    type="hidden"
                                                    name="imageId"
                                                    value={node.id}
                                                />

                                                <input
                                                    type="hidden"
                                                    name="imageUrl"
                                                    value={img?.url || ""}
                                                />

                                                <input
                                                    type="hidden"
                                                    name="altText"
                                                    value={img?.altText || ""}
                                                />

                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    style={{
                                                        background: "#111",
                                                        color: "#fff",
                                                        border: "none",
                                                        padding: "8px 12px",
                                                        borderRadius: "6px",
                                                        cursor: "pointer",
                                                        width: "100%",
                                                    }}
                                                >
                                                    {
                                                        loading
                                                            ? "Optimizing..."
                                                            : "Optimize AVIF"
                                                    }
                                                </button>

                                            </Form>

                                        </div>
                                    );
                                })}

                            </div>

                        </div>
                    );
                })}

            </div>

        </div>
    );
}