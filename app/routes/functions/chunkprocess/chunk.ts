// import pLimit from 'p-limit';
// import retry from 'async-retry';
// import AbortController from 'abort-controller';
// import { Readable } from 'stream';

import { allResults, chunkArray, type VARIBALES } from "@/routes/app.descreptionupdated";
import { buildPrompt } from "../propmtsSEO/propmts_descreption";
import { sendPrompt } from "../deepseekai/deepseekai";

// // Configuration
// const BATCH_SIZE = 1;              // One product per "chunk" (two API calls)
// const CONCURRENCY = 5;              // Max products processed in parallel
// const API_TIMEOUT = 30000;          // 30 seconds per API call
// const MAX_RETRIES = 3;

// // In-memory result collector (can be replaced with a write stream)
// const allResults: any[] = [];

// // Chunking function remains the same
// function chunkArray<T>(array: T[], size: number): T[][] {
//   const chunks: T[][] = [];
//   for (let i = 0; i < array.length; i += size) {
//     chunks.push(array.slice(i, i + size));
//   }
//   return chunks;
// }

// // Build prompt function (unchanged, but you can move it to a worker if needed)
// function buildPrompt(chunk: VARIBALES[], outputField: 'shortDescription' | 'detailedDescription'): string {
//   // ... (keep your existing implementation)
// }

// // sendPrompt with timeout and retry (assumed to return parsed JSON)
// async function sendPromptWithRetry(prompt: string, apiKey: string): Promise<any> {
//   return retry(
//     async (bail, attempt) => {
//       const controller = new AbortController();
//       const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

//       try {
//         // Replace with your actual API call (fetch, axios, etc.)
//         const response = await fetch('YOUR_GEMINI_ENDPOINT', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
//           body: JSON.stringify({ prompt }),
//           signal: controller.signal
//         });

//         if (!response.ok) {
//           if (response.status >= 400 && response.status < 500) bail(new Error(`Client error: ${response.status}`));
//           throw new Error(`Server error: ${response.status}`);
//         }

//         return await response.json();
//       } catch (err: any) {
//         if (err.name === 'AbortError') throw new Error('Request timeout');
//         throw err;
//       } finally {
//         clearTimeout(timeoutId);
//       }
//     },
//     {
//       retries: MAX_RETRIES,
//       factor: 2,
//       minTimeout: 1000,
//       onRetry: (err, attempt) => {
//         console.log(`Retry ${attempt} after error: ${err.message}`);
//       }
//     }
//   );
// }

// // Process a single product (two parallel API calls, then merge)
// async function processProduct(product: VARIBALES): Promise<{ id: string; shortDescription: string; detailedDescription: string }> {
//   const chunk = [product]; // BATCH_SIZE = 1

//   const shortPrompt = buildPrompt(chunk as VARIBALES[], 'shortDescription');
//   const detailedPrompt = buildPrompt(chunk as VARIBALES[], 'detailedDescription');

//   // Execute both API calls concurrently
//   const [shortResults, detailedResults] = await Promise.all([
//     sendPromptWithRetry(shortPrompt, API_KEY_GEMINI),
//     sendPromptWithRetry(detailedPrompt, API_KEY_GEMINI)
//   ]);

//   // Ensure responses are arrays
//   const shortArray = Array.isArray(shortResults) ? shortResults : [];
//   const detailedArray = Array.isArray(detailedResults) ? detailedResults : [];

//   // Merge using Maps for O(1) lookup
//   const shortMap = new Map(shortArray.map(item => [item.id, item]));
//   const detailedMap = new Map(detailedArray.map(item => [item.id, item]));

//   const short = shortMap.get(product.id);
//   const detailed = detailedMap.get(product.id);

//   return {
//     id: product.id,
//     shortDescription: short?.shortDescription ?? '',
//     detailedDescription: detailed?.detailedDescription ?? ''
//   };
// }

// // ----- STREAMING APPROACH -----
// // If the input array is huge, we process it as a stream.
// // Otherwise you can simply use the concurrent map below.
// async function processStream(products: VARIBALES[]) {
//   // Create a readable stream from the products array
//   const readable = Readable.from(products);

//   // Concurrency limiter
//   const limit = pLimit(CONCURRENCY);

//   // Process each product as it comes, but limit concurrency
//   const promises: Promise<void>[] = [];

//   readable.on('data', (product: VARIBALES) => {
//     // Wrap processing in concurrency limiter
//     const promise = limit(async () => {
//       try {
//         const result = await processProduct(product);
//         allResults.push(result);
//         console.log(`Processed ${product.id}`);
//       } catch (err) {
//         console.error(`Failed to process ${product.id}:`, err);
//         // Optionally collect errors
//       }
//     });
//     promises.push(promise);
//   });

//   // Wait for stream to end and all tasks to complete
//   await new Promise((resolve, reject) => {
//     readable.on('end', resolve);
//     readable.on('error', reject);
//   });

//   await Promise.all(promises);
// }

// // ----- SIMPLE CONCURRENT MAP (if you don't need streaming) -----
// async function processConcurrent(products: VARIBALES[]) {
//   const limit = pLimit(CONCURRENCY);
//   const results = await Promise.all(
//     products.map(product => limit(() => processProduct(product)))
//   );
//   allResults.push(...results);
// }

// // ----- MAIN EXECUTION -----
// (async () => {
//   try {
//     const chunks = chunkArray(updatedDescreptionAI, BATCH_SIZE); // still chunked if needed
//     // But since BATCH_SIZE=1, chunks is just an array of single-product arrays.
//     // We'll flatten it for simpler processing.
//     const products = chunks.flat(); // or directly use updatedDescreptionAI

//     // Option 1: Use streaming (good for > 1000 products)
//     await processStream(products);

//     // Option 2: Use concurrent map (simpler)
//     // await processConcurrent(products);

//     console.log(`Total products processed: ${allResults.length}/${updatedDescreptionAI.length}`);
//     return allResults;
//   } catch (err) {
//     console.error('Fatal error:', err);
//     throw err;
//   }
// })();






import pLimit from 'p-limit';





async function processProduct(
    product: VARIBALES | VARIBALES[], 
    DEEP_SEEK_API_KEY: string
  ): Promise<{ id: string; shortDescription: string; detailedDescription: string } | { id: string; shortDescription: string; detailedDescription: string }[]> {
  
    const productsArray = Array.isArray(product) ? product : [product];
  
    const chunkPromises = productsArray.map(async (p) => {
      const shortPrompt = buildPrompt([p], 'shortDescription');
      const detailedPrompt = buildPrompt([p], 'detailedDescription');
  
      let shortResults: { id: string; shortDescription?: string }[] = [];
      let detailedResults: { id: string; detailedDescription?: string }[] = [];
  
      try {
        [shortResults, detailedResults] = await Promise.all([
          sendPrompt(shortPrompt, DEEP_SEEK_API_KEY) as Promise<{ id: string; shortDescription?: string }[]>,
          sendPrompt(detailedPrompt, DEEP_SEEK_API_KEY) as Promise<{ id: string; detailedDescription?: string }[]>
        ]);
      } catch (err) {
        console.error('Error in API calls:', err);
      }
  
      const shortMap = new Map(shortResults.map(item => [item.id, item]));
      const detailedMap = new Map(detailedResults.map(item => [item.id, item]));
  
      const short = shortMap.get(p.id);
      const detailed = detailedMap.get(p.id);
  
      return {
        id: p.id,
        shortDescription: short?.shortDescription ?? '',
        detailedDescription: detailed?.detailedDescription ?? ''
      };
    });
  
    const results = await Promise.all(chunkPromises);
    return Array.isArray(product) ? results : results[0];
  }


export async function processStream(products: VARIBALES[],DEEP_SEEK_API_KEY:string) {
  const CONCURRENCY = 5;
  const limit = pLimit(CONCURRENCY);

  await Promise.all(
    products.map(product =>
      limit(async () => {
        try {
          const result = await processProduct(product,DEEP_SEEK_API_KEY);
          console.log('result is here', result);
          allResults.push(result);
          console.log(`Processed ${product.id}`);
        } catch (err) {
          console.error(`Failed to process ${product.id}:`, err);
        }
      })
    )
  );
}



