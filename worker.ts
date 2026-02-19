import { createRequestHandler } from "@remix-run/cloudflare";
import * as build from "./build/server";
import { generateSeoHtml } from "./app/services/ai.server";

// Define Env interface for TypeScript
interface Env {
  DB: D1Database;
  SEO_QUEUE: Queue;
  GEMINI_API_KEY: string;
}

// 1. The Remix Request Handler (Handles HTTP)
const requestHandler = createRequestHandler({
  build,
  getLoadContext: (context) => ({
    ...context, // Passes env to Remix loaders/actions
  }),
  mode: process.env.NODE_ENV,
});

// 2. Export the Worker Object
export default {
  // A. Fetch Handler (Standard Remix)
  async fetch(request: Request, env: Env, context: ExecutionContext) {
    return requestHandler(request, { env, context });
  },

  // B. Queue Handler (Background Consumer)
  async queue(batch: MessageBatch<any>, env: Env, context: ExecutionContext) { 
       for (const message of batch.messages) {
      // Data comes from the Remix Action
      const productData = message.body; 
      
      try {
        console.log(`[Queue] Processing Product: ${productData?.id}`);

        // Call the AI Logic
        const results = await generateSeoHtml([productData], env.GEMINI_API_KEY);

        if (results && results.length > 0) {
          const seoData = results[0];

          // Save to D1 Database
          await env.DB.prepare(
            "INSERT INTO product_seo (id, shop_domain, short_description, detailed_description) VALUES (?, ?, ?, ?)"
          )
          .bind(
            productData.id, 
            productData.shop, 
            seoData.shortDescription, 
            seoData.detailedDescription
          )
          .run();
        }
      } catch (err) {
        // If this throws, Cloudflare will retry the message automatically
        console.error(`[Queue] Failed processing ${productData.id}`, err);
        throw err; 
      }
    }
  }
};