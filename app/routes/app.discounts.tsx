import prisma from "app/db.server";
import { shopify } from "../shopify.server";
import {  type LoaderFunctionArgs } from "@remix-run/node";

import { useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";
const SHOP_ORIGIN = "https://0g5p1w-50.myshopify.com";
const corsHeaders = {
  "Access-Control-Allow-Origin": SHOP_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
export async function loader({ request, context }: LoaderFunctionArgs) {
  const { session, admin, storefront } =
  await shopify(context).authenticate.public.appProxy(request);

  console.log(JSON.stringify(session, null, 2));
console.log('admin', admin);
console.log('shop', session?.shop);

  const url = new URL(request.url);
  console.log('url is her',url)
  const shop = url.searchParams.get("shop");
  console.log('shop is her ',shop)
  
  if (!shop) {
    return Response.json({ error: "Shop parameter missing" }, { status: 400 });
  }

  // Recupera la session dal database
  const sessionData = await prisma(context.cloudflare.env.DATABASE_URL).session.findUnique({
    where: { shop }
  });

  console.log('database is her embabde',sessionData)

  if (!sessionData || !sessionData.accessToken) {
    return Response.json({ error: "Shop not authenticated" }, { status: 401 });
  }

  // Crea un client GraphQL con l'access token
  // const client = new shopifyApi.clients.Graphql({
  //   session: {
  //     shop,
  //     accessToken: sessionData.accessToken,
  //   }
  // });

  const cursor=url.searchParams.get('cursir')

  let hasNextPage = true;
  // let cursor = null;
let response

/////////////////

  response = await admin?.graphql(
  `#graphql
  query GetVariantsWithContinuePolicy($cursor:String) {
    productVariants(first: 250,after: $cursor,query: "inventory_quantity:0") {
      edges {
        node {
          id
          title
          inventoryPolicy
          inventoryQuantity
          product {
            title,
            id
          }
        }
      },
      pageInfo {
      hasNextPage
      endCursor
    }
    }
    
  }
  `,
  {
    variables:{
     cursor 
    }
  }
);


const resultdata = await response?.json();
 console.log("Shopify variants:", resultdata?.data.productVariants.edges);
hasNextPage = resultdata?.data?.productVariants.pageInfo.hasNextPage
    // cursor = resultdata?.data.productVariants.pageInfo.endCursor;
console.log('hex and cursor',hasNextPage)

const variants =
resultdata?.data?.productVariants?.edges ?? [];
  // console.log("Shopify variants is her hello:", variants);
const continueVariants = variants
.filter(({ node }: any) => node.inventoryPolicy === "CONTINUE")

// const variantsByProduct: Record<string, any[]> = {};

// for (const { node } of continueVariants) {
//   if (!variantsByProduct[node.product.id]) {
//     variantsByProduct[node.product.id] = [];
//   }

//   variantsByProduct[node.product.id].push({
//     id: node.id,
//     inventoryPolicy: "DENY"
//   });
// }


// const results = [];

 
//   for (const productId of Object.keys(variantsByProduct)) {
//        console.log('node is hrer',productId)
//       const mutationResponse = await admin?.graphql(
//         `#graphql
//         mutation UpdateContinueToDeny($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
//           productVariantsBulkUpdate(
           
//             productId: $productId
//             variants: $variants
            
//           ) {
//             productVariants {
//               id
//               inventoryPolicy
//             }
//             userErrors {
//               field
//               message
//             }
           
//           }
//         }
//         `,
//      {
//       variables: {
//         productId,
//         variants: variantsByProduct[productId]
//       }
//     }
//       );
      


    
//     results.push(await mutationResponse?.json());
//   }
// console.log('hekop')

return Response.json({
  variants: continueVariants,
  pageInfo: resultdata?.data?.productVariants.pageInfo
  
});




const collectionHandle = url.searchParams.get("collection"); // Opzionale: filtra per collection

console.log('collection is her',collectionHandle)












  // const query = `
  //   query {
  //     discountNodes(first: 50) {
  //       edges {
  //         node {
  //           id
  //           discount {
  //             ... on DiscountCodeBasic {
  //               title
  //               status
  //               codes(first: 10) {
  //                 nodes {
  //                   code
  //                 }
  //               }
  //               customerGets {
  //                 value {
  //                   ... on DiscountPercentage {
  //                     percentage
  //                   }
  //                   ... on DiscountAmount {
  //                     amount {
  //                       amount
  //                       currencyCode
  //                     }
  //                   }
  //                 }
  //               }
  //               startsAt
  //               endsAt
  //             }
  //             ... on DiscountAutomaticBasic {
  //               title
  //               status
  //               customerGets {
  //                 value {
  //                   ... on DiscountPercentage {
  //                     percentage
  //                   }
  //                 }
  //               }
  //               startsAt
  //               endsAt
  //             }
  //           }
  //         }
  //       }
  //     }
  //   }
  // `;
  const query = `
  query {
    discountNodes(first: 50) {
      edges {
        node {
          id
          discount {
            ... on DiscountCodeBasic {
              title
              status
              codes(first: 10) {
                nodes {
                  code
                }
              }
              customerGets {
                value {
                  ... on DiscountPercentage {
                    percentage
                  }
                  ... on DiscountAmount {
                    amount {
                      amount
                      currencyCode
                    }
                  }
                }
                items {
                  ... on DiscountCollections {
                    collections(first: 10) {
                      nodes {
                        id
                        title
                        handle
                      }
                    }
                  }
                  ... on DiscountProducts {
                    products(first: 10) {
                      nodes {
                        id
                        title
                        handle
                      }
                    }
                  }
                  ... on AllDiscountItems {
                    allItems
                  }
                }
              }
              startsAt
              endsAt
            }
            ... on DiscountAutomaticBasic {
              title
              status
              customerGets {
                value {
                  ... on DiscountPercentage {
                    percentage
                  }
                }
                items {
                  ... on DiscountCollections {
                    collections(first: 10) {
                      nodes {
                        id
                        title
                        handle
                      }
                    }
                  }
                  ... on DiscountProducts {
                    products(first: 10) {
                      nodes {
                        id
                        title
                        handle
                      }
                    }
                  }
                  ... on AllDiscountItems {
                    allItems
                  }
                }
              }
              startsAt
              endsAt
            }
            ... on DiscountCodeBxgy {
              title
              status
              codes(first: 10) {
                nodes {
                  code
                }
              }
              customerGets {
                value {
                  ... on DiscountPercentage {
                    percentage
                  }
                }
                items {
                  ... on DiscountCollections {
                    collections(first: 10) {
                      nodes {
                        id
                        title
                        handle
                      }
                    }
                  }
                  ... on DiscountProducts {
                    products(first: 10) {
                      nodes {
                        id
                        title
                        handle
                      }
                    }
                  }
                }
              }
              customerBuys {
                items {
                  ... on DiscountCollections {
                    collections(first: 10) {
                      nodes {
                        id
                        title
                        handle
                      }
                    }
                  }
                  ... on DiscountProducts {
                    products(first: 10) {
                      nodes {
                        id
                        title
                        handle
                      }
                    }
                  }
                }
              }
              startsAt
              endsAt
            }
          }
        }
      }
    }
  }
`;

  try {
    // const response = await client.request(query);
    const response = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': sessionData.accessToken,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    console.log('daatat fetched forom server',data)
    if (data?.errors) {
      console.error('GraphQL errors:', data.errors);
      return Response.json({ error: 'GraphQL query failed' }, { status: 500 });
    }
    
    // const activeDiscounts = data.data.discountNodes.edges
    //   .filter(({ node }: any) => node.discount.status === 'ACTIVE')
    //   .map(({ node }: any) => {
    //     const discount = node.discount;
        
    //     return {
    //       title: discount.title,
    //       code: discount.codes?.nodes[0]?.code || null,
    //       percentage: discount.customerGets?.value?.percentage || null,
    //       amount: discount.customerGets?.value?.amount || null,
    //       type: discount.codes ? 'code' : 'automatic',
    //       startsAt: discount.startsAt,
    //       endsAt: discount.endsAt
    //     };
    //   });
    const activeDiscounts = data?.data?.discountNodes.edges
      .filter(({ node }: any) => node.discount.status === 'ACTIVE')
      .map(({ node }: any) => {
        const discount = node.discount;
        
        // Estrai collezioni
        const collections = discount.customerGets?.items?.collections?.nodes || [];
        
        // Estrai prodotti
        const products = discount.customerGets?.items?.products?.nodes || [];
        
        // Verifica se si applica a tutti gli item
        const appliesToAll = discount.customerGets?.items?.allItems || false;
        
        return {
          id: node.id,
          title: discount.title,
          code: discount.codes?.nodes[0]?.code || null,
          percentage: discount.customerGets?.value?.percentage || null,
          amount: discount.customerGets?.value?.amount || null,
          type: discount.codes ? 'code' : 'automatic',
          startsAt: discount.startsAt,
          endsAt: discount.endsAt,
          collections: collections.map((col: any) => ({
            id: col.id,
            title: col.title,
            handle: col.handle
          })),
          products: products.map((prod: any) => ({
            id: prod.id,
            title: prod.title,
            handle: prod.handle
          })),
          appliesToAll
        };
      });

    // Filtra per collection se specificato
    let filteredDiscounts = activeDiscounts;
    if (collectionHandle) {
      filteredDiscounts = activeDiscounts.filter((discount: any) => 
        discount.appliesToAll || 
        discount.collections.some((col: any) => col.handle === collectionHandle)
      );
    }
console.log('activatedDiso=count',activeDiscounts)
console.log('throttleStatus',activeDiscounts?.extensions?.cost?.throttleStatus)
    return Response.json({data}, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60, s-maxage=300",
      }
      
    }
  );
    
  } catch (error) {
    console.error('Error fetching discounts:', error);
    console.log('error is her ')
    return Response.json({ error: 'Failed to fetch discounts' }, { status: 500 });
  }
}


  export default function Dsicounts(){

    const initial = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const [rows, setRows] = useState(initial?.variants);
  const [pageInfo, setPageInfo] = useState(initial?.pageInfo);

  useEffect(() => {
    if (fetcher.data) {
      setRows(fetcher?.data?.variants);
      setPageInfo(fetcher?.data?.pageInfo);
    }
  }, [fetcher.data]);

  return (
    <div style={{ padding: 24 }}>
      <h1>Out of stock variants</h1>

      <table width="100%" border={1} cellPadding={8}>
        <thead>
          <tr>
            <th>Product</th>
            <th>Variant</th>
            <th>Inventory</th>
            <th>Policy</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((v: any) => (
            <tr key={v.id}>
              <td>{v.product.title}</td>
              <td>{v.title}</td>
              <td>{v.inventoryQuantity}</td>
              <td>{v.inventoryPolicy}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 16 }}>
        {pageInfo.hasNextPage && (
          <button
            onClick={() =>
              fetcher.load(`?cursor=${pageInfo.endCursor}`)
            }
          >
            Next page →
          </button>
        )}
      </div>
    </div>
  );

  }