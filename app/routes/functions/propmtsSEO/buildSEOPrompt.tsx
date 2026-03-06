import { sendPrompt } from "@/routes/app.descreptionupdated";

// Add this new function alongside your existing generateSeoHtml
export async function generateSeoMetadata(
    products: { id: string; title: string; description: string; handle?: string; vendor?: string,image?:string,productType?:string }[],
    apiKey: string
  ): Promise<{ id: string; seoTitle: string; seoDescription: string; handle: string,image:string,productType?:string,category:string,categoryId:string }[]> {
    const CHUNK_SIZE = 1;
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
      const results = await searchTaxonomyCategory(admin, category, 500);
      console.log('her rsult of the tamoxy is her ',results)
      if (results.categories.length === 0) {
        console.warn(`⚠️ No taxonomy found for: "${category}"`);
        return null;
      }
  
      // Find best match
      let bestMatch = results.categories[0];
      
      for (const edge of results.categories) {
        const node = edge.name;
        
        // Prefer exact name match
        if (node.toLowerCase() === category.toLowerCase()) {
          bestMatch = edge;
          break;
        }
        
        // Prefer leaf categories (actual product categories)
        if (node.isLeaf && !bestMatch.node.productTaxonomyNode.isLeaf) {
          bestMatch = edge;
        }
      }
  
      const taxonomy = bestMatch;
      console.log(`✅ Found: ${taxonomy.fullName}`);
      console.log(`   ID: ${taxonomy.id}`);
      
      return taxonomy.id;
  
    } catch (error) {
      console.error(`❌ Error finding taxonomy for "${category}":`, error);
      return null;
    }
  }
  

// Search taxonomy with automatic pagination
// async function searchTaxonomyCategory(
//     admin: any, 
//     searchTerm: string,
//     maxResults: number = 250 // Maximum results to fetch
//   ) {

   
//    const SEARCH_QUERY=`#graphql
//     query SearchTaxonomy($search: String!) {
//         taxonomy {
//           categories(first: 200, search: $search) {
//             edges {
//               cursor
//               node {
//                 id
//                 name
//                 fullName
//                 ancestorIds
//                 childrenIds
//                 attributes(first: 50) {
//                   edges {
//                     cursor
//                     node {
//                       ... on TaxonomyChoiceListAttribute {
//                         id
//                         name
//                         values(first: 50) {
//                           edges {
//                             cursor
//                             node {
//                               id
//                               name
//                             }
//                           }
//                         }
//                       }
//                       ... on TaxonomyMeasurementAttribute {
//                         id
//                         name
//                         options {
//                           key
//                           value
//                         }
//                       }
//                       ... on TaxonomyAttribute {
//                         id
//                       }
//                     }
//                   }
//                 }
//               }
//             }
//           }
//         }
//       }
//    `
    
//     let allResults: any[] = [];
//     let hasNextPage = true;
//     let cursor: string | null = null;
//     const batchSize = 50;
  
//     try {
//         console.log(`Fetching batch... (current total: ${allResults.length})`);
        
//         const response = await admin.graphql  (SEARCH_QUERY, {
//           variables: { 
//             search: searchTerm,
//             // first: batchSize,
//             // after: cursor
//           }
//         });
        
//         const data:SearchTaxonomyResponse = await response.json();
        
//         if (data.errors) {
//           console.error('GraphQL errors:', data.errors);
//           throw new Error('Failed to fetch taxonomy');
//         }
//         const categories = data.data?.taxonomy.categories?.edges.map((edge:any)=>edge.node);
        
//        console.log('categories verified',categories)
  
//         // Add results to array
//         allResults.push(...categories);
  
//         // Check if there are more pages
//         // hasNextPage = categories.pageInfo.hasNextPage;
//         // cursor = categories.pageInfo.endCursor;
  
//         // console.log(`✅ Fetched ${categories.edges.length} categories (hasNextPage: ${hasNextPage})`);
  
//         // Prevent infinite loops
//         // if (allResults.length >= maxResults) {
//         //   console.log(`⚠️ Reached max results limit: ${maxResults}`);
//         //   break;
//         // }
      
  
//       console.log(`\n📊 Total categories found: ${allResults.length}`);
//       return allResults;
  
//     } catch (error) {
//       console.error('Error searching taxonomy:', error);
//       throw error;
//     }
//   }
  

  


// interface TaxonomyNode {
//     id: string;
//     name: string;
//     fullName: string;
//     isLeaf: boolean;
//     isRoot: boolean;
//   }
  
//   interface ProductCategoryEdge {
//     cursor: string;
//     node: {
//       productTaxonomyNode: TaxonomyNode;
//     };
//   }
  
//   interface SearchTaxonomyResponse {
//     data: {
//       productCategories: {
//         edges: ProductCategoryEdge[];
//         pageInfo: {
//           hasNextPage: boolean;
//           endCursor: string | null;
//         };
//       };
//     };
//     errors?: any;
//   }



// async function searchTaxonomyCategory(
//     admin: any,
//     searchTerm: string,
//     maxResults: number = 250,          // massimo totale da restituire
//     pageSize: number = 50,             // categorie per pagina (first)
//     attributesFirst: number = 20,      // attributi per categoria
//     valuesFirst: number = 50           // valori per attributo
//   ): Promise<TaxonomyCategoryResult[]> {
//     const SEARCH_QUERY = `#graphql
//       query SearchTaxonomyWithAttributes(
//         $search: String!,
//         $first: Int!,
//         $after: String,
//         $attributesFirst: Int!,
//         $valuesFirst: Int!
//       ) {
//         taxonomy {
//           categories(first: $first, search: $search, after: $after) {
//             pageInfo {
//               hasNextPage
//               endCursor
//             }
//             edges {
//               cursor
//               node {
//                 id
//                 name
//                 fullName
//                 ancestorIds
//                 childrenIds
//                 isLeaf
//                 attributes(first: $attributesFirst) {
//                   edges {
//                     cursor
//                     node {
//                       ... on TaxonomyChoiceListAttribute {
//                         id
//                         name
//                         values(first: $valuesFirst) {
//                           edges {
//                             cursor
//                             node {
//                               id
//                               name
//                             }
//                           }
//                         }
//                       }
//                       ... on TaxonomyMeasurementAttribute {
//                         id
//                         name
//                         options {
//                           key
//                           value
//                         }
//                       }
//                       ... on TaxonomyAttribute {
//                         id
//                       }
//                     }
//                   }
//                 }
//               }
//             }
//           }
//         }
//       }
//     `;
  
//     const allResults: TaxonomyCategoryResult[] = [];
//     let hasNextPage = true;
//     let cursor: string | null = null;
  
//     // sicurezza: non chiedere mai più di 100 per pagina
//     const safePageSize = Math.min(pageSize, 100);
  
//     try {
//       while (hasNextPage && allResults.length < maxResults) {
//         console.log(
//           `Fetching batch... (current total: ${allResults.length}, cursor: ${cursor})`
//         );
  
//         const response = await admin.graphql(SEARCH_QUERY, {
//           variables: {
//             search: searchTerm,
//             first: safePageSize,
//             after: cursor,
//             attributesFirst,
//             valuesFirst,
//           },
//         });
  
//         const data:SearchTaxonomyResponse = await response.json();
  
//         // errori top-level GraphQL
//         if (data.errors) {
//           console.error('GraphQL errors while fetching taxonomy:', data.errors);
//           throw new Error('Failed to fetch taxonomy');
//         }
  
//         const connection =
//           data?.data?.taxonomy?.categories ?? null;
  
//         if (!connection) {
//           console.warn('No taxonomy.categories connection in response');
//           break;
//         }
  
//         const pageInfo = connection.pageInfo;
//         const edges = Array.isArray(connection.edges)
//           ? connection.edges
//           : [];
  
//         const categories: TaxonomyCategoryResult[] = edges
//           .filter((edge: any) => edge?.node)
//           .map((edge: any) => edge.node);
  
//         console.log(
//           `✅ Fetched ${categories.length} categories in this batch (hasNextPage: ${pageInfo?.hasNextPage})`
//         );
  
//         allResults.push(...categories);
  
//         // aggiorna paginazione
//         hasNextPage = Boolean(pageInfo?.hasNextPage);
//         cursor = pageInfo?.endCursor ?? null;
  
//         // rispetta maxResults
//         if (allResults.length >= maxResults) {
//           console.log(
//             `⚠️ Reached max results limit: ${maxResults}, stopping pagination.`
//           );
//           break;
//         }
  
//         // se non ci sono più pagine, si esce dal while
//       }
  
//       console.log(`\n📊 Total categories found: ${allResults.length}`);
//       return allResults;
//     } catch (error) {
//       console.error('Error searching taxonomy:', error);
//       throw error;
//     }
//   }

//   type TaxonomyAttributeChoiceValue = {
//     id: string;
//     name: string;
//   };
  
//   type TaxonomyChoiceListAttribute = {
//     __typename: 'TaxonomyChoiceListAttribute';
//     id: string;
//     name: string;
//     values: {
//       edges: { cursor: string; node: TaxonomyAttributeChoiceValue }[];
//     };
//   };
  
//   type TaxonomyMeasurementAttribute = {
//     __typename: 'TaxonomyMeasurementAttribute';
//     id: string;
//     name: string;
//     options: { key: string; value: string }[];
//   };
  
//   type TaxonomyAttributeBase = {
//     __typename: 'TaxonomyAttribute';
//     id: string;
//   };
  
//   type TaxonomyCategoryAttributeNode =
//     | TaxonomyChoiceListAttribute
//     | TaxonomyMeasurementAttribute
//     | TaxonomyAttributeBase;
  
//   type TaxonomyCategoryResult = {
//     id: string;
//     name: string;
//     fullName: string;
//     ancestorIds: string[];
//     childrenIds: string[];
//     isLeaf: boolean;
//     attributes: {
//       edges: { cursor: string; node: TaxonomyCategoryAttributeNode }[];
//     };
//   };








// type GraphQLAdmin = {
//     graphql: (query: string, options?: any) => Promise<Response>;
//   };
  
//   type TaxonomyCategory = {
//     id: string;
//     name: string;
//     fullName: string;
//     ancestorIds: string[];
//     childrenIds: string[];
//     isLeaf: boolean;
//     attributes?: any[];
//   };
  
//   /* -----------------------------
//      LRU CACHE
//   ----------------------------- */
  
//   class LRUCache<K, V> {
//     private cache = new Map<K, V>();
  
//     constructor(private limit = 500) {}
  
//     get(key: K): V | undefined {
//       if (!this.cache.has(key)) return undefined;
  
//       const value = this.cache.get(key)!;
  
//       this.cache.delete(key);
//       this.cache.set(key, value);
  
//       return value;
//     }
  
//     set(key: K, value: V) {
//       if (this.cache.has(key)) this.cache.delete(key);
  
//       this.cache.set(key, value);
  
//       if (this.cache.size > this.limit) {
//         const first = this.cache.keys().next().value;
//         this.cache.delete(first);
//       }
//     }
//   }
  
//   /* -----------------------------
//      PROMISE POOL
//   ----------------------------- */
  
//   async function promisePool<T, R>(
//     items: T[],
//     worker: (item: T) => Promise<R>,
//     concurrency = 5
//   ): Promise<R[]> {
//     const results: R[] = [];
//     const executing: Promise<any>[] = [];
  
//     for (const item of items) {
//       const p = worker(item).then((res) => results.push(res));
  
//       executing.push(p);
  
//       if (executing.length >= concurrency) {
//         await Promise.race(executing);
//         executing.splice(
//           executing.findIndex((e) => e === p),
//           1
//         );
//       }
//     }
  
//     await Promise.all(executing);
  
//     return results;
//   }
  
//   /* -----------------------------
//      GRAPHQL CLIENT
//   ----------------------------- */
  
//   async function graphqlRequest(
//     admin: GraphQLAdmin,
//     query: string,
//     variables: any,
//     retries = 5
//   ): Promise<any> {
//     try {
//       const response = await admin.graphql(query, { variables });
//       const json = await response.json();
  
//       if (json.errors) {
//         throw new Error(JSON.stringify(json.errors));
//       }
  
//       const throttle = json?.extensions?.cost?.throttleStatus;
  
//       if (throttle?.currentlyAvailable < 50) {
//         await new Promise((r) => setTimeout(r, 500));
//       }
  
//       return json;
//     } catch (error) {
//       if (retries <= 0) throw error;
  
//       const delay = 500 * (6 - retries);
//       await new Promise((r) => setTimeout(r, delay));
  
//       return graphqlRequest(admin, query, variables, retries - 1);
//     }
//   }
  
//   /* -----------------------------
//      CACHES
//   ----------------------------- */
  
//   const attributeCache = new LRUCache<string, any[]>(500);
//   const valuesCache = new LRUCache<string, any[]>(1000);
  
//   /* -----------------------------
//      FETCH ATTRIBUTE VALUES
//   ----------------------------- */
  
//   async function fetchValues(
//     admin: GraphQLAdmin,
//     attributeId: string,
//     valuesFirst = 50
//   ) {
//     const cached = valuesCache.get(attributeId);
//     if (cached) return cached;
  
//     const QUERY = `#graphql
//     query ($id: ID!, $first: Int!, $after: String) {
//       node(id: $id) {
//         ... on TaxonomyChoiceListAttribute {
//           values(first: $first, after: $after) {
//             pageInfo { hasNextPage endCursor }
//             edges { node { id name } }
//           }
//         }
//       }
//     }`;
  
//     let values: any[] = [];
//     let cursor: string | null = null;
//     let hasNextPage = true;
  
//     while (hasNextPage) {
//       const json = await graphqlRequest(admin, QUERY, {
//         id: attributeId,
//         first: valuesFirst,
//         after: cursor
//       });
  
//       const conn = json?.data?.node?.values;
//       if (!conn) break;
  
//       values.push(...conn.edges.map((e: any) => e.node));
  
//       hasNextPage = conn.pageInfo.hasNextPage;
//       cursor = conn.pageInfo.endCursor;
//     }
  
//     valuesCache.set(attributeId, values);
  
//     return values;
//   }
  
//   /* -----------------------------
//      FETCH ATTRIBUTES
//   ----------------------------- */
  
//   async function fetchAttributes(
//     admin: GraphQLAdmin,
//     categoryId: string,
//     attributesFirst = 20,
//     valuesFirst = 50
//   ) {
//     const cached = attributeCache.get(categoryId);
//     if (cached) return cached;
  
//     const QUERY = `#graphql
//     query ($id: ID!, $first: Int!, $after: String) {
//       node(id: $id) {
//         ... on TaxonomyCategory {
//           attributes(first: $first, after: $after) {
//             pageInfo { hasNextPage endCursor }
//             edges {
//               node {
//                 __typename
//                 ... on TaxonomyChoiceListAttribute {
//                   id
//                   name
//                 }
//                 ... on TaxonomyMeasurementAttribute {
//                   id
//                   name
//                   options { key value }
//                 }
//               }
//             }
//           }
//         }
//       }
//     }`;
  
//     let attributes: any[] = [];
//     let cursor: string | null = null;
//     let hasNextPage = true;
  
//     while (hasNextPage) {
//       const json = await graphqlRequest(admin, QUERY, {
//         id: categoryId,
//         first: attributesFirst,
//         after: cursor
//       });
  
//       const conn = json?.data?.node?.attributes;
//       if (!conn) break;
  
//       const batch = conn.edges.map((e: any) => e.node);
  
//       const choiceAttrs = batch.filter(
//         (a: any) => a.__typename === "TaxonomyChoiceListAttribute"
//       );
  
//       await promisePool(
//         choiceAttrs,
//         async (attr: any) => {
//           attr.values = await fetchValues(
//             admin,
//             attr.id,
//             valuesFirst
//           );
//         },
//         6
//       );
  
//       attributes.push(...batch);
  
//       hasNextPage = conn.pageInfo.hasNextPage;
//       cursor = conn.pageInfo.endCursor;
//     }
  
//     attributeCache.set(categoryId, attributes);
  
//     return attributes;
//   }
  
//   /* -----------------------------
//      MAIN SEARCH FUNCTION
//   ----------------------------- */
  
//   export async function searchTaxonomyCategory(
//     admin: GraphQLAdmin,
//     searchTerm: string,
//     maxResults = 250,
//     pageSize = 50,
//     attributesFirst = 20,
//     valuesFirst = 50
//   ): Promise<TaxonomyCategory[]> {
  
//     const QUERY = `#graphql
//     query ($search: String!, $first: Int!, $after: String) {
//       taxonomy {
//         categories(first: $first, search: $search, after: $after) {
//           pageInfo { hasNextPage endCursor }
//           edges {
//             node {
//               id
//               name
//               fullName
//               ancestorIds
//               childrenIds
//               isLeaf
//             }
//           }
//         }
//       }
//     }`;
  
//     let cursor: string | null = null;
//     let hasNextPage = true;
  
//     const results: TaxonomyCategory[] = [];
  
//     while (hasNextPage && results.length < maxResults) {
  
//       const json = await graphqlRequest(admin, QUERY, {
//         search: searchTerm,
//         first: pageSize,
//         after: cursor
//       });
  
//       const conn = json?.data?.taxonomy?.categories;
//       if (!conn) break;
  
//       const categories: TaxonomyCategory[] =
//         conn.edges.map((e: any) => e.node);
  
//       const enriched = await promisePool(
//         categories,
//         async (category) => {
//           category.attributes = await fetchAttributes(
//             admin,
//             category.id,
//             attributesFirst,
//             valuesFirst
//           );
//           return category;
//         },
//         5
//       );
  
//       results.push(...enriched);
  
//       hasNextPage = conn.pageInfo.hasNextPage;
//       cursor = conn.pageInfo.endCursor;
//     }
  
//     return results.slice(0, maxResults);
//   }





// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface GraphQLAdmin {
    graphql: (query: string, options?: { variables?: Record<string, any> }) => Promise<Response>;
  }
  
  interface TaxonomyValue {
    id: string;
    name: string;
    taxonomyId: string;
  }
  
  interface TaxonomyAttribute {
    id: string;
    name: string;
    taxonomyId: string;
    type: 'choice' | 'measurement' | 'unknown';
    values?: TaxonomyValue[];
    options?: Array<{ key: string; value: string }>;
  }
  
  interface TaxonomyCategory {
    id: string;
    name: string;
    fullName: string;
    ancestorIds: string[];
    childrenIds: string[];
    isLeaf: boolean;
    isRoot?: boolean;
    isArchived?: boolean;
    level: number;
    parentId?: string;
    taxonomyId: string;
    attributes: TaxonomyAttribute[];
  }
  
  interface SearchOptions {
    maxResults?: number;
    pageSize?: number;
    fetchAttributes?: boolean;
    attributesFirst?: number;
    valuesFirst?: number;
    attributeTypes?: ('choice' | 'measurement')[];
    concurrency?: number;
  }
  
  interface SearchResult {
    success: boolean;
    categories: TaxonomyCategory[];
    totalFound: number;
    searchTerm: string;
    executionTimeMs: number;
    hasMore: boolean;
  }
  
  // ============================================================================
  // SEARCH UTILITIES
  // ============================================================================
  
  class SearchSanitizer {
    /**
     * Sanitize search term for Shopify GraphQL search
     * Handles special characters like &, |, !, etc.
     */
    static sanitize(searchTerm: string): string {
      if (!searchTerm) return '';
      
      let sanitized = searchTerm.trim();
      
      // Replace & with escaped version or space
      sanitized = sanitized.replace(/&/g, '\\&');
      sanitized = sanitized.replace(/\|/g, '\\|');
      sanitized = sanitized.replace(/!/g, '\\!');
      sanitized = sanitized.replace(/:/g, '\\:');
      sanitized = sanitized.replace(/\(/g, '\\(');
      sanitized = sanitized.replace(/\)/g, '\\)');
      
      return sanitized;
    }
  
    /**
     * Alternative: Prepare search term for partial matching
     */
    static prepareForSearch(searchTerm: string): string {
      if (!searchTerm) return '';
      
      return searchTerm
        .trim()
        .replace(/&/g, ' ')
        .replace(/\|/g, ' ')
        .replace(/!/g, ' ')
        .replace(/[()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  
    /**
     * Create multiple search variations for better matching
     */
    static createSearchVariations(searchTerm: string): string[] {
      const variations: string[] = [];
      
      // Original (sanitized)
      variations.push(this.sanitize(searchTerm));
      
      // Without special chars
      variations.push(this.prepareForSearch(searchTerm));
      
      // Just the first word
      const firstWord = searchTerm.split(/[\s&|]/)[0];
      if (firstWord && firstWord !== searchTerm) {
        variations.push(firstWord);
      }
      
      return [...new Set(variations)];
    }
  }
  
  // ============================================================================
  // CACHE
  // ============================================================================
  
  class TTLCache<K, V> {
    private cache = new Map<K, { value: V; expires: number }>();
    
    constructor(
      private maxSize = 1000,
      private defaultTTL = 1000 * 60 * 60 * 2
    ) {}
  
    get(key: K): V | undefined {
      const entry = this.cache.get(key);
      if (!entry) return undefined;
      if (Date.now() > entry.expires) {
        this.cache.delete(key);
        return undefined;
      }
      this.cache.delete(key);
      this.cache.set(key, entry);
      return entry.value;
    }
  
    set(key: K, value: V, ttl?: number): void {
      if (this.cache.has(key)) this.cache.delete(key);
      const expires = Date.now() + (ttl ?? this.defaultTTL);
      this.cache.set(key, { value, expires });
      if (this.cache.size > this.maxSize) {
        const first = this.cache.keys().next().value;
        this.cache.delete(first);
      }
    }
  }
  
  // ============================================================================
  // GRAPHQL CLIENT
  // ============================================================================
  
  class GraphQLExecutor {
    constructor(
      private admin: GraphQLAdmin,
      private retries = 3,
      private baseDelay = 300
    ) {}
  
    async execute<T = any>(
      query: string,
      variables: Record<string, any>,
      operationName?: string
    ): Promise<T> {
      try {
        return await this.executeWithRetry(query, variables, operationName);
      } catch (error) {
        throw error;
      }
    }
  
    private async executeWithRetry(
      query: string,
      variables: Record<string, any>,
      operationName?: string,
      retriesLeft = this.retries
    ): Promise<any> {
      try {
        const response = await this.admin.graphql(query, { variables });
        console.log('response is her 1',response)
        const json = await response.json();
  
        if (json.errors?.length) {
          throw new Error(`GraphQL Error: ${JSON.stringify(json.errors)}`);
        }
  
        // Rate limit handling
        const cost = json?.extensions?.cost;
        if (cost?.throttleStatus?.currentlyAvailable < 100) {
          await this.sleep(500);
        }
  
        return json.data;
      } catch (error) {
        if (retriesLeft <= 0) throw error;
        const delay = this.baseDelay * Math.pow(2, this.retries - retriesLeft);
        await this.sleep(delay);
        return this.executeWithRetry(query, variables, operationName, retriesLeft - 1);
      }
    }
  
    private sleep(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }
  
  // ============================================================================
  // CONCURRENCY POOL
  // ============================================================================
  
  class ConcurrencyPool {
    private queue: Array<() => Promise<void>> = [];
    private active = 0;
  
    constructor(private limit: number) {}
  
    async execute<T>(task: () => Promise<T>): Promise<T> {
      if (this.active >= this.limit) {
        await new Promise<void>(resolve => this.queue.push(resolve));
      }
  
      this.active++;
      try {
        return await task();
      } finally {
        this.active--;
        const next = this.queue.shift();
        if (next) next();
      }
    }
  
    async map<T, R>(items: T[], mapper: (item: T) => Promise<R>): Promise<R[]> {
      const results = new Array<R>(items.length);
      await Promise.all(
        items.map((item, index) => 
          this.execute(async () => {
            results[index] = await mapper(item);
          })
        )
      );
      return results;
    }
  }
  
  // ============================================================================
  // TAXONOMY REPOSITORY
  // ============================================================================
  
  class TaxonomyRepository {
    private client: GraphQLExecutor;
    private valuesCache: TTLCache<string, TaxonomyValue[]>;
    private pool: ConcurrencyPool;
  
    constructor(admin: GraphQLAdmin, concurrency = 5) {
      this.client = new GraphQLExecutor(admin);
      this.valuesCache = new TTLCache();
      this.pool = new ConcurrencyPool(concurrency);
    }
  
    // ==========================================================================
    // GET ATTRIBUTE VALUES
    // ==========================================================================
  
    async getAttributeValues(
      attributeId: string,
      first = 250
    ): Promise<TaxonomyValue[]> {
      const cached = this.valuesCache.get(attributeId);
      if (cached) return cached;
  
      const query = `#graphql
        query GetAttributeValues($id: ID!, $first: Int!, $after: String) {
          node(id: $id) {
            ... on TaxonomyChoiceListAttribute {
              id
              name
              values(first: $first, after: $after) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                edges {
                  node {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      `;
  
      const values: TaxonomyValue[] = [];
      let cursor: string | null = null;
      let hasNextPage = true;
  
      while (hasNextPage) {
        const data = await this.client.execute(
          query,
          { id: attributeId, first, after: cursor },
          `GetValues-${attributeId}`
        );
  
        const node = data?.node;
        if (!node?.values) break;
  
        const pageValues = node.values.edges.map((e: any) => ({
          id: e.node.id,
          name: e.node.name,
          taxonomyId: e.node.id
        }));
  
        values.push(...pageValues);
        hasNextPage = node.values.pageInfo.hasNextPage;
        cursor = node.values.pageInfo.endCursor;
      }
  
      this.valuesCache.set(attributeId, values);
      return values;
    }
  
    // ==========================================================================
    // GET CATEGORY ATTRIBUTES
    // ==========================================================================
  
    async getCategoryAttributes(
      categoryId: string,
      options: {
        first?: number;
        valuesFirst?: number;
        types?: ('choice' | 'measurement')[];
      } = {}
    ): Promise<TaxonomyAttribute[]> {
      const { first = 100, valuesFirst = 250, types } = options;
  
      const query = `#graphql
        query GetCategoryAttributes($id: ID!, $first: Int!, $after: String) {
          node(id: $id) {
            ... on TaxonomyCategory {
              id
              attributes(first: $first, after: $after) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                edges {
                  node {
                    __typename
                    ... on TaxonomyChoiceListAttribute {
                      id
                      name
                    }
                    ... on TaxonomyMeasurementAttribute {
                      id
                      name
                      options {
                        key
                        value
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;
  
      const attributes: TaxonomyAttribute[] = [];
      let cursor: string | null = null;
      let hasNextPage = true;
  
      while (hasNextPage) {
        const data = await this.client.execute(
          query,
          { id: categoryId, first, after: cursor },
          `GetAttributes-${categoryId}`
        );
  
        const node = data?.node;
        if (!node?.attributes) break;
  
        const batch = node.attributes.edges.map((e: any) => {
          const node = e.node;
          const typeMap: Record<string, TaxonomyAttribute['type']> = {
            'TaxonomyChoiceListAttribute': 'choice',
            'TaxonomyMeasurementAttribute': 'measurement'
          };
  
          return {
            id: node.id,
            name: node.name,
            taxonomyId: node.id,
            type: typeMap[node.__typename] || 'unknown',
            ...(node.options && { options: node.options })
          } as TaxonomyAttribute;
        });
  
        const filteredBatch = types ? batch.filter(a => types.includes(a.type)) : batch;
  
        // Fetch values for choice attributes
        const choiceAttrs = filteredBatch.filter(a => a.type === 'choice');
        if (choiceAttrs.length > 0) {
          await Promise.all(
            choiceAttrs.map(async (attr) => {
              try {
                attr.values = await this.getAttributeValues(attr.id, valuesFirst);
              } catch (error) {
                attr.values = [];
              }
            })
          );
        }
  
        attributes.push(...filteredBatch);
        hasNextPage = node.attributes.pageInfo.hasNextPage;
        cursor = node.attributes.pageInfo.endCursor;
      }
  
      return attributes;
    }
  
    // ==========================================================================
    // SEARCH - FIXED VERSION
    // ==========================================================================
  
    async search(
      searchTerm: string,
      options: SearchOptions = {}
    ): Promise<SearchResult> {
      const startTime = Date.now();
  
      const config = {
        maxResults: options.maxResults ?? 250,
        pageSize: options.pageSize ?? 50,
        fetchAttributes: options.fetchAttributes ?? true,
        attributesFirst: options.attributesFirst ?? 100,
        valuesFirst: options.valuesFirst ?? 250,
        attributeTypes: options.attributeTypes,
        concurrency: options.concurrency ?? 5
      };
  
      // Try multiple search strategies
      const searchVariations = SearchSanitizer.createSearchVariations(searchTerm);
      let allCategories: TaxonomyCategory[] = [];
      
      console.log(`🔍 Searching for: "${searchTerm}"`);
      console.log(`   Trying variations:`, searchVariations);
  
      for (const variation of searchVariations) {
        if (allCategories.length > 0) break;
        
        try {
          const categories = await this.executeSearch(variation, config);
          allCategories = categories;
        } catch (error) {
          console.error(`   Search error for "${variation}":`, (error as Error).message);
        }
      }
  
      // If still no results, try hierarchical search
      if (allCategories.length === 0) {
        console.log(`   ⚠️ No direct matches, trying hierarchical search...`);
        allCategories = await this.hierarchicalSearch(searchTerm, config);
      }
  
      // Enrich with attributes
      if (config.fetchAttributes && allCategories.length > 0) {
        console.log(`   📦 Enriching ${allCategories.length} categories with attributes...`);
        
        const enriched = await this.pool.map(
          allCategories,
          async (category) => {
            try {
              const attrs = await this.getCategoryAttributes(category.id, {
                first: config.attributesFirst,
                valuesFirst: config.valuesFirst,
                types: config.attributeTypes
              });
              category.attributes = attrs;
              return category;
            } catch (error) {
              category.attributes = [];
              return category;
            }
          }
        );
      }
  
      return {
        success: allCategories.length > 0,
        categories: allCategories.slice(0, config.maxResults),
        totalFound: allCategories.length,
        searchTerm,
        executionTimeMs: Date.now() - startTime,
        hasMore: false
      };
    }
  
    // ==========================================================================
    // EXECUTE SEARCH QUERY - FIXED (NO handle FIELD)
    // ==========================================================================
  
    private async executeSearch(
      searchTerm: string,
      config: any
    ): Promise<TaxonomyCategory[]> {
      // FIXED: Removed 'handle' field which doesn't exist on TaxonomyCategory
      const query = `#graphql
        query SearchTaxonomyCategories($search: String!, $first: Int!, $after: String) {
          taxonomy {
            categories(first: $first, search: $search, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              edges {
                node {
                  id
                  name
                  fullName
                  ancestorIds
                  childrenIds
                  isLeaf
                  isRoot
                  isArchived
                  level
                  parentId
                }
              }
            }
          }
        }
      `;
  
      const categories: TaxonomyCategory[] = [];
      let cursor: string | null = null;
      let hasNextPage = true;
  
      while (hasNextPage && categories.length < config.maxResults) {
        const remaining = config.maxResults - categories.length;
        const fetchSize = Math.min(config.pageSize, remaining);
  
        try {
          const data = await this.client.execute(
            query,
            { search: searchTerm, first: fetchSize, after: cursor },
            `Search-${searchTerm}`
          );
  
          const conn = data?.taxonomy?.categories;
          if (!conn) break;
  
          const batch = conn.edges.map((e: any) => this.buildCategory(e.node));
          categories.push(...batch);
  
          hasNextPage = conn.pageInfo.hasNextPage;
          cursor = conn.pageInfo.endCursor;
        } catch (error) {
          console.error(`   Search execution error:`, (error as Error).message);
          break;
        }
      }
  
      return categories;
    }
  
    // ==========================================================================
    // HIERARCHICAL SEARCH - FIXED
    // ==========================================================================
  
    private async hierarchicalSearch(
      searchTerm: string,
      config: any
    ): Promise<TaxonomyCategory[]> {
      const parentTerms = ['Apparel & Accessories', 'Clothing', 'Men', 'Women', 'Hoodies'];
      const results: TaxonomyCategory[] = [];
      
      for (const parentTerm of parentTerms) {
        if (results.length > 0) break;
        
        try {
          // Get parent category
          const parentQuery = `#graphql
            query SearchParent($search: String!) {
              taxonomy {
                categories(first: 10, search: $search) {
                  edges {
                    node {
                      id
                      name
                    }
                  }
                }
              }
            }
          `;
          
          const parentData = await this.client.execute(
            parentQuery,
            { search: parentTerm },
            `FindParent-${parentTerm}`
          );
          
          const parents = parentData?.taxonomy?.categories?.edges || [];
          
          // Search children of each parent
          for (const parent of parents) {
            const childrenQuery = `#graphql
              query GetChildren($id: ID!) {
                taxonomy {
                  categories(first: 100, children_of: $id) {
                    edges {
                      node {
                        id
                        name
                        fullName
                        ancestorIds
                        childrenIds
                        isLeaf
                        isRoot
                        isArchived
                        level
                        parentId
                      }
                    }
                  }
                }
              }
            `;
            
            const childrenData = await this.client.execute(
              childrenQuery,
              { id: parent.node.id },
              `SearchChildren-${parent.node.id}`
            );
            
            const children = childrenData?.taxonomy?.categories?.edges || [];
            
            // Filter manually for better matching
            const searchWords = searchTerm.toLowerCase().split(/[\s&]+/).filter(w => w.length > 0);
            
            const matching = children.filter((e: any) => {
              const name = e.node.name.toLowerCase();
              const fullName = e.node.fullName.toLowerCase();
              return searchWords.some(word => 
                name.includes(word) || fullName.includes(word)
              );
            });
            
            if (matching.length > 0) {
              results.push(...matching.map((e: any) => this.buildCategory(e.node)));
              break;
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      return results;
    }
  
    private buildCategory(node: any): TaxonomyCategory {
      return {
        id: node.id,
        name: node.name,
        fullName: node.fullName,
        ancestorIds: node.ancestorIds || [],
        childrenIds: node.childrenIds || [],
        isLeaf: node.isLeaf,
        isRoot: node.isRoot,
        isArchived: node.isArchived,
        level: node.level || (node.ancestorIds?.length || 0),
        parentId: node.parentId || node.ancestorIds?.[node.ancestorIds.length - 1],
        taxonomyId: node.id,
        attributes: [],
        path: node.fullName?.split(' > ') || [node.name]
      };
    }
  }
  
  // ============================================================================
  // EXPORT FUNCTIONS
  // ============================================================================
  
  let repository: TaxonomyRepository | null = null;
  
  function getRepository(admin: GraphQLAdmin): TaxonomyRepository {
    if (!repository) {
      repository = new TaxonomyRepository(admin);
    }
    return repository;
  }
  
  export async function searchTaxonomyAdvanced(
    admin: GraphQLAdmin,
    searchTerm: string,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    const repo = getRepository(admin);
    return repo.search(searchTerm, options);
  }
  
  export async function searchTaxonomyCategory(
    admin: GraphQLAdmin,
    searchTerm: string,
    maxResults?: number,
    pageSize?: number,
    attributesFirst?: number,
    valuesFirst?: number
  ): Promise<SearchResult> {
    return searchTaxonomyAdvanced(admin, searchTerm, {
      maxResults,
      pageSize,
      attributesFirst,
      valuesFirst,
      fetchAttributes: true
    });
  }
  
  // Type exports
  export type {
    TaxonomyCategory,
    TaxonomyAttribute,
    TaxonomyValue,
    SearchResult,
    SearchOptions,
    GraphQLAdmin
  };