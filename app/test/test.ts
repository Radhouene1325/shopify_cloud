// import { sendPrompt } from "@/routes/functions/deepseekai/deepseekai";
// import { buildPrompt } from "@/routes/functions/propmtsSEO/propmts_descreption";

// interface ProductInput {
//     id: string;
//     descreption: string; // keeping original typo as in your code
//     [key: string]: any;
//   }
  
//   interface ProcessedProduct {
//     id: string;
//     shortDescription: string;
//     detailedDescription: string;
//   }
  
//   interface ApiResult {
//     id: string;
//     shortDescription?: string;
//     detailedDescription?: string;
//   }
  
//   type DescriptionType = 'shortDescription' | 'detailedDescription';
  
//   // Optimized chunk function with validation
//   function chunkArray<T>(array: T[], size: number): T[][] {
//     if (!Array.isArray(array)) throw new TypeError('Expected an array');
//     if (!Number.isInteger(size) || size <= 0) throw new TypeError('Chunk size must be a positive integer');
    
//     return Array.from(
//       { length: Math.ceil(array.length / size) },
//       (_, i) => array.slice(i * size, (i + 1) * size)
//     );
//   }
  
//   // Retry logic with exponential backoff
//   async function withRetry<T>(
//     operation: () => Promise<T>,
//     maxRetries: number = 3,
//     baseDelay: number = 1000
//   ): Promise<T> {
//     let lastError: Error | undefined;
    
//     for (let attempt = 0; attempt <= maxRetries; attempt++) {
//       try {
//         return await operation();
//       } catch (error) {
//         lastError = error instanceof Error ? error : new Error(String(error));
        
//         if (attempt === maxRetries) break;
        
//         // Exponential backoff with jitter
//         const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
//         await new Promise(resolve => setTimeout(resolve, delay));
//       }
//     }
    
//     throw lastError;
//   }
  
//   // Validate API response structure
//   function validateApiResponse(response: unknown, type: DescriptionType): ApiResult[] {
//     if (!Array.isArray(response)) {
//       throw new Error(`Invalid API response: expected array for ${type}`);
//     }
    
//     return response.map((item, index) => {
//       if (!item || typeof item !== 'object') {
//         throw new Error(`Invalid item at index ${index} for ${type}: not an object`);
//       }
//       if (!('id' in item) || typeof item.id !== 'string') {
//         throw new Error(`Missing or invalid 'id' at index ${index} for ${type}`);
//       }
//       return item as ApiResult;
//     });
//   }
  
//   // Process a single chunk with proper error handling
//   async function processChunk(
//     chunk: ProductInput[],
//     chunkIndex: number,
//     totalChunks: number,
//     apiKey: string
//   ): Promise<ProcessedProduct[]> {
//     console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks} (${chunk.length} products)`);
  
//     const shortPrompt = buildPrompt(chunk, 'shortDescription');
//     const detailedPrompt = buildPrompt(chunk, 'detailedDescription');
  
//     // Parallel execution with individual retry logic
//     const [shortResults, detailedResults] = await Promise.all([
//       withRetry(() => sendPrompt(shortPrompt, apiKey))
//         .then(res => validateApiResponse(res, 'shortDescription')),
//       withRetry(() => sendPrompt(detailedPrompt, apiKey))
//         .then(res => validateApiResponse(res, 'detailedDescription'))
//     ]);
  
//     // Build lookup maps for O(1) access instead of O(n) find()
//     const shortMap = new Map(shortResults.map(r => [r.id, r.shortDescription ?? '']));
//     const detailedMap = new Map(detailedResults.map(r => [r.id, r.detailedDescription ?? '']));
  
//     // Validate all IDs exist in both responses
//     const chunkIds = new Set(chunk.map(p => p.id));
//     const shortIds = new Set(shortResults.map(r => r.id));
//     const detailedIds = new Set(detailedResults.map(r => r.id));
  
//     const missingInShort = [...chunkIds].filter(id => !shortIds.has(id));
//     const missingInDetailed = [...chunkIds].filter(id => !detailedIds.has(id));
  
//     if (missingInShort.length > 0) {
//       console.warn(`Chunk ${chunkIndex + 1}: Missing shortDescription for IDs:`, missingInShort);
//     }
//     if (missingInDetailed.length > 0) {
//       console.warn(`Chunk ${chunkIndex + 1}: Missing detailedDescription for IDs:`, missingInDetailed);
//     }
  
//     // Merge results
//     return chunk.map(product => ({
//       id: product.id,
//       shortDescription: shortMap.get(product.id) ?? '',
//       detailedDescription: detailedMap.get(product.id) ?? ''
//     }));
//   }
  
//   // Main function with concurrency control and comprehensive error handling
//   export async function generateSeoHtml(
//     updatedDescreptionAI: ProductInput[],
//     DEEP_SEEK_API_KEY: string,
//     options: {
//       batchSize?: number;
//       concurrency?: number;
//       maxRetries?: number;
//     } = {}
//   ): Promise<ProcessedProduct[]> {
//     const { 
//       batchSize = 2, 
//       concurrency = 3, // Limit parallel chunk processing
//       maxRetries = 3 
//     } = options;
  
//     // Input validation
//     if (!Array.isArray(updatedDescreptionAI)) {
//       throw new TypeError('updatedDescreptionAI must be an array');
//     }
//     if (!DEEP_SEEK_API_KEY || typeof DEEP_SEEK_API_KEY !== 'string') {
//       throw new TypeError('Valid DEEP_SEEK_API_KEY is required');
//     }
//     if (updatedDescreptionAI.length === 0) {
//       console.warn('Empty input array provided');
//       return [];
//     }
  
//     // Validate input items
//     updatedDescreptionAI.forEach((item, index) => {
//       if (!item?.id || typeof item.id !== 'string') {
//         throw new TypeError(`Invalid product at index ${index}: missing or invalid 'id'`);
//       }
//     });
  
//     const chunks = chunkArray(updatedDescreptionAI, batchSize);
//     const totalChunks = chunks.length;
//     const results: ProcessedProduct[] = [];
  
//     console.log(`Starting processing of ${updatedDescreptionAI.length} products in ${totalChunks} chunks`);
  
//     // Process chunks with controlled concurrency using semaphore pattern
//     const executing: Promise<void>[] = [];
//     let completedChunks = 0;
  
//     for (let i = 0; i < chunks.length; i++) {
//       const chunkPromise = processChunk(chunks[i], i, totalChunks, DEEP_SEEK_API_KEY)
//         .then(chunkResults => {
//           results.push(...chunkResults);
//           completedChunks++;
//           console.log(`Progress: ${completedChunks}/${totalChunks} chunks completed`);
//         })
//         .catch(error => {
//           console.error(`Fatal error in chunk ${i + 1}:`, error);
//           throw new Error(`Chunk ${i + 1} failed: ${error.message}`);
//         });
  
//       executing.push(chunkPromise);
  
//       // Wait when concurrency limit reached
//       if (executing.length >= concurrency) {
//         await Promise.race(executing);
//         // Remove completed promises
//         const index = executing.findIndex(p => p === chunkPromise);
//         if (index > -1) executing.splice(index, 1);
//       }
//     }
  
//     // Wait for remaining chunks
//     await Promise.all(executing);
  
//     // Final validation
//     if (results.length !== updatedDescreptionAI.length) {
//       console.warn(`Result count mismatch: expected ${updatedDescreptionAI.length}, got ${results.length}`);
//     }
  
//     console.log(`Successfully processed ${results.length} products`);
//     return results;
//   }
  
//   // Placeholder for your existing buildPrompt function
  
  
//   // Placeholder for your existing sendPrompt function
  

// import { sendPrompt } from "@/routes/functions/deepseekai/deepseekai";
// import { buildPrompt } from "@/routes/functions/propmtsSEO/propmts_descreption";

// interface ProductInput {
//   id: string;
//   descreption: string;
//   [key: string]: any;
// }

// interface ProcessedProduct {
//   id: string;
//   shortDescription: string;
//   detailedDescription: string;
// }

// interface ApiResult {
//   id: string;
//   shortDescription?: string;
//   detailedDescription?: string;
// }

// type DescriptionType = 'shortDescription' | 'detailedDescription';

// // Yield control back to event loop (CRITICAL for Cloudflare)
// async function yieldControl(): Promise<void> {
//   return new Promise(resolve => setTimeout(resolve, 0));
// }

// // Chunk array with validation
// function chunkArray<T>(array: T[], size: number): T[][] {
//   if (!Array.isArray(array)) throw new TypeError('Expected an array');
//   if (!Number.isInteger(size) || size <= 0) throw new TypeError('Chunk size must be a positive integer');
  
//   return Array.from(
//     { length: Math.ceil(array.length / size) },
//     (_, i) => array.slice(i * size, (i + 1) * size)
//   );
// }

// // Retry with exponential backoff
// async function withRetry<T>(
//   operation: () => Promise<T>,
//   maxRetries: number = 3,
//   baseDelay: number = 1000
// ): Promise<T> {
//   let lastError: Error | undefined;
  
//   for (let attempt = 0; attempt <= maxRetries; attempt++) {
//     try {
//       return await operation();
//     } catch (error) {
//       lastError = error instanceof Error ? error : new Error(String(error));
      
//       if (attempt === maxRetries) break;
      
//       const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
//       await new Promise(resolve => setTimeout(resolve, delay));
//     }
//   }
  
//   throw lastError;
// }

// // Validate API response
// function validateApiResponse(response: unknown, type: DescriptionType): ApiResult[] {
//   if (!Array.isArray(response)) {
//     throw new Error(`Invalid API response: expected array for ${type}`);
//   }
  
//   return response.map((item, index) => {
//     if (!item || typeof item !== 'object') {
//       throw new Error(`Invalid item at index ${index} for ${type}: not an object`);
//     }
//     if (!('id' in item) || typeof item.id !== 'string') {
//       throw new Error(`Missing or invalid 'id' at index ${index} for ${type}`);
//     }
//     return item as ApiResult;
//   });
// }

// // Process single chunk with CPU-conscious execution
// async function processChunk(
//   chunk: ProductInput[],
//   chunkIndex: number,
//   totalChunks: number,
//   apiKey: string,
//   delayBetweenCalls: number = 500 // ms between API calls
// ): Promise<ProcessedProduct[]> {
//   console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks} (${chunk.length} products)`);

//   const shortPrompt = buildPrompt(chunk, 'shortDescription');
  
//   // Yield before first API call
//   await yieldControl();
  
//   const shortResults = await withRetry(() => sendPrompt(shortPrompt, apiKey))
//     .then(res => validateApiResponse(res, 'shortDescription'));

//   // Small delay between API calls to prevent CPU spike
//   if (delayBetweenCalls > 0) {
//     await new Promise(resolve => setTimeout(resolve, delayBetweenCalls));
//   }
  
//   // Yield between API calls
//   await yieldControl();

//   const detailedPrompt = buildPrompt(chunk, 'detailedDescription');
//   const detailedResults = await withRetry(() => sendPrompt(detailedPrompt, apiKey))
//     .then(res => validateApiResponse(res, 'detailedDescription'));

//   // Yield after API calls before processing
//   await yieldControl();

//   // Build maps
//   const shortMap = new Map(shortResults.map(r => [r.id, r.shortDescription ?? '']));
//   const detailedMap = new Map(detailedResults.map(r => [r.id, r.detailedDescription ?? '']));

//   // Validate IDs
//   const chunkIds = new Set(chunk.map(p => p.id));
//   const shortIds = new Set(shortResults.map(r => r.id));
//   const detailedIds = new Set(detailedResults.map(r => r.id));

//   const missingInShort = [...chunkIds].filter(id => !shortIds.has(id));
//   const missingInDetailed = [...chunkIds].filter(id => !detailedIds.has(id));

//   if (missingInShort.length > 0) {
//     console.warn(`Chunk ${chunkIndex + 1}: Missing shortDescription for IDs:`, missingInShort);
//   }
//   if (missingInDetailed.length > 0) {
//     console.warn(`Chunk ${chunkIndex + 1}: Missing detailedDescription for IDs:`, missingInDetailed);
//   }

//   // Final yield before returning
//   await yieldControl();

//   return chunk.map(product => ({
//     id: product.id,
//     shortDescription: shortMap.get(product.id) ?? '',
//     detailedDescription: detailedMap.get(product.id) ?? ''
//   }));
// }

// // Sequential chunk processor to minimize CPU usage
// async function processChunksSequential(
//   chunks: ProductInput[][],
//   apiKey: string,
//   delayBetweenChunks: number,
//   onChunkComplete: (results: ProcessedProduct[], index: number) => void
// ): Promise<void> {
//   for (let i = 0; i < chunks.length; i++) {
//     const results = await processChunk(chunks[i], i, chunks.length, apiKey);
//     onChunkComplete(results, i);
    
//     // Delay between chunks to prevent CPU accumulation
//     if (i < chunks.length - 1 && delayBetweenChunks > 0) {
//       await new Promise(resolve => setTimeout(resolve, delayBetweenChunks));
//     }
    
//     // Force yield after each chunk
//     await yieldControl();
//   }
// }

// // Main function with Cloudflare-optimized defaults
//  async function generateSeoHtml(
//   updatedDescreptionAI: ProductInput[],
//   DEEP_SEEK_API_KEY: string,
//   options: {
//     batchSize?: number;
//     concurrency?: number; // Deprecated, kept for compatibility
//     maxRetries?: number;
//     delayBetweenChunks?: number; // NEW: ms between chunks
//     delayBetweenCalls?: number;  // NEW: ms between short/detailed calls
//     sequential?: boolean;        // NEW: force sequential processing
//   } = {}
// ): Promise<ProcessedProduct[]> {
//   const { 
//     batchSize = 1,              // REDUCED: Process 1 product at a time
//     maxRetries = 3,
//     delayBetweenChunks = 1000,  // NEW: 1s between chunks
//     delayBetweenCalls = 500,    // NEW: 500ms between API calls
//     sequential = true           // NEW: Default to sequential
//   } = options;

//   // Input validation
//   if (!Array.isArray(updatedDescreptionAI)) {
//     throw new TypeError('updatedDescreptionAI must be an array');
//   }
//   if (!DEEP_SEEK_API_KEY || typeof DEEP_SEEK_API_KEY !== 'string') {
//     throw new TypeError('Valid DEEP_SEEK_API_KEY is required');
//   }
//   if (updatedDescreptionAI.length === 0) {
//     console.warn('Empty input array provided');
//     return [];
//   }

//   // Validate input items
//   updatedDescreptionAI.forEach((item, index) => {
//     if (!item?.id || typeof item.id !== 'string') {
//       throw new TypeError(`Invalid product at index ${index}: missing or invalid 'id'`);
//     }
//   });

//   const chunks = chunkArray(updatedDescreptionAI, batchSize);
//   const totalChunks = chunks.length;
//   const results: ProcessedProduct[] = [];

//   console.log(`Starting processing of ${updatedDescreptionAI.length} products in ${totalChunks} chunks (sequential: ${sequential})`);

//   if (sequential) {
//     // Sequential processing - lowest CPU usage
//     await processChunksSequential(
//       chunks,
//       DEEP_SEEK_API_KEY,
//       delayBetweenChunks,
//       (chunkResults, index) => {
//         results.push(...chunkResults);
//         console.log(`Progress: ${index + 1}/${totalChunks} chunks completed`);
//       }
//     );
//   } else {
//     // Limited parallel processing (use with caution on Cloudflare)
//     const concurrency = Math.min(options.concurrency || 2, 2); // Cap at 2
//     const executing: Promise<void>[] = [];
//     let completedChunks = 0;

//     for (let i = 0; i < chunks.length; i++) {
//       const chunkPromise = (async () => {
//         // Stagger starts to prevent CPU spikes
//         if (i > 0) {
//           await new Promise(resolve => setTimeout(resolve, i * 200));
//         }
        
//         const chunkResults = await processChunk(chunks[i], i, totalChunks, DEEP_SEEK_API_KEY, delayBetweenCalls);
//         results.push(...chunkResults);
//         completedChunks++;
//         console.log(`Progress: ${completedChunks}/${totalChunks} chunks completed`);
//       })();

//       executing.push(chunkPromise);

//       if (executing.length >= concurrency) {
//         await Promise.race(executing);
//         const index = executing.findIndex(p => p === chunkPromise);
//         if (index > -1) executing.splice(index, 1);
        
//         // Yield after each concurrency slot frees up
//         await yieldControl();
//       }
//     }

//     await Promise.all(executing);
//   }

//   // Final validation
//   if (results.length !== updatedDescreptionAI.length) {
//     console.warn(`Result count mismatch: expected ${updatedDescreptionAI.length}, got ${results.length}`);
//   }

//   console.log(`Successfully processed ${results.length} products`);
//   return results;
// }