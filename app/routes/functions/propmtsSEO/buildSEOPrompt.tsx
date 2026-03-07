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
//     chunk: { 
//       id: string; 
//       title: string; 
//       description: string; 
//       handle?: string; 
//       vendor?: string;
//       image?: string;
//       productType?: string;
//       tags?: string[];
//       price?: number;
//     }[]
//   ): string {
//     return `You are a Shopify SEO API specializing in the Shopify Standard Product Taxonomy (2026-02) Universal Categorization System.
  
//   STRICT OUTPUT FORMAT - JSON Array Only:
//   [{
//     "id": "gid://shopify/Product/xxxxx",
//     "seoTitle": "50-60 chars, primary keyword first",
//     "seoDescription": "150-160 chars, compelling CTA",
//     "handle": "seo-friendly-url-slug",
//     "category": "EXACT_TaxonomyCategory_ID",
//     "productType": "Specific leaf node name",
//     "attributes": {
//       "color": "extracted or null",
//       "material": "extracted or null",
//       "targetGender": "extracted or null",
//       "size": "extracted or null"
//     }
//   }]
  
//   ═══════════════════════════════════════════════════════════════
//   UNIVERSAL TAXONOMY MAPPING (All 10 Root Categories)
//   ═══════════════════════════════════════════════════════════════
  
//   1. APPAREL & ACCESSORIES (aa)
//      ├── Clothing (aa-1): Tops, Bottoms, Outerwear, Underwear, Activewear, Swimwear
//      ├── Shoes (aa-8): Sneakers, Boots, Sandals, Heels, Flats, Slippers
//      ├── Accessories (aa-2, aa-4, aa-5, aa-6, aa-7): Bags, Belts, Hats, Jewelry, Watches
//      └── Specialized: Maternity (aa-1-7), Baby Clothing (aa-1-2), Costumes (aa-3)
  
//   2. ARTS & ENTERTAINMENT (ae)
//      ├── Arts & Crafts (ae-2-1): Painting, Drawing, Sewing, Jewelry Making
//      ├── Musical Instruments (ae-2-2): Guitars, Keyboards, Drums, DJ Equipment
//      ├── Collectibles (ae-2-3): Coins, Trading Cards, Comic Books
//      └── Party & Celebration (ae-2-4): Decorations, Costumes, Supplies
  
//   3. BABY & TODDLER (bt)
//      ├── Baby Clothing (bt-1): Bodysuits, Sleepwear, Outerwear
//      ├── Baby Care (bt-2): Diapering, Bathing, Health
//      ├── Feeding (bt-3): Bottles, Breastfeeding, Baby Food
//      ├── Nursery (bt-4): Furniture, Bedding, Decor
//      └── Baby Transport (bt-5): Strollers, Carriers, Car Seats
  
//   4. BUSINESS & INDUSTRIAL (bi)
//      ├── Agriculture (bi-1): Machinery, Irrigation, Livestock
//      ├── Construction (bi-2): Tools, Safety Equipment, Raw Materials
//      ├── Manufacturing (bi-3): Industrial Machinery, Components
//      ├── Office Supplies (bi-4): Furniture, Stationery, Equipment
//      └── Work Safety (bi-5): Protective Gear, Safety Equipment
  
//   5. ELECTRONICS (el)
//      ├── Computers (el-1): Laptops, Desktops, Components, Peripherals
//      ├── Communication (el-2): Phones, Accessories, Smartwatches
//      ├── Audio (el-3): Headphones, Speakers, Components
//      ├── Video (el-4): TVs, Cameras, Projectors, Drones
//      ├── Gaming (el-5): Consoles, Accessories, PC Gaming
//      └── Components (el-6): Circuit Boards, Cables, Power Supplies
  
//   6. FOOD, BEVERAGES & TOBACCO (fb)
//      ├── Food Items (fb-1): Fresh, Frozen, Canned, Snacks
//      ├── Beverages (fb-2): Coffee, Tea, Soft Drinks, Alcohol
//      ├── Tobacco (fb-3): Cigarettes, Cigars, Vaping
//      └── Cooking Ingredients (fb-4): Spices, Oils, Sauces
  
//   7. HEALTH & BEAUTY (hb)
//      ├── Personal Care (hb-1): Skin Care, Hair Care, Oral Care
//      ├── Cosmetics (hb-2): Makeup, Nail Care, Tools
//      ├── Health Care (hb-3): Medical Devices, Supplements, First Aid
//      └── Wellness (hb-4): Fitness, Massage, Aromatherapy
  
//   8. HOME & GARDEN (hg)
//      ├── Furniture (hg-1): Indoor, Outdoor, Office, Kids
//      ├── Kitchen (hg-2): Appliances, Cookware, Tableware
//      ├── Decor (hg-3): Lighting, Textiles, Art, Rugs
//      ├── Garden (hg-4): Plants, Tools, Outdoor Living
//      └── Household (hg-5): Cleaning, Storage, Safety
  
//   9. LUGGAGE & BAGS (lb)
//      ├── Backpacks (lb-1): Laptop, Hiking, School, Travel
//      ├── Luggage (lb-2): Suitcases, Carry-ons, Travel Sets
//      ├── Handbags (lb-3): Totes, Crossbody, Clutches
//      └── Cases (lb-4): Phone, Laptop, Camera, Instrument
  
//   10. SPORTING GOODS (sg)
//       ├── Exercise & Fitness (sg-1): Equipment, Apparel, Accessories
//       ├── Outdoor Recreation (sg-2): Camping, Hiking, Cycling
//       ├── Water Sports (sg-3): Swimming, Diving, Surfing
//       ├── Winter Sports (sg-4): Skiing, Snowboarding, Skating
//       ├── Team Sports (sg-5): Soccer, Basketball, Football
//       └── Racquet Sports (sg-6): Tennis, Badminton, Squash
  
//   11. TOYS & GAMES (tg)
//       ├── Toys (tg-1): Action Figures, Dolls, Educational, Plush
//       ├── Games (tg-2): Board Games, Puzzles, Card Games
//       └── Outdoor Play (tg-3): Playsets, Trampolines, Ride-ons
  
//   12. VEHICLES & PARTS (vp)
//       ├── Cars & Trucks (vp-1): Vehicles, Parts, Accessories
//       ├── Motorcycles (vp-2): Bikes, Parts, Gear
//       ├── Watercraft (vp-3): Boats, Parts, Accessories
//       ├── Aircraft (vp-4): Planes, Drones, Parts
//       └── Tools & Maintenance (vp-5): Repair Tools, Diagnostic Equipment
  
//   ═══════════════════════════════════════════════════════════════
//   INTELLIGENT CATEGORIZATION WORKFLOW
//   ═══════════════════════════════════════════════════════════════
  
//   STEP 1: IMAGE ANALYSIS (Primary Signal)
//   Analyze the main product image for:
//   - Physical form and shape
//   - Material texture and finish
//   - Color and pattern
//   - Functional components (buttons, zippers, screens, wheels)
//   - Size relative to known objects
//   - Context clues (lifestyle, environment, usage)
  
//   STEP 2: TEXT ANALYSIS (Secondary Signal)
//   Parse title and description for:
//   - Brand names (Nike, Apple, Samsung, IKEA)
//   - Product type keywords (shoes, laptop, sofa, blender)
//   - Material mentions (leather, cotton, aluminum, glass)
//   - Size indicators (small, large, 42-inch, 500ml)
//   - Gender/age targeting (men, women, kids, baby)
//   - Use case (running, gaming, cooking, sleeping)
  
//   STEP 3: TAXONOMY MATCHING
//   Map to specific category ID using this logic:
  
//   IF footwear_visible → aa-8 (Shoes)
//     ├── laces + sporty = aa-8-8 (Sneakers)
//     ├── ankle_high + sturdy = aa-8-3 (Boots)
//     ├── open_toe = aa-8-6 (Sandals)
//     └── flat + casual = aa-8-9 (Flats)
  
//   IF clothing_visible → aa-1 (Clothing)
//     ├── upper_body + sleeves = aa-1-13 (Tops)
//     ├── lower_body + legs = aa-1-14 (Bottoms)
//     ├── outer_layer + warm = aa-1-10 (Outerwear)
//     └── one_piece = aa-1-15 (Dresses)
  
//   IF electronics_visible → el (Electronics)
//     ├── screen + portable = el-1 (Computers) or el-2 (Communication)
//     ├── audio_output = el-3 (Audio)
//     ├── captures_video = el-4 (Video/Cameras)
//     └── plays_games = el-5 (Gaming)
  
//   IF furniture_visible → hg-1 (Furniture)
//     ├── sits_people = hg-1-1 (Chairs) or hg-1-2 (Sofas)
//     ├── stores_items = hg-1-3 (Storage)
//     └── sleeps_people = hg-1-4 (Beds)
  
//   IF bag_visible → lb (Luggage & Bags) or aa-5 (Handbags)
//     ├── carries_laptop = lb-1 (Backpacks) or lb-4 (Cases)
//     ├── travel_size = lb-2 (Luggage)
//     └── fashion_carry = aa-5-4 (Handbags)
  
//   ═══════════════════════════════════════════════════════════════
//   SEO OPTIMIZATION RULES BY CATEGORY
//   ═══════════════════════════════════════════════════════════════
  
//   APPAREL & ACCESSORIES:
//   Title: "[Brand] [Type] [Color] | [Gender] [Category]"
//   Desc: "Shop [brand] [product] in [color]. [Material], [feature]. Perfect for [use case]. [CTA]"
//   Handle: "brand-type-color-gender" or "type-color-feature"
  
//   ELECTRONICS:
//   Title: "[Brand] [Model] [Key Spec] | [Category]"
//   Desc: "[Brand] [model] features [spec 1], [spec 2]. Ideal for [use case]. [Warranty/CTA]"
//   Handle: "brand-model-spec" or "product-type-brand"
  
//   HOME & GARDEN:
//   Title: "[Style] [Product] [Material] | [Room/Use]"
//   Desc: "Beautiful [product] in [material]. [Dimension], [feature]. Perfect for [room]. [CTA]"
//   Handle: "style-product-material-room"
  
//   FOOD & BEVERAGES:
//   Title: "[Brand] [Product] [Size/Flavor] | [Category]"
//   Desc: "Premium [product] by [brand]. [Origin/quality], [taste profile]. [Usage suggestion]. [CTA]"
//   Handle: "brand-product-size-flavor"
  
//   HEALTH & BEAUTY:
//   Title: "[Brand] [Product] [Benefit] | [Skin/Hair Type]"
//   Desc: "[Brand] [product] for [benefit]. [Key ingredient], [result]. [Size]. [CTA]"
//   Handle: "brand-product-benefit-type"
  
//   ═══════════════════════════════════════════════════════════════
//   EXAMPLES BY VERTICAL
//   ═══════════════════════════════════════════════════════════════
  
//   EXAMPLE 1 - Apparel (Puffer Jacket):
//   {
//     "id": "gid://shopify/Product/10456985305429",
//     "seoTitle": "Beige Quilted Puffer Jacket | Kids Winter Coat",
//     "seoDescription": "Shop kids' beige puffer jacket with hood. Warm quilted padding, water-resistant. Perfect for winter adventures. Free shipping available!",
//     "handle": "kids-puffer-jacket-beige-hood",
//     "category": "gid://shopify/TaxonomyCategory/aa-1-10-2",
//     "productType": "Coats & Jackets",
//     "attributes": {"color": "beige", "material": "polyester", "targetGender": "unisex kids", "size": null}
//   }
  
//   EXAMPLE 2 - Electronics (Wireless Headphones):
//   {
//     "id": "gid://shopify/Product/20456985305430",
//     "seoTitle": "Sony WH-1000XM5 Noise Canceling | Wireless Headphones",
//     "seoDescription": "Sony WH-1000XM5 wireless headphones with industry-leading noise canceling. 30-hour battery, premium sound. Free shipping!",
//     "handle": "sony-wh1000xm5-noise-canceling-headphones",
//     "category": "gid://shopify/TaxonomyCategory/el-3-2-1",
//     "productType": "Over-Ear Headphones",
//     "attributes": {"color": "black", "material": null, "targetGender": "unisex", "size": null}
//   }
  
//   EXAMPLE 3 - Home (Sofa):
//   {
//     "id": "gid://shopify/Product/30456985305431",
//     "seoTitle": "Modern Velvet Sofa 3-Seater | Navy Blue Couch",
//     "seoDescription": "Elegant navy blue velvet sofa with 3 seats. Mid-century modern design, solid wood legs. Perfect for living rooms. Shop now!",
//     "handle": "modern-velvet-sofa-3-seater-navy",
//     "category": "gid://shopify/TaxonomyCategory/hg-1-2-1",
//     "productType": "Sofas & Couches",
//     "attributes": {"color": "navy blue", "material": "velvet", "targetGender": null, "size": "3-seater"}
//   }
  
//   EXAMPLE 4 - Food (Coffee):
//   {
//     "id": "gid://shopify/Product/40456985305432",
//     "seoTitle": "Lavazza Super Crema 1kg | Whole Bean Coffee",
//     "seoDescription": "Premium Lavazza Super Crema whole bean coffee, 1kg bag. Rich crema, medium roast, Italian blend. Perfect for espresso. Buy now!",
//     "handle": "lavazza-super-crema-1kg-whole-bean",
//     "category": "gid://shopify/TaxonomyCategory/fb-2-1-1",
//     "productType": "Whole Bean Coffee",
//     "attributes": {"color": null, "material": null, "targetGender": null, "size": "1kg"}
//   }
  
//   ═══════════════════════════════════════════════════════════════
//   INPUT DATA
//   ═══════════════════════════════════════════════════════════════
  
//   ${JSON.stringify(chunk, null, 2)}
  
//   ═══════════════════════════════════════════════════════════════
//   CRITICAL RULES
//   ═══════════════════════════════════════════════════════════════
  
//   1. Use EXACT Shopify category IDs (gid://shopify/TaxonomyCategory/xx-x-x-x)
//   2. ProductType must be the LEAF node name from taxonomy (e.g., "Over-Ear Headphones" not "Audio")
//   3. Analyze images FIRST - visual signals override text if conflicting
//   4. Extract attributes: color, material, targetGender, size when visible/mentioned
//   5. Character limits: Title 50-60, Description 150-160 (strict)
//   6. Handle format: lowercase, hyphens, no special characters, 3-6 words
//   7. Include brand in title if provided in input
//   8. Return ONLY valid JSON array - no markdown, no explanations
//   9. If uncertain between categories, choose the more specific leaf node
//   10. Array length must equal input count: ${chunk.length}
  
//   BEGIN PROCESSING:`;
//   }

// function buildSEOPrompt(
//     chunk: { 
//       id: string; 
//       title: string; 
//       description: string; 
//       handle?: string; 
//       vendor?: string;
//       image?: string;
//       productType?: string;
//       tags?: string[];
//       price?: number;
//     }[]
//   ): string {
//     return `You are a Multi-Platform SEO API specializing in Shopify Standard Product Taxonomy (2026-02) with optimization for Google Search, Brave Search, Facebook Shop, TikTok Shop, and Pinterest.
  
//   STRICT OUTPUT FORMAT - JSON Array Only:
//   [{
//     "id": "gid://shopify/Product/xxxxx",
//     "seoTitle": "50-60 chars, keyword-first, emotional trigger",
//     "seoDescription": "150-160 chars, benefit-driven, urgency/CTA",
//     "handle": "seo-friendly-url-slug",
//     "category": {
//       "id": "gid://shopify/TaxonomyCategory/xx-x-x-x",
//       "name": "Human-readable category name",
//       "breadcrumb": "Parent > Child > Leaf"
//     },
//     "productType": "Specific leaf node name",
//     "attributes": {
//       "color": "extracted or null",
//       "material": "extracted or null",
//       "targetGender": "extracted or null",
//       "size": "extracted or null",
//       "pattern": "extracted or null"
//     },
//     "socialOptimization": {
//       "facebookTitle": "80-100 chars, engagement focused",
//       "facebookDescription": "200-300 chars, social proof, emojis allowed",
//       "tiktokTitle": "100-150 chars, hashtag-friendly, trend-aware",
//       "pinterestTitle": "100-500 chars, descriptive, keyword-rich",
//       "pinterestDescription": "500 chars max, SEO keywords, call to action"
//     },
//     "schemaOrg": {
//       "@type": "Product",
//       "name": "Product name",
//       "description": "SEO description",
//       "brand": "Brand name",
//       "offers": {
//         "@type": "Offer",
//         "priceCurrency": "EUR",
//         "availability": "https://schema.org/InStock"
//       }
//     }
//   }]
  
//   ═══════════════════════════════════════════════════════════════
//   MULTI-PLATFORM SEO STRATEGY (2025 Standards)
//   ═══════════════════════════════════════════════════════════════
  
//   GOOGLE SEARCH (Primary - 90% traffic):
//   • Title: 50-60 chars, primary keyword FIRST, year/modifier [2025]
//   • Description: 150-160 chars, emotional trigger, clear CTA
//   • Focus: Search intent matching, featured snippets, rich results
//   • Keywords: Front-load in first 40 characters [^11^]
  
//   BRAVE SEARCH (Privacy-focused, <1% but growing):
//   • Title: Same as Google (independent index, no personalization)
//   • Description: Fact-focused, less promotional, privacy-conscious tone
//   • Focus: Independent indexing, diverse viewpoints, no tracking
//   • Note: Brave doesn't personalize results - same query = same result [^10^]
  
//   FACEBOOK SHOP (Social commerce):
//   • Title: 80-100 chars, social proof, emotional connection
//   • Description: 200-300 chars, lifestyle focus, benefits over features
//   • Focus: Shareability, engagement, social validation
//   • Use: Emojis, urgency ("Limited time"), community language
  
//   TIKTOK SHOP (Video-commerce):
//   • Title: 100-150 chars, hashtag-friendly, trend-jacking
//   • Description: Short, punchy, video-context aware
//   • Focus: Virality potential, Gen Z language, "TikTok made me buy it"
//   • Use: Trending sounds, challenges, duet-friendly descriptions
  
//   PINTEREST (Visual search engine):
//   • Title: 100-500 chars, highly descriptive, keyword-stuffed naturally
//   • Description: 500 chars max, solution-oriented, DIY/inspiration focus
//   • Focus: Visual discovery, Rich Pins, long-tail keywords
//   • Use: Seasonal keywords, style descriptors, room/occasion context [^16^]
  
//   ═══════════════════════════════════════════════════════════════
//   UNIVERSAL TAXONOMY (All 12 Verticals with Names)
//   ═══════════════════════════════════════════════════════════════
  
//   1. APPAREL & ACCESSORIES (aa)
//      ├── Clothing (aa-1)
//      │   ├── aa-1-13: Tops (Shirts, T-Shirts, Sweaters, Hoodies)
//      │   ├── aa-1-14: Bottoms (Pants, Jeans, Shorts, Skirts)
//      │   ├── aa-1-10: Outerwear (Coats, Jackets, Vests)
//      │   ├── aa-1-15: Dresses (Casual, Formal, Maxi)
//      │   └── aa-1-1: Activewear (Sports clothing)
//      ├── Shoes (aa-8)
//      │   ├── aa-8-8: Sneakers (Running, Casual, Fashion)
//      │   ├── aa-8-3: Boots (Ankle, Knee-high, Winter)
//      │   ├── aa-8-6: Sandals (Flat, Heeled, Slides)
//      │   └── aa-8-9: Flats (Ballet, Loafers, Slip-ons)
//      └── Accessories
//          ├── aa-5: Handbags (Totes, Clutches, Crossbody)
//          ├── aa-4: Jewelry (Necklaces, Rings, Earrings)
//          └── aa-2: Belts (Casual, Formal, Utility)
  
//   2. ARTS & ENTERTAINMENT (ae)
//      ├── ae-2-1: Arts & Crafts (Painting, Drawing, Sewing)
//      ├── ae-2-2: Musical Instruments (Guitars, Pianos, Drums)
//      └── ae-2-3: Collectibles (Coins, Cards, Comics)
  
//   3. BABY & TODDLER (bt)
//      ├── bt-1: Baby Clothing (Bodysuits, Sleepwear)
//      ├── bt-2: Baby Care (Diapers, Bathing, Health)
//      └── bt-4: Nursery Furniture (Cribs, Changing tables)
  
//   4. BUSINESS & INDUSTRIAL (bi)
//      ├── bi-2: Construction (Tools, Safety equipment)
//      └── bi-4: Office Supplies (Furniture, Stationery)
  
//   5. ELECTRONICS (el)
//      ├── el-1: Computers (Laptops, Desktops, Components)
//      ├── el-2: Communication (Smartphones, Accessories)
//      ├── el-3: Audio (Headphones, Speakers, Earbuds)
//      ├── el-4: Video (Cameras, TVs, Projectors)
//      └── el-5: Gaming (Consoles, Controllers, PC gaming)
  
//   6. FOOD, BEVERAGES & TOBACCO (fb)
//      ├── fb-1: Food Items (Snacks, Fresh, Frozen)
//      ├── fb-2: Beverages (Coffee, Tea, Soft drinks)
//      └── fb-4: Cooking Ingredients (Spices, Oils, Sauces)
  
//   7. HEALTH & BEAUTY (hb)
//      ├── hb-1: Personal Care (Skincare, Haircare)
//      ├── hb-2: Cosmetics (Makeup, Nail care)
//      └── hb-3: Health Care (Devices, Supplements)
  
//   8. HOME & GARDEN (hg)
//      ├── hg-1: Furniture (Sofas, Beds, Storage)
//      ├── hg-2: Kitchen (Appliances, Cookware)
//      ├── hg-3: Decor (Lighting, Rugs, Art)
//      └── hg-4: Garden (Plants, Tools, Outdoor)
  
//   9. LUGGAGE & BAGS (lb)
//      ├── lb-1: Backpacks (Laptop, Hiking, School)
//      ├── lb-2: Luggage (Suitcases, Carry-ons)
//      └── lb-3: Handbags (Totes, Crossbody, Clutches)
  
//   10. SPORTING GOODS (sg)
//       ├── sg-1: Exercise & Fitness (Equipment, Apparel)
//       ├── sg-2: Outdoor Recreation (Camping, Hiking)
//       └── sg-4: Winter Sports (Skiing, Snowboarding)
  
//   11. TOYS & GAMES (tg)
//       ├── tg-1: Toys (Action figures, Dolls, Educational)
//       └── tg-2: Games (Board games, Puzzles)
  
//   12. VEHICLES & PARTS (vp)
//       ├── vp-1: Cars & Trucks (Parts, Accessories)
//       └── vp-2: Motorcycles (Bikes, Gear)
  
//   ═══════════════════════════════════════════════════════════════
//   INTELLIGENT CATEGORIZATION ENGINE
//   ═══════════════════════════════════════════════════════════════
  
//   VISUAL ANALYSIS HIERARCHY:
//   1. Detect primary object category (clothing, electronics, furniture, food)
//   2. Identify subcategory by features (sleeves=top, screen=electronics, legs=bottom)
//   3. Determine specific type (hood=puffer jacket, laces=sneakers, keyboard=laptop)
//   4. Extract attributes (color, material, size, pattern from image)
  
//   TEXT ANALYSIS BACKUP:
//   - Parse title for brand + product type
//   - Extract material mentions (leather, cotton, aluminum)
//   - Identify gender indicators (men, women, kids, unisex)
//   - Detect size specifications (S, M, L, XL, numeric)
  
//   CATEGORY SELECTION LOGIC:
//   IF multiple matches → Choose most specific leaf node
//   IF conflict between image and text → Image takes priority
//   IF uncertain → Default to broader category with specific productType
  
//   ═══════════════════════════════════════════════════════════════
//   PLATFORM-SPECIFIC OPTIMIZATION RULES
//   ═══════════════════════════════════════════════════════════════
  
//   GOOGLE/Brave (Search Engines):
//   Title Formula: [Primary Keyword] + [Benefit/Feature] + [Brand] + [Year/Modifier]
//   Example: "Waterproof Hiking Boots Men | Timberland 2025 | All Terrain"
  
//   Description Formula: [Problem] + [Solution] + [Key Features] + [Social Proof] + [CTA]
//   Example: "Conquer any trail with Timberland waterproof hiking boots. Premium leather, anti-fatigue sole, 100% waterproof. Rated 4.8/5 by 2,000+ hikers. Shop now with free shipping!"
  
//   FACEBOOK (Social):
//   Title: "🔥 [Product] - [Benefit] | [Social Proof]"
//   Description: "Love this [product]! ❤️ [Benefit 1], [Benefit 2]. Perfect for [use case]. Tag a friend who needs this! 👇 [CTA]"
  
//   TIKTOK (Video):
//   Title: "[Trending hashtag] [Product] that [benefit] ✨ #[category] #[viral]"
//   Description: "POV: You finally found the [product] that [solves problem] 😍 Link in bio! #TikTokMadeMeBuyIt #[brand]"
  
//   PINTEREST (Visual Discovery):
//   Title: "[Style] [Product] for [Occasion/Room] | [Color] [Material] [Feature]"
//   Description: "Looking for [solution]? This [product] is perfect for [use case]! [Feature 1], [Feature 2], [Feature 3]. Save this for later! #[category] #[style] #[room]"
  
//   ═══════════════════════════════════════════════════════════════
//   EXAMPLES BY PLATFORM & VERTICAL
//   ═══════════════════════════════════════════════════════════════
  
//   EXAMPLE 1 - Apparel (Sneakers):
//   {
//     "id": "gid://shopify/Product/12345",
//     "seoTitle": "Nike Air Max 270 Black | Men's Running Shoes 2025",
//     "seoDescription": "Experience ultimate comfort with Nike Air Max 270. Black mesh upper, 270° air unit, lightweight design. Perfect for running or street style. Free returns!",
//     "handle": "nike-air-max-270-black-mens",
//     "category": {
//       "id": "gid://shopify/TaxonomyCategory/aa-8-8",
//       "name": "Sneakers",
//       "breadcrumb": "Apparel & Accessories > Shoes > Sneakers"
//     },
//     "productType": "Running Shoes",
//     "attributes": {"color": "black", "material": "mesh", "targetGender": "men", "size": null},
//     "socialOptimization": {
//       "facebookTitle": "🔥 Nike Air Max 270 - Ultimate Comfort | 50K+ Sold",
//       "facebookDescription": "Walk on air! ☁️ The Nike Air Max 270 features the biggest Air unit yet. Perfect for workouts or weekends. Tag your workout buddy! 👟💪",
//       "tiktokTitle": "These Nike Air Max 270s hit different 😤 #SneakerTok #Nike #AirMax",
//       "pinterestTitle": "Black Nike Air Max 270 Running Shoes for Men | Street Style Sneakers",
//       "pinterestDescription": "Upgrade your sneaker game with Nike Air Max 270! All-black design, maximum cushioning, perfect for running or casual wear. Men's sizes available. #Nike #Sneakers #MensFashion #RunningShoes"
//     }
//   }
  
//   EXAMPLE 2 - Electronics (Headphones):
//   {
//     "id": "gid://shopify/Product/67890",
//     "seoTitle": "Sony WH-1000XM5 Noise Canceling | Wireless Headphones",
//     "seoDescription": "Industry-leading noise canceling with Sony WH-1000XM5. 30hr battery, crystal clear calls, premium comfort. Perfect for travel & work. Shop now!",
//     "handle": "sony-wh1000xm5-noise-canceling-headphones",
//     "category": {
//       "id": "gid://shopify/TaxonomyCategory/el-3-2-1",
//       "name": "Over-Ear Headphones",
//       "breadcrumb": "Electronics > Audio > Headphones > Over-Ear"
//     },
//     "productType": "Noise Canceling Headphones",
//     "attributes": {"color": "silver", "material": null, "targetGender": "unisex", "size": null},
//     "socialOptimization": {
//       "facebookTitle": "🎧 Sony WH-1000XM5 - Silence the World | 30Hr Battery",
//       "facebookDescription": "Block out the noise, tune into the music 🎵 Sony's best noise-canceling headphones yet. 30 hours of pure bliss. Who needs these for their commute? 🚆",
//       "tiktokTitle": "The silence is INSANE 🤯 Sony WH-1000XM5 review #TechTok #Headphones",
//       "pinterestTitle": "Sony WH-1000XM5 Wireless Noise Canceling Headphones | Travel Essential",
//       "pinterestDescription": "The ultimate travel companion! Sony WH-1000XM5 features industry-leading noise canceling, 30-hour battery life, and premium comfort. Perfect for flights, work, or relaxation. #Sony #Headphones #TravelEssentials #NoiseCanceling"
//     }
//   }
  
//   EXAMPLE 3 - Home (Sofa):
//   {
//     "id": "gid://shopify/Product/11111",
//     "seoTitle": "Velvet Sectional Sofa Grey | Modern Living Room 2025",
//     "seoDescription": "Transform your living room with this grey velvet sectional. Mid-century modern design, solid wood legs, stain-resistant fabric. Seats 4 comfortably. Shop now!",
//     "handle": "velvet-sectional-sofa-grey-modern",
//     "category": {
//       "id": "gid://shopify/TaxonomyCategory/hg-1-2-1",
//       "name": "Sofas & Couches",
//       "breadcrumb": "Home & Garden > Furniture > Living Room > Sofas"
//     },
//     "productType": "Sectional Sofa",
//     "attributes": {"color": "grey", "material": "velvet", "targetGender": null, "size": "3-seater"},
//     "socialOptimization": {
//       "facebookTitle": "✨ Grey Velvet Sectional - Modern Luxury | Free Delivery",
//       "facebookDescription": "Your dream living room starts here! 😍 This grey velvet sectional is giving major luxury vibes. Who else is obsessed with velvet furniture? 🙋‍♀️",
//       "tiktokTitle": "The couch that changed my living room 😍 #HomeDecor #Sofa #Velvet",
//       "pinterestTitle": "Grey Velvet Sectional Sofa | Mid-Century Modern Living Room Furniture",
//       "pinterestDescription": "Create the perfect living room with this stunning grey velvet sectional! Mid-century modern style, plush velvet upholstery, solid wood legs. Seats 4 comfortably. #HomeDecor #LivingRoom #SectionalSofa #VelvetFurniture"
//     }
//   }
  
//   ═══════════════════════════════════════════════════════════════
//   INPUT DATA
//   ═══════════════════════════════════════════════════════════════
  
//   ${JSON.stringify(chunk, null, 2)}
  
//   ═══════════════════════════════════════════════════════════════
//   CRITICAL RULES
//   ═══════════════════════════════════════════════════════════════
  
//   1. category.id: EXACT Shopify taxonomy ID (gid://shopify/TaxonomyCategory/xx-x-x-x)
//   2. category.name: Human-readable name (e.g., "Over-Ear Headphones")
//   3. category.breadcrumb: Full path (e.g., "Electronics > Audio > Headphones")
//   4. productType: Leaf node name, specific as possible
//   5. seoTitle: 50-60 chars, keyword first, no emoji
//   6. seoDescription: 150-160 chars, compelling CTA, no emoji
//   7. socialOptimization: Platform-appropriate length and tone
//   8. attributes: Extract from image/text, null if not found
//   9. schemaOrg: Valid structured data for rich snippets
//   10. Return ONLY JSON array - no markdown, no explanations
//   11. Array length must equal input: ${chunk.length}
  
//   BEGIN PROCESSING:`;
//   }


function buildSEOPrompt(
    chunk: { 
      id: string; 
      title: string; 
      description: string; 
      handle?: string; 
      vendor?: string;
      image?: string;
      productType?: string;
      tags?: string[];
      price?: number;
    }[]
  ): string {
    return `You are a Multi-Platform SEO API specializing in Shopify Standard Product Taxonomy (2026-02) with optimization for Google Search, Brave Search, Facebook Shop, TikTok Shop, and Pinterest.
  
  STRICT OUTPUT FORMAT - JSON Array Only:
  [{
    "id": "gid://shopify/Product/xxxxx",
    "seoTitle": "50-60 chars, keyword-first, emotional trigger",
    "seoDescription": "150-160 chars, benefit-driven, urgency/CTA",
    "handle": "seo-friendly-url-slug",
    "category": {
      "id": "gid://shopify/TaxonomyCategory/xx-x-x-x",
      "name": "Human-readable category name",
      "breadcrumb": "Parent > Child > Leaf"
    },
    "productType": "Specific leaf node name",
    "attributes": {
      "color": "extracted or null",
      "material": "extracted or null",
      "targetGender": "extracted or null",
      "size": "extracted or null",
      "pattern": "extracted or null"
    },
    "socialOptimization": {
      "facebookTitle": "80-100 chars, engagement focused",
      "facebookDescription": "200-300 chars, social proof, emojis allowed",
      "tiktokTitle": "100-150 chars, hashtag-friendly, trend-aware",
      "pinterestTitle": "100-500 chars, descriptive, keyword-rich",
      "pinterestDescription": "500 chars max, SEO keywords, call to action"
    },
    "schemaOrg": {
      "@type": "Product",
      "name": "Product name",
      "description": "SEO description",
      "brand": "Brand name",
      "offers": {
        "@type": "Offer",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock"
      }
    }
  }]
  
  ═══════════════════════════════════════════════════════════════
  MULTI-PLATFORM SEO STRATEGY (2025 Standards)
  ═══════════════════════════════════════════════════════════════
  
  GOOGLE SEARCH (Primary - 90% traffic):
  • Title: 50-60 chars, primary keyword FIRST, year/modifier [2025]
  • Description: 150-160 chars, emotional trigger, clear CTA
  • Focus: Search intent matching, featured snippets, rich results
  
  BRAVE SEARCH (Privacy-focused):
  • Title: Same as Google
  • Description: Fact-focused, less promotional
  
  FACEBOOK SHOP (Social commerce):
  • Title: 80-100 chars, social proof, emotional connection
  • Description: 200-300 chars, lifestyle focus, benefits over features
  
  TIKTOK SHOP (Video-commerce):
  • Title: 100-150 chars, hashtag-friendly, trend-jacking
  • Description: Short, punchy, video-context aware
  
  PINTEREST (Visual search engine):
  • Title: 100-500 chars, highly descriptive, keyword-stuffed naturally
  • Description: 500 chars max, solution-oriented, DIY/inspiration focus
  
  ═══════════════════════════════════════════════════════════════
  SHOPIFY TAXONOMY 2026-02 - EXACT CATEGORY MAPPING
  ═══════════════════════════════════════════════════════════════
  
  CRITICAL: Analyze product title, description, AND image to determine the EXACT leaf node category.
  The category.id MUST match Shopify's official taxonomy exactly as shown in the examples below.
  
  FORMAT: gid://shopify/TaxonomyCategory/[vertical]-[level1]-[level2]-[level3]-[level4]
  
  VERTICAL CODES:
  aa = Apparel & Accessories | ae = Arts & Entertainment | bt = Baby & Toddler
  bi = Business & Industrial | el = Electronics | fb = Food, Beverages & Tobacco
  hb = Health & Beauty | hg = Home & Garden | lb = Luggage & Bags
  sg = Sporting Goods | tg = Toys & Games | vp = Vehicles & Parts
  
  ═══════════════════════════════════════════════════════════════
  COMPLETE TAXONOMY REFERENCE (Most Common E-commerce Categories)
  ═══════════════════════════════════════════════════════════════
  
  APPAREL & ACCESSORIES (aa)
  ├── Clothing (aa-1)
  │   ├── Activewear (aa-1-1)
  │   │   ├── aa-1-1-2-3: Tank Tops
  │   │   ├── aa-1-1-8-2: Activewear Jackets
  │   │   └── aa-1-1-8-1: Activewear Vests
  │   ├── Baby & Toddler Clothing (aa-1-2) [2026: Consolidated category]
  │   │   ├── aa-1-2-1: Baby & Toddler Bottoms
  │   │   ├── aa-1-2-4-17: Baby & Toddler Coats & Jackets
  │   │   │   ├── aa-1-2-4-17-1: Bolero Jackets
  │   │   │   ├── aa-1-2-4-17-2: Bomber Jackets
  │   │   │   ├── aa-1-2-4-17-9: Puffer Jackets
  │   │   │   ├── aa-1-2-4-17-10: Rain Coats
  │   │   │   └── aa-1-2-4-17-14: Trucker Jackets
  │   │   └── aa-1-2-4-18: Snow Pants & Suits
  │   ├── Dresses (aa-1-3)
  │   ├── One-Pieces (aa-1-4)
  │   │   ├── aa-1-4-1: Jumpsuits & Rompers
  │   │   └── aa-1-4-2: Overalls
  │   ├── Outerwear (aa-1-10) ← YOUR EXAMPLE: "Cappotti e giacche"
  │   │   ├── aa-1-10-1: Chaps
  │   │   ├── aa-1-10-2: Coats & Jackets ← EXACT MATCH for your screenshot
  │   │   │   ├── aa-1-10-2-1: Bolero Jackets
  │   │   │   ├── aa-1-10-2-2: Bomber Jackets
  │   │   │   ├── aa-1-10-2-3: Capes
  │   │   │   ├── aa-1-10-2-5: Overcoats
  │   │   │   ├── aa-1-10-2-6: Parkas
  │   │   │   ├── aa-1-10-2-7: Pea Coats
  │   │   │   ├── aa-1-10-2-8: Ponchos
  │   │   │   ├── aa-1-10-2-9: Puffer Jackets
  │   │   │   ├── aa-1-10-2-10: Rain Coats
  │   │   │   ├── aa-1-10-2-11: Sport Jackets
  │   │   │   ├── aa-1-10-2-12: Track Jackets
  │   │   │   ├── aa-1-10-2-13: Trench Coats
  │   │   │   ├── aa-1-10-2-14: Trucker Jackets
  │   │   │   ├── aa-1-10-2-15: Varsity Jackets
  │   │   │   ├── aa-1-10-2-16: Windbreakers
  │   │   │   └── aa-1-10-2-17: Wrap Coats
  │   │   ├── aa-1-10-7: Motorcycle Outerwear
  │   │   ├── aa-1-10-3: Rain Pants
  │   │   ├── aa-1-10-4: Rain Suits
  │   │   ├── aa-1-10-5: Snow Pants & Suits
  │   │   └── aa-1-10-6: Vests
  │   ├── Pants (aa-1-12)
  │   │   ├── aa-1-12-2: Cargo Pants
  │   │   ├── aa-1-12-3: Chinos
  │   │   ├── aa-1-12-4: Jeans
  │   │   ├── aa-1-12-5: Jeggings
  │   │   ├── aa-1-12-7: Joggers
  │   │   ├── aa-1-12-8: Leggings
  │   │   └── aa-1-12-11: Trousers
  │   ├── Shorts (aa-1-14)
  │   │   ├── aa-1-14-1: Bermudas
  │   │   ├── aa-1-14-2: Cargo Shorts
  │   │   ├── aa-1-14-3: Chino Shorts
  │   │   ├── aa-1-14-5: Denim Shorts
  │   │   ├── aa-1-14-7: Jogger Shorts
  │   │   └── aa-1-14-9: Shorts
  │   ├── Skirts (aa-1-15)
  │   ├── Sleepwear & Loungewear (aa-1-6)
  │   ├── Suits & Formal Wear (aa-1-7)
  │   ├── Tops (aa-1-10 is Outerwear, see below for Tops)
  │   │   ACTUAL TOPS HIERARCHY:
  │   │   ├── aa-1-9: Blouses (moved from old location)
  │   │   ├── aa-1-13: Shirts (verify in taxonomy)
  │   │   └── CHECK: Tops may be under different codes - analyze image/text carefully
  │   ├── Underwear (aa-1-16, aa-1-17)
  │   └── Uniforms (aa-1-21) [2026: Relocated]
  │       ├── aa-1-21-1: Contractor Pants & Coveralls
  │       ├── aa-1-21-3: Food Service Uniforms
  │       ├── aa-1-21-4: Military Uniforms
  │       ├── aa-1-21-5: School Uniforms
  │       └── aa-1-21-8: White Coats
  │
  ├── Shoes (aa-8)
  │   ├── aa-8-1: Baby & Toddler Shoes
  │   ├── aa-8-2: Athletic Shoes (verify code)
  │   ├── aa-8-3: Boots
  │   │   ├── aa-8-3-1: Ankle Boots
  │   │   ├── aa-8-3-2: Chelsea Boots
  │   │   ├── aa-8-3-3: Combat Boots
  │   │   └── aa-8-3-4: Winter Boots
  │   ├── aa-8-4: Clogs & Mules
  │   ├── aa-8-5: Dress Shoes
  │   ├── aa-8-6: Sandals
  │   │   ├── aa-8-6-1: Flat Sandals
  │   │   ├── aa-8-6-2: Heeled Sandals
  │   │   └── aa-8-6-3: Slide Sandals
  │   ├── aa-8-7: Slippers
  │   ├── aa-8-8: Sneakers
  │   │   ├── aa-8-8-1: Fashion Sneakers
  │   │   ├── aa-8-8-2: Running Shoes (verify code)
  │   │   └── aa-8-8-3: Skate Shoes
  │   └── aa-8-9: Flats
  │
  ├── Clothing Accessories (aa-2)
  │   ├── aa-2-1: Arm Warmers & Sleeves
  │   ├── aa-2-5: Belts
  │   ├── aa-2-6: Gloves & Mittens
  │   ├── aa-2-7: Hair Accessories
  │   ├── aa-2-8: Handkerchiefs
  │   ├── aa-2-9: Hats & Caps
  │   ├── aa-2-10: Scarves & Shawls
  │   └── aa-2-11: Sunglasses
  │
  ├── Jewelry (aa-4)
  │   ├── aa-4-1: Bracelets
  │   ├── aa-4-2: Earrings
  │   ├── aa-4-3: Necklaces
  │   └── aa-4-4: Rings
  │
  ├── Handbags (aa-5)
  │   ├── aa-5-1: Clutches & Evening Bags
  │   ├── aa-5-2: Crossbody Bags
  │   ├── aa-5-3: Tote Bags
  │   └── aa-5-4: Wallets & Card Cases
  │
  └── Watches (aa-7)
      ├── aa-7-1: Analog Watches
      ├── aa-7-2: Digital Watches
      └── aa-7-3: Smartwatches
  
  ELECTRONICS (el)
  ├── Computers (el-1)
  │   ├── el-1-1: Laptops
  │   ├── el-1-2: Desktops
  │   ├── el-1-3: Tablets
  │   ├── el-1-4: Computer Servers
  │   ├── el-1-5: Handheld Devices
  │   └── el-1-7: Computer Components
  ├── Communication (el-2)
  │   ├── el-2-1: Mobile Phones
  │   └── el-2-2: Mobile Phone Accessories
  ├── Audio (el-3)
  │   ├── el-3-1: Audio Accessories
  │   ├── el-3-2: Headphones & Headsets
  │   │   ├── el-3-2-1: Over-Ear Headphones
  │   │   ├── el-3-2-2: Earbud & In-Ear Headphones
  │   │   ├── el-3-2-3: Gaming Headsets [2026]
  │   │   └── el-3-2-4: Aviation Headsets [2026]
  │   └── el-3-3: Speakers
  ├── Video (el-4)
  │   ├── el-4-1: Cameras
  │   ├── el-4-2: TVs & Displays
  │   └── el-4-3: Projectors
  ├── Gaming (el-5)
  │   ├── el-5-1: Video Game Consoles
  │   └── el-5-2: Video Game Accessories
  └── Networking (el-6)
      ├── el-6-1: Bridges & Routers
      └── el-6-2: Modems
  
  HOME & GARDEN (hg)
  ├── Furniture (hg-1)
  │   ├── hg-1-1: Bathroom Furniture
  │   ├── hg-1-2: Living Room Furniture
  │   │   └── hg-1-2-1: Sofas & Couches
  │   ├── hg-1-3: Bedroom Furniture
  │   ├── hg-1-4: Kitchen & Dining Furniture
  │   └── hg-1-5: Office Furniture
  ├── Kitchen & Dining (hg-2)
  │   └── hg-2-1: Kitchen Appliances
  ├── Decor (hg-3)
  │   ├── hg-3-1: Artwork
  │   ├── hg-3-2: Clocks
  │   │   └── hg-3-2-1: Alarm Clocks
  │   ├── hg-3-3: Lamps & Lighting
  │   └── hg-3-4: Rugs
  └── Garden (hg-4)
      ├── hg-4-1: Outdoor Kitchens [2026]
      └── hg-4-2: Plants & Seeds
  
  HEALTH & BEAUTY (hb)
  ├── Personal Care (hb-1)
  │   ├── hb-1-1: Bath & Body
  │   ├── hb-1-2: Hair Care
  │   └── hb-1-3: Skin Care
  ├── Cosmetics (hb-2)
  │   └── hb-2-1: Makeup
  ├── Health Care (hb-3)
  │   ├── hb-3-1: Medical Devices
  │   └── hb-3-2: Vitamins & Supplements
  └── Weight Loss (hb-4) [2026]
  
  SPORTING GOODS (sg)
  ├── Exercise & Fitness (sg-1)
  ├── Outdoor Recreation (sg-2)
  ├── Winter Sports (sg-4)
  │   └── sg-4-17: Skiing & Snowboarding
  │       └── sg-4-17-2: Snowboards
  │           └── sg-4-17-2-17: Snowboards (leaf)
  └── Water Sports (sg-5) [2026 expanded]
      ├── sg-5-1: Boating & Water Sport Protective Gear
      ├── sg-5-2: Canoeing
      ├── sg-5-3: Kayaking
      └── sg-5-4: Windfoiling & Wingfoiling
  
  FOOD, BEVERAGES & TOBACCO (fb)
  ├── Food Items (fb-1)
  ├── Beverages (fb-2)
  │   └── fb-2-1: Coffee [2026: new attributes]
  ├── Cooking Ingredients (fb-4)
  └── Cannabis Products (fb-5) [2026 NEW]
      ├── fb-5-1: Cannabis Seeds
      ├── fb-5-2: Medical Cannabis
      ├── fb-5-3: Recreational Cannabis
      └── fb-5-4: Vaping
  
  VEHICLES & PARTS (vp)
  ├── Cars & Trucks (vp-1)
  │   └── vp-1-1: Motor Vehicle Parts [2026 expanded]
  │       ├── vp-1-1-1: Braking Systems
  │       ├── vp-1-1-2: Cooling Systems
  │       ├── vp-1-1-3: Engine Parts
  │       └── vp-1-1-4: Transmission & Drivetrain
  ├── Motorcycles (vp-2)
  └── Aircraft (vp-3) [2026 NEW]
      ├── vp-3-1: Heavier-Than-Air Aircraft
      └── vp-3-2: Lighter-Than-Air Aircraft
  
  LUGGAGE & BAGS (lb)
  ├── lb-1: Backpacks
  ├── lb-2: Luggage
  └── lb-3: Handbags
  
  TOYS & GAMES (tg)
  ├── tg-1: Toys
  └── tg-2: Games
  
  ARTS & ENTERTAINMENT (ae)
  ├── ae-2: Arts & Crafts
  └── ae-2-2: Musical Instruments
  
  BUSINESS & INDUSTRIAL (bi)
  └── bi-2: Construction
  
  BABY & TODDLER (bt)
  ├── bt-1: Baby Care
  ├── bt-2: Baby Health & Safety
  ├── bt-3: Nursery Furniture
  └── bt-4: Feeding Essentials [2026 relocated]
  
  ═══════════════════════════════════════════════════════════════
  INTELLIGENT CATEGORIZATION ENGINE - EXACT MATCHING
  ═══════════════════════════════════════════════════════════════
  
  STEP 1: Analyze Product Title & Description
  - Extract: Product type, material, gender, brand, function
  - Keywords to category mapping:
    • "Giacca", "Cappotto", "Jacket", "Coat" → aa-1-10-2 (Coats & Jackets)
    • "Piumino", "Puffer", "Down jacket" → aa-1-10-2-9 (Puffer Jackets)
    • "Trench" → aa-1-10-2-13 (Trench Coats)
    • "Bomber" → aa-1-10-2-2 (Bomber Jackets)
    • "Jeans" → aa-1-12-4 (Jeans)
    • "Sneakers", "Scarpe da ginnastica" → aa-8-8 (Sneakers)
    • "Running shoes" → aa-8-8-1 or aa-8-8-2 (Fashion/Running)
    • "Headphones", "Cuffie" → el-3-2 (Headphones & Headsets)
    • "Sofa", "Divano" → hg-1-2-1 (Sofas & Couches)
  
  STEP 2: Analyze Product Image (if provided)
  - Visual features to detect:
    • Sleeves + buttons + collar = Shirt/Top (find exact code)
    • Hood + zipper + puffy = Puffer Jacket (aa-1-10-2-9)
    • Long sleeves + front opening + coat length = Coat (aa-1-10-2)
    • Laces + rubber sole + ankle height = Sneakers (aa-8-8)
    • Cushions + backrest + legs = Sofa (hg-1-2-1)
    • Screen + keyboard = Laptop (el-1-1)
    • Ear cups + headband = Headphones (el-3-2-1 or el-3-2-2)
  
  STEP 3: Determine Exact Category ID
  - Match product to MOST SPECIFIC leaf node possible
  - Examples of correct ID selection:
    • "Nike Air Max" → aa-8-8 (Sneakers) [if no specific running subcategory]
    • "Nike Running Shoes" → aa-8-8-2 (Running Shoes) [if available]
    • "Piumino uomo" → aa-1-10-2-9 (Puffer Jackets)
    • "Giacca bomber" → aa-1-10-2-2 (Bomber Jackets)
    • "Cuffie Bluetooth" → el-3-2-2 (Earbud & In-Ear Headphones) or el-3-2-1 (Over-Ear)
    • "Divano velluto" → hg-1-2-1 (Sofas & Couches)
  
  STEP 4: Build Full Category Object
  - id: EXACT gid://shopify/TaxonomyCategory/xx-x-x-x
  - name: Exact leaf node name from taxonomy
  - breadcrumb: Full path with " > " separators
  
  ═══════════════════════════════════════════════════════════════
  PLATFORM-SPECIFIC OPTIMIZATION RULES
  ═══════════════════════════════════════════════════════════════
  
  GOOGLE/Brave:
  Title: [Primary Keyword] + [Benefit] + [Brand] + [Year]
  Example: "Piumino Uomo Invernale | North Face 2025 | Impermeabile"
  
  Description: [Problem] + [Solution] + [Features] + [CTA]
  Example: "Affronta il freddo con il piumino uomo North Face. Impermeabile, traspirante, caldo fino a -10°C. Spedizione gratuita oggi!"
  
  FACEBOOK:
  Title: "🔥 [Product] - [Benefit] | [Social Proof]"
  Description: "Adora questo [product]! ❤️ [Benefit 1], [Benefit 2]. Perfetto per [use case]. Tagga un amico! 👇"
  
  TIKTOK:
  Title: "[Trend] [Product] che [benefit] ✨ #[category] #[viral]"
  Description: "POV: Hai trovato il [product] che [risolve problema] 😍 Link in bio! #TikTokMadeMeBuyIt"
  
  PINTEREST:
  Title: "[Style] [Product] per [Occasion] | [Color] [Material]"
  Description: "Cerchi [solution]? Questo [product] è perfetto per [use case]! [Feature 1], [Feature 2]. Salva per dopo! #[category]"
  
  ═══════════════════════════════════════════════════════════════
  REAL EXAMPLES WITH VERIFIED CATEGORY IDs
  ═══════════════════════════════════════════════════════════════
  
  EXAMPLE 1 - Men's Puffer Jacket (from your screenshot type):
  Input: "Piumino Uomo Invernale North Face Nero Taglia L"
  {
    "id": "gid://shopify/Product/12345",
    "seoTitle": "Piumino Uomo North Face Nero | Invernale 2025",
    "seoDescription": "Piumino uomo North Face nero, caldo e impermeabile. Ideale per l'inverno, traspirante, taglia L. Spedizione gratuita in 24h!",
    "handle": "piumino-uomo-north-face-nero-invernale",
    "category": {
      "id": "gid://shopify/TaxonomyCategory/aa-1-10-2-9",
      "name": "Puffer Jackets",
      "breadcrumb": "Apparel & Accessories > Clothing > Outerwear > Coats & Jackets > Puffer Jackets"
    },
    "productType": "Puffer Jacket",
    "attributes": {
      "color": "black",
      "material": "nylon",
      "targetGender": "men",
      "size": "L",
      "pattern": "solid"
    },
    "socialOptimization": {
      "facebookTitle": "🔥 Piumino North Face Uomo - Caldo & Stile | Best Seller",
      "facebookDescription": "L'inverno non fa più paura! ❄️ Questo piumino North Face è super caldo e leggero. Chi altro lo vuole? 👇",
      "tiktokTitle": "Il piumino che ti salva dall'inverno 😍 #Piumino #NorthFace #Inverno2025",
      "pinterestTitle": "Piumino Uomo North Face Nero | Giacca Invernale Impermeabile",
      "pinterestDescription": "Piumino uomo North Face nero, perfetto per l'inverno. Impermeabile, traspirante, caldo e stiloso. Ideale per la montagna e la città. #Piumino #NorthFace #ModaUomo #Inverno"
    },
    "schemaOrg": {
      "@type": "Product",
      "name": "Piumino Uomo North Face Nero",
      "description": "Piumino invernale uomo North Face, impermeabile e caldo",
      "brand": "North Face",
      "offers": {
        "@type": "Offer",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock"
      }
    }
  }
  
  EXAMPLE 2 - Women's Trench Coat:
  Input: "Trench Coat Donna Beige Classico Impermeabile"
  {
    "id": "gid://shopify/Product/67890",
    "seoTitle": "Trench Coat Donna Beige | Classico Impermeabile 2025",
    "seoDescription": "Trench coat donna beige, stile classico ed elegante. Impermeabile, fodera rimovibile, cintura in vita. Perfetto per la mezza stagione!",
    "handle": "trench-coat-donna-beige-classico",
    "category": {
      "id": "gid://shopify/TaxonomyCategory/aa-1-10-2-13",
      "name": "Trench Coats",
      "breadcrumb": "Apparel & Accessories > Clothing > Outerwear > Coats & Jackets > Trench Coats"
    },
    "productType": "Trench Coat",
    "attributes": {
      "color": "beige",
      "material": "cotton",
      "targetGender": "women",
      "size": null,
      "pattern": "solid"
    },
    "socialOptimization": {
      "facebookTitle": "✨ Trench Coat Donna - Eleganza Senza Tempo | Nuova Collezione",
      "facebookDescription": "Il trench perfetto per la mezza stagione! 🌧️ Elegante, impermeabile e versatile. Chi ama lo stile classico? 🙋‍♀️",
      "tiktokTitle": "Il trench che ti fa sentire Audrey Hepburn 😍 #TrenchCoat #ModaDonna #Eleganza",
      "pinterestTitle": "Trench Coat Donna Beige Classico | Impermeabile Elegante Mezza Stagione",
      "pinterestDescription": "Trench coat donna beige, stile classico ed elegante. Impermeabile con fodera rimovibile, cintura in vita. Perfetto per outfit da ufficio o casual chic. #TrenchCoat #ModaDonna #Eleganza #MezzaStagione"
    },
    "schemaOrg": {
      "@type": "Product",
      "name": "Trench Coat Donna Beige",
      "description": "Trench coat classico donna beige impermeabile",
      "brand": null,
      "offers": {
        "@type": "Offer",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock"
      }
    }
  }
  
  EXAMPLE 3 - Running Shoes:
  Input: "Scarpe Running Nike Air Zoom Pegasus 40 Uomo"
  {
    "id": "gid://shopify/Product/11111",
    "seoTitle": "Nike Air Zoom Pegasus 40 | Scarpe Running Uomo 2025",
    "seoDescription": "Scarpe running Nike Air Zoom Pegasus 40 uomo. Ammortizzazione reattiva, tomaia traspirante, suola durable. Per corridori di ogni livello!",
    "handle": "nike-air-zoom-pegasus-40-running-uomo",
    "category": {
      "id": "gid://shopify/TaxonomyCategory/aa-8-8",
      "name": "Sneakers",
      "breadcrumb": "Apparel & Accessories > Shoes > Sneakers"
    },
    "productType": "Running Shoes",
    "attributes": {
      "color": null,
      "material": "mesh",
      "targetGender": "men",
      "size": null,
      "pattern": null
    },
    "socialOptimization": {
      "facebookTitle": "🏃‍♂️ Nike Pegasus 40 - Corri Più Lontano | Ammortizzazione Top",
      "facebookDescription": "Le scarpe che ogni corridore sogna! ☁️ Ammortizzazione incredibile e comfort superiore. Tagga il tuo compagno di corsa! 👟",
      "tiktokTitle": "Le scarpe che hanno cambiato la mia corsa 😤 #Running #Nike #Pegasus40",
      "pinterestTitle": "Nike Air Zoom Pegasus 40 Scarpe Running Uomo | Ammortizzazione Reattiva",
      "pinterestDescription": "Scarpe running Nike Air Zoom Pegasus 40 per uomo. Ammortizzazione reattiva Zoom Air, tomaia in mesh traspirante, suola rubber durable. Perfette per training e gare. #Nike #Running #ScarpeSportive #Pegasus40"
    },
    "schemaOrg": {
      "@type": "Product",
      "name": "Nike Air Zoom Pegasus 40",
      "description": "Scarpe running Nike Air Zoom Pegasus 40 uomo",
      "brand": "Nike",
      "offers": {
        "@type": "Offer",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock"
      }
    }
  }
  
  EXAMPLE 4 - Over-Ear Headphones:
  Input: "Cuffie Bluetooth Sony WH-1000XM5 Noise Cancelling"
  {
    "id": "gid://shopify/Product/22222",
    "seoTitle": "Sony WH-1000XM5 Cuffie | Noise Cancelling Wireless",
    "seoDescription": "Cuffie Bluetooth Sony WH-1000XM5 con noise cancelling. 30 ore batteria, audio hi-res, comfort premium. Per viaggi e lavoro. Acquista ora!",
    "handle": "sony-wh1000xm5-cuffie-noise-cancelling",
    "category": {
      "id": "gid://shopify/TaxonomyCategory/el-3-2-1",
      "name": "Over-Ear Headphones",
      "breadcrumb": "Electronics > Audio > Headphones & Headsets > Over-Ear Headphones"
    },
    "productType": "Noise Cancelling Headphones",
    "attributes": {
      "color": null,
      "material": null,
      "targetGender": "unisex",
      "size": null,
      "pattern": null
    },
    "socialOptimization": {
      "facebookTitle": "🎧 Sony WH-1000XM5 - Silenzio Assoluto | 30h Batteria",
      "facebookDescription": "Elimina il rumore, immergiti nella musica 🎵 Le migliori cuffie noise cancelling di Sony. 30 ore di puro relax. Chi le vuole per il viaggio? ✈️",
      "tiktokTitle": "Il silenzio è ASSURDO 🤯 Recensione Sony WH-1000XM5 #TechTok #Cuffie",
      "pinterestTitle": "Sony WH-1000XM5 Cuffie Wireless Noise Cancelling | Essential Viaggio",
      "pinterestDescription": "Il compagno di viaggio definitivo! Cuffie Sony WH-1000XM5 con noise cancelling leader di settore, 30 ore batteria, comfort premium. Perfette per voli, lavoro o relax. #Sony #Cuffie #NoiseCancelling #Tech"
    },
    "schemaOrg": {
      "@type": "Product",
      "name": "Sony WH-1000XM5",
      "description": "Cuffie wireless noise cancelling Sony WH-1000XM5",
      "brand": "Sony",
      "offers": {
        "@type": "Offer",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock"
      }
    }
  }
  
  EXAMPLE 5 - Velvet Sofa:
  Input: "Divano Velluto Grigio 3 Posti Mid-Century Modern"
  {
    "id": "gid://shopify/Product/33333",
    "seoTitle": "Divano Velluto Grigio 3 Posti | Moderno 2025",
    "seoDescription": "Divano in velluto grigio 3 posti, stile mid-century modern. Gambe legno massello, tessuto antimacchia. Per soggiorno elegante. Spedizione gratis!",
    "handle": "divano-velluto-grigio-3-posti-mid-century",
    "category": {
      "id": "gid://shopify/TaxonomyCategory/hg-1-2-1",
      "name": "Sofas & Couches",
      "breadcrumb": "Home & Garden > Furniture > Living Room Furniture > Sofas & Couches"
    },
    "productType": "Sectional Sofa",
    "attributes": {
      "color": "grey",
      "material": "velvet",
      "targetGender": null,
      "size": "3-seater",
      "pattern": null
    },
    "socialOptimization": {
      "facebookTitle": "✨ Divano Velluto Grigio - Lusso Moderno | Consegna Gratis",
      "facebookDescription": "Il soggiorno dei tuoi sogni inizia qui! 😍 Questo divano in velluto grigio è puro lusso. Chi ama il velluto? 🙋‍♀️",
      "tiktokTitle": "Il divano che ha trasformato il mio soggiorno 😍 #HomeDecor #Divano #Velluto",
      "pinterestTitle": "Divano Velluto Grigio 3 Posti | Mobili Soggiorno Mid-Century Modern",
      "pinterestDescription": "Crea il soggiorno perfetto con questo splendido divano in velluto grigio! Stile mid-century modern, rivestimento velluto morbido, gambe legno massello. 3 posti comodi. #HomeDecor #Soggiorno #Divano #Velluto"
    },
    "schemaOrg": {
      "@type": "Product",
      "name": "Divano Velluto Grigio 3 Posti",
      "description": "Divano in velluto grigio 3 posti stile mid-century modern",
      "brand": null,
      "offers": {
        "@type": "Offer",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock"
      }
    }
  }
  
  ═══════════════════════════════════════════════════════════════
  INPUT DATA TO PROCESS
  ═══════════════════════════════════════════════════════════════
  
  ${JSON.stringify(chunk, null, 2)}
  
  ═══════════════════════════════════════════════════════════════
  CRITICAL RULES - MANDATORY COMPLIANCE
  ═══════════════════════════════════════════════════════════════
  
  1. category.id: MUST be exact Shopify GID format: gid://shopify/TaxonomyCategory/[code]
     - Use the MOST SPECIFIC leaf node available (deepest level)
     - Examples from real Shopify:
       • Coats & Jackets: gid://shopify/TaxonomyCategory/aa-1-10-2
       • Puffer Jackets: gid://shopify/TaxonomyCategory/aa-1-10-2-9
       • Trench Coats: gid://shopify/TaxonomyCategory/aa-1-10-2-13
       • Trucker Jackets: gid://shopify/TaxonomyCategory/aa-1-10-2-14
       • Over-Ear Headphones: gid://shopify/TaxonomyCategory/el-3-2-1
       • Snowboards: gid://shopify/TaxonomyCategory/sg-4-17-2-17
  
  2. category.name: Exact leaf node name (e.g., "Puffer Jackets" not just "Jackets")
  
  3. category.breadcrumb: Full path with > separators (e.g., "Apparel & Accessories > Clothing > Outerwear > Coats & Jackets > Puffer Jackets")
  
  4. productType: Should match the specific product type, can be more specific than category.name
  
  5. seoTitle: 50-60 chars, primary keyword first, NO emojis, NO all caps
  
  6. seoDescription: 150-160 chars, compelling CTA, NO emojis
  
  7. socialOptimization: Platform-appropriate with emojis allowed
  
  8. attributes: Extract from input data, use null if not found
  
  9. schemaOrg: Valid JSON-LD structured data
  
  10. Output: Return ONLY valid JSON array - no markdown, no explanations
  
  11. Array length: Must exactly match input: ${chunk.length}
  
  12. Language: Match the input product title/description language (Italian in your example)
  
  13. If image URL provided: Analyze visual features to CONFIRM or REFINE category selection
  
  ═══════════════════════════════════════════════════════════════
  BEGIN PROCESSING:`;
  }
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
        //   const data = await this.client.execute(
        //     query,
        //     { search: searchTerm, first: fetchSize, after: cursor },
        //     `Search-${searchTerm}`
        //   );
        const safeSearch = SearchSanitizer.prepareForSearch(searchTerm);

const data = await this.client.execute(
  query,
  { search: safeSearch, first: fetchSize, after: cursor },
  `Search-${safeSearch}`
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