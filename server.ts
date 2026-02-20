import { createRequestHandler, type ServerBuild } from "@remix-run/cloudflare";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore This file won’t exist if it hasn’t yet been built
import * as build from "./build/server"; // eslint-disable-line import/no-unresolved
import { getLoadContext } from "./load-context";
import { generateSeoHtml } from "@/routes/app.descreptionupdated";

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

    for (const message of batch.messages) {
      const productData = message.body;
console.log('productedData',productData)
      try {
        console.log("Processing:", productData?.id);

        const results = await generateSeoHtml(
          productData,
          env.KIMI_API_KEY
        );

        if (results?.length) {
  //         for (const res of results) {
  //           const { id, shortDescription, detailedDescription } = res;
  //           await env.DB.prepare(`
  //             INSERT INTO descreption (id, short_description, detailed_description)
  //             VALUES (?, ?, ?)
  //             ON CONFLICT(id) DO UPDATE SET
  //     short_description = excluded.short_description,
  //     detailed_description = excluded.detailed_description
  //           `)
  //      .bind(
  //     id,
  //     // productData.shop,
  //     shortDescription,
  //     detailedDescription
  //   )
  //   .run();
  //  }
          // for(const res of results){
          //   await env.DB.prepare(`
          //     INSERT INTO descreption (id, short_description, detailed_description)
          //     VALUES (?, ?, ?)
          //     ON CONFLICT(id) DO UPDATE SET
          //       short_description = excluded.short_description,
          //       detailed_description = excluded.detailed_description
          //   `)
          //     .bind(
          //       res.id,
          //       // productData.shop,
          //       res.shortDescription,
          //       res.detailedDescription
          //     )
          //     .run();
          // }
          if (results?.length) {
            await Promise.all(
              results.map(({ id, shortDescription, detailedDescription }) =>
                env.DB.prepare(`
                  INSERT INTO descreption (id, short_description, detailed_description)
                  VALUES (?, ?, ?)
                  ON CONFLICT(id) DO UPDATE SET
                    short_description = excluded.short_description,
                    detailed_description = excluded.detailed_description
                `)
                .bind(
                  id,
                  shortDescription ?? "",
                  detailedDescription ?? ""
                )
                .run()
              )
            );
          }
          
         
        }

        message.ack(); // ✅ IMPORTANT
      } catch (err) {
        console.error("Queue error:", err);
        message.retry(); // better than throw
      }
    }
  }
} satisfies ExportedHandler<Env>;
