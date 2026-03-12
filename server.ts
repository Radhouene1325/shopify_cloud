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
import { ultraDecompress } from "@/routes/functions/uint8ToBase64/brotliCompressSync";
import { productSchema } from "@/routes/functions/schemasSEO/SEO";

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


    

await Promise.all(
  batch.messages.map((message) =>
    queue.add(async () => {
      // const payload = decompressPayload(message.body.body as string);
      console.log('message her from queue',message.body)
      const payload=ultraDecompress(message.body.body as string)
      const { shop, products } = payload;
      // console.log('products is her decopressed',products)
      let cursor=10
      const id=products[0].id.split('/').pop()
      console.log(id)
      let index=products.every((e)=>e.tags.includes("DESC_AI"))

      console.log("index verify is her ",index)
      // const rating = await fetch(
      //   `${env.URL_REVIEWS}/public/reviews?sort=by_date&direction=asc&product_id=${id}`,
      //   {
      //     method: "GET",
      //     headers: {
      //       "Content-Type": "application/json",
      //       "Authorization": `Bearer ${env.REVIEWS_API_KEY_PLATINUM}`
      //     }
      //   }
      // );
      
      // const other_reviews = await rating.json();
      
      // console.log("rrrrrrrrrrrrrrrrrr",other_reviews?.data?.reviews.map((e:any)=>e.media).filter((media:any)=>media!==null).flatMap((e)=>e));
      // console.log("other",other_reviews?.data?.reviews);
    

      
      const admin = createShopifyAdmin(
        shop,
        env.SHOPIFY_API_TOKEN_PALITINUMSHOP
      );
     
        
      try {
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
   let verify= products.every((e)=>e.tags.includes('DESC_AI'))
  
    optimizedHtml = await generateSeoHtml(
      products,
      env.DEEP_SEEK_API_KEY
    )
   
    categoryCache.set("categoryCache",optimizedHtml)



    seo = await generateSeoMetadata(
      products,
      env.DEEP_SEEK_API_KEY
    );


  }


  try {
    
    const delay = (ms:any) => new Promise(resolve => setTimeout(resolve, ms));

    //  console.log('SEO_OPTIMISE_TITLE_DECPRETION_HANDEL ',seotitle_descreption_handel)
    const seoMap = new Map(seo.map(s => [s.id, s]));
let DESC_AI=new Map(optimizedHtml.map(s=>[s.id,s]))
console.log("ssssssssssssssssssssssssssssssssssssssssssssssssssssss",DESC_AI)
      for(const test of products){
        console.log('dddddddddddddddddddddddddddaaa')
        console.log(DESC_AI.get(test.id))
        console.log(DESC_AI.get(test.seoTitle))
        console.log(DESC_AI.get(test.seoDescription))
        console.log(DESC_AI.get(test.category))
        console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
      }


    const updateProducts = []; 

    for (const DESC_AI of optimizedHtml) {
    
      // if (!DESC_AI.id || !DESC_AI.detailedDescription || !DESC_AI.shortDescription) {
      //   console.error("AI returned empty fields", DESC_AI);
      //   continue;
      // }
    
      const OLD_DESC = oldDescreptionsMap.get(DESC_AI.id);
      if (!OLD_DESC) continue;
    
      const SEO = seoMap.get(DESC_AI.id);
      if (!SEO) continue;
    
      const mergedTags = [
        ...(OLD_DESC.tags || []),
        SEO.category?.name || [],
        "DESC_AI"
      ].filter(Boolean);

      const minPrice = OLD_DESC.min_amount
      ? parseFloat(OLD_DESC.min_amount).toFixed(2)
      : "0.00";
    
    const maxPrice = OLD_DESC.max_amount
      ? parseFloat(OLD_DESC.max_amount).toFixed(2)
      : minPrice;
      const reverse=`#graphql
      query GetProductReviewSchema($id: ID!) {
        product(id: $id) {
          metafield(namespace: "alireviews", key: "seo_rating_review_key_script") {
            key 
            value
            type
            namespace
            jsonValue
            id
            compareDigest
            createdAt
            updatedAt
            
          }
        }
      }
      `
            const result=await admin.graphql(reverse,{variables:{id:OLD_DESC.id}})
            let res=await result.json()
            const data=res?.data?.product?.metafield.value
            console.log(res?.data?.product?.metafield)
            // const getAliRating = (value:string) => {
            //   if (!value) return null;
            
            //   try {
            //     return JSON.parse(`{${value.replace(/,$/, "")}}`).aggregateRating;
            //   } catch {
            //     return null;
            //   }
            // };
            
            // const aggregateRating = getAliRating(data?.value);
            // console.log(aggregateRating)

            interface AliReview {
             
                ratingValue: number;
                reviewCount: number;
                bestRating?: number;
                worstRating?: number;
              
              
            }

          const aggregateRating:AliReview | null = data
            ? (() => {
                try {
                  return JSON.parse(`{${data.replace(/,$/, "")}}`).aggregateRating;
                } catch (err) {
                  console.error("Failed to parse metafield JSON:", err);
                  return null;
                }
              })()
            : null;

console.log('ssssssssssssssss',aggregateRating)
const rating = await fetch(
  `${env.URL_REVIEWS}/public/reviews?sort=by_date&direction=asc&product_id=${OLD_DESC.id.split('/').pop()}`,
  {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.REVIEWS_API_KEY_PLATINUM}`
    }
  }
);

const other_reviews = await rating.json();

console.log("rrrrrrrrrrrrrrrrrr",other_reviews?.data?.reviews.map((e:any)=>e.media).filter((media:any)=>media!==null).flatMap((e)=>e));
console.log("other",other_reviews?.data?.reviews);
const review = Array.isArray(other_reviews?.data?.reviews) && other_reviews?.data?.reviews.length
? other_reviews?.data?.reviews.map((rev: any) => ({
    "@type": "Review",
    "author": { "@type": "Person", "name": rev.author || "Anonymous" },
    "datePublished": rev.creviewreated_at || new Date().toISOString(),
    "reviewBody": rev.content || "",
    "shop_id":rev.shop_id,
    "country":rev.country,
    "product_id":rev.product_id,
    "id":rev.id,
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": rev.star || 0,
      "bestRating": 5,
      "worstRating": 1
    },
    "media":Array.isArray(rev.media)
    ?
    rev.media
    .filter((media:any)=>media!==null)
    .flat()
    .map((e:any)=>({
      "@type":"photo",
      "id":e.id,
      "product_id":e.product_id,
      "comment_id":e.comment_id,
      "type":e.type,
      "url":e.url
    })):undefined
  }))
: undefined;
console.log('reviews after fetch ',review)


    const offers = {
      "@type": "AggregateOffer",
      "priceCurrency": OLD_DESC.currencyCode,
      "lowPrice": Number(minPrice).toFixed(2),
      "highPrice": Number(maxPrice).toFixed(2),
      "offerCount": OLD_DESC.variants?.length || 1,
      "url": `https://platinumshop.it/products/${SEO.handle}`,
      "availability": "https://schema.org/InStock"

    };
   
    const aggregateRating__ = aggregateRating
  ? {
      "@type": "AggregateRating",
      "ratingValue":aggregateRating?.ratingValue || "0",
      "reviewCount":aggregateRating?.reviewCount || "0",
      "bestRating": aggregateRating?.bestRating || 5,
      "worstRating": aggregateRating?.worstRating || 1
    }
  : undefined; // Will be skipped if missing

  //  // Will be skipped if missiaggregateRating__ng

  console.log('aggreagation is her',aggregateRating__)
 console.log('revieeeessssssssss',OLD_DESC)

 const query = `#graphql
 query GetCollectionsByProduct($first: Int!) {
   collections(first: $first, query:"product_id:${OLD_DESC.id.split("/").pop()}") {
     edges {
       
       node {
         id
         title
         handle
       }
     }
   }
 }
`;
const response = await admin.graphql(query, {
 variables: {
   first: 250,
  
 },
});
const json = await response.json();
console.log('collection in her ', json);

const edges = json?.data?.collections?.edges ?? [];
const collections = edges.map((edge: any) => edge.node);
console.log('Collections for product:', collections); 


   
      console.log('ddndndnd',productSchema)

  
      console.log("productSchema is secces",productSchema)
      
      updateProducts.push({
        id: OLD_DESC.id,
        descriptionHtml: DESC_AI.detailedDescription,
        tags: mergedTags,
        category: SEO.category?.id,
        handle: OLD_DESC.handle,
        productType: SEO.productType,
        seo: { description: SEO.seoDescription, title: SEO.seoTitle },
        metafields: [
          { namespace: "custom", key: "descriptionsai", type: "json", value: JSON.stringify(DESC_AI.shortDescription) },
          { namespace: "custom", key: "seo_title", type: "json", value: JSON.stringify(SEO.seoTitle) },
          { namespace: "custom", key: "seo_descreption", type: "json", value: JSON.stringify(SEO.seoDescription) },
          { namespace: "seo", key: "schema_org", type: "json", value: JSON.stringify(productSchema(SEO,collections,OLD_DESC,offers,aggregateRating__,aggregateRating,review)) },
        
          { namespace: "custom", key: "facebookTitle", type: "json", value:JSON.stringify(   SEO?.socialOptimization.facebookTitle) },
          { namespace: "custom", key: "facebookDescription", type: "json", value: JSON.stringify( SEO?.socialOptimization.facebookDescription ) },
          { namespace: "custom", key: "tiktokTitle", type: "json", value:JSON.stringify(   SEO?.socialOptimization.tiktokTitle) },
          { namespace: "custom", key: "pinterestTitle", type: "json", value:JSON.stringify(  SEO?.socialOptimization.pinterestTitle) },
          { namespace: "custom", key: "pinterestDescription", type: "json", value:JSON.stringify(SEO?.socialOptimization.pinterestDescription)    },

        
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



