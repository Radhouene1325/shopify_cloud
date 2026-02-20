// import { GoogleGenerativeAI, GenerativeModel, SchemaType } from "@google/generative-ai";

// interface ProductDescription {
//   id: string;
//   description: string; // Fixed typo from 'descreption'
//   title?: string;
//   category?: string;
//   brand?: string;
//   price?: number;
//   images?: string[];
//   specifications?: Record<string, string>;
//   [key: string]: any;
// }

// interface SizeInfo {
//   label: string;
//   value: string;
//   guidance?: string;
//   notes?: string;
// }

// interface SeoOutput {
//   id: string;
//   shortDescription: string;
//   detailedDescription: string;
//   sizeInfo: SizeInfo[];
//   metaTitle?: string;
//   metaDescription?: string;
//   keywords?: string[];
// }

// interface GenerationConfig {
//   temperature?: number;
//   topP?: number;
//   maxOutputTokens?: number;
// }

// /**
//  * Advanced SEO Content Generator with robust error handling and data validation
//  */
// export class SeoContentGenerator {
//   private model: GenerativeModel;
//   private readonly defaultConfig: GenerationConfig = {
//     temperature: 0.7,
//     topP: 0.9,
//     maxOutputTokens: 8192
//   };

//   constructor(apiKey: string, config: GenerationConfig = {}) {
//     const genAI = new GoogleGenerativeAI(apiKey);
    
//     // Using Gemini 1.5 Flash for optimal speed/quality balance
//     // Note: "gemini-3-flash-preview" doesn't exist - using correct model name
//     this.model = genAI.getGenerativeModel({
//       model: "gemini-3-flash-preview",
//       generationConfig: {
//         responseMimeType: "application/json",
//         ...this.defaultConfig,
//         ...config
//       }
//     });
//   }

//   /**
//    * Main entry point: Process multiple products with enhanced error recovery
//    */
//   async generateBatch(products: ProductDescription[]): Promise<SeoOutput[]> {
//     if (!Array.isArray(products) || products.length === 0) {
//       throw new Error("Invalid input: products must be a non-empty array");
//     }

//     // Validate and sanitize input data
//     const sanitizedProducts = products.map(p => this.sanitizeProduct(p));
    
//     try {
//       // Use structured generation with JSON schema for reliability
//       const result = await this.model.generateContent({
//         contents: [{ role: "user", parts: [{ text: this.buildPrompt(sanitizedProducts) }] }],
//         generationConfig: {
//           responseMimeType: "application/json",
//           responseSchema: this.getResponseSchema(products.length)
//         }
//       });

//       const responseText = result.response.text();
//       return this.parseAndValidateResponse(responseText, products);
      
//     } catch (error) {
//       console.error("Primary generation failed, attempting recovery:", error);
//       return this.fallbackGeneration(sanitizedProducts);
//     }
//   }

//   /**
//    * Build a structured, maintainable prompt with dynamic content
//    */
//   private buildPrompt(products: ProductDescription[]): string {
//     const productContexts = products.map((p, idx) => this.buildProductContext(p, idx + 1)).join('\n\n');
    
//     return `You are an elite E-commerce SEO Architect and Conversion Copywriter specializing in luxury digital experiences.

// ## MISSION
// Transform raw product data into psychologically-optimized, conversion-focused HTML content that ranks and sells.

// ## COLOR PSYCHOLOGY SYSTEM
// Apply these luxury color codes strategically:
// - Primary: #2C3E50 (Trust, Authority) - Headlines, key accents
// - Secondary: #8B7355 (Sophistication) - Subheadings, borders  
// - Accent: #C4A484 (Premium) - CTAs, badges
// - Background: #F9F9F9 (Clean luxury) - Sections
// - Text: #333333 (Readability) - Body copy
// - Highlight: #E8D5C4 (Warmth) - Important info

// ## TYPOGRAPHY HIERARCHY
// - H1: 32-36px, font-family: 'Playfair Display', Georgia, serif, color: #2C3E50
// - H2: 24-28px, font-family: 'Montserrat', sans-serif, color: #8B7355  
// - Body: 16-18px, line-height: 1.6, color: #333333
// - Mobile: Scale down 20-30% using clamp()

// ## RESPONSIVE DESIGN RULES (CRITICAL)
// 1. Mobile-first: All layouts work at 320px+
// 2. Use CSS Grid: grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))
// 3. Tables: Wrap in <div style="overflow-x:auto;"> for mobile scroll
// 4. Images: max-width:100%, height:auto, display:block
// 5. Touch targets: Minimum 44x44px for buttons
// 6. Typography: Use clamp(1rem, 2.5vw, 1.25rem) for fluid scaling
// 7. Spacing: Use clamp(0.5rem, 2vw, 1.5rem) for responsive gaps

// ## CONTENT ARCHITECTURE

// ### SHORT DESCRIPTION (5-6 bullets)
// - Start with ● symbol + bold [CAPITALIZED BENEFIT] in #2C3E50
// - Focus on transformation, not features
// - End with centered CTA button: "✨ ELEVATE YOUR EXPERIENCE ✨"
// - Include trust badges: ⭐ SATISFACTION GUARANTEED

// ### DETAILED DESCRIPTION (Full HTML5 Article)
// Structure:
// 1. <header> - Emotional H1 headline with value proposition
// 2. <section class="hero"> - Lifestyle imagery + aspirational copy
// 3. <section class="features"> - 2-3 column grid of benefit cards
// 4. <section class="specs"> - 4-column responsive table (Spec | Detail | Benefit | Cert)
// 5. <section class="size-guide"> - Only if size data exists, responsive table
// 6. <section class="social-proof"> - Subtle review indicators
// 7. <footer> - Final CTA with gradient background

// ### SIZE INFO EXTRACTION
// If product contains size/dimension data, extract to:
// [{"label": "Chest", "value": "42 inches", "guidance": "Relaxed fit", "notes": "Measure flat"}]

// ## PRODUCTS TO PROCESS (${products.length}):

// ${productContexts}

// ## OUTPUT REQUIREMENTS
// Return valid JSON array. Each object must contain:
// - id: original product ID
// - shortDescription: HTML string (bullet list)
// - detailedDescription: Complete HTML5 article
// - sizeInfo: Array of size objects (empty if none)
// - metaTitle: SEO title under 60 chars
// - metaDescription: Meta description under 160 chars
// - keywords: Array of 5-8 target keywords

// CRITICAL: 
// - Escape all quotes in HTML properly
// - No markdown code blocks, pure JSON only
// - All HTML must be valid and responsive
// - Preserve original image URLs exactly`;
//   }

//   /**
//    * Build detailed context for each product
//    */
//   private buildProductContext(product: ProductDescription, index: number): string {
//     const specs = product.specifications 
//       ? Object.entries(product.specifications).map(([k,v]) => `${k}: ${v}`).join('\n    ')
//       : 'None provided';

//     return `--- PRODUCT ${index} ---
// ID: ${product.id}
// TITLE: ${product.title || 'Not provided'}
// CATEGORY: ${product.category || 'General'}
// BRAND: ${product.brand || 'Premium Brand'}
// PRICE: ${product.price ? '$' + product.price : 'Contact for pricing'}
// DESCRIPTION: ${product.description.substring(0, 500)}${product.description.length > 500 ? '...' : ''}
// IMAGES: ${product.images?.length ? product.images.join(', ') : 'None'}
// SPECIFICATIONS:
//     ${specs}`;
//   }

//   /**
//    * JSON Schema for structured generation (ensures valid output)
//    */
//   private getResponseSchema(count: number) {
//     return {
//       type: SchemaType.ARRAY,
//       items: {
//         type: SchemaType.OBJECT,
//         properties: {
//           id: { type: SchemaType.STRING },
//           shortDescription: { type: SchemaType.STRING },
//           detailedDescription: { type: SchemaType.STRING },
//           sizeInfo: {
//             type: SchemaType.ARRAY,
//             items: {
//               type: SchemaType.OBJECT,
//               properties: {
//                 label: { type: SchemaType.STRING },
//                 value: { type: SchemaType.STRING },
//                 guidance: { type: SchemaType.STRING },
//                 notes: { type: SchemaType.STRING }
//               }
//             }
//           },
//           metaTitle: { type: SchemaType.STRING },
//           metaDescription: { type: SchemaType.STRING },
//           keywords: {
//             type: SchemaType.ARRAY,
//             items: { type: SchemaType.STRING }
//           }
//         },
//         required: ["id", "shortDescription", "detailedDescription", "sizeInfo"]
//       }
//     };
//   }

//   /**
//    * Sanitize product data to prevent prompt injection
//    */
//   private sanitizeProduct(product: any): ProductDescription {
//     return {
//       id: String(product.id || '').replace(/[<>]/g, ''),
//       description: String(product.description || product.descreption || '')
//         .replace(/[<>]/g, '') // Basic XSS prevention
//         .substring(0, 2000), // Limit length
//       title: String(product.title || '').substring(0, 200),
//       category: String(product.category || ''),
//       brand: String(product.brand || ''),
//       price: typeof product.price === 'number' ? product.price : undefined,
//       images: Array.isArray(product.images) ? product.images.slice(0, 10) : [],
//       specifications: product.specifications || {}
//     };
//   }

//   /**
//    * Parse and validate Gemini response with error recovery
//    */
//   private parseAndValidateResponse(responseText: string, originalProducts: ProductDescription[]): SeoOutput[] {
//     let parsed: any;
    
//     try {
//       // Clean common Gemini JSON issues
//       const cleaned = responseText
//         .replace(/```json\s*/g, '')
//         .replace(/```\s*$/g, '')
//         .trim();
      
//       parsed = JSON.parse(cleaned);
//     } catch (e) {
//       console.error("JSON parse error, attempting regex extraction");
//       const jsonMatch = responseText.match(/\[[\s\S]*\]/);
//       if (jsonMatch) {
//         parsed = JSON.parse(jsonMatch[0]);
//       } else {
//         throw new Error("Unable to parse Gemini response as JSON");
//       }
//     }

//     if (!Array.isArray(parsed)) {
//       throw new Error("Response is not an array");
//     }

//     // Validate each item has required fields
//     return parsed.map((item, idx) => ({
//       id: item.id || originalProducts[idx]?.id || `unknown-${idx}`,
//       shortDescription: this.validateHtml(item.shortDescription),
//       detailedDescription: this.validateHtml(item.detailedDescription),
//       sizeInfo: Array.isArray(item.sizeInfo) ? item.sizeInfo : [],
//       metaTitle: item.metaTitle || '',
//       metaDescription: item.metaDescription || '',
//       keywords: Array.isArray(item.keywords) ? item.keywords : []
//     }));
//   }

//   /**
//    * Basic HTML validation and cleanup
//    */
//   private validateHtml(html: string): string {
//     if (!html || typeof html !== 'string') {
//       return '<p>Content generation pending</p>';
//     }
//     // Ensure proper escaping for JSON
//     return html
//       .replace(/\\/g, '\\\\')
//       .replace(/"/g, '\\"')
//       .replace(/\n/g, '\\n');
//   }

//   /**
//    * Fallback generation if primary fails - process one by one
//    */
//   private async fallbackGeneration(products: ProductDescription[]): Promise<SeoOutput[]> {
//     const results: SeoOutput[] = [];
    
//     for (const product of products) {
//       try {
//         const singleResult = await this.model.generateContent({
//           contents: [{ 
//             role: "user", 
//             parts: [{ text: this.buildPrompt([product]) }] 
//           }]
//         });
        
//         const parsed = this.parseAndValidateResponse(singleResult.response.text(), [product]);
//         results.push(parsed[0]);
        
//         // Rate limiting protection
//         await new Promise(r => setTimeout(r, 500));
        
//       } catch (e) {
//         console.error(`Failed to generate for product ${product.id}:`, e);
//         results.push(this.generatePlaceholder(product));
//       }
//     }
    
//     return results;
//   }

//   /**
//    * Generate placeholder content for failed items
//    */
//   private generatePlaceholder(product: ProductDescription): SeoOutput {
//     return {
//       id: product.id,
//       shortDescription: `<ul style="list-style:none;padding:0;"><li style="margin-bottom:12px;"><strong style="color:#2C3E50;">[PREMIUM QUALITY]</strong> ${product.title || 'This product'} features exceptional craftsmanship and attention to detail.</li><li style="text-align:center;margin-top:16px;"><span style="background:#2C3E50;color:white;padding:10px 20px;border-radius:20px;">✨ SHOP NOW ✨</span></li></ul>`,
//       detailedDescription: `<article style="max-width:1200px;margin:0 auto;"><h1 style="color:#2C3E50;">${product.title || 'Premium Product'}</h1><p>${product.description}</p></article>`,
//       sizeInfo: [],
//       metaTitle: product.title || 'Premium Product',
//       metaDescription: product.description.substring(0, 160),
//       keywords: ['premium', 'luxury', 'quality']
//     };
//   }
// }

// // Convenience function for direct usage
// export async function generateSeoHtmlGemini(
//   GEMINI_API_KEY: string, 
//   descriptions: ProductDescription[],
//   config?: GenerationConfig
// ): Promise<SeoOutput[]> {
//   const generator = new SeoContentGenerator(GEMINI_API_KEY, config);
//   console.log('new generatoe is her hello',generator)
//   return generator.generateBatch(descriptions);
// }
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

interface ProductInput {
  id: string;
  description: string;
  title?: string;
  category?: string;
  brand?: string;
  price?: number;
  images?: string[];
  specifications?: Record<string, string>;
  sizes?: Array<{ label: string; value: string; guidance?: string; notes?: string }>;
  [key: string]: any;
}

interface SizeInfo {
  label: string;
  value: string;
  guidance?: string;
  notes?: string;
}

interface SeoOutput {
  id: string;
  shortDescription: string;
  detailedDescription: string;
  sizeInfo: SizeInfo[];
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
}

/**
 * Production-Ready SEO Content Generator
 * Handles complex product data with consistent, high-quality output
 */
export class AdvancedSeoGenerator {
  private model: any;
  private readonly brandColors = {
    primary: "#2C3E50",    // Deep Midnight Blue - Trust, Authority
    secondary: "#8B7355",  // Rich Taupe - Sophistication
    accent: "#C4A484",     // Champagne Gold - Premium CTAs
    background: "#F9F9F9", // Off-white - Clean luxury
    text: "#333333",       // Dark Gray - Readability
    highlight: "#E8D5C4",  // Warm Beige - Highlights
    success: "#27AE60",    // Forest Green - Eco/Quality badges
    urgent: "#C0392B"      // Crimson - Limited offers
  };

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 8192,
        responseMimeType: "application/json"
      }
    });
  }

  /**
   * Process batch with enhanced error handling and data validation
   */
  async generateBatch(products: ProductInput[]): Promise<SeoOutput[]> {
    if (!Array.isArray(products) || products.length === 0) {
      throw new Error("Products must be a non-empty array");
    }

    // Pre-process to extract size information from descriptions
    const enrichedProducts = products.map(p => this.enrichProductData(p));
    
    try {
      const result = await this.model.generateContent({
        contents: [{
          role: "user",
          parts: [{ text: this.buildAdvancedPrompt(enrichedProducts) }]
        }],
        generationConfig: {
          responseSchema: this.getStrictSchema(products.length)
        }
      });

      return this.parseRobustResponse(result.response.text(), enrichedProducts);
      
    } catch (error) {
      console.error("Batch generation failed, falling back to individual processing:", error);
      return this.processIndividually(enrichedProducts);
    }
  }

  /**
   * Extract size information and enrich product data before sending to Gemini
   */
  private enrichProductData(product: ProductInput): ProductInput {
    const enriched = { ...product };
    const desc = product.description || '';
    console.log('desc is her ',desc)
    // Extract size information using regex patterns
    const sizePatterns = [
      /size[:\s]+([\w\s-]+)/gi,
      /(\d{2,3})\s*(cm|mm|inch|inches|")/gi,
      /(eu|us|uk)[\s:]+(\d{2})/gi,
      /(chest|waist|length|sleeve)[:\s]+([\d.]+\s*(cm|inch)?)/gi
    ];

    const extractedSizes: SizeInfo[] = [];
    
    sizePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(desc)) !== null) {
        extractedSizes.push({
          label: match[1]?.trim() || 'Size',
          value: match[2]?.trim() || match[0],
          guidance: 'Standard fit',
          notes: 'See size chart for details'
        });
      }
    });

    // If no sizes found in description, check specifications
    if (extractedSizes.length === 0 && product.specifications) {
      Object.entries(product.specifications).forEach(([key, value]) => {
        if (key.toLowerCase().includes('size') || key.toLowerCase().includes('dimension')) {
          extractedSizes.push({
            label: key,
            value: value,
            guidance: '',
            notes: ''
          });
        }
      });
    }

    enriched.sizes = extractedSizes;
    return enriched;
  }

  /**
   * Build comprehensive prompt with strict structure requirements
   */
  private buildAdvancedPrompt(products: ProductInput[]): string {
    return `You are an elite E-commerce SEO Architect specializing in luxury athletic footwear and apparel.

## BRAND IDENTITY SYSTEM
Colors: ${JSON.stringify(this.brandColors)}

## STRICT OUTPUT REQUIREMENTS

### 1. SHORT DESCRIPTION (HTML String)
Structure:
\`\`\`html
<ul style="list-style:none;padding:0;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;">
  <li style="margin-bottom:12px;padding-left:28px;position:relative;">
    <span style="position:absolute;left:0;color:${this.brandColors.secondary};font-size:18px;">●</span>
    <strong style="color:${this.brandColors.primary};">[BENEFIT CATEGORY]</strong> Emotional benefit-driven description.
  </li>
  <!-- 4-5 bullets total -->
  <li style="margin-top:16px;text-align:center;">
    <span style="background:${this.brandColors.primary};color:white;padding:12px 24px;border-radius:30px;display:inline-block;font-weight:500;letter-spacing:0.5px;font-size:clamp(12px,2vw,14px);">
      ✨ ELEVATE YOUR EXPERIENCE TODAY ✨
    </span>
  </li>
</ul>
\`\`\`

Rules:
- EXACTLY 5 bullets (4 features + 1 CTA)
- Start each feature with ● symbol
- Use [CAPITALIZED CATEGORY] format
- CTA must be centered, pill-shaped, use primary color
- Mobile-responsive font sizes using clamp()

### 2. DETAILED DESCRIPTION (Complete HTML5 Article)
Required Structure:
\`\`\`html
<article style="max-width:1200px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${this.brandColors.text};box-sizing:border-box;padding:0 16px;">
  
  <header style="text-align:center;margin-bottom:clamp(30px,5vw,50px);">
    <h1 style="font-size:clamp(28px,5vw,40px);font-weight:400;font-family:'Playfair Display',Georgia,serif;color:${this.brandColors.primary};border-bottom:3px solid ${this.brandColors.secondary};padding-bottom:15px;display:inline-block;line-height:1.2;">
      [Emotional Headline with Primary Keyword]
    </h1>
    <p style="font-size:clamp(16px,2.5vw,20px);color:#666;max-width:600px;margin:20px auto;line-height:1.6;">
      [Subheadline with value proposition]
    </p>
  </header>

  <section style="margin-bottom:clamp(30px,5vw,50px);">
    <h2 style="font-size:clamp(20px,3vw,26px);color:${this.brandColors.secondary};border-left:4px solid ${this.brandColors.primary};padding-left:15px;margin-bottom:20px;">
      [Section Title]
    </h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:clamp(16px,3vw,30px);">
      <div style="background:${this.brandColors.background};padding:clamp(20px,3vw,30px);border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <h3 style="color:${this.brandColors.primary};margin-top:0;font-size:clamp(18px,2.5vw,22px);">[Feature Title]</h3>
        <p style="line-height:1.6;color:#555;">[Benefit description]</p>
      </div>
      <!-- Repeat for 2-3 features -->
    </div>
  </section>

  <section style="margin-bottom:clamp(30px,5vw,50px);">
    <h2 style="font-size:clamp(20px,3vw,26px);color:${this.brandColors.secondary};margin-bottom:20px;">Technical Specifications</h2>
    <div style="overflow-x:auto;width:100%;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
      <table style="width:100%;border-collapse:collapse;background:white;min-width:600px;">
        <thead style="background:${this.brandColors.highlight};">
          <tr>
            <th style="padding:16px 12px;text-align:left;color:${this.brandColors.primary};font-weight:600;border:1px solid #D4C4B5;font-size:clamp(12px,1.5vw,14px);">Specification</th>
            <th style="padding:16px 12px;text-align:left;color:${this.brandColors.primary};font-weight:600;border:1px solid #D4C4B5;font-size:clamp(12px,1.5vw,14px);">Detail</th>
            <th style="padding:16px 12px;text-align:left;color:${this.brandColors.primary};font-weight:600;border:1px solid #D4C4B5;font-size:clamp(12px,1.5vw,14px);">Benefit</th>
            <th style="padding:16px 12px;text-align:left;color:${this.brandColors.primary};font-weight:600;border:1px solid #D4C4B5;font-size:clamp(12px,1.5vw,14px);">Standard</th>
          </tr>
        </thead>
        <tbody>
          <!-- Alternate row colors: #FFFFFF and #FAFAFC -->
        </tbody>
      </table>
    </div>
  </section>

  ${products.some(p => p.sizes?.length) ? `
  <section style="margin-bottom:clamp(30px,5vw,50px);">
    <h2 style="font-size:clamp(20px,3vw,26px);color:${this.brandColors.secondary};margin-bottom:20px;">Size & Fit Guide</h2>
    <div style="overflow-x:auto;width:100%;border-radius:8px;">
      <table style="width:100%;border-collapse:collapse;background:white;min-width:500px;">
        <thead style="background:${this.brandColors.highlight};">
          <tr>
            <th style="padding:14px 12px;text-align:left;border:1px solid #D4C4B5;color:${this.brandColors.primary};">Size</th>
            <th style="padding:14px 12px;text-align:left;border:1px solid #D4C4B5;color:${this.brandColors.primary};">Measurement</th>
            <th style="padding:14px 12px;text-align:left;border:1px solid #D4C4B5;color:${this.brandColors.primary};">Fit Guidance</th>
            <th style="padding:14px 12px;text-align:left;border:1px solid #D4C4B5;color:${this.brandColors.primary};">Notes</th>
          </tr>
        </thead>
        <tbody>
          <!-- Size rows from provided data -->
        </tbody>
      </table>
    </div>
  </section>
  ` : ''}

  <footer style="text-align:center;margin-top:clamp(40px,6vw,60px);padding:clamp(30px,4vw,50px);background:linear-gradient(135deg,${this.brandColors.background} 0%,#FFFFFF 100%);border-radius:16px;border:1px solid #E0E0E0;">
    <h3 style="color:${this.brandColors.primary};margin-bottom:15px;font-family:'Playfair Display',serif;font-size:clamp(22px,3vw,28px);">Experience the Difference</h3>
    <p style="margin-bottom:25px;color:#666;font-size:clamp(14px,2vw,16px);">Join thousands of satisfied customers who demand excellence.</p>
    <a href="#" style="background:${this.brandColors.accent};color:white;padding:16px 40px;text-decoration:none;border-radius:40px;font-weight:600;letter-spacing:1px;display:inline-block;font-size:clamp(14px,2vw,16px);box-shadow:0 4px 12px rgba(196,164,132,0.3);transition:transform 0.2s;min-height:48px;line-height:1;">DISCOVER LUXURY NOW</a>
  </footer>

</article>
\`\`\`

### 3. SIZE INFO (JSON Array)
Extract ALL size-related data into structured format:
\`\`\`json
[
  {"label": "EU Size", "value": "44", "guidance": "True to size", "notes": "For wide feet, size up"},
  {"label": "US Size", "value": "10", "guidance": "Standard fit", "notes": ""}
]
\`\`\`

### 4. META DATA
- metaTitle: 50-60 chars, include primary keyword + brand
- metaDescription: 150-160 chars, compelling CTA
- keywords: Array of 5-8 relevant search terms

## PRODUCTS TO PROCESS (${products.length}):

${products.map((p, i) => `
--- PRODUCT ${i + 1} ---
ID: ${p.id}
TITLE: ${p.title || 'Untitled Product'}
CATEGORY: ${p.category || 'Athletic Footwear'}
BRAND: ${p.brand || 'Adidas'}
DESCRIPTION: ${p.description?.substring(0, 800) || 'No description'}
SPECS: ${JSON.stringify(p.specifications || {})}
EXTRACTED SIZES: ${JSON.stringify(p.sizes || [])}
IMAGES: ${p.images?.length || 0} images
`).join('\n')}

## CRITICAL RULES:
1. EVERY product must have EXACTLY 5 bullets in shortDescription
2. EVERY detailedDescription must have: header, 2 feature sections, specs table, size section (if sizes exist), footer
3. ALL tables must be wrapped in overflow-x:auto container
4. ALL font sizes must use clamp() for responsiveness
5. Size info must be extracted and returned in sizeInfo array, NOT just in HTML
6. NEVER use [Object] - always expand full values
7. Escape all quotes in HTML properly for JSON
8. Return valid JSON array only - no markdown, no explanations

Generate complete SEO content for all ${products.length} products now.`;
  }

  /**
   * Strict JSON schema for structured generation
   */
  private getStrictSchema(count: number) {
    return {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          shortDescription: { 
            type: SchemaType.STRING,
            description: "HTML bullet list with EXACTLY 5 items including CTA"
          },
          detailedDescription: { 
            type: SchemaType.STRING,
            description: "Complete HTML5 article with all sections"
          },
          sizeInfo: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                label: { type: SchemaType.STRING },
                value: { type: SchemaType.STRING },
                guidance: { type: SchemaType.STRING },
                notes: { type: SchemaType.STRING }
              },
              required: ["label", "value"]
            }
          },
          metaTitle: { 
            type: SchemaType.STRING,
            maxLength: 60
          },
          metaDescription: { 
            type: SchemaType.STRING,
            maxLength: 160
          },
          keywords: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            maxItems: 8
          },
          colorPalette: {
            type: SchemaType.OBJECT,
            properties: {
              primary: { type: SchemaType.STRING },
              secondary: { type: SchemaType.STRING },
              accent: { type: SchemaType.STRING },
              background: { type: SchemaType.STRING },
              text: { type: SchemaType.STRING }
            }
          }
        },
        required: ["id", "shortDescription", "detailedDescription", "sizeInfo", "metaTitle", "metaDescription", "keywords"]
      },
      minItems: count,
      maxItems: count
    };
  }

  /**
   * Robust parsing with multiple fallback strategies
   */
  private parseRobustResponse(text: string, originalProducts: ProductInput[]): SeoOutput[] {
    let cleaned = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*$/g, '')
      .trim();

    // Fix common Gemini JSON errors
    cleaned = cleaned
      .replace(/,\s*]/g, ']') // Remove trailing commas
      .replace(/,\s*}/g, '}') // Remove trailing commas in objects
      .replace(/\n/g, '\\n')  // Escape newlines in HTML
      .replace(/"\s+/g, '"')  // Fix spacing after quotes
      .replace(/\s+"/g, '"'); // Fix spacing before quotes

    try {
      const parsed = JSON.parse(cleaned);
      return this.validateAndEnrich(parsed, originalProducts);
    } catch (e) {
      // Try extracting JSON array from text
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        return this.validateAndEnrich(JSON.parse(match[0]), originalProducts);
      }
      throw new Error("Failed to parse response");
    }
  }

  /**
   * Validate structure and fill missing data
   */
  private validateAndEnrich(parsed: any[], originalProducts: ProductInput[]): SeoOutput[] {
    return parsed.map((item, index) => {
      const original = originalProducts[index];
      
      return {
        id: item.id || original.id,
        shortDescription: this.ensureValidShortDescription(item.shortDescription),
        detailedDescription: this.ensureValidDetailedDescription(item.detailedDescription, original),
        sizeInfo: item.sizeInfo?.length ? item.sizeInfo : (original.sizes || []),
        metaTitle: item.metaTitle || this.generateMetaTitle(original),
        metaDescription: item.metaDescription || this.generateMetaDescription(original),
        keywords: item.keywords || this.generateKeywords(original),
        colorPalette: item.colorPalette || this.brandColors
      };
    });
  }

  private ensureValidShortDescription(html: string): string {
    if (!html || !html.includes('<ul')) {
      return this.generateFallbackShortDescription();
    }
    // Ensure exactly 5 list items
    const liCount = (html.match(/<li/g) || []).length;
    if (liCount < 5) {
      return html.replace('</ul>', `<li style="margin-top:16px;text-align:center;"><span style="background:${this.brandColors.primary};color:white;padding:12px 24px;border-radius:30px;display:inline-block;">✨ SHOP NOW ✨</span></li></ul>`);
    }
    return html;
  }

  private ensureValidDetailedDescription(html: string, product: ProductInput): string {
    if (!html || !html.includes('<article')) {
      return this.generateFallbackDetailedDescription(product);
    }
    return html;
  }

  private generateFallbackShortDescription(): string {
    return `<ul style="list-style:none;padding:0;margin:0;font-family:sans-serif;line-height:1.6;">
      <li style="margin-bottom:12px;padding-left:28px;position:relative;"><span style="position:absolute;left:0;color:${this.brandColors.secondary};">●</span><strong style="color:${this.brandColors.primary};">[PREMIUM QUALITY]</strong> Exceptional craftsmanship and materials.</li>
      <li style="margin-bottom:12px;padding-left:28px;position:relative;"><span style="position:absolute;left:0;color:${this.brandColors.secondary};">●</span><strong style="color:${this.brandColors.primary};">[SUPERIOR COMFORT]</strong> Designed for all-day wearability.</li>
      <li style="margin-bottom:12px;padding-left:28px;position:relative;"><span style="position:absolute;left:0;color:${this.brandColors.secondary};">●</span><strong style="color:${this.brandColors.primary};">[DURABLE DESIGN]</strong> Built to last with premium construction.</li>
      <li style="margin-bottom:12px;padding-left:28px;position:relative;"><span style="position:absolute;left:0;color:${this.brandColors.secondary};">●</span><strong style="color:${this.brandColors.primary};">[VERSATILE STYLE]</strong> Perfect for any occasion.</li>
      <li style="margin-top:16px;text-align:center;"><span style="background:${this.brandColors.primary};color:white;padding:12px 24px;border-radius:30px;display:inline-block;">✨ EXPERIENCE EXCELLENCE TODAY ✨</span></li>
    </ul>`;
  }

  private generateFallbackDetailedDescription(product: ProductInput): string {
    return `<article style="max-width:1200px;margin:0 auto;padding:20px;">
      <h1 style="color:${this.brandColors.primary};">${product.title || 'Premium Product'}</h1>
      <p>${product.description || 'High-quality athletic product'}</p>
    </article>`;
  }

  private generateMetaTitle(product: ProductInput): string {
    const title = product.title || 'Premium Product';
    return `${title} | ${product.brand || 'Adidas'} Official`.substring(0, 60);
  }

  private generateMetaDescription(product: ProductInput): string {
    const desc = product.description || 'High-quality athletic footwear';
    return `Shop ${product.title || 'premium products'}. ${desc.substring(0, 100)} Free shipping available.`.substring(0, 160);
  }

  private generateKeywords(product: ProductInput): string[] {
    return [
      product.brand?.toLowerCase() || 'adidas',
      product.category?.toLowerCase() || 'footwear',
      'premium',
      'athletic',
      'performance',
      'luxury',
      'sports',
      'official'
    ];
  }

  /**
   * Individual processing fallback
   */
  private async processIndividually(products: ProductInput[]): Promise<SeoOutput[]> {
    const results: SeoOutput[] = [];
    
    for (const product of products) {
      try {
        const result = await this.model.generateContent({
          contents: [{
            role: "user",
            parts: [{ text: this.buildAdvancedPrompt([product]) }]
          }]
        });
        
        const parsed = this.parseRobustResponse(result.response.text(), [product]);
        results.push(parsed[0]);
        
        await new Promise(r => setTimeout(r, 300)); // Rate limiting
      } catch (e) {
        results.push({
          id: product.id,
          shortDescription: this.generateFallbackShortDescription(),
          detailedDescription: this.generateFallbackDetailedDescription(product),
          sizeInfo: product.sizes || [],
          metaTitle: this.generateMetaTitle(product),
          metaDescription: this.generateMetaDescription(product),
          keywords: this.generateKeywords(product),
          colorPalette: this.brandColors
        });
      }
    }
    
    return results;
  }
}

// Export convenience function
export async function generateSeoHtmlGemini(
  apiKey: string,
  products: ProductInput[]
): Promise<SeoOutput[]> {
  const generator = new AdvancedSeoGenerator(apiKey);
  return generator.generateBatch(products);
}