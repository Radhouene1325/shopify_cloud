


import {type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useActionData, Form, useNavigation, useLoaderData, useFetcher, useSubmit } from "@remix-run/react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { shopify } from "../shopify.server";
import { Button } from "@shopify/polaris";
import { useEffect, useState } from "react";
import JSON5 from "json5";
  // sk-c8552ae161ed4db684bb1268bf4ba758
  import { Deepseek } from 'node-deepseek';

  
import  { generateSeoHtmlGemini } from "./functions/parser";
import { productsupdated } from "./functions/query/updateprooductquery";
import { parserData } from "@/parser/parser_data";
  interface DeepSeekResponse {
    choices?: Array<{
      message?: {
        content?: string;
      };
      finish_reason?: string;
    }>;
  }
  interface DESCREPTION{
    descreption:string,
    id:string,
    tags:string[]
  }

  async function sendPrompt(prompt: string, API_KEY_GEMINI: string) {
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY_GEMINI}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [  {
            role: "system",
            content:
              "You are a strict JSON generator. Return ONLY valid JSON. No markdown. No explanation. No code fences. CRITICAL: All quotes inside string values MUST be escaped with backslashes (\\\"). All HTML content must have properly escaped quotes. Ensure the JSON is complete and valid.",
          },{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 8192
        })
      });
      
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('DeepSeek API error:', response.status, errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
  
      const data = await response.json() as DeepSeekResponse;
      const choice = data?.choices?.[0];
      let resulter = choice?.message?.content;
      if (choice?.finish_reason === 'length') {
        throw new Error('Response truncated: Output hit token limit. Try processing fewer products or shortening product descriptions.');
      }
      if (!resulter) {
        throw new Error('No content in API response');
      }
      // Only pass a string to the cleaning function if it's defined
      // let tested = typeof resulter === 'string' ? strongCleanObjectArray([resulter]) : [];
      // console.log("tes the function is ok hello ", tested);
      
      // Clean the response - remove markdown code fences if present
      if (typeof resulter === 'string') {
        // Remove markdown code fences (```json ... ``` or ``` ... ```)
        resulter = resulter.trim();
        resulter = resulter.replace(/^```(?:json)?\s*/i, ''); // Remove opening fence
        resulter = resulter.replace(/\s*```$/i, ''); // Remove closing fence
        resulter = resulter.trim();
      }
      
      // Try multiple parsing strategies
      let parsed: any = null;
      
      // Strategy 1: Try standard JSON.parse
      // try {
      //   parsed = JSON.parse(resulter);
      //   console.log('Successfully parsed with JSON.parse');
      // } catch (jsonError) {
      //   console.warn('JSON.parse failed, trying JSON5:', jsonError);
        
      //   // Strategy 2: Try JSON5 (more lenient parser)
      //   try {
      //     parsed = JSON5.parse(resulter);
      //     console.log('Successfully parsed with JSON5');
      //   } catch (json5Error) {
      //     console.warn('JSON5.parse failed, trying to extract and repair JSON:', json5Error);
          
      //     // Strategy 3: Extract JSON array and try to repair common issues
      //     const jsonMatch = resulter.match(/\[[\s\S]*\]/);
      //     if (jsonMatch) {
      //       let jsonText = jsonMatch[0];
            
      //       // Try to fix common issues: unescaped quotes in HTML strings
      //       // This is a simple fix - replace unescaped quotes inside string values
      //       // Note: This is a heuristic and may not work for all cases
      //       try {
      //         // First try JSON5 on the extracted text
      //         parsed = JSON5.parse(jsonText);
      //         console.log('Successfully parsed extracted JSON with JSON5');
      //       } catch (e) {
      //         console.warn('JSON5 on extracted text failed, trying manual repair:', e);
              
      //         // Try to repair by finding and fixing unescaped quotes in HTML content
      //         // This is a more aggressive approach
      //         try {
      //           let repaired = jsonText;
                
      //           // Strategy: Fix common HTML attribute patterns that break JSON
      //           // Replace single quotes in HTML attributes with escaped double quotes
      //           repaired = repaired.replace(/style='([^']*)'/g, (match, content) => {
      //             return `style="${content.replace(/"/g, '\\"')}"`;
      //           });
                
      //           // Fix other common HTML attribute patterns
      //           repaired = repaired.replace(/(\w+)='([^']*)'/g, (match, attr, content) => {
      //             // Only fix if it's inside a string value (has quotes around)
      //             return `${attr}="${content.replace(/"/g, '\\"')}"`;
      //           });
                
      //           // Try JSON5 again with repaired text
      //           parsed = JSON5.parse(repaired);
      //           console.log('Successfully parsed after manual repair');
      //         } catch (repairError) {
      //           console.error('All parsing strategies failed:', repairError);
      //           console.error('Response length:', resulter.length);
      //           console.error('First 500 chars:', resulter.substring(0, 500));
      //           console.error('Last 500 chars:', resulter.substring(Math.max(0, resulter.length - 500)));
                
      //           // Check if response appears truncated (ends abruptly without closing brackets)
      //           const trimmed = resulter.trim();
      //           const lastChar = trimmed[trimmed.length - 1];
      //           const bracketCount = (trimmed.match(/\[/g) || []).length - (trimmed.match(/\]/g) || []).length;
      //           const braceCount = (trimmed.match(/\{/g) || []).length - (trimmed.match(/\}/g) || []).length;
                
      //           if (lastChar !== ']' && lastChar !== '}' || bracketCount > 0 || braceCount > 0) {
      //             console.warn('Response appears to be truncated. JSON is incomplete.');
      //             throw new Error('Response truncated: JSON is incomplete. Try processing fewer products at once.');
      //           }
                
      //           // Last resort: try to parse just the structure and return partial data
      //           throw new Error(`Failed to parse JSON: ${repairError instanceof Error ? repairError.message : 'Unknown error'}`);
      //         }
      //       }
      //     } else {
      //       throw new Error('Could not find JSON array in response');
      //     }
      //   }
      // }
      const res=parserData(resulter,parsed,JSON5)
      parsed=res
      // Ensure it's an array
      if (Array.isArray(parsed)) {
        console.log(`Successfully parsed ${parsed.length} items`);
        return parsed;
      } else if (parsed && typeof parsed === 'object') {
        // If it's an object, wrap it in an array
        console.log('Wrapped single object in array');
        return [parsed];
      } else {
        throw new Error('Parsed result is not a valid object or array');
      }
          
   
      
    } catch (error) {
      console.error('Error calling DeepSeek:', error);
      throw error;
    }
  }
  // async function sendPrompt(prompt: string,deepseek:any) {
  //   try {
  //     const response = await deepseek.chat.createCompletion({
  //       messages: [{ role: 'user', content: prompt }],
  //       model: 'deepseek-chat',
  //       temperature:0.7,
  //       max_tokens:4000
  //     });
  //     return response.choices;
  //   } catch (error) {
  //     console.error('Error:', error);
  //     throw error;
  //   }
  // }

// 1. Logic to call Gemini
export  async function generateSeoHtml(updatedDescreptionAI:any,API_KEY_GEMINI:string) {
  // ⚠️ WARNING: Use process.env.GEMINI_KEY in production!
  // const genAI = new GoogleGenerativeAI(API_KEY_GEMINI);
  // const model = genAI.getGenerativeModel({ model:"gemini-3-flash-preview",generationConfig: {
  //   responseMimeType: "application/json",
  // }});
  // Process products in batches to avoid token limit truncation
  // DeepSeek-chat has max 8192 output tokens; shortDescription + detailedDescription together can exceed this.
  // Split into two API calls per chunk: one for shortDescription, one for detailedDescription.
  const BATCH_SIZE = 1;
  const allResults: any[] = [];

  function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  const chunks = chunkArray(updatedDescreptionAI, BATCH_SIZE);

  console.log(`Total chunks to process: ${chunks.length}`);

  //Build prompt for a specific output field to stay under DeepSeek's 8K output token limit
  // function buildPrompt(
  //   chunk: { id: string; descreption: string }[],
  //   outputField: 'shortDescription' | 'detailedDescription'
  // ): string {
  //   const isShort = outputField === 'shortDescription';
  //   const fieldLabel = isShort ? 'shortDescription (bullet points only)' : 'detailedDescription (full article only)';
  //   const outputStructure = isShort
  //     ? '{ "id": "original_product_id", "shortDescription": "PROFESSIONAL_HTML_STRING" }'
  //     : '{ "id": "original_product_id", "detailedDescription": "COMPLETE_HTML5_ARTICLE" }';

  //   return `You are a JSON API. Process ALL ${chunk.length} products and return a JSON array with ONLY ${fieldLabel}.

  //   PROMPT TEMPLATE FOR EACH PRODUCT:
  //   {
  //     "role": "Senior E-commerce SEO Specialist & UX Copywriter with expertise in luxury branding and color psychology",
  //     "objective": "Transform raw technical data into a visually stunning, high-converting Amazon listing that uses professional HTML structure and strategic color psychology to drive emotional engagement and sales.",
  //     "outputFormat": {
  //       ${isShort
  //         ? '"shortDescription": "PROFESSIONAL_HTML_STRING (SEO-Optimized Bullet Points with strategic color accents)"'
  //         : '"detailedDescription": "PROFESSIONAL_HTML_STRING (A+ Content with complete HTML5 structure, color psychology, and responsive design)"'
  //       }
  //     },
  //     "stylingGuidelines": {
  //       "tone": "Luxury, sophisticated, authoritative, yet emotionally resonant.",
  //       "colorPalette": {
  //         "primary": "#2C3E50", "secondary": "#8B7355", "accent": "#C4A484",
  //         "background": "#F9F9F9", "text": "#333333", "highlight": "#E8D5C4",
  //         "tableHeader": "#F0E9E2", "tableBorder": "#D4C4B5"
  //       }
  //     },
  //     ${isShort
  //       ? '"constraints": ["5-6 Bullets maximum.", "Start each bullet with bolded [BENEFIT].", "Use subtle emoji (●, ▶) before each bullet.", "End with CTA."]'
  //       : '"constraints": ["Use <h1>, <h2>, <section>.", "Convert specs into styled <table>.", "Preserve ALL <img> tags. Limit to 3-4 sections to stay concise."]'
  //     }
  //   }

  //   DATA TO PROCESS:
  //   ${JSON.stringify(chunk.map(p => ({ id: p.id, content: p.descreption })))}

  //   Return a JSON array with EXACTLY ${chunk.length} objects. Each object: ${outputStructure}
  //   CRITICAL: All quotes in strings MUST be escaped (\\"). Return ONLY the JSON array, no markdown.`;
  // }

  // function buildPrompt(
  //   chunk: { id: string; descreption: string }[],
  //   outputField: 'shortDescription' | 'detailedDescription'
  // ): string {
  //   const isShort = outputField === 'shortDescription';
  //   const fieldLabel = isShort
  //     ? 'shortDescription (bullet points only)'
  //     : 'detailedDescription (full article only)';
  
  //   const outputStructure = isShort
  //     ? '{ "id": "original_product_id", "shortDescription": "PROFESSIONAL_HTML_STRING" }'
  //     : '{ "id": "original_product_id", "detailedDescription": "COMPLETE_HTML5_ARTICLE_WITH_CSS" }';
  
  //   return `You are a JSON API. Process ALL ${chunk.length} products and return a JSON array with ONLY ${fieldLabel}.
  
  // PROMPT TEMPLATE FOR EACH PRODUCT:
  // {
  //   "role": "Senior E-commerce SEO Specialist, Conversion Strategist & Front-End UX Architect",
  //   "objective": "Transform raw technical product data into a high-converting, SEO-optimized, fully responsive HTML5 product description using professional embedded CSS and structured data tables.",
  //   "outputFormat": {
  //     ${
  //       isShort
  //         ? '"shortDescription": "SEO-Optimized HTML bullet list with professional structure"'
  //         : '"detailedDescription": "Complete HTML5 article with embedded professional CSS, responsive layout, structured specification tables, and automatic size-detection table formatting"'
  //     }
  //   },
  //   "SEORequirements": [
  //     "Use one <h1> optimized for product keyword intent.",
  //     "Use logical <h2> hierarchy.",
  //     "Include semantic HTML5 structure.",
  //     "Use keyword-rich but natural language.",
  //     "Optimize for readability and conversion."
  //   ],
  //   ${
  //     isShort
  //       ? `"constraints": [
  //           "5-6 Bullet points maximum.",
  //           "Use <ul> and <li>.",
  //           "Start each bullet with <strong>Benefit:</strong>.",
  //           "End with persuasive CTA paragraph."
  //         ]`
  //       : `"constraints": [
  //           "Use <article>, <section>, <header>.",
  //           "Include embedded <style> block at top of output.",
  //           "CSS must be clean, modern, professional.",
  //           "Use responsive design with media queries.",
  //           "Convert ALL technical specifications into structured <table>.",
  //           "Detect any size-related information (dimensions, weight, capacity, measurements, fit, etc.) and place it inside a dedicated 'Size & Dimensions' table section.",
  //           "All tables must be responsive.",
  //           "Preserve ALL <img> tags exactly as provided.",
  //           "Limit to 3-4 main sections for clarity."
  //         ]`
  //   },
  //   "CSSGuidelines": {
  //     "design": "Minimal luxury e-commerce style",
  //     "typography": "Clean system font stack",
  //     "layout": "Max-width container centered with spacing",
  //     "tables": "Professional bordered table with styled header row",
  //     "responsive": "Mobile-first with breakpoint at 768px",
  //     "performance": "Lightweight CSS, no external libraries"
  //   }
  // }
  
  // DETAILED STRUCTURE REQUIREMENTS (for detailedDescription):
  
  // 1. Start with:
  //    <style>
  //    /* Professional Responsive Product CSS */
  //    </style>
  
  // 2. Wrap everything inside:
  //    <article class="product-description">
  
  // 3. Required Sections:
  //    - Hero Introduction
  //    - Key Features Section
  //    - Specifications Table
  //    - Size & Dimensions Table (ONLY if size data exists)
  //    - Closing CTA Section
  
  // 4. Table Rules:
  //    - Use <table>, <thead>, <tbody>
  //    - Use proper <th> headers
  //    - No inline styles
  //    - Must be mobile responsive (overflow-x or stacked layout)
  
  // DATA TO PROCESS:
  // ${JSON.stringify(chunk.map(p => ({ id: p.id, content: p.descreption })))}
  
  // Return a JSON array with EXACTLY ${chunk.length} objects.
  // Each object: ${outputStructure}
  // CRITICAL: All quotes in strings MUST be escaped (\\").
  // Return ONLY the JSON array, no markdown.`;
  // }

  function buildPrompt(
    chunk: { id: string; descreption: string }[],
    outputField: 'shortDescription' | 'detailedDescription'
  ): string {
    const isShort = outputField === 'shortDescription';
    const fieldLabel = isShort
      ? 'shortDescription (magical bullet points only)'
      : 'detailedDescription (captivating full article only)';
  
    const outputStructure = isShort
      ? '{ "id": "original_product_id", "shortDescription": "HTML_STRING" }'
      : '{ "id": "original_product_id", "detailedDescription": "SEO_FRIENDLY_HTML_ARTICLE" }';
  
    return `You are a JSON API that creates stunning, SEO-optimized product descriptions. Process ALL ${chunk.length} products and return a JSON array with ONLY ${fieldLabel}.
  
  🎯 CORE MISSION: Create beautiful, conversion-focused product descriptions using clean HTML/CSS that works in ANY Shopify theme. No Tailwind - just semantic HTML with inline styles or style tags that will render perfectly everywhere.
  
  PROMPT TEMPLATE FOR EACH PRODUCT:
  {
    "role": "Senior SEO Strategist & E-commerce UX Designer specialized in high-converting Amazon-style product pages",
    "objective": "Transform raw product data into a gorgeous, SEO-optimized product description using semantic HTML5 and clean CSS that works in all Shopify themes.",
    "designDirection": "Warm, professional, trustworthy, and conversion-focused. Clean typography, friendly colors, and excellent visual hierarchy.",
    "outputFormat": {
      ${
        isShort
          ? '"shortDescription": "SEO-Optimized bullet section with friendly, scannable design using inline styles or style tags"'
          : '"detailedDescription": "Complete SEO-friendly HTML5 article with stunning Amazon-style specification tables and responsive layout"'
      }
    },
    "SEORequirements": [
      "One optimized H1 tag using main keyword intent",
      "Clear H2 hierarchy for search engines",
      "Keyword-rich natural language that reads like a helpful friend",
      "Short, scannable paragraphs with ample white space",
      "Conversion-focused copywriting that builds trust",
      "Mobile-optimized with touch-friendly tap targets",
      "Semantic HTML5 structure (article, section, header, etc.)",
      "Proper heading hierarchy for screen readers"
    ],
    ${
      isShort
        ? `"constraints": [
            "5-6 bullet points maximum - each compelling and benefit-focused.",
            "Use UL and LI with custom bullet styling.",
            "Start each bullet with a friendly emoji (✓, ✨, 🚀, 💡, ⭐, ✅).",
            "Include a warm CTA at the end.",
            "Use inline styles OR a style tag - both work in Shopify.",
            "Keep it lightweight and fast-loading."
          ]`
        : `"constraints": [
            "Use inline styles OR a style tag with classes - both work perfectly in Shopify.",
            "Convert ALL technical specifications into beautiful Amazon-style tables with visual hierarchy.",
            "Detect size-related data (dimensions, weight, fit, measurements, capacity) and create separate 'Size & Fit Guide' section.",
            "Tables must be responsive with horizontal scroll on mobile.",
            "Preserve ALL img tags and wrap them in responsive containers.",
            "Use warm, friendly color palette: soft blues, warm grays, and accent greens.",
            "Add subtle hover effects for interactivity.",
            "Include proper spacing and visual hierarchy.",
            "Use system fonts (Arial, Helvetica, sans-serif) for maximum compatibility."
          ]`
    },
    "Color Palette": {
      "primary": "#3B82F6",
      "primaryDark": "#2563EB",
      "secondary": "#10B981",
      "text": "#4B5563",
      "textDark": "#1F2937",
      "background": "#FFFFFF",
      "backgroundAlt": "#F9FAFB",
      "border": "#E5E7EB",
      "tableHeader": "#F3F4F6",
      "tableRowEven": "#F9FAFB"
    }
  }
  
  📋 DETAILED STRUCTURE REQUIREMENTS (for detailedDescription):
  
  1. MAIN CONTAINER:
     <div style="max-width: 1280px; margin: 0 auto; padding: 0 1rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #4B5563;">
       <!-- ALL CONTENT HERE -->
     </div>
  
  2. ✨ HERO SECTION - First Impressions Matter
     <header style="margin-bottom: 3rem; text-align: left;">
       <h1 style="font-size: 2.5rem; font-weight: 700; color: #1F2937; margin-bottom: 1rem; line-height: 1.2;">
         Product Title with Keywords
       </h1>
       <p style="font-size: 1.25rem; color: #4B5563; max-width: 800px; margin-bottom: 2rem;">
         Engaging introduction paragraph that hooks the reader and includes primary keywords naturally.
       </p>
       <img src="product-image.jpg" alt="Descriptive alt text with keywords" style="width: 100%; max-width: 800px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);">
     </header>
  
  3. 💫 KEY FEATURES SECTION - Benefits That Convert
     <section style="margin-bottom: 4rem;">
       <h2 style="font-size: 2rem; font-weight: 700; color: #1F2937; margin-bottom: 2rem; padding-bottom: 0.5rem; border-bottom: 3px solid #3B82F6; display: inline-block;">
         Key Features & Benefits
       </h2>
       
       <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
         <!-- Feature Card 1 -->
         <div style="background: white; border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); border: 1px solid #E5E7EB; transition: all 0.3s ease;">
           <div style="font-size: 2.5rem; margin-bottom: 1rem;">✨</div>
           <h3 style="font-size: 1.25rem; font-weight: 600; color: #1F2937; margin-bottom: 0.75rem;">Feature Title</h3>
           <p style="color: #4B5563;">Benefit-focused description that sells the feature.</p>
         </div>
         
         <!-- More feature cards... -->
       </div>
     </section>
  
  4. 📊 TECHNICAL SPECIFICATIONS (Amazon Style - Beautiful & Clear)
     <section style="margin-bottom: 4rem;">
       <h2 style="font-size: 2rem; font-weight: 700; color: #1F2937; margin-bottom: 2rem; padding-bottom: 0.5rem; border-bottom: 3px solid #3B82F6; display: inline-block;">
         Technical Specifications
       </h2>
       
       <div style="overflow-x: auto; border-radius: 12px; border: 1px solid #E5E7EB; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
         <table style="width: 100%; border-collapse: collapse; font-size: 1rem; min-width: 600px;">
           <thead>
             <tr style="background: #F3F4F6;">
               <th style="padding: 1rem 1.5rem; text-align: left; font-weight: 600; color: #1F2937; border-bottom: 2px solid #E5E7EB;">Specification</th>
               <th style="padding: 1rem 1.5rem; text-align: left; font-weight: 600; color: #1F2937; border-bottom: 2px solid #E5E7EB;">Details</th>
             </tr>
           </thead>
           <tbody>
             <tr style="background: white;">
               <td style="padding: 1rem 1.5rem; border-bottom: 1px solid #E5E7EB; font-weight: 500; color: #1F2937;">Material</td>
               <td style="padding: 1rem 1.5rem; border-bottom: 1px solid #E5E7EB; color: #4B5563;">Premium Cotton Blend</td>
             </tr>
             <tr style="background: #F9FAFB;">
               <td style="padding: 1rem 1.5rem; border-bottom: 1px solid #E5E7EB; font-weight: 500; color: #1F2937;">Dimensions</td>
               <td style="padding: 1rem 1.5rem; border-bottom: 1px solid #E5E7EB; color: #4B5563;">10" x 8" x 2"</td>
             </tr>
             <!-- More rows with alternating backgrounds -->
           </tbody>
         </table>
       </div>
     </section>
  
  5. 📏 SIZE & FIT GUIDE (Only if dimensions/capacity data exists)
     <section style="margin-bottom: 4rem;">
       <h2 style="font-size: 2rem; font-weight: 700; color: #1F2937; margin-bottom: 2rem; padding-bottom: 0.5rem; border-bottom: 3px solid #3B82F6; display: inline-block;">
         Size & Fit Guide
       </h2>
       
       <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
         <!-- Measurement Card -->
         <div style="background: #F9FAFB; border-radius: 12px; padding: 1.5rem; text-align: center;">
           <div style="font-size: 2rem; margin-bottom: 0.5rem;">📐</div>
           <div style="font-size: 1rem; color: #6B7280;">Width</div>
           <div style="font-size: 1.5rem; font-weight: 700; color: #1F2937;">12 inches</div>
         </div>
         <!-- More measurement cards -->
       </div>
       
       <!-- Amazon-style size table -->
       <div style="overflow-x: auto; border-radius: 12px; border: 1px solid #E5E7EB;">
         <table style="width: 100%; border-collapse: collapse;">
           <!-- Table structure as above -->
         </table>
       </div>
     </section>
  
  6. 🎯 FINAL CTA SECTION - Close with Confidence
     <section style="margin-top: 5rem; text-align: center;">
       <div style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); border-radius: 24px; padding: 3rem 2rem; color: white; box-shadow: 0 25px 50px -12px rgba(37, 99, 235, 0.5);">
         <h3 style="font-size: 2.5rem; font-weight: 700; margin-bottom: 1rem; color: white;">Ready to Upgrade? 🚀</h3>
         <p style="font-size: 1.25rem; margin-bottom: 2rem; opacity: 0.9; max-width: 600px; margin-left: auto; margin-right: auto;">
           Join thousands of happy customers who've transformed their experience.
         </p>
         <a href="#" style="display: inline-block; background: white; color: #3B82F6; padding: 1rem 3rem; border-radius: 9999px; font-weight: 600; font-size: 1.125rem; text-decoration: none; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); transition: all 0.3s ease;">
           Shop Now →
         </a>
       </div>
     </section>
  
  🎨 STYLE GUIDE (Use these consistently):
  
  <!-- Style tag approach (PREFERRED for cleaner HTML) -->
  <style>
  .product-description * {
    margin: 0;
    box-sizing: border-box;
  }
  
  .product-description {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 1rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    line-height: 1.6;
    color: #4B5563;
  }
  
  .product-description h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1F2937;
    margin-bottom: 1rem;
    line-height: 1.2;
  }
  
  .product-description h2 {
    font-size: 2rem;
    font-weight: 700;
    color: #1F2937;
    margin-bottom: 2rem;
    padding-bottom: 0.5rem;
    border-bottom: 3px solid #3B82F6;
    display: inline-block;
  }
  
  .product-description h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1F2937;
    margin-bottom: 0.75rem;
  }
  
  .product-description .feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin: 2rem 0;
  }
  
  .product-description .feature-card {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    border: 1px solid #E5E7EB;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  
  .product-description .feature-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
  }
  
  .product-description .table-wrapper {
    overflow-x: auto;
    border-radius: 12px;
    border: 1px solid #E5E7EB;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  }
  
  .product-description table {
    width: 100%;
    border-collapse: collapse;
    min-width: 600px;
  }
  
  .product-description th {
    background: #F3F4F6;
    padding: 1rem 1.5rem;
    text-align: left;
    font-weight: 600;
    color: #1F2937;
    border-bottom: 2px solid #E5E7EB;
  }
  
  .product-description td {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #E5E7EB;
    color: #4B5563;
  }
  
  .product-description tr:last-child td {
    border-bottom: none;
  }
  
  .product-description tr:nth-child(even) {
    background: #F9FAFB;
  }
  
  .product-description tr:hover td {
    background: #EFF6FF;
  }
  
  .product-description .cta-section {
    margin-top: 5rem;
    text-align: center;
  }
  
  .product-description .cta-box {
    background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
    border-radius: 24px;
    padding: 3rem 2rem;
    color: white;
    box-shadow: 0 25px 50px -12px rgba(37, 99, 235, 0.5);
  }
  
  .product-description .cta-button {
    display: inline-block;
    background: white;
    color: #3B82F6;
    padding: 1rem 3rem;
    border-radius: 9999px;
    font-weight: 600;
    font-size: 1.125rem;
    text-decoration: none;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    transition: all 0.3s ease;
  }
  
  .product-description .cta-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
  }
  
  @media (max-width: 640px) {
    .product-description h1 { font-size: 2rem; }
    .product-description h2 { font-size: 1.5rem; }
    .product-description .feature-grid { grid-template-columns: 1fr; }
    .product-description .cta-box { padding: 2rem 1rem; }
    .product-description .cta-box h3 { font-size: 1.75rem; }
  }
  </style>
  
  <!-- Then wrap content in -->
  <div class="product-description">
    <!-- ALL CONTENT HERE -->
  </div>
  
  📦 DATA TO PROCESS:
  ${JSON.stringify(chunk.map(p => ({ id: p.id, content: p.descreption })))}
  
  Return a JSON array with EXACTLY ${chunk.length} objects.
  Each object: ${outputStructure}
  
  ⚠️ CRITICAL INSTRUCTIONS:
  - Escape all quotes as (\\") for JSON compatibility.
  - Return ONLY the JSON array - no markdown, no explanations.
  - Use the style tag approach for cleaner, more maintainable HTML.
  - Ensure all styles are responsive and mobile-friendly.
  - Include alt text on all images with keywords.
  - Use semantic HTML5 for better SEO.
  - Keep copy warm, friendly, and benefit-focused.
  - Tables must be beautiful AND functional - easy to read on all devices.
  
  Remember: This will be embedded in Shopify themes - it must work everywhere! Focus on clean, compatible CSS that renders consistently across all browsers. 🌟
  `;
  }

//   function buildPrompt(
//     chunk: { id: string; descreption: string }[],
//     outputField: 'shortDescription' | 'detailedDescription'
//   ): string {
//     const isShort = outputField === 'shortDescription';
//     const fieldLabel = isShort
//       ? 'shortDescription (bullet points only)'
//       : 'detailedDescription (expandable professional article)';
//     const outputStructure = isShort
//       ? '{ "id": "original_product_id", "shortDescription": "SAFE_HTML_STRING" }'
//       : '{ "id": "original_product_id", "detailedDescription": "SAFE_EXPANDABLE_HTML_STRING" }';
  
//     return `You are a JSON API. Process ALL ${chunk.length} products and return a JSON array with ONLY ${fieldLabel}.
  
//   PROMPT TEMPLATE FOR EACH PRODUCT:
//   {
//     "role": "Senior Luxury E-commerce SEO Strategist",
//     "objective": "Create high-converting, SEO-optimized product content using semantic HTML only. Content must NOT break website layout or responsiveness.",
//     "rules": {
//       "critical": [
//         "DO NOT use inline styles except minimal text emphasis.",
//         "DO NOT use background colors.",
//         "DO NOT use fixed widths or positioning.",
//         "DO NOT override layout.",
//         "DO NOT include <html>, <body>, or full page structure.",
//         "Avoid <h1>. Start from <h2>."
//       ],
//       "SEO rules": [
//   "Use keyword-rich <h2> headings.",
//   "Do not duplicate product title.",
//   "Avoid generic filler text.",
//   "Ensure semantic hierarchy (<h2> then <h3>).",
//   "Keep HTML clean and crawlable."
// ],
//       "responsiveSafety": [
//         "Tables must NOT contain width attributes.",
//         "Images must preserve original <img> tags exactly.",
//         "Use semantic structure only: <h2>, <h3>, <p>, <ul>, <li>, <table>.",
//         "HTML must work inside an existing product page container."
//       ]
//     },
//     "tone": "Premium, authoritative, emotionally persuasive, clean."
//     ${isShort
//       ? `,
//       "constraints": [
//         "Maximum 5 bullet points.",
//         "Use semantic structure: <ul class=\\"product-highlights\\"> and <li>.",
//         "Each bullet must start with a subtle, relevant emoji (e.g., 🔹, ✔️, ⭐, 💎).",
//         "After the emoji, begin with <strong>Benefit Title:</strong> followed by persuasive explanation.",
//         "Keep bullets concise, conversion-focused, and benefit-driven.",
//         "If the product includes a discount, insert a badge ABOVE the <ul> using:",
//         "<div class=\\"discount-badge\\">🔥 Limited Time Offer – Save XX%</div>",
//         "Include dynamic urgency triggers if applicable:",
//         "<div class=\\"urgency-badge\\">⚡ Only 3 left in stock!</div>",
//         "<div class=\\"bestseller-badge\\">🏆 Bestseller</div>",
//         "Use psychological triggers naturally: scarcity (limited quantity), exclusivity (premium edition), authority (expert recommendation).",
//         "Add structured data / schema for shortDescription using JSON-LD if possible:",
//         "<script type=\\"application/ld+json\\">{ \\"@context\\": \\"https://schema.org\\", \\"@type\\": \\"Product\\", \\"name\\": \\"PRODUCT_NAME\\", \\"description\\": \\"SHORT_DESCRIPTION\\", \\"offers\\": { \\"@type\\": \\"Offer\\", \\"price\\": \\"PRICE\\", \\"availability\\": \\"https://schema.org/InStock\\" } }</script>",
//         "No inline styling.",
//         "No background colors.",
//         "No width attributes.",
//         "Fully compatible with external CSS and mobile responsive layouts."
//       ]`
//       : `,
//     "constraints": [
//     "Structure content in two parts: summary (always visible) and extended content (inside <div class=\\"extended-content\\">).",
//     "Use semantic HTML only: <h2>, <h3>, <p>, <ul>, <li>, <table>.",
//     "Professional, responsive tables:",
//     "<div class=\\"spec-table-wrapper\\"><table class=\\"spec-table\\">...</table></div>",
//     "Preserve all <img> tags exactly, no inline styling.",
//     "Include discount badges and urgency/bestseller indicators if applicable.",
//     "Use psychological triggers (scarcity, exclusivity, authority) naturally in text.",
//     "Add structured data / schema (JSON-LD) for SEO:",
//     "<script type=\\"application/ld+json\\">{ \\"@context\\": \\"https://schema.org\\", \\"@type\\": \\"Product\\", \\"name\\": \\"PRODUCT_NAME\\", \\"description\\": \\"DETAILED_DESCRIPTION\\", \\"offers\\": { \\"@type\\": \\"Offer\\", \\"price\\": \\"PRICE\\", \\"availability\\": \\"https://schema.org/InStock\\" } }</script>",
//     "No inline styling.",
//     "No background colors.",
//     "No width attributes.",
//     "Fully mobile responsive, compatible with external CSS.",
//     "Limit to 4 sections in total."
//     ]`
//     }
//   }
  
//   DATA TO PROCESS:
//   ${JSON.stringify(chunk.map(p => ({ id: p.id, content: p.descreption })))}
  
//   Return a JSON array with EXACTLY ${chunk.length} objects.
//   Each object: ${outputStructure}
//   CRITICAL:
//   - Escape all quotes (\\")
//   - Return ONLY valid JSON array
//   - No markdown
//   - No explanations.`;
//   }
// function buildPrompt(
//   chunk: { id: string; descreption: string }[],
//   outputField: 'shortDescription' | 'detailedDescription'
// ): string {
//   const isShort = outputField === 'shortDescription';
//   const fieldLabel = isShort
//     ? 'shortDescription (conversion-optimized bullet points)'
//     : 'detailedDescription (comprehensive SEO article)';
//   const outputStructure = isShort
//     ? '{ "id": "original_product_id", "shortDescription": "SAFE_HTML_STRING", "trackingMetadata": { "characterCount": number, "keywordDensity": object } }'
//     : '{ "id": "original_product_id", "detailedDescription": "SAFE_EXPANDABLE_HTML_STRING", "trackingMetadata": { "characterCount": number, "sections": number, "keywordDensity": object } }';

//   return `You are a JSON API specializing in premium e-commerce content optimization. Process ALL ${chunk.length} products and return a JSON array with EXCLUSIVELY ${fieldLabel}.

// PROMPT TEMPLATE FOR EACH PRODUCT:
// {
//   "role": "Senior Luxury E-commerce SEO Strategist & Conversion Optimization Expert",
//   "objective": "Create high-converting, SEO-dominant product content using semantic HTML5 that drives organic traffic and maximizes conversion rates. Content must be fully responsive across all devices and trackable via Google Analytics 4.",
//   "corePrinciples": {
//     "seoStrategy": [
//       "Implement latent semantic indexing (LSI) keywords naturally throughout content",
//       "Maintain optimal keyword density (1-2% for primary, 0.5-1% for secondary)",
//       "Include long-tail keywords matching user search intent",
//       "Structure content for featured snippets (questions/answers format)",
//       "Use schema markup strategically for rich results",
//       "Optimize for voice search with natural language patterns"
//     ],
//     "analyticsIntegration": [
//       "Include data attributes for enhanced e-commerce tracking: data-product-id, data-category, data-price",
//       "Structure content to support Google Analytics 4 enhanced measurement",
//       "Create clickable elements with meaningful data-event-name attributes",
//       "Support cross-domain tracking with proper UTM parameter compatibility",
//       "Enable scroll depth tracking through logical content segmentation"
//     ],
//     "responsiveDesign": {
//       "mobileFirst": [
//         "Use viewport-relative units (%, vw, vh) through CSS classes only",
//         "Implement fluid typography scale (min 16px for body text)",
//         "Ensure touch targets are minimum 44x44px",
//         "Stack content vertically on mobile breakpoints (<768px)",
//         "Optimize image loading with loading=\"lazy\" and srcset compatibility"
//       ],
//       "tabletOptimization": [
//         "Two-column layouts only when beneficial for comprehension",
//         "Maintain readable font sizes (min 15px)",
//         "Preserve table readability with horizontal scroll on overflow"
//       ],
//       "desktopEnhancement": [
//         "Multi-column layouts for efficient space usage",
//         "Hover states for interactive elements (via external CSS)",
//         "Higher information density without compromising readability"
//       ]
//     }
//   },
//   "rules": {
//     "critical": [
//       "ZERO inline styles - use semantic classes only",
//       "ZERO background colors or fixed dimensions",
//       "ZERO layout-altering properties (position, float, margin, padding)",
//       "NO <html>, <body>, or full page structures",
//       "AVOID <h1> - hierarchy starts at <h2> for SEO optimization",
//       "ALL content must be wrapped in device-agnostic containers",
//       "PRESERVE original image tags exactly with added loading=\"lazy\" for performance"
//     ],
//     "seoEnhancements": [
//       "Implement keyword-rich <h2> headings with primary keywords",
//       "Use <h3> for subsections with long-tail variations",
//       "Include FAQ schema compatibility through Q&A formatting",
//       "Optimize meta-description length snippets (155-160 chars)",
//       "Create SEO-friendly URLs through content structure",
//       "Implement breadcrumb compatibility indicators",
//       "Add alt-text attributes to all images with keyword optimization"
//     ],
//     "googleAnalytics4": [
//       "Add data attributes for enhanced measurement:",
//       "- data-ga-category=\"product-interaction\"",
//       "- data-ga-label=\"short-description-view\" or \"detailed-description-view\"",
//       "- data-ga-non-interaction=\"false\" for user engagement",
//       "Structure expandable sections with data-ga-event=\"content-expand\"",
//       "Include impression tracking via data-ga-impression=\"true\"",
//       "Support e-commerce tracking with data-product-sku and data-product-price",
//       "Enable scroll tracking with logical section breaks at 25%, 50%, 75%, 100%"
//     ],
//     "responsiveSafety": [
//       "Tables MUST use responsive pattern:",
//       "<div class=\"table-responsive-wrapper\">",
//       "  <table class=\"specs-table\">",
//       "    <thead>...</thead>",
//       "    <tbody>...</tbody>",
//       "  </table>",
//       "</div>",
//       "Images: <img ... loading=\"lazy\" class=\"responsive-image\">",
//       "Use fluid containers: class=\"content-section\", \"feature-grid\", \"specifications\"",
//       "Ensure 100% width compatibility with parent containers",
//       "Test breakpoints mentally: mobile (320px), tablet (768px), desktop (1024+)"
//     ]
//   },
//   "tone": "Ultra-premium, authoritative yet approachable, data-driven persuasive, emotionally resonant with logical triggers",
  
//   ${isShort ? `"constraints": [
//     "SHORT DESCRIPTION SPECIFICATIONS:",
//     "1. Structure:",
//     "   - Maximum 5 high-impact bullet points within <ul class=\"product-highlights\">",
//     "   - Each <li> format: 🔹 <strong>Benefit-Driven Headline:</strong> persuasive explanation with psychological trigger",
//     "   - Include micro-conversions: <span class=\"micro-text\">(based on 127 reviews)</span> where relevant",
    
//     "2. Badge System (priority order):",
//     "   - Discount: <div class=\"badge badge-savings\" data-ga-event=\"view-promotion\">🎯 Limited Time: Save XX%</div>",
//     "   - Scarcity: <div class=\"badge badge-urgency\" data-ga-event=\"scarcity-trigger\">⚡ Only Y left - Selling Fast</div>",
//     "   - Social Proof: <div class=\"badge badge-social\" data-ga-event=\"social-proof\">👥 500+ bought this week</div>",
//     "   - Authority: <div class=\"badge badge-authority\" data-ga-event=\"authority-badge\">🏆 Editor's Choice 2024</div>",
    
//     "3. Analytics Implementation:",
//     "   - Wrap entire short description in: <div class=\"short-description\" data-ga-content-type=\"short-description\" data-product-id=\"[ID]\">",
//     "   - Each bullet: data-ga-bullet-position=\"1-5\"",
//     "   - Badges: data-ga-badge-type=\"discount|urgency|social|authority\"",
    
//     "4. Schema Markup (JSON-LD):",
//     "<script type=\"application/ld+json\">",
//     "{",
//     "  \"@context\": \"https://schema.org/\",",
//     "  \"@type\": \"Product\",",
//     "  \"name\": \"PRODUCT_NAME\",",
//     "  \"description\": \"SHORT_DESCRIPTION_TEXT\",",
//     "  \"sku\": \"PRODUCT_SKU\",",
//     "  \"brand\": {",
//     "    \"@type\": \"Brand\",",
//     "    \"name\": \"BRAND_NAME\"",
//     "  },",
//     "  \"offers\": {",
//     "    \"@type\": \"Offer\",",
//     "    \"price\": \"PRICE\",",
//     "    \"priceCurrency\": \"USD\",",
//     "    \"availability\": \"https://schema.org/InStock\",",
//     "    \"hasMerchantReturnPolicy\": {",
//     "      \"@type\": \"MerchantReturnPolicy\",",
//     "      \"returnPolicyCategory\": \"https://schema.org/MerchantReturnFiniteReturnWindow\"",
//     "    }",
//     "  },",
//     "  \"aggregateRating\": {",
//     "    \"@type\": \"AggregateRating\",",
//     "    \"ratingValue\": \"4.8\",",
//     "    \"reviewCount\": \"127\"",
//     "  }",
//     "}",
//     "</script>",
    
//     "5. Performance Optimization:",
//     "   - All images: loading=\"lazy\" and fetchpriority=\"low\"",
//     "   - Critical CSS classes only (non-render blocking)",
//     "   - Minimal DOM depth for better Core Web Vitals"
//   ]` : `"constraints": [
//     "DETAILED DESCRIPTION ARCHITECTURE:",
//     "1. Content Structure (Maximum 5 sections):",
//     "   Section 1 - Executive Summary: <div class=\"product-summary\" data-ga-section=\"summary\">",
//     "     - Compelling opening with primary keyword",
//     "     - Key value proposition with supporting data",
//     "     - Trust signals with micro-data",
//     "   Section 2 - Features & Benefits: <div class=\"features-deep-dive\" data-ga-section=\"features\">",
//     "     - Feature-benefit matrix with specifications",
//     "     - Comparison with alternatives",
//     "     - Use case scenarios",
//     "   Section 3 - Technical Specifications: <div class=\"technical-specs\" data-ga-section=\"specs\">",
//     "     - Responsive specifications table",
//     "     - Compatibility information",
//     "     - Certification and compliance data",
//     "   Section 4 - Social Proof & Reviews: <div class=\"social-proof\" data-ga-section=\"reviews\">",
//     "     - Expert quotes with attribution",
//     "     - User testimonial highlights",
//     "     - Award badges and certifications",
//     "   Section 5 - FAQ: <div class=\"faq-section\" data-ga-section=\"faq\">",
//     "     - Question-based headings (<h3>What makes this premium?</h3>)",
//     "     - Concise, authoritative answers",
//     "     - Schema.org/FAQPage compatibility",
    
//     "2. Responsive Design Implementation:",
//     "   - Mobile (<768px): Single column, stacked sections, horizontal scroll for tables",
//     "   - Tablet (768-1024px): Optional 2-column for feature grid, preserved readability",
//     "   - Desktop (>1024px): Multi-column where appropriate, enhanced typography",
//     "   - All interactive elements: min-height:44px for touch targets",
    
//     "3. Enhanced E-commerce Analytics:",
//     "   - Section tracking: data-ga-section-view=\"true\"",
//     "   - Time-on-section estimation through content breaks",
//     "   - Click tracking: data-ga-interactive=\"true\"",
//     "   - Conversion funnels: data-ga-funnel-step=\"1-5\"",
//     "   - Scroll tracking anchors: <div class=\"scroll-marker\" data-scroll-point=\"25\"></div>",
    
//     "4. Advanced Schema Implementation:",
//     "<script type=\"application/ld+json\">",
//     "{",
//     "  \"@context\": \"https://schema.org/\",",
//     "  \"@type\": \"Product\",",
//     "  \"@id\": \"PRODUCT_URL#product\",",
//     "  \"name\": \"PRODUCT_NAME\",",
//     "  \"description\": \"DETAILED_DESCRIPTION_TEXT\",",
//     "  \"sku\": \"PRODUCT_SKU\",",
//     "  \"mpn\": \"MANUFACTURER_PN\",",
//     "  \"brand\": {",
//     "    \"@type\": \"Brand\",",
//     "    \"name\": \"BRAND_NAME\",",
//     "    \"logo\": \"BRAND_LOGO_URL\"",
//     "  },",
//     "  \"image\": [",
//     "    \"IMAGE_URL_1\",",
//     "    \"IMAGE_URL_2\"",
//     "  ],",
//     "  \"offers\": {",
//     "    \"@type\": \"Offer\",",
//     "    \"price\": \"PRICE\",",
//     "    \"priceCurrency\": \"USD\",",
//     "    \"priceValidUntil\": \"2024-12-31\",",
//     "    \"itemCondition\": \"https://schema.org/NewCondition\",",
//     "    \"availability\": \"https://schema.org/InStock\",",
//     "    \"seller\": {",
//     "      \"@type\": \"Organization\",",
//     "      \"name\": \"YOUR_STORE_NAME\"",
//     "    }",
//     "  },",
//     "  \"aggregateRating\": {",
//     "    \"@type\": \"AggregateRating\",",
//     "    \"ratingValue\": \"RATING\",",
//     "    \"reviewCount\": \"COUNT\",",
//     "    \"bestRating\": \"5\",",
//     "    \"worstRating\": \"1\"",
//     "  },",
//     "  \"review\": [",
//     "    {",
//     "      \"@type\": \"Review\",",
//     "      \"author\": { \"@type\": \"Person\", \"name\": \"REVIEWER_NAME\" },",
//     "      \"reviewRating\": {",
//     "        \"@type\": \"Rating\",",
//     "        \"ratingValue\": \"5\"",
//     "      },",
//     "      \"reviewBody\": \"REVIEW_TEXT\"",
//     "    }",
//     "  ]",
//     "}",
//     "</script>",
    
//     "5. Performance Metrics:",
//     "   - Total DOM nodes < 150 per product",
//     "   - No render-blocking resources",
//     "   - Cumulative Layout Shift (CLS) score optimization",
//     "   - Largest Contentful Paint (LCP) friendly structure",
//     "   - First Input Delay (FID) optimized through minimal JavaScript"
//   ]`}
// }

// DATA TO PROCESS:
// ${JSON.stringify(chunk.map(p => ({ 
//   id: p.id, 
//   content: p.descreption,
//   metadata: {
//     requiresSchema: true,
//     analyticsTracking: true,
//     responsiveLevel: 'full'
//   }
// })))}

// OUTPUT REQUIREMENTS:
// - Return EXACTLY ${chunk.length} objects in the JSON array
// - Each object must follow: ${outputStructure}
// - Include trackingMetadata for analytics validation
// - Escape all double quotes (\\") within HTML strings
// - NO markdown formatting
// - NO explanatory text before or after JSON
// - VALID JSON array only

// QUALITY CHECKS:
// - ✓ SEO keyword density optimized
// - ✓ GA4 enhanced measurement ready
// - ✓ Mobile-first responsive design
// - ✓ Schema.org validation passed
// - ✓ Core Web Vitals optimized
// - ✓ Accessibility compliant (WCAG 2.1)
// - ✓ Cross-browser compatible
// - ✓ Print-friendly where applicable

// Return ONLY the valid JSON array.`;
// }
// function buildPrompt(
//   chunk: { id: string; descreption: string }[],
//   outputField: 'shortDescription' | 'detailedDescription'
// ): string {
//   const isShort = outputField === 'shortDescription';
//   const fieldLabel = isShort
//     ? 'shortDescription (conversion-optimized bullet points)'
//     : 'detailedDescription (comprehensive SEO article)';
//   const outputStructure = isShort
//     ? '{ "id": "original_product_id", "shortDescription": "SAFE_HTML_STRING", "trackingMetadata": { "characterCount": number, "keywordDensity": object } }'
//     : '{ "id": "original_product_id", "detailedDescription": "SAFE_EXPANDABLE_HTML_STRING", "trackingMetadata": { "characterCount": number, "sections": number, "keywordDensity": object } }';

//   return `You are a JSON API specializing in premium e-commerce content optimization. Process ALL ${chunk.length} products and return a JSON array with EXCLUSIVELY ${fieldLabel}.

// PROMPT TEMPLATE FOR EACH PRODUCT:
// {
//   "role": "Senior Luxury E-commerce SEO Strategist & Conversion Optimization Expert",
//   "objective": "Create high-converting, SEO-dominant product content using semantic HTML5 that drives organic traffic and maximizes conversion rates. Content must be fully responsive across all devices and trackable via Google Analytics 4.",
//   "corePrinciples": {
//     "seoStrategy": [
//       "Implement latent semantic indexing (LSI) keywords naturally throughout content",
//       "Maintain optimal keyword density (1-2% for primary, 0.5-1% for secondary)",
//       "Include long-tail keywords matching user search intent",
//       "Structure content for featured snippets (questions/answers format)",
//       "Use schema markup strategically for rich results",
//       "Optimize for voice search with natural language patterns"
//     ],
//     "analyticsIntegration": [
//       "Include data attributes for enhanced e-commerce tracking: data-product-id, data-category, data-price",
//       "Structure content to support Google Analytics 4 enhanced measurement",
//       "Create clickable elements with meaningful data-event-name attributes",
//       "Support cross-domain tracking with proper UTM parameter compatibility",
//       "Enable scroll depth tracking through logical content segmentation"
//     ],
//     "responsiveDesign": {
//       "mobileFirst": [
//         "Use viewport-relative units (%, vw, vh) through CSS classes only",
//         "Implement fluid typography scale (min 16px for body text)",
//         "Ensure touch targets are minimum 44x44px",
//         "Stack content vertically on mobile breakpoints (<768px)",
//         "Optimize image loading with loading=\\"lazy\\" and srcset compatibility"
//       ],
//       "tabletOptimization": [
//         "Two-column layouts only when beneficial for comprehension",
//         "Maintain readable font sizes (min 15px)",
//         "Preserve table readability with horizontal scroll on overflow"
//       ],
//       "desktopEnhancement": [
//         "Multi-column layouts for efficient space usage",
//         "Hover states for interactive elements (via external CSS)",
//         "Higher information density without compromising readability"
//       ]
//     }
//   },
//   "rules": {
//     "critical": [
//       "ZERO inline styles - use semantic classes only",
//       "ZERO background colors or fixed dimensions",
//       "ZERO layout-altering properties (position, float, margin, padding)",
//       "NO <html>, <body>, or full page structures",
//       "AVOID <h1> - hierarchy starts at <h2> for SEO optimization",
//       "ALL content must be wrapped in device-agnostic containers",
//       "PRESERVE original image tags exactly with added loading=\\"lazy\\" for performance"
//     ],
//     "seoEnhancements": [
//       "Implement keyword-rich <h2> headings with primary keywords",
//       "Use <h3> for subsections with long-tail variations",
//       "Include FAQ schema compatibility through Q&A formatting",
//       "Optimize meta-description length snippets (155-160 chars)",
//       "Create SEO-friendly URLs through content structure",
//       "Implement breadcrumb compatibility indicators",
//       "Add alt-text attributes to all images with keyword optimization"
//     ],
//     "googleAnalytics4": [
//       "Add data attributes for enhanced measurement:",
//       "- data-ga-category=\\"product-interaction\\"",
//       "- data-ga-label=\\"short-description-view\\" or \\"detailed-description-view\\"",
//       "- data-ga-non-interaction=\\"false\\" for user engagement",
//       "Structure expandable sections with data-ga-event=\\"content-expand\\"",
//       "Include impression tracking via data-ga-impression=\\"true\\"",
//       "Support e-commerce tracking with data-product-sku and data-product-price",
//       "Enable scroll tracking with logical section breaks at 25%, 50%, 75%, 100%"
//     ],
//     "responsiveSafety": [
//       "ALL TABLES MUST use responsive wrapper pattern regardless of count:",
//       "<div class=\\"table-responsive-wrapper\\">",
//       "  <table class=\\"specs-table\\">",
//       "    <thead>...</thead>",
//       "    <tbody>...</tbody>",
//       "  </table>",
//       "</div>",
//       "If more than 5 tables exist, apply additional optimization:",
//       "- Use data-ga-table-id attributes for tracking",
//       "- Implement progressive loading with data-load-priority=\\"lazy\\"",
//       "- Ensure consistent column widths across all tables",
//       "Images: <img ... loading=\\"lazy\\" class=\\"responsive-image\\">",
//       "Use fluid containers: class=\\"content-section\\", \\"feature-grid\\", \\"specifications\\"",
//       "Ensure 100% width compatibility with parent containers",
//       "Test breakpoints mentally: mobile (320px), tablet (768px), desktop (1024+)"
//     ]
//   },
//   "tone": "Ultra-premium, authoritative yet approachable, data-driven persuasive, emotionally resonant with logical triggers",
  
//   ${isShort ? `"constraints": [
//     "SHORT DESCRIPTION SPECIFICATIONS:",
//     "1. Structure:",
//     "   - Maximum 5 high-impact bullet points within <ul class=\\"product-highlights\\">",
//     "   - Each <li> format: 🔹 <strong>Benefit-Driven Headline:</strong> persuasive explanation with psychological trigger",
//     "   - Include micro-conversions: <span class=\\"micro-text\\">(based on 127 reviews)</span> where relevant",
    
//     "2. Badge System (priority order):",
//     "   - Discount: <div class=\\"badge badge-savings\\" data-ga-event=\\"view-promotion\\">🎯 Limited Time: Save XX%</div>",
//     "   - Scarcity: <div class=\\"badge badge-urgency\\" data-ga-event=\\"scarcity-trigger\\">⚡ Only Y left - Selling Fast</div>",
//     "   - Social Proof: <div class=\\"badge badge-social\\" data-ga-event=\\"social-proof\\">👥 500+ bought this week</div>",
//     "   - Authority: <div class=\\"badge badge-authority\\" data-ga-event=\\"authority-badge\\">🏆 Editor's Choice 2024</div>",
    
//     "3. Analytics Implementation:",
//     "   - Wrap entire short description in: <div class=\\"short-description\\" data-ga-content-type=\\"short-description\\" data-product-id=\\"[ID]\\">",
//     "   - Each bullet: data-ga-bullet-position=\\"1-5\\"",
//     "   - Badges: data-ga-badge-type=\\"discount|urgency|social|authority\\"",
    
//     "4. Schema Markup (JSON-LD):",
//     "<script type=\\"application/ld+json\\">",
//     "{",
//     "  \\"@context\\": \\"https://schema.org/\\",",
//     "  \\"@type\\": \\"Product\\",",
//     "  \\"name\\": \\"PRODUCT_NAME\\",",
//     "  \\"description\\": \\"SHORT_DESCRIPTION_TEXT\\",",
//     "  \\"sku\\": \\"PRODUCT_SKU\\",",
//     "  \\"brand\\": {",
//     "    \\"@type\\": \\"Brand\\",",
//     "    \\"name\\": \\"BRAND_NAME\\"",
//     "  },",
//     "  \\"offers\\": {",
//     "    \\"@type\\": \\"Offer\\",",
//     "    \\"price\\": \\"PRICE\\",",
//     "    \\"priceCurrency\\": \\"USD\\",",
//     "    \\"availability\\": \\"https://schema.org/InStock\\",",
//     "    \\"hasMerchantReturnPolicy\\": {",
//     "      \\"@type\\": \\"MerchantReturnPolicy\\",",
//     "      \\"returnPolicyCategory\\": \\"https://schema.org/MerchantReturnFiniteReturnWindow\\"",
//     "    }",
//     "  },",
//     "  \\"aggregateRating\\": {",
//     "    \\"@type\\": \\"AggregateRating\\",",
//     "    \\"ratingValue\\": \\"4.8\\",",
//     "    \\"reviewCount\\": \\"127\\"",
//     "  }",
//     "}",
//     "</script>",
    
//     "5. Performance Optimization:",
//     "   - All images: loading=\\"lazy\\" and fetchpriority=\\"low\\"",
//     "   - Critical CSS classes only (non-render blocking)",
//     "   - Minimal DOM depth for better Core Web Vitals"
//   ]` : `"constraints": [
//     "DETAILED DESCRIPTION ARCHITECTURE:",
//     "1. Content Structure (Maximum 5 sections):",
//     "   Section 1 - Executive Summary: <div class=\\"product-summary\\" data-ga-section=\\"summary\\">",
//     "     - Compelling opening with primary keyword",
//     "     - Key value proposition with supporting data",
//     "     - Trust signals with micro-data",
//     "   Section 2 - Features & Benefits: <div class=\\"features-deep-dive\\" data-ga-section=\\"features\\">",
//     "     - Feature-benefit matrix with specifications",
//     "     - Comparison with alternatives",
//     "     - Use case scenarios",
//     "   Section 3 - Technical Specifications: <div class=\\"technical-specs\\" data-ga-section=\\"specs\\">",
//     "     - Responsive specifications table (use wrapper pattern)",
//     "     - Compatibility information",
//     "     - Certification and compliance data",
//     "   Section 4 - Social Proof & Reviews: <div class=\\"social-proof\\" data-ga-section=\\"reviews\\">",
//     "     - Expert quotes with attribution",
//     "     - User testimonial highlights",
//     "     - Award badges and certifications",
//     "   Section 5 - FAQ: <div class=\\"faq-section\\" data-ga-section=\\"faq\\">",
//     "     - Question-based headings (<h3>What makes this premium?</h3>)",
//     "     - Concise, authoritative answers",
//     "     - Schema.org/FAQPage compatibility",
    
//     "2. Responsive Design Implementation:",
//     "   - Mobile (<768px): Single column, stacked sections, horizontal scroll for tables",
//     "   - Tablet (768-1024px): Optional 2-column for feature grid, preserved readability",
//     "   - Desktop (>1024px): Multi-column where appropriate, enhanced typography",
//     "   - All interactive elements: min-height:44px for touch targets",
    
//     "3. Enhanced E-commerce Analytics:",
//     "   - Section tracking: data-ga-section-view=\\"true\\"",
//     "   - Time-on-section estimation through content breaks",
//     "   - Click tracking: data-ga-interactive=\\"true\\"",
//     "   - Conversion funnels: data-ga-funnel-step=\\"1-5\\"",
//     "   - Scroll tracking anchors: <div class=\\"scroll-marker\\" data-scroll-point=\\"25\\"></div>",
    
//     "4. Advanced Schema Implementation:",
//     "<script type=\\"application/ld+json\\">",
//     "{",
//     "  \\"@context\\": \\"https://schema.org/\\",",
//     "  \\"@type\\": \\"Product\\",",
//     "  \\"@id\\": \\"PRODUCT_URL#product\\",",
//     "  \\"name\\": \\"PRODUCT_NAME\\",",
//     "  \\"description\\": \\"DETAILED_DESCRIPTION_TEXT\\",",
//     "  \\"sku\\": \\"PRODUCT_SKU\\",",
//     "  \\"mpn\\": \\"MANUFACTURER_PN\\",",
//     "  \\"brand\\": {",
//     "    \\"@type\\": \\"Brand\\",",
//     "    \\"name\\": \\"BRAND_NAME\\",",
//     "    \\"logo\\": \\"BRAND_LOGO_URL\\"",
//     "  },",
//     "  \\"image\\": [",
//     "    \\"IMAGE_URL_1\\",",
//     "    \\"IMAGE_URL_2\\"",
//     "  ],",
//     "  \\"offers\\": {",
//     "    \\"@type\\": \\"Offer\\",",
//     "    \\"price\\": \\"PRICE\\",",
//     "    \\"priceCurrency\\": \\"USD\\",",
//     "    \\"priceValidUntil\\": \\"2024-12-31\\",",
//     "    \\"itemCondition\\": \\"https://schema.org/NewCondition\\",",
//     "    \\"availability\\": \\"https://schema.org/InStock\\",",
//     "    \\"seller\\": {",
//     "      \\"@type\\": \\"Organization\\",",
//     "      \\"name\\": \\"YOUR_STORE_NAME\\"",
//     "    }",
//     "  },",
//     "  \\"aggregateRating\\": {",
//     "    \\"@type\\": \\"AggregateRating\\",",
//     "    \\"ratingValue\\": \\"RATING\\",",
//     "    \\"reviewCount\\": \\"COUNT\\",",
//     "    \\"bestRating\\": \\"5\\",",
//     "    \\"worstRating\\": \\"1\\"",
//     "  },",
//     "  \\"review\\": [",
//     "    {",
//     "      \\"@type\\": \\"Review\\",",
//     "      \\"author\\": { \\"@type\\": \\"Person\\", \\"name\\": \\"REVIEWER_NAME\\" },",
//     "      \\"reviewRating\\": {",
//     "        \\"@type\\": \\"Rating\\",",
//     "        \\"ratingValue\\": \\"5\\"",
//     "      },",
//     "      \\"reviewBody\\": \\"REVIEW_TEXT\\"",
//     "    }",
//     "  ]",
//     "}",
//     "</script>",
    
//     "5. Performance Metrics:",
//     "   - Total DOM nodes < 150 per product",
//     "   - No render-blocking resources",
//     "   - Cumulative Layout Shift (CLS) score optimization",
//     "   - Largest Contentful Paint (LCP) friendly structure",
//     "   - First Input Delay (FID) optimized through minimal JavaScript"
//   ]`}
// }

// DATA TO PROCESS:
// ${JSON.stringify(chunk.map(p => ({ 
//   id: p.id, 
//   content: p.descreption,
//   metadata: {
//     requiresSchema: true,
//     analyticsTracking: true,
//     responsiveLevel: 'full'
//   }
// })))}

// OUTPUT REQUIREMENTS:
// - Return EXACTLY ${chunk.length} objects in the JSON array
// - Each object must follow: ${outputStructure}
// - Include trackingMetadata for analytics validation
// - Escape all double quotes (\\\\") within HTML strings
// - NO markdown formatting
// - NO explanatory text before or after JSON
// - VALID JSON array only

// QUALITY CHECKS:
// - ✓ SEO keyword density optimized
// - ✓ GA4 enhanced measurement ready
// - ✓ Mobile-first responsive design
// - ✓ Schema.org validation passed
// - ✓ Core Web Vitals optimized
// - ✓ Accessibility compliant (WCAG 2.1)
// - ✓ Cross-browser compatible
// - ✓ Print-friendly where applicable

// Return ONLY the valid JSON array.`;
// }
    const chunkPromises = chunks.map(async (chunk, idx) => {
      console.log(`Processing chunk ${idx + 1}/${chunks.length} (${chunk.length} products) - split into 2 API calls`);

      // Call 1: shortDescription only (keeps output under token limit)
      const shortPrompt = buildPrompt(chunk as { id: string; descreption: string }[], 'shortDescription');
      // Call 2: detailedDescription only
      const detailedPrompt = buildPrompt(chunk as { id: string; descreption: string }[], 'detailedDescription');

      let shortResults: { id: string; shortDescription?: string }[] = [];
      let detailedResults: { id: string; detailedDescription?: string }[] = [];

      try {
        [shortResults, detailedResults] = await Promise.all([
          sendPrompt(shortPrompt, API_KEY_GEMINI) as Promise<{ id: string; shortDescription?: string }[]>,
          sendPrompt(detailedPrompt, API_KEY_GEMINI) as Promise<{ id: string; detailedDescription?: string }[]>
        ]);
      } catch (err) {
        console.error(`Error processing chunk ${idx + 1}:`, err);
        throw err;
      }

      if (!Array.isArray(shortResults) || !Array.isArray(detailedResults)) {
        throw new Error(`Chunk ${idx + 1} returned invalid format`);
      }

      // Merge by id: { id, shortDescription, detailedDescription }
      const merged = (chunk as { id: string; descreption: string }[]).map((p: { id: string; descreption: string }) => {
        const short = shortResults.find((r) => r.id === p.id);
        const detailed = detailedResults.find((r) => r.id === p.id);
        return {
          id: p.id,
          shortDescription: short?.shortDescription ?? '',
          detailedDescription: detailed?.detailedDescription ?? ''
        };
      });

      return merged;
    });

    // Wait for all chunks to complete
    const results = await Promise.all(chunkPromises);

    // Flatten results into a single array
    results.forEach(r => allResults.push(...r));

    console.log(`Total products processed: ${allResults.length}/${updatedDescreptionAI.length}`);

    return allResults;
  }

  //     try {
  //       const batchResponse = await sendPrompt(batchPrompt, API_KEY_GEMINI);
  //       console.log('batcher prod IDIDID',batchResponse.some((e)=>e.id===v.id))
    
  //       if (Array.isArray(batchResponse)) {
  //         allResults.push(...batchResponse);
  //         // console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} completed: ${batchResponse.length} products processed`);
  //       } else {
  //         console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} returned invalid format:`, batchResponse);
  //       }
  //     } catch (error) {
  //       console.error(`Error processing batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
  //       throw error; // Re-throw to stop processing if a batch fails
  //     }
  //   }
  // }
  
  
  // console.log(`Total products processed: ${allResults.length}/${updatedDescreptionAI.length}`);
  // return allResults;


 // 2. Remix Action (Server Side)
export async function action({context ,request }: ActionFunctionArgs) {
 let {admin}=await shopify(context).authenticate.admin(request)

 let formData=await request.formData()
 const updatedDescreptionAI:DESCREPTION = JSON.parse(formData.get('descreptionAI') as string);
 if (!Array.isArray(updatedDescreptionAI)) {
   console.error("Invalid or missing 'descreptionAI' data");
   return Response.json({ error: "Invalid or missing 'descreptionAI' data" }, { status: 400 });
 }

// let x;
// const {env}=context
// console.log('env context is her ',context)
// // for(const desc of updatedDescreptionAI){
//   let message=updatedDescreptionAI
//   // {
//   //   body:{
//   //     id:desc?.id,
//   //     descreption:desc?.descreption,
//   //     tags:desc?.tags
//   //   }
//   // }
// console.log('body meaasge',message)
//   try {
//     // @ts-ignore
//    const f= await context.cloudflare.env.SEO_QUEUE.send(message);
//     console.log('ffffffff',f)
//    x=f
//     return Response.json({ status: "success", message: "Product queued for generation!" });
//   } catch (error) {
//     return Response.json({ status: "error", message: "Failed to queue" }, { status: 500 });
//   }
// }
//  return Response.json({ data:x,status: "success", message: "Product queued for generation!" });

    const API_KEY_DEEP_SEEK=context.cloudflare?.env?.DEEP_SEEK_API_KEY
    console.log('api key is her ',API_KEY_DEEP_SEEK)

    const API_KEY_GEMINI_GEMINI=context.cloudflare?.env?.GEMINI_API_KEY
    console.log('api key is her ',API_KEY_GEMINI_GEMINI)
    // console.log('hello UPDATE_PRODUCT',UPDATE_PRODUCT?.loc?.source.body)


  if (!updatedDescreptionAI) {
    return Response.json({ error: "Please provide a description" }, { status: 400 });
  }

  // Cloudflare Workers limit: 50 subrequests per request (free tier).
  // Each product: 1–2 AI fetches + 1 GraphQL update. Limit to 15 products to stay under 50.
  const MAX_PRODUCTS_PER_REQUEST = 15;
  if (updatedDescreptionAI.length > MAX_PRODUCTS_PER_REQUEST) {
    return Response.json(
      {
        error: `Too many products. Please select up to ${MAX_PRODUCTS_PER_REQUEST} products at a time. (Cloudflare subrequest limit)`,
        code: "TOO_MANY_SUBREQUESTS"
      },
      { status: 400 }
    );
  }
  let optimizedHtml
  try {
    try{
      console.log('thes from gimini')
      const optimizedHtml_gimini =      await generateSeoHtmlgimini(API_KEY_GEMINI_GEMINI as string,updatedDescreptionAI,)
      optimizedHtml=optimizedHtml_gimini
    }
    catch{
      console.log('thes from deepseek')
      const optimizedHtml_deep_seek =  await generateSeoHtml(updatedDescreptionAI,API_KEY_DEEP_SEEK);
      //  await generateSeoHtmlgimini(API_KEY_GEMINI_TESTED as string,updatedDescreptionAI,)
      optimizedHtml=optimizedHtml_deep_seek
    }
 
    // console.log('new descreption is her and optimise ',optimizedHtml)

let responses

for( const DESC_AI of optimizedHtml){
    if (!DESC_AI.id|| !DESC_AI.detailedDescription || !DESC_AI.shortDescription) {
        console.error("AI returned empty fields", optimizedHtml);
        return Response.json({ error: "Empty content from AI" }, { status: 500 });
      }
  for (const OLD_DESC of updatedDescreptionAI ){
      if(DESC_AI.id===OLD_DESC.id){
        // console.log("VERIFU IS TESTED",DESC_AI.id===OLD_DESC.id)
        // console.log('is true is very nice ')
        // Merge tags: preserve existing + add DESC_AI (productUpdate overwrites, so we must include all)
        const mergedTags = [...new Set([...(OLD_DESC.tags || []), "DESC_AI"])];
        const response = await admin.graphql(productsupdated, {
          variables: {
            product: {
              id: OLD_DESC.id,
              descriptionHtml: DESC_AI.detailedDescription,
              tags: mergedTags,
              metafields: [
                {
                  namespace: "custom",
                  key: "descriptionsai",
                  type: "json",
                  value: JSON.stringify(DESC_AI.shortDescription)
                },
                {
                  namespace: "custom",
                  key: "sizeInfo",
                  type: "json",
                  value: JSON.stringify(DESC_AI.sizeInfo ?? [])
                },
                {
                  namespace: "custom",
                  key: "metaDescreption",
                  type: "json",
                  value: JSON.stringify(DESC_AI.sizeInfo ?? [])
                }
              ]
            }
          }
        });
             
          
  
          responses=response
        }
    

   

  }

}




 console.log('hhhhhhhhhhhhhhhhhhhhhhhhh',optimizedHtml,responses)


    return Response.json(optimizedHtml);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to generate content" }, { status: 500 });
  }

}




export default function Descriptionupdated(){

    const initial = useLoaderData<typeof loader>();
    console.log('initia deta is her helo ',initial)
    
    const fetcher = useFetcher();
    const submit =useSubmit()
    const actionData=useActionData()
    const navigation=useNavigation()
    const isSubmitting=navigation.state==="submitting"
  console.log('action data is her',actionData)
  console.log('fetcher data is her',fetcher)
  
    const [rows, setRows] = useState(initial?.variants);
    const [pageInfo, setPageInfo] = useState(initial?.pageInfo);
  
    // cursor history
    const [cursorStack, setCursorStack] = useState<string[]>([]);
  
    interface SelectedVariant {
      id: string;
      descreption: string,
      tags:string[]
    }
  
    const [selected, setSelected] = useState<SelectedVariant[]>([]);
  
    // Handle pagination result
    useEffect(() => {
      if (fetcher.data) {
        setRows(fetcher.data.variants);
        setPageInfo(fetcher.data.pageInfo);
      }
    }, [fetcher.data]);
  
    // Auto-select CONTINUE variants on each page
    useEffect(() => {
      const autoSelected: SelectedVariant[] = rows
      .filter((v: any) => !v.tags?.includes('DESC_AI'))
        // .filter((v: any) => v.inventoryPolicy === "CONTINUE")
        .map((v: any) => ({
          id: v.id,
          descreption: v.descriptionHtml,
          tags:v.tags
        }));
  
      setSelected(autoSelected);
    }, [rows]);
  console.log('selected',selected)
  
  const handleSubmitFormData = () => {
    // if(selected.length===0) return 
    const formData = new FormData();
    formData.append("descreptionAI", JSON.stringify(selected));
    
    submit(formData, { 
      method: "post",
      encType: "application/x-www-form-urlencoded" 
    });
  };
  
    const prevCursor =
      cursorStack.length > 1
        ? cursorStack[cursorStack.length - 2]
        : undefined;
  
    return (
      <>
      <div style={{ padding: 24 }}>
        <h1>Out of stock variants</h1>
  
        <table width="100%" border={1} cellPadding={8}>
          <thead>
            <tr>
              <th>Select</th>
              {/* <th>Product Title</th>
              <th>Product ID</th> */}
              <th>title</th>
              <th>product ID</th>
              <th>descreption</th>
              <th>tags</th>
              {/* <th>Inventory</th>
              <th>Policy</th> */}
            </tr>
          </thead>
  
          <tbody>
            {rows.map((v: any) => (
              <tr key={v.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.some(s => s.id === v.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelected(prev => [
                          ...prev,
                          {
                            ...v, // spread all properties of v to satisfy SelectedVariant type
                            id: v.id,
                            descreption: v.descriptionHtml,
                            tags:v.tags
                          }
                        ]);
                      } else {
                        setSelected(prev =>
                          prev.filter(s => s.id !== v.id)
                        );
                      }
                    }}
                  />
                </td>
                {/* <td>{v.product.title}</td>
                <td>{v.product.id}</td> */}
                 <td>{v.title}</td>
                <td>{v.id}</td>
                <td>{v.descriptionHtml}</td>
                <td>
                {v.tags.map((tag:string,index:number)=>(
                  <span className="badge" key={index}>{tag}</span>
                )
                 
                )}
                </td>
                {/* <td>{v.inventoryQuantity}</td>
                <td>{v.inventoryPolicy}</td> */}
              </tr>
            ))}
          </tbody>
        </table>
  
        {/* Next page */}
        {pageInfo.hasNextPage && (
          <button
            disabled={fetcher.state === "loading"}
            onClick={() => {
              setCursorStack(prev => [...prev, pageInfo.endCursor]);
              fetcher.load(`?cursor=${pageInfo.endCursor}`);
            }}
          >
            {fetcher.state === "loading" ? "Loading..." : "Next page →"}
          </button>
        )}
  
        {/* Previous page */}
        {prevCursor && (
          <button
            disabled={fetcher.state === "loading"}
            onClick={() => {
              setCursorStack(prev => prev.slice(0, -1));
              fetcher.load(`?cursor=${prevCursor}`);
            }}
          >
            ← Previous page
          </button>
        )}
  
        {/* updated thedata */}
        <Button
                  variant="primary"
                  onClick={handleSubmitFormData}
                  loading={isSubmitting}
                  size="large"
                >
                  Create updated policy
                </Button>
      </div>

      {/* {Array.isArray(actionData) && actionData?.map((e: { detailedDescription?: string }, idx: number) => (
      <>
        <div key={idx} dangerouslySetInnerHTML={{ __html: e.detailedDescription || "" }} />
        <p>
          {e.detailedDescription
            ? (() => {
                try {
                  return JSON.parse(e.detailedDescription);
                } catch {
                  return e.detailedDescription;
                }
              })()
            : ""}
        </p>
      </>
      ))} */}
  </>
  
    );
  }
  





export const loader = async ({request,context}:LoaderFunctionArgs) => {
  const { admin } = await shopify(context).authenticate.admin(request);
  const url=new URL(request.url)
  const cursor=url.searchParams.get('cursor')
  console.log('cursor her ',cursor)
  let query=    `#graphql
  query GetProducts($cursor:String) {
    products(first: 15,after:$cursor) {
        edges{
            node{
                title
                id
                descriptionHtml
                tags
            }
        }
      
      pageInfo{
        endCursor
        hasNextPage
      }
    }
  
  }
  `
  const response = await admin.graphql(query,{variables:{cursor}});
  const res = await response.json();
  console.log('res is her ',res.data)
  const productsdescreption={
    variants: res?.data.products.edges.map((e: any) => e.node),
        pageInfo: res?.data.products.pageInfo
  }
  return new Response(JSON.stringify(productsdescreption), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60, s-maxage=300",
    },
  });
//   return json.data;
}



async function generateSeoHtmlgimini(GEMINI_API_KEY:string,description:DESCREPTION) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  
  // Using Gemini 3 Flash for speed and intelligence
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" ,
    generationConfig: {
      responseMimeType: "application/json",
        temperature: 0.7,
       maxOutputTokens: 8192,
      // topP:0.9
    },
  });

  const prompt = `You are a JSON API. Process ALL ${Array.isArray(description) ? description.length : 0} products and return a JSON array.

  PROMPT TEMPLATE FOR EACH PRODUCT:
  {
    "role": "Senior E-commerce SEO Specialist & UX Copywriter with expertise in luxury branding and color psychology",
    "objective": "Transform raw technical data into a visually stunning, high-converting Amazon listing that uses professional HTML structure and strategic color psychology to drive emotional engagement and sales.",
    "outputFormat": {
      "shortDescription": "PROFESSIONAL_HTML_STRING (SEO-Optimized Bullet Points with strategic color accents)",
      "detailedDescription": "PROFESSIONAL_HTML_STRING (A+ Content with complete HTML5 structure, color psychology, and responsive design)"
    },
    "stylingGuidelines": {
      "tone": "Luxury, sophisticated, authoritative, yet emotionally resonant. Use elevated vocabulary that conveys exclusivity and quality.",
      "colorPsychology": {
        "general": "Apply color psychology strategically to evoke desired emotions:",
        "colorMeanings": {
          "Deep Midnight Blue": "Conveys trust, stability, sophistication, and premium quality. Ideal for technology, finance, and luxury products.",
          "Rich Burgundy": "Evokes luxury, passion, confidence, and timeless elegance. Perfect for premium fashion and accessories.",
          "Forest Green": "Represents growth, harmony, nature, and wealth. Excellent for organic, eco-friendly, and wellness products.",
          "Charcoal Gray": "Communicates authority, practicality, timelessness, and modern minimalism. Great for professional attire and tech gadgets.",
          "Champagne Gold": "Signifies premium quality, success, celebration, and exclusivity. Use sparingly for accent elements.",
          "Crimson Red": "Creates urgency, excitement, passion, and energy. Effective for calls-to-action and limited offers.",
          "Royal Purple": "Associated with royalty, wisdom, creativity, and luxury. Suitable for premium and artistic products.",
          "Cream White": "Evokes purity, simplicity, elegance, and clarity. Perfect for backgrounds and minimalist designs."
        },
        "application": "Use these colors strategically in headings, accents, and key elements. Never use bright neon or saturated primary colors which appear cheap. Maintain sophisticated, muted luxury tones."
      },
      "typography": {
        "headings": "Use elegant font stacks with proper hierarchy: 'Playfair Display', 'Cormorant Garamond', or 'Georgia' for serif elegance; 'Montserrat', 'Helvetica Neue', or 'Open Sans' for clean sans-serif.",
        "body": "Use highly readable fonts like 'Lato', 'Roboto', or 'Avenir' with proper line-height (1.6) and letter-spacing for luxury feel.",
        "accent": "Use subtle uppercase with letter-spacing for premium badges and highlights."
      },
      "visualHierarchy": {
        "primary": "Bold, emotive headline that captures attention and positions the product as a solution to an aspirational desire.",
        "secondary": "Supporting elements that build credibility and highlight transformation.",
        "tertiary": "Technical details presented in an organized, scannable format."
      },
      "seoStrategy": "Integrate primary keywords naturally into headings, first 100 words, and image alt text. Use semantic HTML for SEO ranking."
    },
    "responsiveDesign": {
      "mobileFirst": "Design mobile-first, then enhance for larger screens. All layouts must be fully responsive and work perfectly on phones (320px+), tablets (768px+), and desktops (1024px+).",
      "flexibleLayouts": "Use flexible units (%, vw, vh, rem, em) instead of fixed pixels. Use CSS Grid and Flexbox for responsive layouts that adapt automatically.",
      "typography": {
        "mobile": "Font sizes must scale: h1: 24-28px, h2: 20-22px, body: 14-16px on mobile. Use rem units for scalability.",
        "tablet": "Font sizes: h1: 28-32px, h2: 24-26px, body: 16-18px on tablets.",
        "desktop": "Font sizes: h1: 32-36px, h2: 26-28px, body: 16-18px on desktop."
      },
      "images": "All images must use max-width: 100%, height: auto, and display: block. Include srcset for responsive images when possible. Images must never overflow containers.",
      "tables": "Tables must be horizontally scrollable on mobile using overflow-x: auto wrapper. Consider converting to card layout on mobile (under 768px) for better UX.",
      "grids": "Feature grids: 1 column on mobile, 2 columns on tablet (768px+), 3-4 columns on desktop (1024px+). Use CSS Grid with auto-fit/auto-fill.",
      "spacing": "Use responsive padding/margins: smaller on mobile (8-12px), medium on tablet (16-20px), larger on desktop (24-30px). Use clamp() for fluid spacing.",
      "touchTargets": "All interactive elements (buttons, links) must be at least 44x44px on mobile for easy touch interaction.",
      "mediaQueries": "Include inline media queries using @media in style attributes or use CSS custom properties. Breakpoints: mobile (<768px), tablet (768px-1023px), desktop (1024px+).",
      "viewport": "Ensure content never exceeds viewport width. Use box-sizing: border-box on all elements. Prevent horizontal scrolling."
    },
    "designElements": {
      "badges": "Include premium badges like '🏆 PREMIUM QUALITY', '✨ EXCLUSIVE DESIGN', '🌟 BESTSELLER', '🎁 PERFECT GIFT' where appropriate using subtle emoji or CSS pseudo-elements.",
      "testimonials": "Include subtle customer satisfaction indicators where space allows (e.g., '⭐ 4.9/5 ⭐ from 500+ reviews').",
      "guarantees": "Prominently display satisfaction guarantees or warranty information if mentioned in specs."
    },
    "constraints": {
      "shortDescription": [
        "5-6 Bullets maximum.",
        "Start each bullet with a bolded [CAPITALIZED KEY BENEFIT] in a sophisticated color (#8B7355, #2C3E50, or #4A4A4A).",
        "Use a subtle emoji or symbol (●, ▶, ◆) before each bullet for visual appeal.",
        "Focus on the 'Transformation' - how does the customer's life improve?",
        "End with a clear, emotionally resonant Call to Action (CTA) in a contrasting but elegant color.",
        "Include subtle trust signals like '⭐ SATISFACTION GUARANTEED' or '🔒 SECURE CHECKOUT'."
      ],
      "detailedDescription": [
        "Use <h1> for a punchy, benefit-driven title with sophisticated color (#1A1A1A or #2C1810).",
        "Use <h2> for feature-specific storytelling sections with elegant border-bottom or subtle background.",
        "Create visually appealing feature grids using <div class='feature-grid'> with 2-3 columns on desktop.",
        "Mandatory: Convert all JSON spec data into a professionally styled 4-column <table> with:",
        "  - Light gray header background (#F5F5F7)",
        "  - Alternating row colors (#FFFFFF and #FAFAFC)",
        "  - Subtle borders (#E0E0E0)",
        "  - cellpadding='12' for comfortable spacing",
        "  - Proper <thead> with bold, slightly uppercase text",
        "Retention: All <img> tags from the source must be preserved in their original sequence.",
        "Style images with subtle border-radius (4px) and light box-shadow for depth.",
        "Semantic HTML: Use <section>, <article>, <header>, and <strong> for accessibility and SEO ranking.",
        "Add subtle hover effects on interactive elements.",
        "Include a comparison section highlighting what makes this product unique.",
        "End with a compelling summary and final call-to-action."
      ],
      "colorPalette": {
        "primary": "#2C3E50 (Deep Midnight Blue) - For main headings and key accents",
        "secondary": "#8B7355 (Rich Taupe) - For subheadings and supporting elements",
        "accent": "#C4A484 (Champagne Gold) - For calls-to-action and premium badges",
        "background": "#F9F9F9 (Off-white) - Main background for readability",
        "text": "#333333 (Dark Gray) - Body text for comfortable reading",
        "highlight": "#E8D5C4 (Warm Beige) - For highlighting important information",
        "tableHeader": "#F0E9E2 (Elegant Cream) - For table headers",
        "tableBorder": "#D4C4B5 (Soft Brown) - For table borders"
      }
    },
    "htmlStructure": {
      shortDescription: "<ul class='premium-bullets' style='list-style: none; padding: 0; margin: 0; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; line-height: 1.6;'>\n  <li style='margin-bottom: 12px; padding-left: 28px; position: relative;'>\n    <span style='position: absolute; left: 0; color: #8B7355; font-size: 18px;'>●</span>\n    <strong style='color: #2C3E50;'>[PREMIUM MATERIAL]</strong> Description text here...\n  </li>\n  <!-- More list items -->\n  <li style='margin-top: 16px; text-align: center;'>\n    <span style='background: #2C3E50; color: white; padding: 10px 20px; border-radius: 30px; display: inline-block; font-weight: 500; letter-spacing: 0.5px;'>✨ ELEVATE YOUR EXPERIENCE TODAY ✨</span>\n  </li>\n</ul>",
      detailedDescription: "<article style='max-width: 1200px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; color: #333;'>\n  <header style='margin-bottom: 40px;'>\n    <h1 style='font-size: 32px; font-weight: 400; font-family: \"Playfair Display\", Georgia, serif; color: #2C3E50; border-bottom: 2px solid #8B7355; padding-bottom: 15px;'>Experience Unparalleled Luxury</h1>\n  </header>\n  \n  <section style='margin-bottom: 40px;'>\n    <h2 style='font-size: 24px; font-weight: 400; color: #8B7355; letter-spacing: 0.5px; margin-bottom: 20px;'>Where Craftsmanship Meets Elegance</h2>\n    <div style='display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px;'>\n      <div style='background: #F9F9F9; padding: 25px; border-radius: 8px;'>\n        <h3 style='color: #2C3E50; margin-top: 0;'>Exceptional Quality</h3>\n        <p>Detailed description with emotional resonance...</p>\n      </div>\n      <!-- More feature blocks -->\n    </div>\n  </section>\n\n  <section style='margin-bottom: 40px;'>\n    <h2 style='font-size: 24px; font-weight: 400; color: #8B7355;'>Technical Excellence</h2>\n    <table style='width: 100%; border-collapse: collapse; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.05);'>\n      <thead style='background: #F0E9E2;'>\n        <tr>\n          <th style='padding: 12px; text-align: left; color: #2C3E50; font-weight: 500; border: 1px solid #D4C4B5;'>Specification</th>\n          <th style='padding: 12px; text-align: left; color: #2C3E50; font-weight: 500; border: 1px solid #D4C4B5;'>Detail</th>\n          <th style='padding: 12px; text-align: left; color: #2C3E50; font-weight: 500; border: 1px solid #D4C4B5;'>Benefit</th>\n          <th style='padding: 12px; text-align: left; color: #2C3E50; font-weight: 500; border: 1px solid #D4C4B5;'>Certification</th>\n        </tr>\n      </thead>\n      <tbody>\n        <tr style='background: white;'>\n          <td style='padding: 12px; border: 1px solid #D4C4B5;'>Material</td>\n          <td style='padding: 12px; border: 1px solid #D4C4B5;'>Premium Cotton</td>\n          <td style='padding: 12px; border: 1px solid #D4C4B5;'>Breathable & Comfortable</td>\n          <td style='padding: 12px; border: 1px solid #D4C4B5;'>OEKO-TEX®</td>\n        </tr>\n        <tr style='background: #FAFAFC;'>\n          <td style='padding: 12px; border: 1px solid #D4C4B5;'>Dimensions</td>\n          <td style='padding: 12px; border: 1px solid #D4C4B5;'>Size specifications</td>\n          <td style='padding: 12px; border: 1px solid #D4C4B5;'>Perfect fit</td>\n          <td style='padding: 12px; border: 1px solid #D4C4B5;'>ISO Certified</td>\n        </tr>\n      </tbody>\n    </table>\n  </section>\n\n  <footer style='text-align: center; margin-top: 40px; padding: 30px; background: linear-gradient(135deg, #F9F9F9 0%, #FFFFFF 100%); border-radius: 12px;'>\n    <h3 style='color: #2C3E50; margin-bottom: 15px;'>Experience the Difference</h3>\n    <p style='margin-bottom: 20px;'>Join thousands of satisfied customers who have elevated their daily experience.</p>\n    <a href='#' style='background: #C4A484; color: white; padding: 15px 40px; text-decoration: none; border-radius: 40px; font-weight: 500; letter-spacing: 1px; display: inline-block;'>DISCOVER LUXURY NOW</a>\n  </footer>\n</article>"
    }
  }
  
  PRODUCTS TO PROCESS:
  ${description.map((p, index) => `
  --- PRODUCT ${index + 1} (ID: ${p.id}) ---
  ${p.descreption}
  `).join('\n')}
  
  IMPORTANT INSTRUCTIONS:
  1. Process EACH product individually using the complete prompt template above
  2. Apply the color psychology guidelines based on the product type and target audience
  3. Use the provided HTML structure as a foundation, adapting it to each product's unique features
  4. Return a JSON array with EXACTLY ${Array.isArray(description) ? description.length : 0} objects
  5. Each object MUST have this structure:
     {
       "id": "original_product_id",
       "shortDescription": "PROFESSIONAL_HTML_STRING with bullet points and elegant styling",
       "detailedDescription": "COMPLETE_HTML5_ARTICLE with proper semantic structure, color psychology, and responsive design"
       
       }
  6. Do NOT include any other text, explanations, or markdown
  7. Return ONLY the JSON array
  8. Preserve ALL original image tags in their exact sequence
  9. Ensure all HTML is properly formatted and escaped for JSON
  10. CRITICAL RESPONSIVE REQUIREMENTS:
      - All layouts must be mobile-first and work on phones (320px+), tablets (768px+), and desktops (1024px+)
      - Use clamp() for fluid typography and spacing
      - Use CSS Grid with auto-fit/auto-fill for responsive columns
      - Tables must be horizontally scrollable on mobile with overflow-x: auto wrapper
      - All images must use max-width: 100%, height: auto
      - Buttons/CTAs must be minimum 44x44px for touch-friendly mobile interaction
      - Use box-sizing: border-box on all elements
      - Prevent horizontal scrolling with max-width: 100vw
      - Font sizes must scale responsively using clamp() or rem units
    11. SIZE INFORMATION HANDLING:
   - Detect any size-related information (Size, Dimensions, Measurements, Chest, Length, Sleeve, Waist, Fit, Height, Width, Weight, etc.)
   - If size data exists, create a dedicated <section> titled "Size & Fit Guide"
   - Convert all size data into a professionally styled responsive HTML table
   - The table must:
       • Be wrapped inside a <div style="overflow-x:auto; width:100%;"> for mobile scrolling
       • Use 4 columns if possible: Measurement | Value | Fit Guidance | Notes
       • Use table header background #F5F5F7
       • Alternate row colors #FFFFFF and #FAFAFC
       • Use border color #E0E0E0
       • Use cellpadding="12"
       • Use proper <thead> and <tbody>
   - If only simple size info exists (e.g., "Available in S-XXL"), still create a structured 2-column table
   - If no size information exists, do NOT create a size section
   - Do NOT duplicate size info elsewhere in the article

   - If size data appears in a table, convert each row into label/value pairs
   - If no size information exists, return: "sizeInfo": []
   - Do NOT include size information inside HTML tables if already extracted — avoid duplication

  Example response format:
  [
    {
      "id": "gid://shopify/Product/123",
      "shortDescription": "<ul class='premium-bullets' style='list-style: none; padding: 0;'><li style='margin-bottom: 12px; padding-left: 28px; position: relative;'><span style='position: absolute; left: 0; color: #8B7355;'>●</span><strong style='color: #2C3E50;'>[PREMIUM CRAFTSMANSHIP]</strong> Exquisitely tailored...</li></ul>",
      "detailedDescription": "<article style='max-width: 1200px; margin: 0 auto;'><header><h1 style='color: #2C3E50; font-family: \"Playfair Display\", serif;'>Masterful Design Meets Uncompromising Quality</h1></header><section>...</section></article>"

      }
  ]`;

  try {
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (error: any) {
    console.error("Gemini Error:", error.message);
    throw new Error("Failed to optimize SEO content.");
  }
}


// prompts/productContentPrompt.js



