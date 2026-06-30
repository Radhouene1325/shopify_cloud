import { type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import DescriptionManager from "./app.descreptionupdated";
import { shopify } from "../shopify.server";
import { sendPrompt } from "./functions/deepseekai/deepseekai";
import { buildPrompt } from "./functions/propmtsSEO/propmts_descreption";
import { productsupdated } from "./functions/query/updateprooductquery";

export async function generateSeoHtml(
  updatedDescreptionAI: any,
  DEEP_SEEK_API_KEY: string
) {
  const products = updatedDescreptionAI.map((product: any) => ({
    ...product,
    id: product.id || "",
    handle: product.handle || product.handel || "",
    title: product.title || "",
    vendor: product.vendor || "",
    descreption: product.descreption || product.description || product.descriptionHtml || "",
    totalInventory: product.totalInventory || 0,
    tracksInventory: Number(product.tracksInventory || 0),
    max_amount: product.max_amount || "",
    currencyCode: product.currencyCode || "",
    min_amount: product.min_amount || "",
  }));

  const data: any[] = [];

  for (const [idx, product] of products.entries()) {
    const prompt = buildPrompt(product, "shortDescription");
    const promptResults = await sendPrompt(prompt, DEEP_SEEK_API_KEY) as any[];

    if (!Array.isArray(promptResults)) {
      throw new Error(`Product ${idx + 1} returned invalid TikTok description format`);
    }

    const generated = promptResults.find((item) => item.id === product.id);

    data.push({
      id: product.id,
      title: product.title,
      descriptionHtml: generated?.shortDescription || generated?.description || "",
    });
  }

  return {
    total: data.length,
    data,
  };
}

export async function action({ context, request }: ActionFunctionArgs) {
  const { admin } = await shopify(context).authenticate.admin(request);

  const formData = await request.formData();
  const rawProducts = formData.get("descreptionAI");

  if (typeof rawProducts !== "string") {
    return Response.json({ error: "Invalid or missing 'descreptionAI' data" }, { status: 400 });
  }

  let products: any[];

  try {
    products = JSON.parse(rawProducts);
  } catch {
    return Response.json({ error: "Invalid JSON in 'descreptionAI' data" }, { status: 400 });
  }

  if (!Array.isArray(products)) {
    return Response.json({ error: "Invalid or missing 'descreptionAI' data" }, { status: 400 });
  }

  const deepSeekApiKey = (context.cloudflare.env as Record<string, string | undefined>)
    .DEEP_SEEK_API_KEY;

  if (!deepSeekApiKey) {
    return Response.json({ error: "Missing DEEP_SEEK_API_KEY" }, { status: 500 });
  }

  const result = await generateSeoHtml(products, deepSeekApiKey);
  const updatedData: any[] = [];

  for (const product of result.data) {
    const originalProduct = products.find((item: any) => item.id === product.id);

    if (!originalProduct) {
      return Response.json(
        {
          error: "Generated product does not match original selected product",
          productId: product.id,
          data: result.data,
        },
        { status: 400 }
      );
    }

    if (!product.descriptionHtml) {
      return Response.json(
        {
          error: "AI returned empty TikTok Shop description",
          productId: product.id,
          data: result.data,
        },
        { status: 400 }
      );
    }

    const response = await admin.graphql(productsupdated, {
      variables: {
        product: {
          id: product.id,
          title: product.title,
          descriptionHtml: product.descriptionHtml,
        },
      },
    });

    const json = await response.json() as any;
    const userErrors = json?.data?.productUpdate?.userErrors || [];

    if (userErrors.length > 0) {
      return Response.json(
        {
          error: "Failed to update TikTok Shop description",
          productId: product.id,
          userErrors,
          data: result.data,
        },
        { status: 400 }
      );
    }

    updatedData.push({
      id: product.id,
      title: product.title,
      descriptionHtml: product.descriptionHtml,
    });
  }

  return Response.json({
    success: true,
    total: updatedData.length,
    data: updatedData,
  });
}

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const { admin } = await shopify(context).authenticate.admin(request);
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");

  const query = `#graphql
    query GetTikTokPolicyProducts($cursor: String) {
      products(first: 15, after: $cursor, sortKey: PUBLISHED_AT, reverse: true) {
        edges {
          node {
            id
            title
            descriptionHtml
            tags
            handle
            vendor
            productType
            totalInventory
            tracksInventory
            featuredMedia {
              ... on MediaImage {
                id
                image {
                  url
                  altText
                  width
                  height
                }
              }
            }
            priceRangeV2 {
              maxVariantPrice {
                amount
                currencyCode
              }
              minVariantPrice {
                amount
                currencyCode
              }
            }
            media(first: 10) {
              edges {
                node {
                  ... on MediaImage {
                    id
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
                  sku
                  id
                  title
                  price
                  barcode
                  compareAtPrice
                  inventoryPolicy
                }
              }
            }
          }
        }
        pageInfo {
          endCursor
          hasNextPage
          hasPreviousPage
          startCursor
        }
      }
    }
  `;

  const response = await admin.graphql(query, { variables: { cursor } });
  const json = (await response.json()) as {
    data?: {
      products?: {
        edges?: Array<{ node: any }>;
        pageInfo?: any;
      };
    };
  };

  const variants = json.data?.products?.edges?.map((edge) => edge.node) || [];
  const pageInfo = json.data?.products?.pageInfo || {};
  const data = variants.map((product: any) => ({
    id: product.id,
    title: product.title,
    descriptionHtml: product.descriptionHtml || "",
  }));

  return Response.json({
    variants,
    data,
    pageInfo,
  });
};

export { DescriptionManager };
export default DescriptionManager;
