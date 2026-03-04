import { sendPrompt } from "@/routes/app.descreptionupdated";

// Add this new function alongside your existing generateSeoHtml
export async function generateSeoMetadata(
    products: { id: string; title: string; description: string; handle?: string; vendor?: string,image?:string }[],
    apiKey: string
  ): Promise<{ id: string; seoTitle: string; seoDescription: string; handle: string,image:string }[]> {
    const CHUNK_SIZE = 20;
    const chunks = [];
    
    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
      chunks.push(products.slice(i, i + CHUNK_SIZE));
    }
  
    const allResults: { id: string; seoTitle: string; seoDescription: string; handle: string,image:string }[] = [];
  
    const chunkPromises = chunks.map(async (chunk, idx) => {
      const seoPrompt = buildSEOPrompt(chunk);
  
      try {
        const seoResults = await sendPrompt(seoPrompt, apiKey) as { id: string; seoTitle: string; seoDescription: string; handle: string,image:string }[];
        
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
  


// function buildSEOPrompt(
//     chunk: { id: string; title: string; description: string; handle?: string; vendor?: string,image:string }[]
//   ): string {
//     return `You are a JSON API specialized in e-commerce SEO optimization for Shopify stores. Process EACH of the ${chunk.length} products INDIVIDUALLY and return a JSON array with optimized SEO metadata.
  
//   ROLE: Senior SEO Specialist
  
//   OBJECTIVE: Generate three critical SEO fields for each product:
//   1. seoTitle: Optimized for search engines and click-through rate
//   2. seoDescription: Compelling meta description that drives clicks
//   3. handle: Clean, SEO-friendly URL slug
  
//   OUTPUT FORMAT for each product:
//   {
//     "id": "gid://shopify/Product/xxxxx",
//     "seoTitle": "OPTIMIZED_SEO_TITLE",
//     "seoDescription": "COMPELLING_META_DESCRIPTION",
//     "handle": "clean-url-slug"
//   }
  
//   SEO TITLE GUIDELINES (50-60 characters):
//   - Format: "[Brand] [Product Type] [Key Feature/Color] | [Gender]"
//   - Examples:
//     * "Birkenstock Bend Low White Gold Sneakers | Women"
//     * "Skechers Bobs Squad Memory Foam | Women's Shoes"
//     * "Joma Meta 2631 Running Shoes Black | Men"
//   - Must be under 60 characters
//   - Include pipe separator (|)
//   - Title Case
  
//   SEO DESCRIPTION GUIDELINES (150-160 characters):
//   - Format: "[Action] [Brand] [product]. [Feature 1], [Feature 2]. [CTA]."
//   - Examples:
//     * "Shop Birkenstock Bend Low sneakers in white-gold. Iconic molded insole, platform sole, premium comfort. Perfect for casual & outdoor wear. Free shipping!"
//     * "Discover Skechers Bobs Squad with Memory Foam insoles. Lightweight, breathable design for all-day comfort. Order now for fast delivery!"
//   - Must be 150-160 characters
//   - Include trust signals: "Free shipping", "Premium quality"
  
//   HANDLE GUIDELINES (URL slug):
//   - Format: "brand-product-color" (3-5 words max)
//   - Examples: "birkenstock-bend-low-white", "skechers-bobs-squad-black"
//   - Lowercase, hyphens only, no special chars
//   - Keep model numbers if searchable (e.g., "joma-meta-2631")
  
//   BRAND-SPECIFIC RULES:
//   - Skechers: Mention "Memory Foam"
//   - Birkenstock: "molded insole" or "footbed"
//   - Joma: Technology (VTS, Phylon)
//   - Barefoot: "barefoot" or "natural"
//   - Vegan: Include "vegan"
//   - XTI: "vegan certified"
//   - Natural World: "eco-friendly"
  
//   ITALIAN MARKET:
//   - SEO in ENGLISH (better for international reach)
//   - Include universal terms: sneakers, running, platform
  
//   DATA: ${JSON.stringify(chunk, null, 2)}
  
//   Return JSON array with ${chunk.length} objects: {id, seoTitle, seoDescription, handle}
//   Escape quotes. JSON only, no markdown.`;
//   }
function buildSEOPrompt(
    chunk: { 
      id: string; 
      title: string; 
      description: string; 
      handle?: string; 
      vendor?: string;
      image?: string; // Array of image URLs
    }[]
  ): string {
    return `You are a JSON API specialized in e-commerce SEO optimization for Shopify stores with advanced image analysis capabilities. Process EACH of the ${chunk.length} products INDIVIDUALLY and return a JSON array with optimized SEO metadata.
  
  ROLE: Senior SEO Specialist + AI Image Analyst + Product Categorization Expert
  
  OBJECTIVE: Generate FIVE critical fields for each product:
  1. seoTitle: Optimized for search engines and click-through rate
  2. seoDescription: Compelling meta description that drives clicks
  3. handle: Clean, SEO-friendly URL slug
  4. category: Accurate product category based on images and description
  5. productType: Specific product type for Shopify taxonomy
  
  OUTPUT FORMAT for each product:
  {
    "id": "gid://shopify/Product/xxxxx",
    "seoTitle": "OPTIMIZED_SEO_TITLE",
    "seoDescription": "COMPELLING_META_DESCRIPTION",
    "handle": "clean-url-slug",
    "category": "MAIN_CATEGORY",
    "productType": "SPECIFIC_TYPE"
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
  - Use insights from product images to identify key features
  
  SEO DESCRIPTION GUIDELINES (150-160 characters):
  - Format: "[Action] [Brand] [product]. [Feature 1], [Feature 2]. [CTA]."
  - Examples:
    * "Shop Birkenstock Bend Low sneakers in white-gold. Iconic molded insole, platform sole, premium comfort. Perfect for casual & outdoor wear. Free shipping!"
    * "Discover Skechers Bobs Squad with Memory Foam insoles. Lightweight, breathable design for all-day comfort. Order now for fast delivery!"
  - Must be 150-160 characters
  - Include trust signals: "Free shipping", "Premium quality"
  - Incorporate visual details from images (color, style, design elements)
  
  HANDLE GUIDELINES (URL slug):
  - Format: "brand-product-color" (3-5 words max)
  - Examples: "birkenstock-bend-low-white", "skechers-bobs-squad-black"
  - Lowercase, hyphens only, no special chars
  - Keep model numbers if searchable (e.g., "joma-meta-2631")
  - Use color information visible in images
  
  CATEGORY GENERATION (analyze images + description):
  MAIN CATEGORIES (choose ONE most accurate):
  - "Athletic Footwear" → Running shoes, training shoes, sports sneakers
  - "Casual Sneakers" → Everyday sneakers, lifestyle shoes, fashion sneakers
  - "Walking Shoes" → Comfort walking shoes, slip-ons, easy-wear
  - "Performance Running" → Technical running shoes, marathon shoes, racing shoes
  - "Outdoor & Hiking" → Trail shoes, hiking boots, outdoor sneakers
  - "Fashion Sneakers" → High-tops, platform sneakers, designer sneakers
  - "Work & Safety" → Work shoes, slip-resistant, safety footwear
  - "Barefoot & Minimalist" → Barefoot shoes, zero-drop, natural movement
  - "Sandals & Slides" → Open-toe footwear, summer shoes, casual slides
  - "Boots & High-Tops" → Ankle boots, high-top sneakers, winter boots
  
  CATEGORY SELECTION RULES:
  1. Analyze product images for:
     - Shoe silhouette (low-top, high-top, slip-on, lace-up)
     - Sole type (flat, platform, running sole, chunky)
     - Material visible (mesh, leather, canvas, suede)
     - Design style (sporty, casual, formal, rugged)
     - Brand positioning (athletic, fashion, comfort)
  
  2. Analyze description for keywords:
     - "running", "training", "performance" → Athletic Footwear or Performance Running
     - "walking", "comfort", "all-day" → Walking Shoes
     - "casual", "everyday", "versatile" → Casual Sneakers
     - "trail", "outdoor", "hiking" → Outdoor & Hiking
     - "platform", "fashion", "trendy" → Fashion Sneakers
     - "barefoot", "natural", "minimalist" → Barefoot & Minimalist
     - "work", "slip-resistant", "safety" → Work & Safety
  
  3. Brand-specific category hints:
     - Skechers Go Walk → Walking Shoes
     - Joma (with running tech) → Performance Running
     - Birkenstock → Casual Sneakers or Sandals & Slides
     - Vans, Converse → Fashion Sneakers or Casual Sneakers
     - Mustang Barefoot, Victoria Barefoot → Barefoot & Minimalist
     - Skechers Work Squad → Work & Safety
  
  PRODUCT TYPE GENERATION (more specific):
  Examples based on category:
  - Athletic Footwear → "Running Shoes", "Training Shoes", "Cross-Training Shoes"
  - Casual Sneakers → "Low-Top Sneakers", "Canvas Sneakers", "Leather Sneakers"
  - Walking Shoes → "Slip-On Shoes", "Walking Sneakers", "Comfort Shoes"
  - Performance Running → "Road Running Shoes", "Marathon Shoes", "Racing Flats"
  - Outdoor & Hiking → "Trail Running Shoes", "Hiking Shoes", "Outdoor Sneakers"
  - Fashion Sneakers → "Platform Sneakers", "High-Top Sneakers", "Designer Sneakers"
  - Work & Safety → "Work Sneakers", "Slip-Resistant Shoes", "Safety Shoes"
  - Barefoot & Minimalist → "Barefoot Sneakers", "Zero-Drop Shoes", "Minimalist Shoes"
  - Sandals & Slides → "Sport Sandals", "Casual Slides", "Summer Sandals"
  - Boots & High-Tops → "Ankle Boots", "High-Top Sneakers", "Winter Boots"
  
  BRAND-SPECIFIC RULES:
  - Skechers: Mention "Memory Foam" if visible cushioning in images
  - Birkenstock: "molded insole" or "footbed" if contoured sole visible
  - Joma: Technology (VTS, Phylon) if mesh/ventilation visible
  - Barefoot: "barefoot" or "natural" if thin/flexible sole visible
  - Vegan: Include "vegan" if synthetic materials visible
  - XTI: "vegan certified" if eco-friendly design
  - Natural World: "eco-friendly" if organic/natural materials
  
  IMAGE ANALYSIS INSTRUCTIONS:
  For each product, if images are provided:
  1. Identify primary color(s) visible in main product image
  2. Determine shoe type (sneaker, boot, sandal, etc.)
  3. Identify key design features (platform, mesh, leather, etc.)
  4. Assess target use case (running, casual, work, etc.)
  5. Note any visible technology (air cushioning, memory foam, etc.)
  6. Determine gender target (men's, women's, unisex) from styling
  
  If NO images provided:
  - Rely on description text and title
  - Use brand knowledge for categorization
  - Make conservative category choices
  
  ITALIAN MARKET OPTIMIZATION:
  - SEO titles and descriptions in ENGLISH (better for international reach)
  - Handles in English (standard practice)
  - Categories use universal English terms
  - Include universal keywords: sneakers, running, platform, comfort
  
  QUALITY CHECKS:
  ✅ SEO Title: 50-60 chars, brand + product + feature
  ✅ SEO Description: 150-160 chars, actionable, includes CTA
  ✅ Handle: 3-5 words, lowercase, hyphens only
  ✅ Category: ONE of the predefined main categories
  ✅ Product Type: Specific, matches category
  ✅ All fields use insights from images when available
  
  DATA TO PROCESS:
  ${JSON.stringify(chunk, null, 2)}
  
  PROCESSING STEPS:
  1. For each product, analyze ALL provided images (if available)
  2. Extract visual features: color, style, material, sole type
  3. Read description for keywords and technical specs
  4. Determine most accurate category from the list
  5. Generate specific product type within that category
  6. Create SEO title incorporating visual details
  7. Write SEO description highlighting visible features
  8. Generate clean handle with color from images
  9. Validate all character limits and formats
  
  EXAMPLE OUTPUT:
  {
    "id": "gid://shopify/Product/10589930815829",
    "seoTitle": "Skechers Go Walk Flex Pink Breathable | Women's Shoes",
    "seoDescription": "Shop Skechers Go Walk Flex in pink. Breathable mesh upper, cushioned insole, flexible sole. Perfect for walking & daily comfort. Free shipping!",
    "handle": "skechers-go-walk-flex-pink",
    "category": "Walking Shoes",
    "productType": "Slip-On Walking Shoes"
  }
  
  Return JSON array with EXACTLY ${chunk.length} objects.
  Each object must have: id, seoTitle, seoDescription, handle, category, productType
  
  CRITICAL: 
  - Analyze images carefully for accurate categorization
  - Escape all quotes in strings: \\"
  - Return ONLY the JSON array
  - NO markdown code blocks
  - NO explanatory text
  - Just pure JSON`;
  }
  