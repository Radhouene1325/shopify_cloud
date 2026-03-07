import { createRequestHandler, type ServerBuild } from "@remix-run/cloudflare";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore This file won’t exist if it hasn’t yet been built
import * as build from "./build/server"; // eslint-disable-line import/no-unresolved
import { getLoadContext } from "./load-context";
import { generateSeoHtml, generateSeoHtmlgimini } from "@/routes/app.descreptionupdated";
import { generateSeoMetadata, getTaxonomyIdForCategory } from "@/routes/functions/propmtsSEO/buildSEOPrompt";
import { productsupdated } from "@/routes/functions/query/updateprooductquery";
import { decompressPayload } from "@/routes/functions/uint8ToBase64/uint8ToBase64";
import PQueue from "p-queue";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleRemixRequest = createRequestHandler(build as any as ServerBuild);

export default {
  async fetch(request, env, ctx) {
    try {
      console.log("Incoming request method:", request.method);
      const loadContext = getLoadContext({
        request,
        context: {
          cloudflare: {
            // This object matches the return value from Wrangler's
            // `getPlatformProxy` used during development via Remix's
            // `cloudflareDevProxyVitePlugin`:
            // https://developers.cloudflare.com/workers/wrangler/api/#getplatformproxy
            cf: request.cf,
            ctx: {
              waitUntil: ctx.waitUntil.bind(ctx),
              passThroughOnException: ctx.passThroughOnException.bind(ctx),
              props:{}
            },
            caches,
            env,
          },
        },
      });
      // Explicitly handle CORS if needed
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }
      return await handleRemixRequest(request, loadContext);
    } catch (error) {
      console.error("Request handling error:", error);
      return new Response("An unexpected error occurred", { status: 500 });
    }
  },
  async queue(batch: MessageBatch<any>, env: Env, ctx: ExecutionContext) {
    console.log("QUEUE HANDLER ACTIVE");

    const queue=new PQueue({
      concurrency:2,
      interval:1000,
      intervalCap:1
    })


//     for (const message of batch.messages) {
//       const productData = message.body;
// console.log('productedData',productData)
// for (const des of productData){
//   try {
//     console.log("Processing:", des?.id);

//     const results = await generateSeoHtml(
//       productData,
//       env.KIMI_API_KEY
//     );

//     if (!results?.length) {
// //         for (const res of results) {
// //           const { id, shortDescription, detailedDescription } = res;
// //           await env.DB.prepare(`
// //             INSERT INTO descreption (id, short_description, detailed_description)
// //             VALUES (?, ?, ?)
// //             ON CONFLICT(id) DO UPDATE SET
// //     short_description = excluded.short_description,
// //     detailed_description = excluded.detailed_description
// //           `)
// //      .bind(
// //     id,
// //     // productData.shop,
// //     shortDescription,
// //     detailedDescription
// //   )
// //   .run();
// //  }
//       // for(const res of results){
//       //   await env.DB.prepare(`
//       //     INSERT INTO descreption (id, short_description, detailed_description)
//       //     VALUES (?, ?, ?)
//       //     ON CONFLICT(id) DO UPDATE SET
//       //       short_description = excluded.short_description,
//       //       detailed_description = excluded.detailed_description
//       //   `)
//       //     .bind(
//       //       res.id,
//       //       // productData.shop,
//       //       res.shortDescription,
//       //       res.detailedDescription
//       //     )
//       //     .run();
//       // }
//       if (results?.length) {
//         await Promise.all(
//           results.map(({ id, shortDescription, detailedDescription }) =>
//             env.DB.prepare(`
//               INSERT INTO descreption (id, short_description, detailed_description)
//               VALUES (?, ?, ?)
//               ON CONFLICT(id) DO UPDATE SET
//                 short_description = excluded.short_description,
//                 detailed_description = excluded.detailed_description
//             `)
//             .bind(
//               id,
//               shortDescription ?? "",
//               detailedDescription ?? ""
//             )
//             .run()
//           )
//         );
//       }
      
     
//     }

//     message.ack(); // ✅ IMPORTANT
//   } catch (err) {
//     console.error("Queue error:", err);
//     message.retry(); // better than throw
//   }
// }
     
//     }
console.log('hello messages im her ',batch.messages)

await Promise.all(
  batch.messages.map((message) =>
    queue.add(async () => {
      const payload = decompressPayload(message.body.body as string);
      const { shop, products } = payload;

      const admin = createShopifyAdmin(
        shop,
        env.SHOPIFY_API_TOKEN_PALITINUMSHOP
      );

      try {
        // 3️⃣ Process products safely
        await processProducts(products, admin, env);

        // 4️⃣ Acknowledge the message
        message.ack();
      } catch (err) {
        console.error("Queue processing failed for message", message.id, err);
        message.retry();
      }
    })
  )
);

// 5️⃣ Wait until all tasks are finished
await queue.onIdle();


// await Promise.all(
//   batch.messages.map(async(message)=>{
//     const payload = decompressPayload(message.body.body as string);

//     const {shop,products,accessToken}=payload
//     console.log('messager is her for see the data',message)
//     console.log('api token is her hello ',env.SHOPIFY_API_TOKEN_PALITINUMSHOP)
//     const admin= createShopifyAdmin(shop,env.SHOPIFY_API_TOKEN_PALITINUMSHOP)
//     console.log(admin)
//             try {
//               await processProducts(products, admin,env);
    
//               message.ack();
//             }catch(err){
//               console.error("Queue processing failed", err);
    
//               message.retry();
      
//             }
//   })
// )




  }
} satisfies ExportedHandler<Env>;




async function processProducts(products: any[],admin:any, env: any) {


  const categoryCache = new Map();

  const concurrency = 15;
  const pool: Promise<any>[] = [];

  const oldDescreptionsMap=new Map(products.map(item=>[item.id,item]))


  // for (const product of products) {

    const task = processSingleProduct(products, admin, env, categoryCache,oldDescreptionsMap);

    pool.push(task);

    if (pool.length >= concurrency) {
      await Promise.all(pool);
      pool.length = 0;
    }

  // }

  await Promise.all(pool);
}


async function processSingleProduct(
  products: any,
  admin: any,
  env: any,
  categoryCache: Map<string,string>,
  oldDescreptionsMap:any
) {

  let optimizedHtml;
  let seo;

  try {

    optimizedHtml = await generateSeoHtmlgimini(
      env.GEMINI_API_KEY,
      products
    );

    seo = await generateSeoMetadata(
      products,
      env.GEMINI_API_KEY
    );

  } catch {

    optimizedHtml = await generateSeoHtml(
      products,
      env.DEEP_SEEK_API_KEY
    );

    seo = await generateSeoMetadata(
      products,
      env.DEEP_SEEK_API_KEY
    );


  }



  try {
    
    const delay = (ms:any) => new Promise(resolve => setTimeout(resolve, ms));

    //  console.log('SEO_OPTIMISE_TITLE_DECPRETION_HANDEL ',seotitle_descreption_handel)
    const seoMap = new Map(seo.map(s => [s.id, s]));


    const updateProducts = [];

    for (const DESC_AI of optimizedHtml) {
      if (!DESC_AI.id || !DESC_AI.detailedDescription || !DESC_AI.shortDescription) {
        console.error("AI returned empty fields", DESC_AI);
        continue;
      }
    
      const OLD_DESC = oldDescreptionsMap.get(DESC_AI.id);
      if (!OLD_DESC) continue;
    
      const SEO = seoMap.get(DESC_AI.id);
      if (!SEO) continue;
    
      const mergedTags = [
        ...(OLD_DESC.tags || []),
        SEO.category?.name || [],
        "DESC_AI"
      ].filter(Boolean);
    
      const productSchema = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": SEO.seoTitle || OLD_DESC.title,
        "description": SEO.seoDescription || OLD_DESC.title,
        "image": OLD_DESC.image,
        "sku": OLD_DESC.sku || OLD_DESC.id?.split('/').pop() || '',
        "mpn": OLD_DESC.barcode || OLD_DESC.id?.split('/').pop() || '',
        "brand": { "@type": "Brand", "name": OLD_DESC.vendor || "PlatiNum" },
        "offers": {
          "@type": "Offer",
          "url": `https://platinumshop.it/products/${SEO.handle}`,
          "priceCurrency": "EUR",
          "price": OLD_DESC.price ? parseFloat(OLD_DESC.price.toString()).toFixed(2) : "0.00",
          "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          "itemCondition": "https://schema.org/NewCondition",
          "seller": { "@type": "Organization", "name": "PlatiNum" }
        }
      };
    
      updateProducts.push({
        id: OLD_DESC.id,
        descriptionHtml: DESC_AI.detailedDescription,
        tags: mergedTags,
        category: SEO.category?.id,
        handle: SEO.handle,
        productType: SEO.productType,
        seo: { description: SEO.seoDescription, title: SEO.seoTitle },
        metafields: [
          { namespace: "custom", key: "descriptionsai", type: "json", value: JSON.stringify(DESC_AI.shortDescription) },
          { namespace: "custom", key: "seo_title", type: "json", value: JSON.stringify(SEO.seoTitle) },
          { namespace: "custom", key: "seo_descreption", type: "json", value: JSON.stringify(SEO.seoDescription) },
          // { namespace: "seo", key: "schema_org", type: "json", value: JSON.stringify(productSchema) }
        ]
      });
    }
    async function throttledUpdates(products, batchSize = 20, delayMs = 500) {
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
    
        const results = await Promise.allSettled(batch.map(prod =>
          admin.graphql(productsupdated, { variables: { product: prod } })
        ));
    
        results.forEach((res, idx) => {
          if (res.status === "rejected") {
            console.error(`Update failed for product ${batch[idx].id}`, res.reason);
          }
        });
    
        if (i + batchSize < products.length) {
          await delay(delayMs);
        }
      }
    }
    
    // 4️⃣ Run throttled updates
    await throttledUpdates(updateProducts, 2, 500);


// for( const DESC_AI of optimizedHtml){
//     if (!DESC_AI.id|| !DESC_AI.detailedDescription || !DESC_AI.shortDescription) {
//         console.error("AI returned empty fields", optimizedHtml);
//         return Response.json({ error: "Empty content from AI" }, { status: 500 });
//       }
//   // for (const OLD_DESC of updatedDescreptionAI ){
//       const OLD_DESC=oldDescreptionsMap.get(DESC_AI.id)
//       console.log(OLD_DESC.id)
//       const SEO=seoMap.get(DESC_AI.id)
//       if (!OLD_DESC)continue;
//       if (!seo)return
//       // for (const SEO of seo){

//          if(DESC_AI.id===OLD_DESC.id && SEO?.id===OLD_DESC.id){
//         // console.log("VERIFU IS TESTED",DESC_AI.id===OLD_DESC.id)
//         // console.log('is true is very nice ')
//         // Merge tags: preserve existing + add DESC_AI (productUpdate overwrites, so we must include all)
//                    console.log('seo is activated her ',SEO?.category.id)
//                   console.log('seo is activated her ',SEO?.category.name)
//                     console.log('seo is activated her ',SEO)
// //         const CATEGORY_TAMMOXY_ID=await getTaxonomyIdForCategory(admin,SEO.category.name)
// // console.log('her is the value of tamoxy',CATEGORY_TAMMOXY_ID)
//                const productSchema = {
//   "@context": "https://schema.org/",
//   "@type": "Product",
//   "name": SEO?.seoTitle || OLD_DESC.title, // ✅ REQUIRED
//   "description": SEO?.seoDescription || OLD_DESC.title,
//   "image":OLD_DESC.image,
//   "sku": OLD_DESC.sku || OLD_DESC.id?.split('/').pop() || '',
//   "mpn": OLD_DESC.barcode || OLD_DESC.id?.split('/').pop() || '',
//   "brand": {
//     "@type": "Brand",
//     "name": OLD_DESC.vendor || "PlatiNum"
//   },
//   "offers": {
//     "@type": "Offer",
//     "url": `https://platinumshop.it/products/${SEO.handle}`,
//     "priceCurrency": "EUR",
//     "price": OLD_DESC.price ? parseFloat(OLD_DESC.price.toString()).toFixed(2) : "0.00",
//     // "availability": OLD_DESC.available 
//     //   ? "https://schema.org/InStock" 
//     //   : "https://schema.org/OutOfStock",
//     "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
//     "itemCondition": "https://schema.org/NewCondition",
//     "seller": {
//       "@type": "Organization",
//       "name": "PlatiNum"
//     }
//   }
//                   };





//         const mergedTags = [...new Set([
//           ...(OLD_DESC.tags || []),
//           (SEO?.category?.name|| []),
//           "DESC_AI"])];
//         // const response = 
//         await admin.graphql(productsupdated, {
//           variables: {
//             product: {
//               id: OLD_DESC.id,
//               descriptionHtml: DESC_AI.detailedDescription,
//               tags: mergedTags,
//               category:SEO?.category?.id,
//               handle:SEO?.handle,
//               productType:SEO?.productType,
//               seo:{
//                 description:SEO?.seoDescription,
//                 title:SEO?.seoTitle
//               },
//               metafields: [
//                 {
//                   namespace: "custom",
//                   key: "descriptionsai",
//                   type: "json",
//                   value: JSON.stringify(DESC_AI.shortDescription)
//                 },
//                 {
//                   namespace: "custom",
//                   key: "seo_title",
//                   type: "json",
//                   value: JSON.stringify(SEO?.seoTitle)
//                 },
//                 {
//                   namespace: "custom",
//                   key: "seo_descreption",
//                   type: "json",
//                   value: JSON.stringify(SEO?.seoDescription)
//                 },
//                 {
//                   namespace: "seo",
//                   key: "schema_org",
//                   type: "json",
//                   value: JSON.stringify(productSchema)
//                 }
//               ]
//             }
//           }
//         });
             
          
  
         
      
      
       
//         }
      

   

   

// }






    return Response.json(optimizedHtml,  {headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300"
    }});
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to generate content" }, { status: 500 });
  }




  // const DESC_AI = optimizedHtml[0];
  // const SEO = seo[0];

  // if (!DESC_AI || !SEO) return;

  // let taxonomyId = categoryCache.get(SEO.category);

  // if (!taxonomyId) {
  //   taxonomyId = await getTaxonomyIdForCategory(admin, SEO.category);
  //   categoryCache.set(SEO.category, taxonomyId);
  // }

  // const mergedTags = [
  //   ...new Set([
  //     ...(OLD_DESC.tags || []),
  //     SEO.category,
  //     "DESC_AI"
  //   ])
  // ];

  // const productSchema = {
  //   "@context": "https://schema.org/",
  //   "@type": "Product",
  //   name: SEO.seoTitle || OLD_DESC.title,
  //   description: SEO.seoDescription || OLD_DESC.title,
  //   image: OLD_DESC.image,
  //   sku: OLD_DESC.sku || OLD_DESC.id?.split("/").pop(),
  //   mpn: OLD_DESC.barcode || OLD_DESC.id?.split("/").pop(),
  //   brand: {
  //     "@type": "Brand",
  //     name: OLD_DESC.vendor || "PlatiNum"
  //   },
  //   offers: {
  //     "@type": "Offer",
  //     url: `https://platinumshop.it/products/${SEO.handle}`,
  //     priceCurrency: "EUR",
  //     price: OLD_DESC.price
  //       ? parseFloat(OLD_DESC.price).toFixed(2)
  //       : "0.00",
  //     priceValidUntil: new Date(
  //       Date.now() + 365 * 24 * 60 * 60 * 1000
  //     )
  //       .toISOString()
  //       .split("T")[0],
  //     itemCondition: "https://schema.org/NewCondition",
  //     seller: {
  //       "@type": "Organization",
  //       name: "PlatiNum"
  //     }
  //   }
  // };

  // await admin.graphql(productsupdated, {
  //   variables: {
  //     product: {
  //       id: OLD_DESC.id,
  //       descriptionHtml: DESC_AI.detailedDescription,
  //       tags: mergedTags,
  //       category: taxonomyId,
  //       handle: SEO.handle,
  //       productType: SEO.productType,
  //       seo: {
  //         title: SEO.seoTitle,
  //         description: SEO.seoDescription
  //       },
  //       metafields: [
  //         {
  //           namespace: "custom",
  //           key: "descriptionsai",
  //           type: "json",
  //           value: JSON.stringify(DESC_AI.shortDescription)
  //         },
  //         {
  //           namespace: "custom",
  //           key: "seo_title",
  //           type: "json",
  //           value: JSON.stringify(SEO.seoTitle)
  //         },
  //         {
  //           namespace: "custom",
  //           key: "seo_descreption",
  //           type: "json",
  //           value: JSON.stringify(SEO.seoDescription)
  //         },
  //         {
  //           namespace: "seo",
  //           key: "schema_org",
  //           type: "json",
  //           value: JSON.stringify(productSchema)
  //         }
  //       ]
  //     }
  //   }
  // });

}


interface GraphQLAdmin {
  graphql: (query: string, options?: { variables?: Record<string, any> }) => Promise<Response>;
}
function createShopifyAdmin(shop: string, token: string): GraphQLAdmin {
  return {
    async graphql(query: string, options?: { variables?: Record<string, any> }) {

      return fetch(
        `https://${shop}/admin/api/2022-01/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": token
          },
          body: JSON.stringify({
            query,
            variables: options?.variables
          })
        }
      );

    }
  };
}



