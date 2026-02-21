


import {type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useActionData, Form, useNavigation, useLoaderData, useFetcher, useSubmit } from "@remix-run/react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { shopify } from "../shopify.server";
import { Button } from "@shopify/polaris";
import { useEffect, useState } from "react";
import JSON5 from "json5";
import {addtags} from "./functions/query/add_tags"
  // sk-c8552ae161ed4db684bb1268bf4ba758
  import { Deepseek } from 'node-deepseek';

  
import  { generateSeoHtmlGemini } from "./functions/parser";
import { productsupdated } from "./functions/query/updateprooductquery";
import { kimi } from "./functions/KIMI_AI/kimi_descreption";
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
  // Using batch size 1 to guarantee responses fit within token limits
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




  // for (const v of updatedDescreptionAI){
  //   for (let i = 0; i < updatedDescreptionAI.length; i += BATCH_SIZE) {
  //     const batch = updatedDescreptionAI.slice(i, i + BATCH_SIZE);
  //     console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(updatedDescreptionAI.length / BATCH_SIZE)} (${batch.length} products)`);
      
      // Create prompt for this batch
    
      

    const chunkPromises = chunks.map(async (chunk, idx) => {
      console.log(`Processing chunk ${idx + 1}/${chunks.length} (${chunk.length} products)`);
  
      // Create batch prompt for this chunk
      const batchPrompt = `You are a JSON API. Process ALL ${chunk.length} products and return a JSON array.
  
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
      
      DATA TO PROCESS:
        ${JSON.stringify(chunk.map(p => ({ id: p.id, content: p.descreption })))}
      
      IMPORTANT INSTRUCTIONS:
      1. Process EACH product individually using the complete prompt template above
      2. Apply the color psychology guidelines based on the product type and target audience
      3. Use the provided HTML structure as a foundation, adapting it to each product's unique features
      4. Return a JSON array with EXACTLY ${chunk.length} objects
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
      10. CRITICAL: 
        10. CRITICAL RESPONSIVE REQUIREMENTS:
          - All quotes inside string values MUST be escaped with backslashes (\\\")
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
      STRICT OUTPUT FORMAT:
        A JSON array of objects:
        [
          {
            id: "original_id",
            shortDescription: "HTML string: <ul> with 5-6 bullets, bold [BENEFITS], and high-end styling.",
            detailedDescription: "HTML string: <article> containing <h1>, <h2>, <section>, <table> for specs, and preserving original <img> tags."
          }
        ]`;
  
      try {
         const response = await sendPrompt(batchPrompt, API_KEY_GEMINI);
        // const response = await kimi(batchPrompt, API_KEY_GEMINI);
        if (!Array.isArray(response)) {
          throw new Error(`Chunk ${idx + 1} returned invalid format`);
        }
  
        return response;
      } catch (err) {
        console.error(`Error processing chunk ${idx + 1}:`, err);
        throw err;
      }
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
        const response=await admin.graphql(
          // UPDATE_PRODUCT?.loc?.source.body
          productsupdated
          ,{
          variables:{
            "product": {
              "id": OLD_DESC.id,
              "descriptionHtml": DESC_AI.detailedDescription,
              
              "metafields": [
                {
                  "namespace": "custom",
                  "key": "descriptionsai",
                  "type": "json",
                  "value": JSON.stringify(DESC_AI.shortDescription)
                },
                {
                  "namespace": "custom",
                  "key": "sizeInfo",
                  "type": "json",
                  "value": JSON.stringify(DESC_AI.sizeInfo)
                },
                {
                  "namespace": "custom",
                  "key": "metaDescreption",
                  "type": "json",
                  "value": JSON.stringify(DESC_AI.sizeInfo)
                },

              ]
          }
        },
        
        })
        console.log(OLD_DESC.tags)
            await admin.graphql(
              // ADD_TAGS?.loc?.source.body
              addtags
              ,{
              variables:{
                "id":OLD_DESC.id,
                "tags":["DESC_AI"]
              }
            })
             
          
  
          responses=response
        }
    

   

  }

}




 console.log('hhhhhhhhhhhhhhhhhhhhhhhhh',optimizedHtml,responses)


    return Response.json(optimizedHtml,responses);
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

      {Array.isArray(actionData) && actionData?.map((e: { detailedDescription?: string }, idx: number) => (
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
      ))}
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
    products(first: 10,after:$cursor) {
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

  // const prompt = `You are a JSON API. Process ALL ${Array.isArray(description) ? description.length : 0} products and return a JSON array.

  // PROMPT TEMPLATE FOR EACH PRODUCT:
  // {
  //   "role": "Senior E-commerce SEO Specialist & UX Copywriter with expertise in luxury branding and color psychology",
  //   "objective": "Transform raw technical data into a visually stunning, high-converting Amazon listing that uses professional HTML structure and strategic color psychology to drive emotional engagement and sales.",
  //   "outputFormat": {
  //     "shortDescription": "PROFESSIONAL_HTML_STRING (SEO-Optimized Bullet Points with strategic color accents)",
  //     "detailedDescription": "PROFESSIONAL_HTML_STRING (A+ Content with complete HTML5 structure, color psychology, and responsive design)"
  //   },
  //   "stylingGuidelines": {
  //     "tone": "Luxury, sophisticated, authoritative, yet emotionally resonant. Use elevated vocabulary that conveys exclusivity and quality.",
  //     "colorPsychology": {
  //       "general": "Apply color psychology strategically to evoke desired emotions:",
  //       "colorMeanings": {
  //         "Deep Midnight Blue": "Conveys trust, stability, sophistication, and premium quality. Ideal for technology, finance, and luxury products.",
  //         "Rich Burgundy": "Evokes luxury, passion, confidence, and timeless elegance. Perfect for premium fashion and accessories.",
  //         "Forest Green": "Represents growth, harmony, nature, and wealth. Excellent for organic, eco-friendly, and wellness products.",
  //         "Charcoal Gray": "Communicates authority, practicality, timelessness, and modern minimalism. Great for professional attire and tech gadgets.",
  //         "Champagne Gold": "Signifies premium quality, success, celebration, and exclusivity. Use sparingly for accent elements.",
  //         "Crimson Red": "Creates urgency, excitement, passion, and energy. Effective for calls-to-action and limited offers.",
  //         "Royal Purple": "Associated with royalty, wisdom, creativity, and luxury. Suitable for premium and artistic products.",
  //         "Cream White": "Evokes purity, simplicity, elegance, and clarity. Perfect for backgrounds and minimalist designs."
  //       },
  //       "application": "Use these colors strategically in headings, accents, and key elements. Never use bright neon or saturated primary colors which appear cheap. Maintain sophisticated, muted luxury tones."
  //     },
  //     "typography": {
  //       "headings": "Use elegant font stacks with proper hierarchy: 'Playfair Display', 'Cormorant Garamond', or 'Georgia' for serif elegance; 'Montserrat', 'Helvetica Neue', or 'Open Sans' for clean sans-serif.",
  //       "body": "Use highly readable fonts like 'Lato', 'Roboto', or 'Avenir' with proper line-height (1.6) and letter-spacing for luxury feel.",
  //       "accent": "Use subtle uppercase with letter-spacing for premium badges and highlights."
  //     },
  //     "visualHierarchy": {
  //       "primary": "Bold, emotive headline that captures attention and positions the product as a solution to an aspirational desire.",
  //       "secondary": "Supporting elements that build credibility and highlight transformation.",
  //       "tertiary": "Technical details presented in an organized, scannable format."
  //     },
  //     "seoStrategy": "Integrate primary keywords naturally into headings, first 100 words, and image alt text. Use semantic HTML for SEO ranking."
  //   },
  //   "responsiveDesign": {
  //     "mobileFirst": "Design mobile-first, then enhance for larger screens. All layouts must be fully responsive and work perfectly on phones (320px+), tablets (768px+), and desktops (1024px+).",
  //     "flexibleLayouts": "Use flexible units (%, vw, vh, rem, em) instead of fixed pixels. Use CSS Grid and Flexbox for responsive layouts that adapt automatically.",
  //     "typography": {
  //       "mobile": "Font sizes must scale: h1: 24-28px, h2: 20-22px, body: 14-16px on mobile. Use rem units for scalability.",
  //       "tablet": "Font sizes: h1: 28-32px, h2: 24-26px, body: 16-18px on tablets.",
  //       "desktop": "Font sizes: h1: 32-36px, h2: 26-28px, body: 16-18px on desktop."
  //     },
  //     "images": "All images must use max-width: 100%, height: auto, and display: block. Include srcset for responsive images when possible. Images must never overflow containers.",
  //     "tables": "Tables must be horizontally scrollable on mobile using overflow-x: auto wrapper. Consider converting to card layout on mobile (under 768px) for better UX.",
  //     "grids": "Feature grids: 1 column on mobile, 2 columns on tablet (768px+), 3-4 columns on desktop (1024px+). Use CSS Grid with auto-fit/auto-fill.",
  //     "spacing": "Use responsive padding/margins: smaller on mobile (8-12px), medium on tablet (16-20px), larger on desktop (24-30px). Use clamp() for fluid spacing.",
  //     "touchTargets": "All interactive elements (buttons, links) must be at least 44x44px on mobile for easy touch interaction.",
  //     "mediaQueries": "Include inline media queries using @media in style attributes or use CSS custom properties. Breakpoints: mobile (<768px), tablet (768px-1023px), desktop (1024px+).",
  //     "viewport": "Ensure content never exceeds viewport width. Use box-sizing: border-box on all elements. Prevent horizontal scrolling."
  //   },
  //   "designElements": {
  //     "badges": "Include premium badges like '🏆 PREMIUM QUALITY', '✨ EXCLUSIVE DESIGN', '🌟 BESTSELLER', '🎁 PERFECT GIFT' where appropriate using subtle emoji or CSS pseudo-elements.",
  //     "testimonials": "Include subtle customer satisfaction indicators where space allows (e.g., '⭐ 4.9/5 ⭐ from 500+ reviews').",
  //     "guarantees": "Prominently display satisfaction guarantees or warranty information if mentioned in specs."
  //   },
  //   "constraints": {
  //     "shortDescription": [
  //       "5-6 Bullets maximum.",
  //       "Start each bullet with a bolded [CAPITALIZED KEY BENEFIT] in a sophisticated color (#8B7355, #2C3E50, or #4A4A4A).",
  //       "Use a subtle emoji or symbol (●, ▶, ◆) before each bullet for visual appeal.",
  //       "Focus on the 'Transformation' - how does the customer's life improve?",
  //       "End with a clear, emotionally resonant Call to Action (CTA) in a contrasting but elegant color.",
  //       "Include subtle trust signals like '⭐ SATISFACTION GUARANTEED' or '🔒 SECURE CHECKOUT'."
  //     ],
  //     "detailedDescription": [
  //       "Use <h1> for a punchy, benefit-driven title with sophisticated color (#1A1A1A or #2C1810).",
  //       "Use <h2> for feature-specific storytelling sections with elegant border-bottom or subtle background.",
  //       "Create visually appealing feature grids using <div class='feature-grid'> with 2-3 columns on desktop.",
  //       "Mandatory: Convert all JSON spec data into a professionally styled 4-column <table> with:",
  //       "  - Light gray header background (#F5F5F7)",
  //       "  - Alternating row colors (#FFFFFF and #FAFAFC)",
  //       "  - Subtle borders (#E0E0E0)",
  //       "  - cellpadding='12' for comfortable spacing",
  //       "  - Proper <thead> with bold, slightly uppercase text",
  //       "Retention: All <img> tags from the source must be preserved in their original sequence.",
  //       "Style images with subtle border-radius (4px) and light box-shadow for depth.",
  //       "Semantic HTML: Use <section>, <article>, <header>, and <strong> for accessibility and SEO ranking.",
  //       "Add subtle hover effects on interactive elements.",
  //       "Include a comparison section highlighting what makes this product unique.",
  //       "End with a compelling summary and final call-to-action."
  //     ],
  //     "colorPalette": {
  //       "primary": "#2C3E50 (Deep Midnight Blue) - For main headings and key accents",
  //       "secondary": "#8B7355 (Rich Taupe) - For subheadings and supporting elements",
  //       "accent": "#C4A484 (Champagne Gold) - For calls-to-action and premium badges",
  //       "background": "#F9F9F9 (Off-white) - Main background for readability",
  //       "text": "#333333 (Dark Gray) - Body text for comfortable reading",
  //       "highlight": "#E8D5C4 (Warm Beige) - For highlighting important information",
  //       "tableHeader": "#F0E9E2 (Elegant Cream) - For table headers",
  //       "tableBorder": "#D4C4B5 (Soft Brown) - For table borders"
  //     }
  //   },
  //   "htmlStructure": {
  //     shortDescription: "<ul class='premium-bullets' style='list-style: none; padding: 0; margin: 0; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; line-height: 1.6;'>\n  <li style='margin-bottom: 12px; padding-left: 28px; position: relative;'>\n    <span style='position: absolute; left: 0; color: #8B7355; font-size: 18px;'>●</span>\n    <strong style='color: #2C3E50;'>[PREMIUM MATERIAL]</strong> Description text here...\n  </li>\n  <!-- More list items -->\n  <li style='margin-top: 16px; text-align: center;'>\n    <span style='background: #2C3E50; color: white; padding: 10px 20px; border-radius: 30px; display: inline-block; font-weight: 500; letter-spacing: 0.5px;'>✨ ELEVATE YOUR EXPERIENCE TODAY ✨</span>\n  </li>\n</ul>",
  //     detailedDescription: "<article style='max-width: 1200px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; color: #333;'>\n  <header style='margin-bottom: 40px;'>\n    <h1 style='font-size: 32px; font-weight: 400; font-family: \"Playfair Display\", Georgia, serif; color: #2C3E50; border-bottom: 2px solid #8B7355; padding-bottom: 15px;'>Experience Unparalleled Luxury</h1>\n  </header>\n  \n  <section style='margin-bottom: 40px;'>\n    <h2 style='font-size: 24px; font-weight: 400; color: #8B7355; letter-spacing: 0.5px; margin-bottom: 20px;'>Where Craftsmanship Meets Elegance</h2>\n    <div style='display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px;'>\n      <div style='background: #F9F9F9; padding: 25px; border-radius: 8px;'>\n        <h3 style='color: #2C3E50; margin-top: 0;'>Exceptional Quality</h3>\n        <p>Detailed description with emotional resonance...</p>\n      </div>\n      <!-- More feature blocks -->\n    </div>\n  </section>\n\n  <section style='margin-bottom: 40px;'>\n    <h2 style='font-size: 24px; font-weight: 400; color: #8B7355;'>Technical Excellence</h2>\n    <table style='width: 100%; border-collapse: collapse; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.05);'>\n      <thead style='background: #F0E9E2;'>\n        <tr>\n          <th style='padding: 12px; text-align: left; color: #2C3E50; font-weight: 500; border: 1px solid #D4C4B5;'>Specification</th>\n          <th style='padding: 12px; text-align: left; color: #2C3E50; font-weight: 500; border: 1px solid #D4C4B5;'>Detail</th>\n          <th style='padding: 12px; text-align: left; color: #2C3E50; font-weight: 500; border: 1px solid #D4C4B5;'>Benefit</th>\n          <th style='padding: 12px; text-align: left; color: #2C3E50; font-weight: 500; border: 1px solid #D4C4B5;'>Certification</th>\n        </tr>\n      </thead>\n      <tbody>\n        <tr style='background: white;'>\n          <td style='padding: 12px; border: 1px solid #D4C4B5;'>Material</td>\n          <td style='padding: 12px; border: 1px solid #D4C4B5;'>Premium Cotton</td>\n          <td style='padding: 12px; border: 1px solid #D4C4B5;'>Breathable & Comfortable</td>\n          <td style='padding: 12px; border: 1px solid #D4C4B5;'>OEKO-TEX®</td>\n        </tr>\n        <tr style='background: #FAFAFC;'>\n          <td style='padding: 12px; border: 1px solid #D4C4B5;'>Dimensions</td>\n          <td style='padding: 12px; border: 1px solid #D4C4B5;'>Size specifications</td>\n          <td style='padding: 12px; border: 1px solid #D4C4B5;'>Perfect fit</td>\n          <td style='padding: 12px; border: 1px solid #D4C4B5;'>ISO Certified</td>\n        </tr>\n      </tbody>\n    </table>\n  </section>\n\n  <footer style='text-align: center; margin-top: 40px; padding: 30px; background: linear-gradient(135deg, #F9F9F9 0%, #FFFFFF 100%); border-radius: 12px;'>\n    <h3 style='color: #2C3E50; margin-bottom: 15px;'>Experience the Difference</h3>\n    <p style='margin-bottom: 20px;'>Join thousands of satisfied customers who have elevated their daily experience.</p>\n    <a href='#' style='background: #C4A484; color: white; padding: 15px 40px; text-decoration: none; border-radius: 40px; font-weight: 500; letter-spacing: 1px; display: inline-block;'>DISCOVER LUXURY NOW</a>\n  </footer>\n</article>"
  //   }
  // }
  
  // PRODUCTS TO PROCESS:
  // ${description.map((p, index) => `
  // --- PRODUCT ${index + 1} (ID: ${p.id}) ---
  // ${p.descreption}
  // `).join('\n')}
  
  // IMPORTANT INSTRUCTIONS:
  // 1. Process EACH product individually using the complete prompt template above
  // 2. Apply the color psychology guidelines based on the product type and target audience
  // 3. Use the provided HTML structure as a foundation, adapting it to each product's unique features
  // 4. Return a JSON array with EXACTLY ${Array.isArray(description) ? description.length : 0} objects
  // 5. Each object MUST have this structure:
  //    {
  //      "id": "original_product_id",
  //      "shortDescription": "PROFESSIONAL_HTML_STRING with bullet points and elegant styling",
  //      "detailedDescription": "COMPLETE_HTML5_ARTICLE with proper semantic structure, color psychology, and responsive design"
  //       "sizeInfo": [
  //      { "label": "Measurement name", "value": "Measurement value" }
  //       ]
  //      }
  // 6. Do NOT include any other text, explanations, or markdown
  // 7. Return ONLY the JSON array
  // 8. Preserve ALL original image tags in their exact sequence
  // 9. Ensure all HTML is properly formatted and escaped for JSON
  // 10. CRITICAL RESPONSIVE REQUIREMENTS:
  //     - All layouts must be mobile-first and work on phones (320px+), tablets (768px+), and desktops (1024px+)
  //     - Use clamp() for fluid typography and spacing
  //     - Use CSS Grid with auto-fit/auto-fill for responsive columns
  //     - Tables must be horizontally scrollable on mobile with overflow-x: auto wrapper
  //     - All images must use max-width: 100%, height: auto
  //     - Buttons/CTAs must be minimum 44x44px for touch-friendly mobile interaction
  //     - Use box-sizing: border-box on all elements
  //     - Prevent horizontal scrolling with max-width: 100vw
  //     - Font sizes must scale responsively using clamp() or rem units
  //   11. SIZE INFORMATION HANDLING:
  //  - Detect any size-related information (Size, Dimensions, Measurements, Chest, Length, Sleeve, Waist, Fit, Height, Width, Weight, etc.)
  //  - If size data exists, create a dedicated <section> titled "Size & Fit Guide"
  //  - Convert all size data into a professionally styled responsive HTML table
  //  - The table must:
  //      • Be wrapped inside a <div style="overflow-x:auto; width:100%;"> for mobile scrolling
  //      • Use 4 columns if possible: Measurement | Value | Fit Guidance | Notes
  //      • Use table header background #F5F5F7
  //      • Alternate row colors #FFFFFF and #FAFAFC
  //      • Use border color #E0E0E0
  //      • Use cellpadding="12"
  //      • Use proper <thead> and <tbody>
  //  - If only simple size info exists (e.g., "Available in S-XXL"), still create a structured 2-column table
  //  - If no size information exists, do NOT create a size section
  //  - Do NOT duplicate size info elsewhere in the article

  //  - If size data appears in a table, convert each row into label/value pairs
  //  - If no size information exists, return: "sizeInfo": []
  //  - Do NOT include size information inside HTML tables if already extracted — avoid duplication

  // Example response format:
  // [
  //   {
  //     "id": "gid://shopify/Product/123",
  //     "shortDescription": "<ul class='premium-bullets' style='list-style: none; padding: 0;'><li style='margin-bottom: 12px; padding-left: 28px; position: relative;'><span style='position: absolute; left: 0; color: #8B7355;'>●</span><strong style='color: #2C3E50;'>[PREMIUM CRAFTSMANSHIP]</strong> Exquisitely tailored...</li></ul>",
  //     "detailedDescription": "<article style='max-width: 1200px; margin: 0 auto;'><header><h1 style='color: #2C3E50; font-family: \"Playfair Display\", serif;'>Masterful Design Meets Uncompromising Quality</h1></header><section>...</section></article>"

  //     }
  // ]`;
const prompt=generateProductPrompt(description)
console.log(prompt)
  try {
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (error: any) {
    console.error("Gemini Error:", error.message);
    throw new Error("Failed to optimize SEO content.");
  }
}


// prompts/productContentPrompt.js
const generateProductPrompt = (products) => {
  const productCount = Array.isArray(products) ? products.length : 0;
  
  const productData = products.map((p, index) => `
--- PRODUCT ${index + 1} (ID: ${p.id}) ---
${p.descreption}
`).join('\n');

  return `You are a professional E-commerce Content Generation API. Process ALL ${productCount} products and return a valid JSON array.

## ROLE DEFINITION
Senior E-commerce SEO Specialist & UX Copywriter with expertise in:
- Luxury brand positioning
- Color psychology & emotional design
- Conversion rate optimization (CRO)
- Amazon A+ Content standards
- Responsive HTML5/CSS3 implementation

## CORE OBJECTIVE
Transform raw product data into visually stunning, high-converting product listings that combine professional HTML structure, strategic color psychology, and persuasive copywriting to drive emotional engagement and sales conversion.

## OUTPUT FORMAT
Return a JSON array where each object contains:
{
  "id": "original_product_id",
  "shortDescription": "HTML_STRING - SEO-optimized bullet points with strategic styling",
  "detailedDescription": "HTML_STRING - Complete A+ Content with semantic HTML5 structure",
  "sizeInfo": [
    { "label": "Measurement name", "value": "Measurement value" }
  ] OR []
}

## DESIGN SYSTEM

### Color Psychology Framework
Apply these colors strategically based on product category:

| Color | Hex Code | Psychology | Best For |
|-------|----------|------------|----------|
| Deep Midnight Blue | #2C3E50 | Trust, stability, premium quality | Technology, finance, luxury goods |
| Rich Burgundy | #722F37 | Luxury, passion, timeless elegance | Premium fashion, accessories |
| Forest Green | #228B22 | Growth, harmony, natural wellness | Organic, eco-friendly products |
| Charcoal Gray | #36454F | Authority, modern minimalism | Professional attire, tech gadgets |
| Champagne Gold | #C4A484 | Success, exclusivity, celebration | Accent elements, premium badges |
| Crimson Red | #DC143C | Urgency, excitement, energy | CTAs, limited offers |
| Royal Purple | #7851A9 | Royalty, creativity, luxury | Artistic, premium products |
| Cream White | #FDF5E6 | Purity, clarity, elegance | Backgrounds, minimalist designs |

**Color Application Rules:**
- Never use bright neon or saturated primary colors
- Maintain sophisticated, muted luxury tones
- Use Champagne Gold sparingly for premium accents only
- Match color scheme to product category and target demographic

### Typography Standards
- H1: 'Playfair Display', Georgia, serif | clamp(28px, 4vw, 36px) | #2C3E50
- H2: 'Montserrat', 'Helvetica Neue', sans-serif | clamp(22px, 3vw, 28px) | #8B7355
- Body: 'Lato', 'Roboto', sans-serif | clamp(14px, 1.5vw, 18px) | #333333
- Accent: Uppercase, letter-spacing: 1px, font-weight: 600

### Responsive Design Specifications
- Mobile: 320px-767px | Tablet: 768px-1023px | Desktop: 1024px+
- Grid: repeat(auto-fit, minmax(280px, 1fr))
- Touch targets: Minimum 44px × 44px
- Images: max-width: 100%, height: auto, border-radius: 4px
- Tables: Wrap in overflow-x: auto container

## CONTENT STRUCTURE

### Short Description (5-6 Bullets Maximum)
Template:
<ul class="premium-bullets" style="list-style: none; padding: 0; margin: 0; font-family: 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
  <li style="margin-bottom: 14px; padding-left: 32px; position: relative;">
    <span style="position: absolute; left: 0; color: #8B7355; font-size: 20px;">●</span>
    <strong style="color: #2C3E50; font-weight: 600;">[KEY BENEFIT]</strong> 
    Transformation-focused description emphasizing customer value...
  </li>
  <!-- Repeat for 4-5 key benefits -->
  <li style="margin-top: 20px; text-align: center; padding: 20px; background: linear-gradient(135deg, #F9F9F9 0%, #FFFFFF 100%); border-radius: 8px;">
    <span style="background: #2C3E50; color: white; padding: 12px 28px; border-radius: 30px; display: inline-block; font-weight: 500; letter-spacing: 0.5px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      ✨ ELEVATE YOUR EXPERIENCE TODAY ✨
    </span>
  </li>
</ul>

**Bullet Requirements:**
- Start with bolded [CAPITALIZED KEY BENEFIT] in #2C3E50 or #8B7355
- Use elegant bullet symbols (●, ◆, ▶)
- Focus on transformation, not just features
- Include trust signals: ⭐ Satisfaction Guaranteed, 🔒 Secure Checkout
- End with compelling CTA

### Detailed Description (A+ Content Structure)
<article style="max-width: 1200px; margin: 0 auto; font-family: 'Segoe UI', Roboto, sans-serif; color: #333; line-height: 1.6; padding: clamp(16px, 3vw, 40px);">
  
  <header style="margin-bottom: clamp(30px, 5vw, 50px); text-align: center;">
    <h1 style="font-size: clamp(28px, 4vw, 36px); font-weight: 400; font-family: 'Playfair Display', Georgia, serif; color: #2C3E50; border-bottom: 3px solid #8B7355; padding-bottom: 20px; margin-bottom: 20px;">
      [Benefit-Driven Headline]
    </h1>
    <p style="font-size: clamp(16px, 2vw, 20px); color: #666; max-width: 800px; margin: 0 auto;">
      [Subheadline with emotional hook]
    </p>
  </header>

  <section style="margin-bottom: clamp(30px, 5vw, 50px);">
    <h2 style="font-size: clamp(22px, 3vw, 28px); font-weight: 500; color: #8B7355; letter-spacing: 0.5px; margin-bottom: 24px; border-left: 4px solid #C4A484; padding-left: 16px;">
      [Section Title]
    </h2>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: clamp(16px, 2vw, 30px);">
      <div style="background: #F9F9F9; padding: clamp(20px, 3vw, 30px); border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <h3 style="color: #2C3E50; margin-top: 0; font-size: clamp(18px, 2vw, 22px);">[Feature Title]</h3>
        <p>[Benefit-focused description]</p>
      </div>
    </div>
  </section>

  <section style="margin-bottom: clamp(30px, 5vw, 50px);">
    <h2 style="font-size: clamp(22px, 3vw, 28px); font-weight: 500; color: #8B7355; letter-spacing: 0.5px; margin-bottom: 24px;">
      Technical Specifications
    </h2>
    
    <div style="overflow-x: auto; width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
      <table style="width: 100%; border-collapse: collapse; background: white; min-width: 600px;">
        <thead>
          <tr style="background: #F0E9E2;">
            <th style="padding: 16px; text-align: left; color: #2C3E50; font-weight: 600; border: 1px solid #D4C4B5; text-transform: uppercase; letter-spacing: 0.5px; font-size: 14px;">Specification</th>
            <th style="padding: 16px; text-align: left; color: #2C3E50; font-weight: 600; border: 1px solid #D4C4B5; text-transform: uppercase; letter-spacing: 0.5px; font-size: 14px;">Detail</th>
            <th style="padding: 16px; text-align: left; color: #2C3E50; font-weight: 600; border: 1px solid #D4C4B5; text-transform: uppercase; letter-spacing: 0.5px; font-size: 14px;">Benefit</th>
            <th style="padding: 16px; text-align: left; color: #2C3E50; font-weight: 600; border: 1px solid #D4C4B5; text-transform: uppercase; letter-spacing: 0.5px; font-size: 14px;">Standard</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background: white;">
            <td style="padding: 14px 16px; border: 1px solid #D4C4B5;">[Spec Name]</td>
            <td style="padding: 14px 16px; border: 1px solid #D4C4B5;">[Value]</td>
            <td style="padding: 14px 16px; border: 1px solid #D4C4B5;">[Benefit]</td>
            <td style="padding: 14px 16px; border: 1px solid #D4C4B5;">[Certification]</td>
          </tr>
          <tr style="background: #FAFAFC;">
            <td style="padding: 14px 16px; border: 1px solid #D4C4B5;">[Spec Name]</td>
            <td style="padding: 14px 16px; border: 1px solid #D4C4B5;">[Value]</td>
            <td style="padding: 14px 16px; border: 1px solid #D4C4B5;">[Benefit]</td>
            <td style="padding: 14px 16px; border: 1px solid #D4C4B5;">[Certification]</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section style="margin-bottom: clamp(30px, 5vw, 50px); padding: clamp(20px, 3vw, 30px); background: #F9F9F9; border-radius: 12px;">
    <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 20px;">
      <div style="text-align: center; flex: 1; min-width: 150px;">
        <div style="font-size: 32px; margin-bottom: 8px;">🏆</div>
        <div style="font-weight: 600; color: #2C3E50; font-size: 14px;">PREMIUM QUALITY</div>
      </div>
      <div style="text-align: center; flex: 1; min-width: 150px;">
        <div style="font-size: 32px; margin-bottom: 8px;">✨</div>
        <div style="font-weight: 600; color: #2C3E50; font-size: 14px;">EXCLUSIVE DESIGN</div>
      </div>
      <div style="text-align: center; flex: 1; min-width: 150px;">
        <div style="font-size: 32px; margin-bottom: 8px;">🌟</div>
        <div style="font-weight: 600; color: #2C3E50; font-size: 14px;">BESTSELLER</div>
      </div>
      <div style="text-align: center; flex: 1; min-width: 150px;">
        <div style="font-size: 32px; margin-bottom: 8px;">🎁</div>
        <div style="font-weight: 600; color: #2C3E50; font-size: 14px;">PERFECT GIFT</div>
      </div>
    </div>
  </section>

  <footer style="text-align: center; margin-top: clamp(30px, 5vw, 50px); padding: clamp(30px, 4vw, 50px); background: linear-gradient(135deg, #F9F9F9 0%, #FFFFFF 100%); border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <h3 style="color: #2C3E50; margin-bottom: 16px; font-size: clamp(20px, 3vw, 26px); font-family: 'Playfair Display', serif;">
      Experience the Difference
    </h3>
    <p style="margin-bottom: 28px; color: #666; font-size: clamp(14px, 1.5vw, 18px); max-width: 600px; margin-left: auto; margin-right: auto;">
      Join thousands of satisfied customers who have elevated their daily experience with our premium products.
    </p>
    
    <div style="display: inline-block; background: #C4A484; color: white; padding: 16px 40px; border-radius: 40px; font-weight: 600; letter-spacing: 1px; font-size: clamp(14px, 1.5vw, 16px); box-shadow: 0 4px 12px rgba(196, 164, 132, 0.3);">
      DISCOVER LUXURY NOW
    </div>
    
    <div style="margin-top: 24px; font-size: 14px; color: #888;">
      ⭐ 4.9/5 from 500+ reviews · 🔒 Secure Checkout · 🚚 Free Shipping
    </div>
  </footer>
</article>

## PROCESSING INSTRUCTIONS

1. **Content Analysis**: Identify product category, extract specifications, detect size info, locate images
2. **Color Strategy**: Select scheme based on product type (Tech=Blue, Fashion=Burgundy, Organic=Green, etc.)
3. **SEO Optimization**: Integrate keywords in H1 and first 100 words, use semantic HTML
4. **Size Information**: 
   - IF size data exists: Create "Size & Fit Guide" section with responsive table
   - IF no size data: Return "sizeInfo": [] and omit section
5. **Image Preservation**: Maintain ALL original <img> tags, apply responsive styling, add loading="lazy"

## QUALITY CHECKLIST
- [ ] All HTML properly escaped for JSON
- [ ] No markdown formatting in output
- [ ] Valid JSON structure
- [ ] All products processed (${productCount} total)
- [ ] Images preserved in original order
- [ ] Mobile-responsive design implemented
- [ ] Color psychology applied appropriately
- [ ] Size info extracted correctly

## INPUT DATA
${productData}

## OUTPUT REQUIREMENTS
1. Return ONLY a valid JSON array
2. NO markdown code blocks (no \`\`\`json)
3. NO explanatory text before or after JSON
4. NO comments within JSON
5. PROPERLY ESCAPED quotes and newlines in HTML
6. EXACTLY ${productCount} objects in array

Example output structure:
[
  {
    "id": "gid://shopify/Product/123",
    "shortDescription": "<ul style=\\"list-style: none;...\\">...",
    "detailedDescription": "<article style=\\"max-width: 1200px;...\\">...",
    "sizeInfo": [
      { "label": "Chest Width", "value": "42 inches" }
    ]
  }
]`;
};



