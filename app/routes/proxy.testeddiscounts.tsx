




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
//   let allVariants = [];  // Array per salvare TUTTE le varianti

//   let hasNextPage = true;
//   let cursor = null;
// // let response
// let requestCount = 0;
// /////////////////
// while (hasNextPage===true) {
//  const  response = await admin?.graphql(
//   `#graphql
//   query GetVariantsWithContinuePolicy($cursor:String) {
//     productVariants(first: 250,after: $cursor) {
//       edges {
//         node {
//           id
//           title
//           inventoryPolicy
//           inventoryQuantity
//           product {
//             title,
//             id
//           }
//         }
//       },
//       pageInfo {
//       hasNextPage
//       endCursor
//     }
//     }
    
//   }
//   `,
//   {
//     variables:{cursor }
//   }
// );
// }


// const resultdata = await response?.json();
// console.log("Shopify variants:", resultdata?.data);

// const variants = resultdata?.data?.productVariants?.edges ?? [];
// allVariants.push(...variants);  // ← Salva TUTTE le varianti


// hasNextPage = resultdata?.data?.productVariants.pageInfo.hasNextPage
//     cursor = resultdata?.data.productVariants.pageInfo.endCursor;
// console.log('hex and cursor',hasNextPage,cursor)
// requestCount++;
// console.log(`Richiesta ${requestCount} varianti (totale: ${resultdata?.data.length})`);

// // Delay di 100ms tra richieste per evitare rate limits
// if (hasNextPage===true) {
//   await new Promise(resolve => setTimeout(resolve, 100));
// }

// const variants =
// resultdata?.data?.productVariants?.edges ?? [];
//   console.log("Shopify variants is her hello:", variants);
// const continueVariants = variants
// .filter(({ node }: any) => node.inventoryPolicy === "CONTINUE")
// // .map(({ node }:any) => ({
// //   id: node.id,
// //   inventoryPolicy: "CONTINUE"
// // }));
// console.log('varients coninuQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ',continueVariants)

// let results: Record<string,any> = {};

// if (continueVariants.length > 0) {
//   results = await Promise.all(
//     continueVariants.map(async ({ node }: any) => {
//       console.log('node is hrer',node)
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
//             pageInfo {
//                 hasNextPage
//                   endCursor
//                  }
//           }
//         }
//         `,
//         {
//           variables: {
//             productId: node.product.id,
//             variants:[
//               {
//                 id: node.id,
//                inventoryPolicy: "DENY"
//              }
//             ]
//           }
//         }
//       );
//       let data= await mutationResponse?.json();
//       console.log('hello updaed labes alikom',data?.data)
//       return data

//     })
//   );
// }

// return Response.json({
//   updatedCount: results.length,
//   result:results.data,
//   all:results
  
// });

let allVariants = [];  // Array per salvare TUTTE le varianti
let hasNextPage = true;
let cursor = null;
let requestCount = 0;
let  variants :Record<string,any>[] =[]
// LOOP per prendere tutte le pagine
while (hasNextPage === true) {
  const response = await admin?.graphql(  // ← RIMUOVI "return"
    `#graphql
    query GetVariantsWithContinuePolicy($cursor: String) {
      productVariants(first: 250, after: $cursor, query: "inventory_policy:continue") {
        edges {
          node {
            id
            title
            inventoryPolicy
            inventoryQuantity
            product {
              title
              id
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
    `,
    {
      variables: { cursor }
    }
  );

  const resultdata = await response?.json();
  
  // Aggiungi le varianti di questa pagina all'array totale
   variants = resultdata?.data?.productVariants?.edges ?? [];
  // allVariants.push(...variants);  // ← Salva TUTTE le varianti
  // Aggiorna cursor e hasNextPage per la prossima iterazione
  hasNextPage = resultdata?.data?.productVariants?.pageInfo?.hasNextPage;
  cursor = resultdata?.data?.productVariants?.pageInfo?.endCursor;
  
  requestCount++;
  console.log(`Richiesta ${requestCount}: caricati ${variants.length} varianti (totale: ${variants.length})`);
  if(allVariants.length===5000)return variants

  // Delay per evitare rate limits
  if (hasNextPage === true) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

}

// ORA hai TUTTE le varianti in allVariants
console.log(`✓ Totale varianti CONTINUE caricate: ${allVariants.length}`);

// Filtra solo quelle con CONTINUE (già filtrato nella query, ma per sicurezza)
const continueVariants = variants.filter(
  ({ node }: any) => node.inventoryPolicy === "CONTINUE"
);

console.log(`Varianti da aggiornare: ${continueVariants.length}`);
// Raggruppa varianti per prodotto
const variantsByProduct = continueVariants.reduce((acc: any, { node }: any) => {
  const productId = node.product.id;
  if (!acc[productId]) {
    acc[productId] = [];
  }
  acc[productId].push({
    id: node.id,
    inventoryPolicy: "DENY"
  });
  return acc;
}, {});

console.log(`Aggiornamento di ${Object.keys(variantsByProduct).length} prodotti...`);

// Aggiorna TUTTE le varianti
let results: Record<string, any>[] = [];

for (const [productId, variants] of Object.entries(variantsByProduct)) {

 
  
      
      const mutationResponse = await admin?.graphql(
        `#graphql
        mutation UpdateContinueToDeny($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(
            productId: $productId
            variants: $variants
          ) {
            productVariants {
              id
              inventoryPolicy
            }
            userErrors {
              field
              message
            }
          }
        }
        `,
         {
          variables: {
            productId: productId,
            variants: variants as any
          }
        }
    
      );
      
      const data = await mutationResponse?.json();
      results.push(data);
      
      console.log(`Aggiornato prodotto ${productId}: ${(variants as any[]).length} varianti`);
      
      // Delay tra prodotti
      await new Promise(resolve => setTimeout(resolve, 300));
    
  

  }
  return Response.json({
    totalVariantsFound: allVariants.length,
    totalProductsUpdated: results.length,
    updatedCount: continueVariants.length,
    results: results
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

















export  const Showdiscount=()=>{

return(
  <>
  hello im discounts query im her 
  </>
)
}







  
  






//   <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 900px; margin: 0 auto; color: #333; line-height: 1.6;">
// <!-- Hero Section -->
// <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #f4f4f4;">
// <h2 style="color: #2c3e50; font-size: 28px; margin-bottom: 10px;">Collana "La Nuestra Señora de Guadalupe"</h2>
// <p style="font-size: 18px; color: #7f8c8d; font-style: italic;">Un simbolo di fede, protezione ed eleganza intramontabile.</p>
// </div>
// <!-- Main Content -->
// <div style="display: flex; flex-wrap: wrap; gap: 30px; padding: 30px 0;">
// <div style="flex: 1; min-width: 300px;">
// <h3 style="color: #b08d57; border-left: 4px solid #b08d57; padding-left: 15px;">Eleganza Sacra e Stile Moderno</h3>
// <p>Esprimi la tua spiritualità con raffinatezza. Questa splendida collana con pendente della <strong>Madonna di Guadalupe</strong> e <strong>Mano di Hamsa</strong> fonde simbolismo religioso e design contemporaneo. Realizzata con una base in pregiato rame e impreziosita da brillanti <strong>zirconi cubici</strong>, è l'accessorio perfetto per chi cerca un amuleto di protezione senza rinunciare allo stile.</p>
// <ul style="list-style-type: none; padding: 0;">
// <li style="margin-bottom: 10px;">✨ <strong>Luce Radiante:</strong> Zirconi cubici di alta qualità incastonati per una brillantezza superiore.</li>
// <li style="margin-bottom: 10px;">🌟 <strong>Finitura di Lusso:</strong> Placcatura in oro con lucidatura a specchio tripla per una resistenza eccezionale allo sbiadimento.</li>
// <li style="margin-bottom: 10px;">🛡️ <strong>Versatilità:</strong> Design Unisex, ideale per occasioni speciali come matrimoni, compleanni o per l'uso quotidiano.</li>
// </ul>
// </div>
// </div>
// <!-- Image Gallery -->
// <div style="background: #fdfdfd; padding: 20px; border-radius: 12px; margin: 20px 0;">
// <h3 style="text-align: center; color: #2c3e50; margin-bottom: 20px;">Dettagli Artigianali</h3>
// <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; justify-items: center;">
// <img style="width: 100%; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" alt="Dettaglio Collana 1" src="https://ae01.alicdn.com/kf/S519aad003d1e49028354c9f37b51756cS.jpg"> <img style="width: 100%; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" alt="Dettaglio Collana 2" src="https://ae01.alicdn.com/kf/Se156c58e2c0f4bd889ed7fdbbbeffd25k.jpg"> <img style="width: 100%; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" alt="Dettaglio Collana 3" src="https://ae01.alicdn.com/kf/S1580f2385bf748d89e82e5b79f42cbafK.jpg"> <img style="width: 100%; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" alt="Dettaglio Collana 4" src="https://ae01.alicdn.com/kf/Sd383fe34d0f343ed88598c8af0f3ea628.jpg">
// </div>
// </div>
// <!-- Specifications Table -->
// <div style="margin-top: 40px;">
// <h3 style="color: #2c3e50; text-align: center;">Specifiche Tecniche</h3>
// <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 20px;">
// <div style="border-bottom: 1px solid #f4f4f4; padding: 5px;">
// <strong>Materiale:</strong> Rame di alta qualità</div>
// <div style="border-bottom: 1px solid #f4f4f4; padding: 5px;">
// <strong>Pietre:</strong> Zirconia Cubica (AAA)</div>
// <div style="border-bottom: 1px solid #f4f4f4; padding: 5px;">
// <strong>Dimensioni Pendente:</strong> 36mm x 15mm</div>
// <div style="border-bottom: 1px solid #f4f4f4; padding: 5px;">
// <strong>Tipo Catena:</strong> Catena a serpente (Snake Chain)</div>
// <div style="border-bottom: 1px solid #f4f4f4; padding: 5px;">
// <strong>Stile:</strong> Religioso / Punk Chic</div>
// <div style="border-bottom: 1px solid #f4f4f4; padding: 5px;">
// <strong>Compatibilità:</strong> iOS / Universale</div>
// </div>
// </div>
// <!-- Wholesale & Offers -->
// <div style="margin-top: 30px; background: #2c3e50; color: #fff; padding: 25px; border-radius: 12px; text-align: center;">
// <h3 style="margin-top: 0; color: #f1c40f;">Offerte Esclusive &amp; Business</h3>
// <p style="margin-bottom: 15px;">Ottieni il massimo valore dai tuoi acquisti:</p>
// <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
// <span style="background: rgba(255,255,255,0.1); padding: 10px 20px; border-radius: 50px; font-weight: bold;">🚚 Spedizione Gratuita sopra i $200</span> <span style="background: rgba(255,255,255,0.1); padding: 10px 20px; border-radius: 50px; font-weight: bold;">💎 -2% Extra su 5+ pezzi</span> <span style="background: rgba(255,255,255,0.1); padding: 10px 20px; border-radius: 50px; font-weight: bold;">🤝 Supporto Drop Shipping &amp; Wholesale</span>
// </div>
// </div>
// <!-- Call to Action -->
// <div style="text-align: center; padding: 40px 0;">
// <p style="font-size: 18px; margin-bottom: 20px;">Aggiungi un tocco di luce e protezione al tuo look oggi stesso.</p>
// <a style="background: #b08d57; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 18px; transition: 0.3s; display: inline-block;" href="#">ACQUISTA ORA</a>
// </div>
// <!-- Final Image Strip -->
// <div style="display: flex; overflow-x: auto; gap: 10px; padding-bottom: 10px;">
// <img style="height: 120px; border-radius: 4px;" src="https://ae01.alicdn.com/kf/S0831f0e680754a349823d5ac4141b83bG.jpg"> <img style="height: 120px; border-radius: 4px;" src="https://ae01.alicdn.com/kf/S72c0f6505336431d9a6c8c50a3a59333G.jpg"> <img style="height: 120px; border-radius: 4px;" src="https://ae01.alicdn.com/kf/S41f39da1cc814f21a1c8e85ad2a44fc3V.jpg"> <img style="height: 120px; border-radius: 4px;" src="https://ae01.alicdn.com/kf/Sa4deac8e06cb4becb9cdb7c4705d195cO.jpg"> <img style="height: 120px; border-radius: 4px;" src="https://ae01.alicdn.com/kf/Sab361a42549d4c3091248c47e17b1b267.jpg">
// </div>
// </div>




































// {% if product.description != blank %}
//         <div class="premium-product-description" itemscope itemtype="https://schema.org/Product">
          
//           <style>
//             .premium-product-description {
//               max-width: 1200px;
//               margin: 0 auto;
//               padding: 3rem 1.5rem;
//               font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
//               color: #2c2c2c;
//               background: linear-gradient(to bottom, #ffffff 0%, #fafafa 100%);
//             }
            
//             /* Hero Section con Trust Signals */
//             .product-hero {
//               text-align: center;
//               margin-bottom: 3rem;
//               padding: 2rem;
//               background: white;
//               border-radius: 12px;
//               box-shadow: 0 4px 20px rgba(0,0,0,0.08);
//             }
            
//             .product-hero h1 {
//               font-size: 2rem;
//               font-weight: 700;
//               color: #1a1a1a;
//               margin-bottom: 1rem;
//               line-height: 1.3;
//               letter-spacing: -0.5px;
//             }
            
//             .trust-badges {
//               display: flex;
//               justify-content: center;
//               gap: 2rem;
//               margin-top: 1.5rem;
//               flex-wrap: wrap;
//             }
            
//             .trust-badge {
//               display: flex;
//               align-items: center;
//               gap: 0.5rem;
//               font-size: 0.9rem;
//               color: #059669;
//               font-weight: 600;
//             }
            
//             .trust-badge::before {
//               content: "✓";
//               display: inline-block;
//               width: 24px;
//               height: 24px;
//               background: #059669;
//               color: white;
//               border-radius: 50%;
//               text-align: center;
//               line-height: 24px;
//               font-weight: bold;
//             }
            
//             /* Sezione Specifiche Premium */
//             .specs-section {
//               background: white;
//               border-radius: 12px;
//               padding: 2.5rem;
//               margin: 2rem 0;
//               box-shadow: 0 2px 16px rgba(0,0,0,0.06);
//             }
            
//             .specs-section h2 {
//               font-size: 1.5rem;
//               font-weight: 700;
//               color: #1a1a1a;
//               margin-bottom: 1.5rem;
//               text-transform: uppercase;
//               letter-spacing: 1px;
//               border-left: 4px solid #000;
//               padding-left: 1rem;
//             }
            
//             .specs-grid {
//               display: grid;
//               grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
//               gap: 1rem;
//             }
            
//             .spec-item {
//               display: flex;
//               padding: 1rem;
//               background: #f8f9fa;
//               border-radius: 8px;
//               border-left: 3px solid #e5e7eb;
//               transition: all 0.3s ease;
//             }
            
//             .spec-item:hover {
//               border-left-color: #000;
//               transform: translateX(4px);
//               box-shadow: 0 2px 8px rgba(0,0,0,0.1);
//             }
            
//             .spec-label {
//               font-weight: 700;
//               color: #1a1a1a;
//               min-width: 160px;
//               font-size: 1.3rem;
//               text-transform: capitalize;
//             }
            
//             .spec-value {
//               color: #4b5563;
//               font-size: 1.3rem;
//               line-height: 1.6;
//             }
            
//             /* Galleria Immagini Premium */
//             .image-showcase {
//               margin: 3rem 0;
//             }
            
//             .image-showcase h2 {
//               font-size: 1.5rem;
//               font-weight: 700;
//               text-align: center;
//               margin-bottom: 2rem;
//               color: #1a1a1a;
//             }
            
//             .image-gallery {
//               display: grid;
//               grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
//               gap: 1.5rem;
//             }
            
//             .gallery-item {
//               position: relative;
//               overflow: hidden;
//               border-radius: 12px;
//               box-shadow: 0 4px 16px rgba(0,0,0,0.1);
//               background: white;
//               padding: 0.5rem;
//             }
            
//             .gallery-item img {
//               width: 100%;
//               height: auto;
//               display: block;
//               border-radius: 8px;
//               transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
//             }
            
//             .gallery-item:hover img {
//               transform: scale(1.05);
//             }
            
//             /* Sezione Garanzie e Sicurezza */
//             .guarantee-section {
//               background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
//               color: white;
//               padding: 2.5rem;
//               border-radius: 12px;
//               margin: 3rem 0;
//               text-align: center;
//             }
            
//             .guarantee-section h3 {
//               font-size: 1.3rem;
//               margin-bottom: 1.5rem;
//               font-weight: 700;
//             }
            
//             .guarantee-grid {
//               display: grid;
//               grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
//               gap: 2rem;
//               margin-top: 2rem;
//             }
            
//             .guarantee-item {
//               padding: 1.5rem;
//               background: rgba(255,255,255,0.1);
//               border-radius: 8px;
//               backdrop-filter: blur(10px);
//             }
            
//             .guarantee-item strong {
//               display: block;
//               font-size: 1.1rem;
//               margin-bottom: 0.5rem;
//               color: #fbbf24;
//             }
            
//             /* SEO-Friendly Content Structure */
//             .product-benefits {
//               background: white;
//               padding: 2.5rem;
//               border-radius: 12px;
//               margin: 2rem 0;
//               box-shadow: 0 2px 16px rgba(0,0,0,0.06);
//             }
            
//             .product-benefits h2 {
//               font-size: 1.5rem;
//               font-weight: 700;
//               margin-bottom: 1.5rem;
//               color: #1a1a1a;
//             }
            
//             .product-benefits ul {
//               list-style: none;
//               padding: 0;
//             }
            
//             .product-benefits li {
//               padding: 1rem 0 1rem 2.5rem;
//               position: relative;
//               border-bottom: 1px solid #e5e7eb;
//               font-size: 1rem;
//               line-height: 1.7;
//             }
            
//             .product-benefits li:last-child {
//               border-bottom: none;
//             }
            
//             .product-benefits li::before {
//               content: "◆";
//               position: absolute;
//               left: 0;
//               color: #000;
//               font-size: 1.2rem;
//             }
            
//             /* Responsive Design */
//             @media (max-width: 768px) {
//               .premium-product-description {
//                 padding: 1.5rem 1rem;
//               }
              
//               .product-hero h1 {
//                 font-size: 1.5rem;
//               }
              
//               .specs-grid,
//               .image-gallery,
//               .guarantee-grid {
//                 grid-template-columns: 1fr;
//               }
              
//               .trust-badges {
//                 gap: 1rem;
//               }
              
//               .spec-item {
//                 flex-direction: column;
//               }
              
//               .spec-label {
//                 min-width: auto;
//                 margin-bottom: 0.5rem;
//               }
//             }
            
//             /* Accessibility */
//             .premium-product-description *:focus {
//               outline: 2px solid #000;
//               outline-offset: 2px;
//             }
//           </style>
          
//           {%- comment -%} Hero Section con Product Schema {%- endcomment -%}
//           <div class="product-hero">
//             <h1 itemprop="name">{{ product.title }}</h1>
            
//             <div class="trust-badges">
//               <span class="trust-badge">Materiali Premium</span>
//               <span class="trust-badge">Spedizione Sicura</span>
//               <span class="trust-badge">Garanzia 30 Giorni</span>
//             </div>
//           </div>
          
//           {%- comment -%} Estrazione e Parsing Contenuto {%- endcomment -%}
//           {% assign description_html = product.description %}
//           {% assign has_specs = false %}
//           {% assign has_images = false %}
          
//           {% if description_html contains 'SPECIFICATIONS' %}
//             {% assign has_specs = true %}
//           {% endif %}
          
//           {% if description_html contains '<img' %}
//             {% assign has_images = true %}
//           {% endif %}
          
//           {%- comment -%} Sezione Benefici SEO-Friendly {%- endcomment -%}
//           {% if product.metafields.custom.product_benefits != blank %}
// <div class="product-benefits">
//   <h2>Perché Scegliere Questo Prodotto</h2>
//   <ul>
//     {% assign benefits = product.metafields.custom.product_benefits | newline_to_br | split: '<br />' %}
//     {% for benefit in benefits %}
//       {% if benefit != blank %}
//       <li>
//         <strong>{{ benefit | strip }}</strong>
//       </li>
//       {% endif %}
//     {% endfor %}
//   </ul>
// </div>
// {% endif %}
          
//           {%- comment -%} Specifiche Tecniche {%- endcomment -%}
//           {% comment %} {% if has_specs %}
//           <div class="specs-section">
//             <h2>Specifiche Tecniche</h2>
//             <div class="specs-grid">
//               {% assign specs_html = description_html | split: '<h1>SPECIFICATIONS</h1>' | last | split: '<div class="detailmodule_html">' | first %}
//               {% assign spec_lines = specs_html | split: '<p>' %}
              
//               {% for line in spec_lines %}
//                 {% if line contains '<span>' %}
//                   {% assign parts = line | split: '</span>' %}
//                   {% if parts.size >= 2 %}
//                     {% assign label = parts[0] | split: '<span>' | last | strip %}
//                     {% assign value = parts[1] | split: '<span' | last | split: '>' | last | strip %}
                    
//                     {% if label != blank and value != blank %}
//                     <div class="spec-item">
//                       <span class="spec-label">{{ label | replace: ':', '' }}:</span>
//                       <span class="spec-value">{{ value }}</span>
//                     </div>
//                     {% endif %}
//                   {% endif %}
//                 {% endif %}
//               {% endfor %}
//             </div>
//           </div>
//           {% endif %} {% endcomment %}
//           {% assign description_html = product.description %}
//           {% if description_html contains 'SPECIFICATIONS' %}
//           <div class="specs-section">
//             <h2>Specifiche Tecniche</h2>
//             <div class="specs-grid">
//               {% assign specs_html = description_html | split: '<h1>SPECIFICATIONS</h1>' | last | split: '<div class="detailmodule_html">' | first %}
//               {% assign spec_lines = specs_html | split: '<p>' %}
              
//               {%- comment -%} LISTA CAMPI DA ESCLUDERE {%- endcomment -%}
//               {% assign excluded_fields = 'CN,Origine,Origin,CN,size_info,(Origine),Choice,semi_Choice,Dropshipping Available' | split: ',' %}
              





//               {% for line in spec_lines %}
//                 {% if line contains '<span>' %}
//                   {% assign parts = line | split: '</span>' %}
//                   {% if parts.size >= 2 %}
//                     {% assign label = parts[0] | split: '<span>' | last | strip %}
//                     {% assign value = parts[1] | split: '<span' | last | split: '>' | last | strip %}
                    
//                     {%- comment -%} VERIFICA SE IL CAMPO DEVE ESSERE ESCLUSO {%- endcomment -%}
//                     {% assign show_field = true %}
//                     {% for excluded in excluded_fields %}
//                       {% assign excluded_clean = excluded | strip %}
//                       {% if label == excluded_clean %}
//                         {% assign show_field = false %}
//                         {% break %}
//                       {% endif %}
//                     {% endfor %}
                    
//                     {%- comment -%} MOSTRA SOLO SE NON È ESCLUSO E NON È VUOTO {%- endcomment -%}
//                     {% if show_field and label != blank and value != blank %}
//                     <div class="spec-item">
//                       <span class="spec-label">{{ label | replace: ':', '' }}:</span>
//                       <span class="spec-value">{{ value }}</span>
//                     </div>
//                     {% endif %}
//                   {% endif %}
//                 {% endif %}
//               {% endfor %}
//             </div>
//           </div>
//           {% endif %}
          
//           {%- comment -%} Galleria Immagini {%- endcomment -%}
//           {% if has_images %}
//           <div class="image-showcase">
//             <h2>Dettagli del Prodotto</h2>
//             <div class="image-gallery">
//               {% assign images_section = description_html | split: '<div class="detailmodule_html">' | last %}
//               {% assign image_tags = images_section | split: '<img' %}
              
//               {% for img_tag in image_tags %}
//                 {% if img_tag contains 'src=' %}
//                   {% assign src_part = img_tag | split: 'src="' | last | split: '"' | first %}
//                   {% assign alt_part = img_tag | split: 'title="' | last | split: '"' | first %}
                  
//                   {% if src_part contains 'http' %}
//                   <div class="gallery-item">
//                     <img src="{{ src_part }}" 
//                          alt="{{ alt_part | default: product.title }}" 
//                          loading="lazy"
//                          itemprop="image">
//                   </div>
//                   {% endif %}
//                 {% endif %}
//               {% endfor %}
//             </div>
//           </div>
//           {% endif %}
          
//           {%- comment -%} Sezione Garanzie {%- endcomment -%}
//           <div class="guarantee-section">
//             <h3>La Tua Sicurezza è la Nostra Priorità</h3>
//             <div class="guarantee-grid">
//               <div class="guarantee-item">
//                 <strong>✓ Garanzia 30 Giorni</strong>
//                 <p>Rimborso completo se non sei soddisfatto</p>
//               </div>
//               <div class="guarantee-item">
//                 <strong>✓ Spedizione Tracciata</strong>
//                 <p>Monitora il tuo ordine in tempo reale</p>
//               </div>
//               <div class="guarantee-item">
//                 <strong>✓ Materiali Certificati</strong>
//                 <p>Privo di sostanze nocive</p>
//               </div>
//               <div class="guarantee-item">
//                 <strong>✓ Supporto Clienti</strong>
//                 <p>Assistenza rapida entro 24 ore</p>
//               </div>
//             </div>
//           </div>
          
//           {%- comment -%} Schema.org Structured Data per SEO {%- endcomment -%}
//           <meta itemprop="description" content="{{ product.description | strip_html | truncate: 160 }}">
//           <meta itemprop="brand" content="Myfresty">
          
//         </div>
//         {% endif %}
