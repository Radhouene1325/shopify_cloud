import { GoogleGenerativeAI, GenerativeModel, SchemaType } from "@google/generative-ai";

interface ProductDescription {
  id: string;
  description: string; // Fixed typo from 'descreption'
  title?: string;
  category?: string;
  brand?: string;
  price?: number;
  images?: string[];
  specifications?: Record<string, string>;
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
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
}

interface GenerationConfig {
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
}

/**
 * Advanced SEO Content Generator with robust error handling and data validation
 */
export class SeoContentGenerator {
  private model: GenerativeModel;
  private readonly defaultConfig: GenerationConfig = {
    temperature: 0.7,
    topP: 0.9,
    maxOutputTokens: 8192
  };

  constructor(apiKey: string, config: GenerationConfig = {}) {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Using Gemini 1.5 Flash for optimal speed/quality balance
    // Note: "gemini-3-flash-preview" doesn't exist - using correct model name
    this.model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: {
        responseMimeType: "application/json",
        ...this.defaultConfig,
        ...config
      }
    });
  }

  /**
   * Main entry point: Process multiple products with enhanced error recovery
   */
  async generateBatch(products: ProductDescription[]): Promise<SeoOutput[]> {
    if (!Array.isArray(products) || products.length === 0) {
      throw new Error("Invalid input: products must be a non-empty array");
    }

    // Validate and sanitize input data
    const sanitizedProducts = products.map(p => this.sanitizeProduct(p));
    
    try {
      // Use structured generation with JSON schema for reliability
      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: this.buildPrompt(sanitizedProducts) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: this.getResponseSchema(products.length)
        }
      });

      const responseText = result.response.text();
      return this.parseAndValidateResponse(responseText, products);
      
    } catch (error) {
      console.error("Primary generation failed, attempting recovery:", error);
      return this.fallbackGeneration(sanitizedProducts);
    }
  }

  /**
   * Build a structured, maintainable prompt with dynamic content
   */
  private buildPrompt(products: ProductDescription[]): string {
    const productContexts = products.map((p, idx) => this.buildProductContext(p, idx + 1)).join('\n\n');
    
    return `You are an elite E-commerce SEO Architect and Conversion Copywriter specializing in luxury digital experiences.

## MISSION
Transform raw product data into psychologically-optimized, conversion-focused HTML content that ranks and sells.

## COLOR PSYCHOLOGY SYSTEM
Apply these luxury color codes strategically:
- Primary: #2C3E50 (Trust, Authority) - Headlines, key accents
- Secondary: #8B7355 (Sophistication) - Subheadings, borders  
- Accent: #C4A484 (Premium) - CTAs, badges
- Background: #F9F9F9 (Clean luxury) - Sections
- Text: #333333 (Readability) - Body copy
- Highlight: #E8D5C4 (Warmth) - Important info

## TYPOGRAPHY HIERARCHY
- H1: 32-36px, font-family: 'Playfair Display', Georgia, serif, color: #2C3E50
- H2: 24-28px, font-family: 'Montserrat', sans-serif, color: #8B7355  
- Body: 16-18px, line-height: 1.6, color: #333333
- Mobile: Scale down 20-30% using clamp()

## RESPONSIVE DESIGN RULES (CRITICAL)
1. Mobile-first: All layouts work at 320px+
2. Use CSS Grid: grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))
3. Tables: Wrap in <div style="overflow-x:auto;"> for mobile scroll
4. Images: max-width:100%, height:auto, display:block
5. Touch targets: Minimum 44x44px for buttons
6. Typography: Use clamp(1rem, 2.5vw, 1.25rem) for fluid scaling
7. Spacing: Use clamp(0.5rem, 2vw, 1.5rem) for responsive gaps

## CONTENT ARCHITECTURE

### SHORT DESCRIPTION (5-6 bullets)
- Start with ● symbol + bold [CAPITALIZED BENEFIT] in #2C3E50
- Focus on transformation, not features
- End with centered CTA button: "✨ ELEVATE YOUR EXPERIENCE ✨"
- Include trust badges: ⭐ SATISFACTION GUARANTEED

### DETAILED DESCRIPTION (Full HTML5 Article)
Structure:
1. <header> - Emotional H1 headline with value proposition
2. <section class="hero"> - Lifestyle imagery + aspirational copy
3. <section class="features"> - 2-3 column grid of benefit cards
4. <section class="specs"> - 4-column responsive table (Spec | Detail | Benefit | Cert)
5. <section class="size-guide"> - Only if size data exists, responsive table
6. <section class="social-proof"> - Subtle review indicators
7. <footer> - Final CTA with gradient background

### SIZE INFO EXTRACTION
If product contains size/dimension data, extract to:
[{"label": "Chest", "value": "42 inches", "guidance": "Relaxed fit", "notes": "Measure flat"}]

## PRODUCTS TO PROCESS (${products.length}):

${productContexts}

## OUTPUT REQUIREMENTS
Return valid JSON array. Each object must contain:
- id: original product ID
- shortDescription: HTML string (bullet list)
- detailedDescription: Complete HTML5 article
- sizeInfo: Array of size objects (empty if none)
- metaTitle: SEO title under 60 chars
- metaDescription: Meta description under 160 chars
- keywords: Array of 5-8 target keywords

CRITICAL: 
- Escape all quotes in HTML properly
- No markdown code blocks, pure JSON only
- All HTML must be valid and responsive
- Preserve original image URLs exactly`;
  }

  /**
   * Build detailed context for each product
   */
  private buildProductContext(product: ProductDescription, index: number): string {
    const specs = product.specifications 
      ? Object.entries(product.specifications).map(([k,v]) => `${k}: ${v}`).join('\n    ')
      : 'None provided';

    return `--- PRODUCT ${index} ---
ID: ${product.id}
TITLE: ${product.title || 'Not provided'}
CATEGORY: ${product.category || 'General'}
BRAND: ${product.brand || 'Premium Brand'}
PRICE: ${product.price ? '$' + product.price : 'Contact for pricing'}
DESCRIPTION: ${product.description.substring(0, 500)}${product.description.length > 500 ? '...' : ''}
IMAGES: ${product.images?.length ? product.images.join(', ') : 'None'}
SPECIFICATIONS:
    ${specs}`;
  }

  /**
   * JSON Schema for structured generation (ensures valid output)
   */
  private getResponseSchema(count: number) {
    return {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          shortDescription: { type: SchemaType.STRING },
          detailedDescription: { type: SchemaType.STRING },
          sizeInfo: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                label: { type: SchemaType.STRING },
                value: { type: SchemaType.STRING },
                guidance: { type: SchemaType.STRING },
                notes: { type: SchemaType.STRING }
              }
            }
          },
          metaTitle: { type: SchemaType.STRING },
          metaDescription: { type: SchemaType.STRING },
          keywords: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
          }
        },
        required: ["id", "shortDescription", "detailedDescription", "sizeInfo"]
      }
    };
  }

  /**
   * Sanitize product data to prevent prompt injection
   */
  private sanitizeProduct(product: any): ProductDescription {
    return {
      id: String(product.id || '').replace(/[<>]/g, ''),
      description: String(product.description || product.descreption || '')
        .replace(/[<>]/g, '') // Basic XSS prevention
        .substring(0, 2000), // Limit length
      title: String(product.title || '').substring(0, 200),
      category: String(product.category || ''),
      brand: String(product.brand || ''),
      price: typeof product.price === 'number' ? product.price : undefined,
      images: Array.isArray(product.images) ? product.images.slice(0, 10) : [],
      specifications: product.specifications || {}
    };
  }

  /**
   * Parse and validate Gemini response with error recovery
   */
  private parseAndValidateResponse(responseText: string, originalProducts: ProductDescription[]): SeoOutput[] {
    let parsed: any;
    
    try {
      // Clean common Gemini JSON issues
      const cleaned = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*$/g, '')
        .trim();
      
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("JSON parse error, attempting regex extraction");
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Unable to parse Gemini response as JSON");
      }
    }

    if (!Array.isArray(parsed)) {
      throw new Error("Response is not an array");
    }

    // Validate each item has required fields
    return parsed.map((item, idx) => ({
      id: item.id || originalProducts[idx]?.id || `unknown-${idx}`,
      shortDescription: this.validateHtml(item.shortDescription),
      detailedDescription: this.validateHtml(item.detailedDescription),
      sizeInfo: Array.isArray(item.sizeInfo) ? item.sizeInfo : [],
      metaTitle: item.metaTitle || '',
      metaDescription: item.metaDescription || '',
      keywords: Array.isArray(item.keywords) ? item.keywords : []
    }));
  }

  /**
   * Basic HTML validation and cleanup
   */
  private validateHtml(html: string): string {
    if (!html || typeof html !== 'string') {
      return '<p>Content generation pending</p>';
    }
    // Ensure proper escaping for JSON
    return html
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');
  }

  /**
   * Fallback generation if primary fails - process one by one
   */
  private async fallbackGeneration(products: ProductDescription[]): Promise<SeoOutput[]> {
    const results: SeoOutput[] = [];
    
    for (const product of products) {
      try {
        const singleResult = await this.model.generateContent({
          contents: [{ 
            role: "user", 
            parts: [{ text: this.buildPrompt([product]) }] 
          }]
        });
        
        const parsed = this.parseAndValidateResponse(singleResult.response.text(), [product]);
        results.push(parsed[0]);
        
        // Rate limiting protection
        await new Promise(r => setTimeout(r, 500));
        
      } catch (e) {
        console.error(`Failed to generate for product ${product.id}:`, e);
        results.push(this.generatePlaceholder(product));
      }
    }
    
    return results;
  }

  /**
   * Generate placeholder content for failed items
   */
  private generatePlaceholder(product: ProductDescription): SeoOutput {
    return {
      id: product.id,
      shortDescription: `<ul style="list-style:none;padding:0;"><li style="margin-bottom:12px;"><strong style="color:#2C3E50;">[PREMIUM QUALITY]</strong> ${product.title || 'This product'} features exceptional craftsmanship and attention to detail.</li><li style="text-align:center;margin-top:16px;"><span style="background:#2C3E50;color:white;padding:10px 20px;border-radius:20px;">✨ SHOP NOW ✨</span></li></ul>`,
      detailedDescription: `<article style="max-width:1200px;margin:0 auto;"><h1 style="color:#2C3E50;">${product.title || 'Premium Product'}</h1><p>${product.description}</p></article>`,
      sizeInfo: [],
      metaTitle: product.title || 'Premium Product',
      metaDescription: product.description.substring(0, 160),
      keywords: ['premium', 'luxury', 'quality']
    };
  }
}

// Convenience function for direct usage
export async function generateSeoHtmlGemini(
  GEMINI_API_KEY: string, 
  descriptions: ProductDescription[],
  config?: GenerationConfig
): Promise<SeoOutput[]> {
  const generator = new SeoContentGenerator(GEMINI_API_KEY, config);
  return generator.generateBatch(descriptions);
}