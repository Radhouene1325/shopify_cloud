// app/routes/api.generate-related.ts

import type { ActionFunctionArgs } from "@remix-run/node";
import { shopify } from "../shopify.server";
export async function action({ request, context }: ActionFunctionArgs) {
    let { admin } = await shopify(context).authenticate.admin(request);
    await generateRelatedProducts(admin as any)


    return Response.json({
        success: true,
    });
}



// app/utils/generateRelatedProducts.server.ts


const METAFIELD_NAMESPACE = "custom";

const RELATED_METAFIELDS = [
    "related_products_1",
    "related_products_2",
    "related_products_3",
    "related_products_4",
];

const CHUNK_SIZE = 20;

async function generateRelatedProducts(admin:any) {
    let hasNextPage = true;
    let cursor: string | null = null;

    while (hasNextPage) {
        const response = await admin.graphql(`
      query GetProducts($cursor: String) {
        products(first: 50, after: $cursor) {
          edges {
            cursor
            node {
              id
              title
              collections(first: 20) {
                edges {
                  node {
                    id
                    title
                    products(first: 100) {
                      edges {
                        node {
                          id
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `, {
            variables: {
                cursor,
            },
        });

        const productsResponse: any = await response.json();

        const products =
            productsResponse.data.products.edges;

        for (const productEdge of products) {
            const product = productEdge.node;

            console.log(`Processing: ${product.title}`);

            const relatedProductIds = new Set<string>();

            // Get products from all collections
            for (const collectionEdge of product.collections.edges) {
                const collection = collectionEdge.node;

                for (const collectionProductEdge of collection.products.edges) {
                    const collectionProductId =
                        collectionProductEdge.node.id;

                    // Avoid adding current product
                    if (collectionProductId !== product.id) {
                        relatedProductIds.add(collectionProductId);
                    }
                }
            }

            const relatedProductsArray = Array.from(relatedProductIds);

            // Split into chunks of 20
            const metafieldChunks = [
                relatedProductsArray.slice(0, 20),
                relatedProductsArray.slice(20, 40),
                relatedProductsArray.slice(40, 60),
                relatedProductsArray.slice(60, 80),
            ];

            const metafields = metafieldChunks.map((chunk, index) => ({
                namespace: METAFIELD_NAMESPACE,
                key: RELATED_METAFIELDS[index],
                type: "list.product_reference",
                ownerId: product.id,
                value: JSON.stringify(chunk),
            }));

            await admin.graphql(`
        mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              key
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
                variables: {
                    metafields,
                },
            });

            console.log(`Updated metafields for ${product.title}`);
        }

        hasNextPage =
            productsResponse.data.products.pageInfo.hasNextPage;

        cursor =
            products[products.length - 1]?.cursor || null;
    }
}