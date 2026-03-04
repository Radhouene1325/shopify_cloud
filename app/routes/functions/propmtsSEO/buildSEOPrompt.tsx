import { sendPrompt } from "@/routes/app.descreptionupdated";

// Add this new function alongside your existing generateSeoHtml
export async function generateSeoMetadata(
    products: { id: string; title: string; description: string; handle?: string; vendor?: string,image?:string,productType?:string }[],
    apiKey: string
  ): Promise<{ id: string; seoTitle: string; seoDescription: string; handle: string,image:string,productType?:string,category:string,categoryId:string }[]> {
    const CHUNK_SIZE = 20;
    const chunks = [];
    
    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
      chunks.push(products.slice(i, i + CHUNK_SIZE));
    }
  
    const allResults: { id: string; seoTitle: string; seoDescription: string; handle: string,image:string,productType:string,categoryId:string,category:string }[] = [];
  
    const chunkPromises = chunks.map(async (chunk, idx) => {
      const seoPrompt = buildSEOPrompt(chunk);
  
      try {
        const seoResults = await sendPrompt(seoPrompt, apiKey) as { id: string; seoTitle: string; seoDescription: string; handle: string,image:string,productType:string,category:string,categoryId:string }[];
        
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
// function buildSEOPrompt(
//     chunk: { 
//       id: string; 
//       title: string; 
//       description: string; 
//       handle?: string; 
//       vendor?: string;
//       image?: string; // Array of image URLs
//       productType?: string
//     }[]
//   ): string {
//     return `You are a JSON API specialized in e-commerce SEO optimization for Shopify stores with advanced image analysis capabilities. Process EACH of the ${chunk.length} products INDIVIDUALLY and return a JSON array with optimized SEO metadata.
  
//   ROLE: Senior SEO Specialist + AI Image Analyst + Product Categorization Expert
  
//   OBJECTIVE: Generate FIVE critical fields for each product:
//   1. seoTitle: Optimized for search engines and click-through rate
//   2. seoDescription: Compelling meta description that drives clicks
//   3. handle: Clean, SEO-friendly URL slug
//   4. category: Accurate product category based on images and description
//   5. productType: Specific product type for Shopify taxonomy
  
//   OUTPUT FORMAT for each product:
//   {
//     "id": "gid://shopify/Product/xxxxx",
//     "seoTitle": "OPTIMIZED_SEO_TITLE",
//     "seoDescription": "COMPELLING_META_DESCRIPTION",
//     "handle": "clean-url-slug",
//     "category": "MAIN_CATEGORY",
//     "productType": "SPECIFIC_TYPE"
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
//   - Use insights from product images to identify key features
  
//   SEO DESCRIPTION GUIDELINES (150-160 characters):
//   - Format: "[Action] [Brand] [product]. [Feature 1], [Feature 2]. [CTA]."
//   - Examples:
//     * "Shop Birkenstock Bend Low sneakers in white-gold. Iconic molded insole, platform sole, premium comfort. Perfect for casual & outdoor wear. Free shipping!"
//     * "Discover Skechers Bobs Squad with Memory Foam insoles. Lightweight, breathable design for all-day comfort. Order now for fast delivery!"
//   - Must be 150-160 characters
//   - Include trust signals: "Free shipping", "Premium quality"
//   - Incorporate visual details from images (color, style, design elements)
  
//   HANDLE GUIDELINES (URL slug):
//   - Format: "brand-product-color" (3-5 words max)
//   - Examples: "birkenstock-bend-low-white", "skechers-bobs-squad-black"
//   - Lowercase, hyphens only, no special chars
//   - Keep model numbers if searchable (e.g., "joma-meta-2631")
//   - Use color information visible in images
  
//   CATEGORY GENERATION (analyze images + description):
//   MAIN CATEGORIES (choose ONE most accurate):
//   - "Athletic Footwear" → Running shoes, training shoes, sports sneakers
//   - "Casual Sneakers" → Everyday sneakers, lifestyle shoes, fashion sneakers
//   - "Walking Shoes" → Comfort walking shoes, slip-ons, easy-wear
//   - "Performance Running" → Technical running shoes, marathon shoes, racing shoes
//   - "Outdoor & Hiking" → Trail shoes, hiking boots, outdoor sneakers
//   - "Fashion Sneakers" → High-tops, platform sneakers, designer sneakers
//   - "Work & Safety" → Work shoes, slip-resistant, safety footwear
//   - "Barefoot & Minimalist" → Barefoot shoes, zero-drop, natural movement
//   - "Sandals & Slides" → Open-toe footwear, summer shoes, casual slides
//   - "Boots & High-Tops" → Ankle boots, high-top sneakers, winter boots
  
//   CATEGORY SELECTION RULES:
//   1. Analyze product images for:
//      - Shoe silhouette (low-top, high-top, slip-on, lace-up)
//      - Sole type (flat, platform, running sole, chunky)
//      - Material visible (mesh, leather, canvas, suede)
//      - Design style (sporty, casual, formal, rugged)
//      - Brand positioning (athletic, fashion, comfort)
  
//   2. Analyze description for keywords:
//      - "running", "training", "performance" → Athletic Footwear or Performance Running
//      - "walking", "comfort", "all-day" → Walking Shoes
//      - "casual", "everyday", "versatile" → Casual Sneakers
//      - "trail", "outdoor", "hiking" → Outdoor & Hiking
//      - "platform", "fashion", "trendy" → Fashion Sneakers
//      - "barefoot", "natural", "minimalist" → Barefoot & Minimalist
//      - "work", "slip-resistant", "safety" → Work & Safety
  
//   3. Brand-specific category hints:
//      - Skechers Go Walk → Walking Shoes
//      - Joma (with running tech) → Performance Running
//      - Birkenstock → Casual Sneakers or Sandals & Slides
//      - Vans, Converse → Fashion Sneakers or Casual Sneakers
//      - Mustang Barefoot, Victoria Barefoot → Barefoot & Minimalist
//      - Skechers Work Squad → Work & Safety
  
//   PRODUCT TYPE GENERATION (more specific):
//   Examples based on category:
//   - Athletic Footwear → "Running Shoes", "Training Shoes", "Cross-Training Shoes"
//   - Casual Sneakers → "Low-Top Sneakers", "Canvas Sneakers", "Leather Sneakers"
//   - Walking Shoes → "Slip-On Shoes", "Walking Sneakers", "Comfort Shoes"
//   - Performance Running → "Road Running Shoes", "Marathon Shoes", "Racing Flats"
//   - Outdoor & Hiking → "Trail Running Shoes", "Hiking Shoes", "Outdoor Sneakers"
//   - Fashion Sneakers → "Platform Sneakers", "High-Top Sneakers", "Designer Sneakers"
//   - Work & Safety → "Work Sneakers", "Slip-Resistant Shoes", "Safety Shoes"
//   - Barefoot & Minimalist → "Barefoot Sneakers", "Zero-Drop Shoes", "Minimalist Shoes"
//   - Sandals & Slides → "Sport Sandals", "Casual Slides", "Summer Sandals"
//   - Boots & High-Tops → "Ankle Boots", "High-Top Sneakers", "Winter Boots"
  
//   BRAND-SPECIFIC RULES:
//   - Skechers: Mention "Memory Foam" if visible cushioning in images
//   - Birkenstock: "molded insole" or "footbed" if contoured sole visible
//   - Joma: Technology (VTS, Phylon) if mesh/ventilation visible
//   - Barefoot: "barefoot" or "natural" if thin/flexible sole visible
//   - Vegan: Include "vegan" if synthetic materials visible
//   - XTI: "vegan certified" if eco-friendly design
//   - Natural World: "eco-friendly" if organic/natural materials
  
//   IMAGE ANALYSIS INSTRUCTIONS:
//   For each product, if images are provided:
//   1. Identify primary color(s) visible in main product image
//   2. Determine shoe type (sneaker, boot, sandal, etc.)
//   3. Identify key design features (platform, mesh, leather, etc.)
//   4. Assess target use case (running, casual, work, etc.)
//   5. Note any visible technology (air cushioning, memory foam, etc.)
//   6. Determine gender target (men's, women's, unisex) from styling
  
//   If NO images provided:
//   - Rely on description text and title
//   - Use brand knowledge for categorization
//   - Make conservative category choices
  
//   ITALIAN MARKET OPTIMIZATION:
//   - SEO titles and descriptions in ENGLISH (better for international reach)
//   - Handles in English (standard practice)
//   - Categories use universal English terms
//   - Include universal keywords: sneakers, running, platform, comfort
  
//   QUALITY CHECKS:
//   ✅ SEO Title: 50-60 chars, brand + product + feature
//   ✅ SEO Description: 150-160 chars, actionable, includes CTA
//   ✅ Handle: 3-5 words, lowercase, hyphens only
//   ✅ Category: ONE of the predefined main categories
//   ✅ Product Type: Specific, matches category
//   ✅ All fields use insights from images when available
  
//   DATA TO PROCESS:
//   ${JSON.stringify(chunk, null, 2)}
  
//   PROCESSING STEPS:
//   1. For each product, analyze ALL provided images (if available)
//   2. Extract visual features: color, style, material, sole type
//   3. Read description for keywords and technical specs
//   4. Determine most accurate category from the list
//   5. Generate specific product type within that category
//   6. Create SEO title incorporating visual details
//   7. Write SEO description highlighting visible features
//   8. Generate clean handle with color from images
//   9. Validate all character limits and formats
  
//   EXAMPLE OUTPUT:
//   {
//     "id": "gid://shopify/Product/10589930815829",
//     "seoTitle": "Skechers Go Walk Flex Pink Breathable | Women's Shoes",
//     "seoDescription": "Shop Skechers Go Walk Flex in pink. Breathable mesh upper, cushioned insole, flexible sole. Perfect for walking & daily comfort. Free shipping!",
//     "handle": "skechers-go-walk-flex-pink",
//     "category": "Walking Shoes",
//     "productType": "Slip-On Walking Shoes"
//   }
  
//   Return JSON array with EXACTLY ${chunk.length} objects.
//   Each object must have: id, seoTitle, seoDescription, handle, category, productType
  
//   CRITICAL: 
//   - Analyze images carefully for accurate categorization
//   - Escape all quotes in strings: \\"
//   - Return ONLY the JSON array
//   - NO markdown code blocks
//   - NO explanatory text
//   - Just pure JSON`;
//   }
  

function buildSEOPrompt(
    chunk: { 
      id: string; 
      title: string; 
      description: string; 
      handle?: string; 
      vendor?: string;
      image?: string; // Array of image URLs
      productType?: string; // Existing product type if any
    }[]
  ): string {
    return `You are a JSON API specialized in e-commerce SEO optimization for Shopify stores with ADVANCED IMAGE ANALYSIS and MULTI-CATEGORY expertise (Footwear, Apparel, Accessories).
  
  ROLE: Senior SEO Specialist + AI Vision Expert + Product Categorization Specialist
  
  OBJECTIVE: Generate FIVE critical SEO fields for each product by analyzing images and descriptions:
  1. seoTitle: Optimized for search engines (50-60 chars)
  2. seoDescription: Compelling meta description (150-160 chars)
  3. handle: Clean SEO-friendly URL slug
  4. category: Accurate main category based on visual analysis
  5. productType: Specific product type for Shopify taxonomy
  
  OUTPUT FORMAT:
  {
    "id": "gid://shopify/Product/xxxxx",
    "seoTitle": "OPTIMIZED_SEO_TITLE",
    "seoDescription": "COMPELLING_META_DESCRIPTION",
    "handle": "clean-url-slug",
    "category": "MAIN_CATEGORY",
    "productType": "SPECIFIC_TYPE"
  }
  
  ═══════════════════════════════════════════════════════════════
  📸 CRITICAL: IMAGE ANALYSIS FIRST - VISUAL IDENTIFICATION
  ═══════════════════════════════════════════════════════════════
  
  STEP 1: IDENTIFY PRODUCT TYPE FROM IMAGES
  Analyze the main product image and determine:
  
  A) FOOTWEAR (shoes, boots, sandals, sneakers)
     Visual cues: Soles, laces, heels, toe boxes, ankle coverage
     
  B) APPAREL - OUTERWEAR (jackets, coats, vests, puffers)
     Visual cues: Sleeves, zippers, hoods, quilting/padding, length
     
  C) APPAREL - TOPS (shirts, sweaters, hoodies, t-shirts)
     Visual cues: Necklines, sleeves, casual vs formal styling
     
  D) APPAREL - BOTTOMS (pants, jeans, shorts, skirts)
     Visual cues: Waistbands, leg openings, length, pockets
     
  E) ACCESSORIES (bags, hats, scarves, belts)
     Visual cues: Straps, closures, wearable vs carryable
  
  ═══════════════════════════════════════════════════════════════
  🏷️ CATEGORY SYSTEM - COMPREHENSIVE TAXONOMY
  ═══════════════════════════════════════════════════════════════
  
  FOOTWEAR CATEGORIES:
  - "Athletic Footwear" → Running shoes, training shoes, sports sneakers
  - "Casual Sneakers" → Everyday sneakers, lifestyle shoes, fashion sneakers
  - "Walking Shoes" → Comfort walking shoes, slip-ons, easy-wear
  - "Performance Running" → Technical running shoes, marathon shoes
  - "Outdoor & Hiking" → Trail shoes, hiking boots, outdoor sneakers
  - "Fashion Sneakers" → High-tops, platform sneakers, designer sneakers
  - "Work & Safety Shoes" → Work shoes, slip-resistant, safety footwear
  - "Barefoot & Minimalist" → Barefoot shoes, zero-drop, natural movement
  - "Sandals & Slides" → Open-toe footwear, summer shoes, casual slides
  - "Boots & High-Tops" → Ankle boots, high-top sneakers, winter boots
  
  APPAREL - OUTERWEAR CATEGORIES:
  - "Puffer Jackets" (Piumini) → Quilted jackets, down jackets, padded coats
    Visual: Horizontal quilting, puffy appearance, insulated
  - "Winter Coats" (Cappotti) → Long coats, wool coats, trench coats
    Visual: Knee-length or longer, structured, formal or casual
  - "Casual Jackets" (Giacche) → Bomber jackets, denim jackets, windbreakers
    Visual: Hip-length, casual styling, lightweight to medium weight
  - "Hooded Jackets" → Jackets with hoods, parkas, anoraks
    Visual: Hood visible, often sporty or outdoor styling
  - "Vests & Gilets" → Sleeveless outerwear, puffer vests
    Visual: No sleeves, often quilted or fleece
  - "Raincoats & Waterproof" → Rain jackets, waterproof shells
    Visual: Shiny/technical fabric, often with taped seams
  
  APPAREL - TOPS CATEGORIES:
  - "Hoodies & Sweatshirts" → Pullover hoodies, zip hoodies, crewneck sweatshirts
  - "T-Shirts & Polos" → Short sleeve shirts, graphic tees, polo shirts
  - "Sweaters & Knitwear" → Pullover sweaters, cardigans, knit tops
  - "Shirts & Blouses" → Button-up shirts, dress shirts, casual shirts
  
  APPAREL - BOTTOMS CATEGORIES:
  - "Jeans & Denim" → Denim pants, jean shorts, denim skirts
  - "Pants & Trousers" → Casual pants, dress pants, chinos
  - "Shorts" → Casual shorts, athletic shorts, bermuda shorts
  - "Skirts & Dresses" → Mini skirts, midi skirts, casual dresses
  
  ACCESSORIES CATEGORIES:
  - "Bags & Backpacks" → Handbags, backpacks, tote bags, crossbody bags
  - "Hats & Caps" → Baseball caps, beanies, sun hats
  - "Scarves & Wraps" → Neck scarves, shawls, bandanas
  - "Belts & Wallets" → Leather belts, fabric belts, wallets
  
  ═══════════════════════════════════════════════════════════════
  🔍 VISUAL ANALYSIS RULES FOR JACKETS/COATS
  ═══════════════════════════════════════════════════════════════
  
  PUFFER JACKET IDENTIFICATION (Piumini):
  ✅ Horizontal quilted/stitched pattern visible
  ✅ Puffy, padded appearance (filled with down or synthetic)
  ✅ Often shiny or matte nylon/polyester fabric
  ✅ Can have hood (with or without fur trim)
  ✅ Typically hip-length or longer
  ✅ Zipper closure (sometimes with snap buttons)
  ✅ Examples: Down jackets, quilted coats, padded jackets
  
  WINTER COAT IDENTIFICATION (Cappotti):
  ✅ Longer length (knee-length or below)
  ✅ Structured, tailored appearance
  ✅ Wool, cashmere, or heavy fabric
  ✅ Often single or double-breasted
  ✅ More formal styling
  ✅ Examples: Wool coats, trench coats, peacoats
  
  CASUAL JACKET IDENTIFICATION (Giacche):
  ✅ Hip-length or waist-length
  ✅ Casual styling (bomber, denim, windbreaker)
  ✅ Lighter weight than coats
  ✅ Often with elastic cuffs or hem
  ✅ Examples: Bomber jackets, jean jackets, track jackets
  
  HOODED JACKET SPECIAL NOTES:
  - If QUILTED + HOOD → "Puffer Jackets" (Piumini)
  - If LONG + HOOD → "Winter Coats" (Cappotti) or "Hooded Jackets"
  - If CASUAL + HOOD → "Casual Jackets" or "Hooded Jackets"
  
  CHILDREN'S OUTERWEAR:
  - Same categories apply (Puffer Jackets, Winter Coats, etc.)
  - Add "Kids" or "Children's" to productType
  - Note playful details (animal ears, cartoon characters)
  
  ═══════════════════════════════════════════════════════════════
  📝 SEO OPTIMIZATION GUIDELINES
  ═══════════════════════════════════════════════════════════════
  
  SEO TITLE (50-60 characters):
  FOOTWEAR FORMAT: "[Brand] [Type] [Color/Feature] | [Gender]"
  - "Skechers Go Walk Flex Pink | Women's Walking Shoes"
  - "Joma Meta 2631 Running Shoes Black | Men"
  
  APPAREL FORMAT: "[Brand/Style] [Type] [Color/Feature] | [Gender/Age]"
  - "Beige Puffer Jacket with Hood | Kids Winter Coat"
  - "Nike Tech Fleece Hoodie Black | Men's Sportswear"
  - "Quilted Down Jacket Tan | Children's Outerwear"
  
  SEO DESCRIPTION (150-160 characters):
  FOOTWEAR: "Shop [brand] [product]. [Feature 1], [Feature 2]. [Use case]. [CTA]."
  - "Shop Skechers Go Walk Flex. Breathable mesh, Memory Foam insole, flexible sole. Perfect for walking & daily comfort. Free shipping!"
  
  APPAREL: "Discover [product] in [color]. [Feature 1], [Feature 2]. [Season/Use]. [CTA]."
  - "Discover kids' beige puffer jacket with playful horn hood. Warm quilted design, zip closure, cozy winter wear. Perfect for cold days. Shop now!"
  - "Get this tan quilted down jacket. Insulated padding, hooded design, durable nylon shell. Ideal for winter adventures. Free shipping!"
  
  HANDLE (3-5 words, lowercase, hyphens):
  FOOTWEAR: "brand-model-color" or "brand-type-color"
  - "skechers-go-walk-pink"
  - "joma-meta-running-black"
  
  APPAREL: "type-color-feature" or "brand-type-color"
  - "puffer-jacket-beige-kids"
  - "quilted-coat-tan-hood"
  - "nike-hoodie-black-fleece"
  
  PRODUCT TYPE (Specific within category):
  PUFFER JACKETS → "Quilted Puffer Jacket", "Down Jacket", "Padded Coat", "Kids Puffer Jacket"
  WINTER COATS → "Wool Coat", "Long Winter Coat", "Trench Coat"
  CASUAL JACKETS → "Bomber Jacket", "Denim Jacket", "Windbreaker"
  HOODED JACKETS → "Hooded Puffer", "Parka", "Anorak"
  
  ═══════════════════════════════════════════════════════════════
  🎯 PROCESSING WORKFLOW
  ═══════════════════════════════════════════════════════════════
  
  FOR EACH PRODUCT:
  
  1. IMAGE ANALYSIS (Primary):
     - Load and analyze main product image
     - Identify: Is it footwear, outerwear, top, bottom, or accessory?
     - Extract: Color, material, style, special features
     - Detect: Quilting pattern, hood, length, closure type
  
  2. CATEGORY DETERMINATION:
     - If QUILTED/PADDED appearance → "Puffer Jackets"
     - If LONG structured coat → "Winter Coats"
     - If CASUAL hip-length → "Casual Jackets"
     - If FOOTWEAR → Use footwear categories
     - If ACCESSORY → Use accessory categories
  
  3. PRODUCT TYPE GENERATION:
     - Be specific: "Kids Quilted Puffer Jacket with Hood"
     - Include key features: "Hooded Down Jacket"
     - Note target: "Children's Winter Coat"
  
  4. SEO OPTIMIZATION:
     - Title: Include color from image, type, target audience
     - Description: Highlight visible features, use case, CTA
     - Handle: Clean, includes color and type
  
  5. VALIDATION:
     - SEO Title: 50-60 chars ✓
     - SEO Description: 150-160 chars ✓
     - Handle: 3-5 words, lowercase, hyphens ✓
     - Category: From predefined list ✓
     - Product Type: Specific and accurate ✓
  
  ═══════════════════════════════════════════════════════════════
  📊 EXAMPLE OUTPUTS
  ═══════════════════════════════════════════════════════════════
  
  EXAMPLE 1 - PUFFER JACKET (like your image):
  {
    "id": "gid://shopify/Product/10456985305429",
    "seoTitle": "Beige Quilted Puffer Jacket with Hood | Kids Winter",
    "seoDescription": "Shop kids' beige puffer jacket with playful horn details. Warm quilted padding, hooded design, zip closure. Perfect for winter. Free shipping!",
    "handle": "kids-puffer-jacket-beige-hood",
    "category": "Puffer Jackets",
    "productType": "Kids Quilted Puffer Jacket"
  }
  
  EXAMPLE 2 - SNEAKERS:
  {
    "id": "gid://shopify/Product/10589930815829",
    "seoTitle": "Skechers Go Walk Flex Pink | Women's Walking Shoes",
    "seoDescription": "Shop Skechers Go Walk Flex in pink. Breathable mesh, Memory Foam insole, flexible sole. Perfect for walking & daily comfort. Free shipping!",
    "handle": "skechers-go-walk-flex-pink",
    "category": "Walking Shoes",
    "productType": "Slip-On Walking Shoes"
  }
  
  EXAMPLE 3 - WINTER COAT:
  {
    "id": "gid://shopify/Product/12345",
    "seoTitle": "Black Long Wool Coat | Women's Winter Outerwear",
    "seoDescription": "Discover elegant black wool coat. Double-breasted design, knee-length, premium fabric. Perfect for formal & casual winter wear. Shop now!",
    "handle": "black-wool-coat-women",
    "category": "Winter Coats",
    "productType": "Long Wool Coat"
  }
  
  ═══════════════════════════════════════════════════════════════
  ⚙️ DATA INPUT
  ═══════════════════════════════════════════════════════════════
  
  ${JSON.stringify(chunk, null, 2)}
  
  ═══════════════════════════════════════════════════════════════
  ✅ FINAL REQUIREMENTS
  ═══════════════════════════════════════════════════════════════
  
  Return JSON array with EXACTLY ${chunk.length} objects.
  Each object MUST have: id, seoTitle, seoDescription, handle, category, productType
  
  CRITICAL RULES:
  1. ANALYZE IMAGES FIRST - Visual identification is PRIMARY
  2. For QUILTED/PADDED jackets → ALWAYS use "Puffer Jackets" category
  3. For LONG coats → Use "Winter Coats"
  4. For CASUAL jackets → Use "Casual Jackets"
  5. Include COLOR from images in SEO title and handle
  6. Escape all quotes: \\"
  7. Return ONLY JSON array (no markdown, no explanations)
  8. Validate character limits before output
  
  BEGIN PROCESSING NOW.`;
  }
  



  // Complete taxonomy search with pagination and error handling
export async function getTaxonomyIdForCategory(
    admin: any,
    category: string
  ): Promise<string | null> {
    
    try {
      console.log(`🔍 Searching for category: "${category}"`);
      
      // Search with pagination
      const results = await searchTaxonomyCategory(admin, category, 250);
      
      if (results.length === 0) {
        console.warn(`⚠️ No taxonomy found for: "${category}"`);
        return null;
      }
  
      // Find best match
      let bestMatch = results[0];
      
      for (const edge of results) {
        const node = edge.node.productTaxonomyNode;
        
        // Prefer exact name match
        if (node.name.toLowerCase() === category.toLowerCase()) {
          bestMatch = edge;
          break;
        }
        
        // Prefer leaf categories (actual product categories)
        if (node.isLeaf && !bestMatch.node.productTaxonomyNode.isLeaf) {
          bestMatch = edge;
        }
      }
  
      const taxonomy = bestMatch.node.productTaxonomyNode;
      console.log(`✅ Found: ${taxonomy.fullName}`);
      console.log(`   ID: ${taxonomy.id}`);
      
      return taxonomy.id;
  
    } catch (error) {
      console.error(`❌ Error finding taxonomy for "${category}":`, error);
      return null;
    }
  }
  

// Search taxonomy with automatic pagination
async function searchTaxonomyCategory(
    admin: any, 
    searchTerm: string,
    maxResults: number = 250 // Maximum results to fetch
  ) {
    const SEARCH_QUERY = `#graphql
      query SearchTaxonomy($query: String!) {
        ProductCategory(query: $query) {
            productTaxonomyNode{
                fullName
                id
                isLeaf
                isRoot
                name
            }
        }
      }
    `;
  
    let allResults: any[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;
    const batchSize = 50;
  
    try {
        console.log(`Fetching batch... (current total: ${allResults.length})`);
        
        const response = await admin.graphql  (SEARCH_QUERY, {
          variables: { 
            query: searchTerm,
            // first: batchSize,
            // after: cursor
          }
        });
        
        const data:SearchTaxonomyResponse = await response.json();
        
        if (data.errors) {
          console.error('GraphQL errors:', data.errors);
          throw new Error('Failed to fetch taxonomy');
        }
  
        const categories = data.data?.productCategories;
        
        if (!categories) {
          break;
        }
  
        // Add results to array
        allResults.push(...categories.edges);
  
        // Check if there are more pages
        hasNextPage = categories.pageInfo.hasNextPage;
        cursor = categories.pageInfo.endCursor;
  
        console.log(`✅ Fetched ${categories.edges.length} categories (hasNextPage: ${hasNextPage})`);
  
        // Prevent infinite loops
        if (allResults.length >= maxResults) {
          console.log(`⚠️ Reached max results limit: ${maxResults}`);
          break;
        }
      
  
      console.log(`\n📊 Total categories found: ${allResults.length}`);
      return allResults;
  
    } catch (error) {
      console.error('Error searching taxonomy:', error);
      throw error;
    }
  }
  
  // Usage:
//   const runningShoes = await searchTaxonomyCategory(admin, "running shoes", 250);
//   console.log('Found categories:', runningShoes.length);
//   runningShoes.forEach(edge => {
//     const node = edge.node.productTaxonomyNode;
//     console.log(`- ${node.fullName} (${node.id})`);
//   });
  


interface TaxonomyNode {
    id: string;
    name: string;
    fullName: string;
    isLeaf: boolean;
    isRoot: boolean;
  }
  
  interface ProductCategoryEdge {
    cursor: string;
    node: {
      productTaxonomyNode: TaxonomyNode;
    };
  }
  
  interface SearchTaxonomyResponse {
    data: {
      productCategories: {
        edges: ProductCategoryEdge[];
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
      };
    };
    errors?: any;
  }