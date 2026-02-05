



////////////////////////////////////tested discounts chiamta server proxy



import {  type LoaderFunctionArgs } from "@remix-run/node";
import { shopify } from "../shopify.server";
import prisma from "../db.server"; // Il tuo Prisma client

export async function action({request,context}:LoaderFunctionArgs) {
  const { admin } = await shopify(context).authenticate.admin(request);
console.log('hello admin im her bonsoir and radhoun bbbb',admin)
}



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



/////////////////
const response = await admin?.graphql(
  `#graphql
query {
  discountNodes(query: "combines_with:product_discounts", first: 10) {
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
            combinesWith {
              productDiscounts
            }
          }
          ... on DiscountCodeFreeShipping {
            title
            status
            combinesWith {
              productDiscounts
            }
          }
        }
      }
    }
  }
}`,
);
const json = await response?.json();
console.log('data base admin from query shopify is her ',json?.data?.discountNodes)
////////////////////////////





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

















export  const Showdiscount=()=>{

return(
  <>
  hello im discounts query im her 
  </>
)
}






















