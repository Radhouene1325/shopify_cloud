import { sendPrompt } from "@/routes/app.descreptionupdated";

// Add this new function alongside your existing generateSeoHtml
export async function generateSeoMetadata(
    products: { id: string; title: string; description: string; handle?: string; vendor?: string }[],
    apiKey: string
  ): Promise<{ id: string; seoTitle: string; seoDescription: string; handle: string }[]> {
    const CHUNK_SIZE = 20;
    const chunks = [];
    
    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
      chunks.push(products.slice(i, i + CHUNK_SIZE));
    }
  
    const allResults: { id: string; seoTitle: string; seoDescription: string; handle: string }[] = [];
  
    const chunkPromises = chunks.map(async (chunk, idx) => {
      const seoPrompt = buildSEOPrompt(chunk);
  
      try {
        const seoResults = await sendPrompt(seoPrompt, apiKey) as { id: string; seoTitle: string; seoDescription: string; handle: string }[];
        
        if (!Array.isArray(seoResults)) {
          throw new Error(`Chunk ${idx + 1} returned invalid SEO format`);
        }
  
        // Validate results
        seoResults.forEach(item => {
          if (item.seoTitle.length > 60) {
            console.warn(`⚠️ SEO title too long for ${item.id}: ${item.seoTitle.length} chars`);
          }
          if (item.seoDescription.length > 160) {
            console.warn(`⚠️ SEO description too long for ${item.id}: ${item.seoDescription.length} chars`);
          }
          if (!/^[a-z0-9-]+$/.test(item.handle)) {
            console.warn(`⚠️ Invalid handle format for ${item.id}: ${item.handle}`);
          }
        });
  
        return seoResults;
      } catch (err) {
        console.error(`Error processing SEO chunk ${idx + 1}:`, err);
        throw err;
      }
    });
  
    const results = await Promise.all(chunkPromises);
    results.forEach(r => allResults.push(...r));
  
    return allResults;
  }
  


function buildSEOPrompt(
    chunk: { id: string; title: string; description: string; handle?: string; vendor?: string }[]
  ): string {
    return `You are a JSON API specialized in e-commerce SEO optimization for Shopify stores. Process EACH of the ${chunk.length} products INDIVIDUALLY and return a JSON array with optimized SEO metadata.
  
  ROLE: Senior SEO Specialist
  
  OBJECTIVE: Generate three critical SEO fields for each product:
  1. seoTitle: Optimized for search engines and click-through rate
  2. seoDescription: Compelling meta description that drives clicks
  3. handle: Clean, SEO-friendly URL slug
  
  OUTPUT FORMAT for each product:
  {
    "id": "gid://shopify/Product/xxxxx",
    "seoTitle": "OPTIMIZED_SEO_TITLE",
    "seoDescription": "COMPELLING_META_DESCRIPTION",
    "handle": "clean-url-slug"
  }
  
  SEO TITLE GUIDELINES (50-60 characters):
  - Format: "[Brand] [Product Type] [Key Feature/Color] | [Gender]"
  - Examples:
    * "Birkenstock Bend Low White Gold Sneakers | Women"
    * "Skechers Bobs Squad Memory Foam | Women's Shoes"
    * "Joma Meta 2631 Running Shoes Black | Men"
  - Must be under 60 characters
  - Include pipe separator (|)
  - Title Case
  
  SEO DESCRIPTION GUIDELINES (150-160 characters):
  - Format: "[Action] [Brand] [product]. [Feature 1], [Feature 2]. [CTA]."
  - Examples:
    * "Shop Birkenstock Bend Low sneakers in white-gold. Iconic molded insole, platform sole, premium comfort. Perfect for casual & outdoor wear. Free shipping!"
    * "Discover Skechers Bobs Squad with Memory Foam insoles. Lightweight, breathable design for all-day comfort. Order now for fast delivery!"
  - Must be 150-160 characters
  - Include trust signals: "Free shipping", "Premium quality"
  
  HANDLE GUIDELINES (URL slug):
  - Format: "brand-product-color" (3-5 words max)
  - Examples: "birkenstock-bend-low-white", "skechers-bobs-squad-black"
  - Lowercase, hyphens only, no special chars
  - Keep model numbers if searchable (e.g., "joma-meta-2631")
  
  BRAND-SPECIFIC RULES:
  - Skechers: Mention "Memory Foam"
  - Birkenstock: "molded insole" or "footbed"
  - Joma: Technology (VTS, Phylon)
  - Barefoot: "barefoot" or "natural"
  - Vegan: Include "vegan"
  - XTI: "vegan certified"
  - Natural World: "eco-friendly"
  
  ITALIAN MARKET:
  - SEO in ENGLISH (better for international reach)
  - Include universal terms: sneakers, running, platform
  
  DATA: ${JSON.stringify(chunk, null, 2)}
  
  Return JSON array with ${chunk.length} objects: {id, seoTitle, seoDescription, handle}
  Escape quotes. JSON only, no markdown.`;
  }
  