


import {type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useActionData, Form, useNavigation, useLoaderData, useFetcher, useSubmit } from "@remix-run/react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { shopify } from "../shopify.server";
import { Button } from "@shopify/polaris";
import { useEffect, useState } from "react";
import JSON5 from "json5";

  // sk-c8552ae161ed4db684bb1268bf4ba758
  import { Deepseek } from 'node-deepseek';
import strongCleanObjectArray, { cleanStringArray } from "./functions/parser";

  interface DeepSeekResponse {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
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
          temperature: 0.2,
          max_tokens: 8192
        })
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('DeepSeek API error:', response.status, errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
  
      const data = await response.json() as DeepSeekResponse;
      // console.log('hello dtat im e json data',data?.choices?.[0]?.message?.content)
      let resulter = data?.choices?.[0]?.message?.content;
      if (!resulter) {
        throw new Error('No content in API response');
      }
      // Only pass a string to the cleaning function if it's defined
      let tested = typeof resulter === 'string' ? strongCleanObjectArray([resulter]) : [];
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
      try {
        parsed = JSON.parse(resulter);
        console.log('Successfully parsed with JSON.parse');
      } catch (jsonError) {
        console.warn('JSON.parse failed, trying JSON5:', jsonError);
        
        // Strategy 2: Try JSON5 (more lenient parser)
        try {
          parsed = JSON5.parse(resulter);
          console.log('Successfully parsed with JSON5');
        } catch (json5Error) {
          console.warn('JSON5.parse failed, trying to extract and repair JSON:', json5Error);
          
          // Strategy 3: Extract JSON array and try to repair common issues
          const jsonMatch = resulter.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            let jsonText = jsonMatch[0];
            
            // Try to fix common issues: unescaped quotes in HTML strings
            // This is a simple fix - replace unescaped quotes inside string values
            // Note: This is a heuristic and may not work for all cases
            try {
              // First try JSON5 on the extracted text
              parsed = JSON5.parse(jsonText);
              console.log('Successfully parsed extracted JSON with JSON5');
            } catch (e) {
              console.warn('JSON5 on extracted text failed, trying manual repair:', e);
              
              // Try to repair by finding and fixing unescaped quotes in HTML content
              // This is a more aggressive approach
              try {
                let repaired = jsonText;
                
                // Strategy: Fix common HTML attribute patterns that break JSON
                // Replace single quotes in HTML attributes with escaped double quotes
                repaired = repaired.replace(/style='([^']*)'/g, (match, content) => {
                  return `style="${content.replace(/"/g, '\\"')}"`;
                });
                
                // Fix other common HTML attribute patterns
                repaired = repaired.replace(/(\w+)='([^']*)'/g, (match, attr, content) => {
                  // Only fix if it's inside a string value (has quotes around)
                  return `${attr}="${content.replace(/"/g, '\\"')}"`;
                });
                
                // Try JSON5 again with repaired text
                parsed = JSON5.parse(repaired);
                console.log('Successfully parsed after manual repair');
              } catch (repairError) {
                console.error('All parsing strategies failed:', repairError);
                console.error('Response length:', resulter.length);
                console.error('First 500 chars:', resulter.substring(0, 500));
                console.error('Last 500 chars:', resulter.substring(Math.max(0, resulter.length - 500)));
                
                // Check if response appears truncated (ends abruptly without closing brackets)
                const trimmed = resulter.trim();
                const lastChar = trimmed[trimmed.length - 1];
                const bracketCount = (trimmed.match(/\[/g) || []).length - (trimmed.match(/\]/g) || []).length;
                const braceCount = (trimmed.match(/\{/g) || []).length - (trimmed.match(/\}/g) || []).length;
                
                if (lastChar !== ']' && lastChar !== '}' || bracketCount > 0 || braceCount > 0) {
                  console.warn('Response appears to be truncated. JSON is incomplete.');
                  throw new Error('Response truncated: JSON is incomplete. Try processing fewer products at once.');
                }
                
                // Last resort: try to parse just the structure and return partial data
                throw new Error(`Failed to parse JSON: ${repairError instanceof Error ? repairError.message : 'Unknown error'}`);
              }
            }
          } else {
            throw new Error('Could not find JSON array in response');
          }
        }
      }
      
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
async function generateSeoHtml(updatedDescreptionAI:any,API_KEY_GEMINI:string) {
  // ⚠️ WARNING: Use process.env.GEMINI_KEY in production!
  // const genAI = new GoogleGenerativeAI(API_KEY_GEMINI);
  // const model = genAI.getGenerativeModel({ model:"gemini-3-flash-preview",generationConfig: {
  //   responseMimeType: "application/json",
  // }});
  // Process products in batches to avoid token limit truncation
  // Using batch size 1 to guarantee responses fit within token limits
  const BATCH_SIZE = 1;
  const allResults: any[] = [];
  for (const v of updatedDescreptionAI){
    for (let i = 0; i < updatedDescreptionAI.length; i += BATCH_SIZE) {
      const batch = updatedDescreptionAI.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(updatedDescreptionAI.length / BATCH_SIZE)} (${batch.length} products)`);
      
      // Create prompt for this batch
      const batchPrompt = `You are a JSON API. Process ALL ${batch.length} products and return a JSON array.
  
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
    ${JSON.stringify(batch.map(p => ({ id: p.id, content: p.descreption })))}
  
  IMPORTANT INSTRUCTIONS:
  1. Process EACH product individually using the complete prompt template above
  2. Apply the color psychology guidelines based on the product type and target audience
  3. Use the provided HTML structure as a foundation, adapting it to each product's unique features
  4. Return a JSON array with EXACTLY ${batch.length} objects
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
  10. CRITICAL: All quotes inside string values MUST be escaped with backslashes (\\\")
  
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
        const batchResponse = await sendPrompt(batchPrompt, API_KEY_GEMINI);
        console.log('batcher prod IDIDID',batchResponse.some((e)=>e.id===v.id))
    
        if (Array.isArray(batchResponse)) {
          allResults.push(...batchResponse);
          // console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} completed: ${batchResponse.length} products processed`);
        } else {
          console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} returned invalid format:`, batchResponse);
        }
      } catch (error) {
        console.error(`Error processing batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
        throw error; // Re-throw to stop processing if a batch fails
      }
    }
  }
  
  
  console.log(`Total products processed: ${allResults.length}/${updatedDescreptionAI.length}`);
  return allResults;
}

// prompts.ts

//  interface ProductPrompt {
//   id: string // original_product_id
//   content: string // raw description or content
// }

//  const prompt = (updatedDescreptionAI: ProductPrompt[]) => `You are a JSON API. Process ALL ${updatedDescreptionAI.length} products and return a JSON array.

// PROMPT TEMPLATE FOR EACH PRODUCT:
// {
//   role: Senior E-commerce SEO Specialist & UX Copywriter with expertise in luxury branding and color psychology,
//   objective: Transform raw technical data into a visually stunning, high-converting Amazon listing that uses professional HTML structure and strategic color psychology to drive emotional engagement and sales.,
//   outputFormat: {
//     shortDescription: PROFESSIONAL_HTML_STRING (SEO-Optimized Bullet Points with strategic color accents),
//     detailedDescription: PROFESSIONAL_HTML_STRING (A+ Content with complete HTML5 structure, color psychology, and responsive design)
//   },
//   stylingGuidelines: {
//     tone: Luxury, sophisticated, authoritative, yet emotionally resonant. Use elevated vocabulary that conveys exclusivity and quality.,
//     colorPsychology: {
//       general: Apply color psychology strategically to evoke desired emotions:,
//       colorMeanings: {
//         DeepMidnightBlue: Conveys trust, stability, sophistication, and premium quality. Ideal for technology, finance, and luxury products.,
//         RichBurgundy: Evokes luxury, passion, confidence, and timeless elegance. Perfect for premium fashion and accessories.,
//         ForestGreen: Represents growth, harmony, nature, and wealth. Excellent for organic, eco-friendly, and wellness products.,
//         CharcoalGray: Communicates authority, practicality, timelessness, and modern minimalism. Great for professional attire and tech gadgets.,
//         ChampagneGold: Signifies premium quality, success, celebration, and exclusivity. Use sparingly for accent elements.,
//         CrimsonRed: Creates urgency, excitement, passion, and energy. Effective for calls-to-action and limited offers.,
//         RoyalPurple: Associated with royalty, wisdom, creativity, and luxury. Suitable for premium and artistic products.,
//         CreamWhite: Evokes purity, simplicity, elegance, and clarity. Perfect for backgrounds and minimalist designs.
//       },
//       application: Use these colors strategically in headings, accents, and key elements. Never use bright neon or saturated primary colors which appear cheap. Maintain sophisticated, muted luxury tones.
//     },
//     typography: {
//       headings: Use elegant font stacks with proper hierarchy: 'Playfair Display', 'Cormorant Garamond', or 'Georgia' for serif elegance; 'Montserrat', 'Helvetica Neue', or 'Open Sans' for clean sans-serif.,
//       body: Use highly readable fonts like 'Lato', 'Roboto', or 'Avenir' with proper line-height (1.6) and letter-spacing for luxury feel.,
//       accent: Use subtle uppercase with letter-spacing for premium badges and highlights.
//     },
//     visualHierarchy: {
//       primary: Bold, emotive headline that captures attention and positions the product as a solution to an aspirational desire.,
//       secondary: Supporting elements that build credibility and highlight transformation.,
//       tertiary: Technical details presented in an organized, scannable format.
//     },
//     seoStrategy: Integrate primary keywords naturally into headings, first 100 words, and image alt text. Use semantic HTML for SEO ranking.
//   },
//   designElements: {
//     badges: Include premium badges like 🏆 PREMIUM QUALITY, ✨ EXCLUSIVE DESIGN, 🌟 BESTSELLER, 🎁 PERFECT GIFT where appropriate using subtle emoji or CSS pseudo-elements.,
//     testimonials: Include subtle customer satisfaction indicators where space allows (e.g., ⭐ 4.9/5 ⭐ from 500+ reviews).,
//     guarantees: Prominently display satisfaction guarantees or warranty information if mentioned in specs.
//   },
//   constraints: {
//     shortDescription: [
//       5-6 Bullets maximum.,
//       Start each bullet with a bolded [CAPITALIZED KEY BENEFIT] in a sophisticated color (#8B7355, #2C3E50, or #4A4A4A).,
//       Use a subtle emoji or symbol (●, ▶, ◆) before each bullet for visual appeal.,
//       Focus on the 'Transformation' - how does the customer's life improve?,
//       End with a clear, emotionally resonant Call to Action (CTA) in a contrasting but elegant color.,
//       Include subtle trust signals like ⭐ SATISFACTION GUARANTEED or 🔒 SECURE CHECKOUT.
//     ],
//     detailedDescription: [
//       Use <h1> for a punchy, benefit-driven title with sophisticated color (#1A1A1A or #2C1810).,
//       Use <h2> for feature-specific storytelling sections with elegant border-bottom or subtle background.,
//       Create visually appealing feature grids using <div class='feature-grid'> with 2-3 columns on desktop.,
//       Mandatory: Convert all JSON spec data into a professionally styled 4-column <table> with:,
//       - Light gray header background (#F5F5F7),
//       - Alternating row colors (#FFFFFF and #FAFAFC),
//       - Subtle borders (#E0E0E0),
//       - cellpadding='12' for comfortable spacing,
//       - Proper <thead> with bold, slightly uppercase text,
//       Retention: All <img> tags from the source must be preserved in their original sequence.,
//       Style images with subtle border-radius (4px) and light box-shadow for depth.,
//       Semantic HTML: Use <section>, <article>, <header>, and <strong> for accessibility and SEO ranking.,
//       Add subtle hover effects on interactive elements.,
//       Include a comparison section highlighting what makes this product unique.,
//       End with a compelling summary and final call-to-action.
//     ]
//   },
//   htmlStructure: {
//     shortDescription: <ul class='premium-bullets'>...</ul>,
//     detailedDescription: <article>...</article>
//   }
// }

// DATA TO PROCESS:
// ${JSON.stringify(updatedDescreptionAI.map(p => ({ id: p.id, content: p.descreption })))}

// IMPORTANT INSTRUCTIONS:
// 1. Process EACH product individually using the complete prompt template above
// 2. Apply the color psychology guidelines based on the product type and target audience
// 3. Use the provided HTML structure as a foundation, adapting it to each product's unique features
// 4. Return a JSON array with EXACTLY ${updatedDescreptionAI.length} objects
// 5. Each object MUST have this structure:
//    {
//      id: original_product_id,
//      shortDescription: PROFESSIONAL_HTML_STRING,
//      detailedDescription: COMPLETE_HTML5_ARTICLE
//    }
// 6. Do NOT include any other text or markdown
// 7. Preserve ALL original image tags
// 8. Ensure all HTML is properly formatted and escaped for JSON

// STRICT OUTPUT FORMAT:
// [
//   {
//     id: original_id,
//     shortDescription: HTML string: <ul> with 5-6 bullets, bold [BENEFITS], and elegant styling,
//     detailedDescription: HTML string: <article> with <h1>, <h2>, <section>, <table>, and preserved <img> tags
//   }
// ]`;



  // const prompt:Prompt = {
   
  //   "role": "Senior E-commerce SEO Specialist & UX Copywriter",
  //   "objective": "Transform raw technical data into a high-converting, luxury Amazon listing that balances emotional storytelling with rigorous SEO optimization.",
  //   "outputFormat": {
  //     "shortDescription": "HTML_STRING (SEO-Optimized Bullet Points)",
  //     "detailedDescription": "HTML_STRING (A+ Content / Narrative Flow)"
  //   },
  //   "stylingGuidelines": {
  //     "tone": "Sophisticated, authoritative, yet approachable. Avoid 'salesy' fluff; use high-value adjectives.",
  //     "colorPsychology": "Use sensory language that evokes the product's color and texture (e.g., 'Deep Midnight Matte' instead of 'Dark Blue').",
  //     "seoStrategy": "Integrate primary keywords naturally into headings and the first 100 words of the narrative."
  //   },
  //   "constraints": {
  //     "shortDescription": [
  //       "5-6 Bullets maximum.",
  //       "Start each bullet with a bolded [CAPITALIZED KEY BENEFIT].",
  //       "Focus on the 'Transformation' (How does the customer's life improve?).",
  //       "End with a clear, low-friction Call to Action (CTA)."
  //     ],
  //     "detailedDescription": [
  //       "Use <h1> for a punchy, benefit-driven title.",
  //       "Use <h2> for feature-specific storytelling sections.",
  //       "Mandatory: Convert all JSON spec data into a 4-column <table> with thead, cellpadding='10', and border='1'.",
  //       "Retention: All <img> tags from the source must be preserved in their original sequence.",
  //       "Semantic HTML: Use <section>, <article>, and <strong> for accessibility and SEO ranking."
  //     ]
  //   },
  //   "inputData": `${updatedDescreptionAI}`,
    
  // }

  // const result = await model.generateContent(JSON.stringify(prompt));
  // const responseText = result.response.text(); 
  // return JSON.parse(responseText);


// 2. Remix Action (Server Side)
export async function action({context ,request }: ActionFunctionArgs) {
 let {admin}=await shopify(context).authenticate.admin(request)

 let formData=await request.formData()
 let updatedDescreptionAI=JSON.parse(formData.get('descreptionAI')as string)
//  console.log('descreptionAI IS HER ',updatedDescreptionAI)

    const API_KEY_DEEP_SEEK=context.cloudflare?.env?.DEEP_SEEK_API_KEY
    console.log('api key is her ',API_KEY_DEEP_SEEK)

    const API_KEY_GEMINI_GEMINI=context.cloudflare?.env?.GEMINI_API_KEY
    console.log('api key is her ',API_KEY_GEMINI_GEMINI)

  if (!updatedDescreptionAI) {
    return Response.json({ error: "Please provide a description" }, { status: 400 });
  }
  let optimizedHtml
  try {
    try{
      const optimizedHtml_gimini =      await generateSeoHtmlgimini(API_KEY_GEMINI_GEMINI as string,updatedDescreptionAI,)
      optimizedHtml=optimizedHtml_gimini
    }
    catch{
      const optimizedHtml_deep_seek =  await generateSeoHtml(updatedDescreptionAI,API_KEY_DEEP_SEEK);
      //  await generateSeoHtmlgimini(API_KEY_GEMINI_TESTED as string,updatedDescreptionAI,)
      optimizedHtml=optimizedHtml_deep_seek
    }
 
    // console.log('new descreption is her and optimise ',optimizedHtml)


const query=  `#graphql
mutation UpdateProductDescription($input: ProductInput!) {
  productUpdate(input: $input) {
    product {
      id
      title
      descriptionHtml
      metafields(first: 5) {
        nodes {
          namespace
          key
          value
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}`
let responses

for(const DESC_AI of optimizedHtml){
    if (!DESC_AI.id|| !DESC_AI.detailedDescription || !DESC_AI.shortDescription) {
        console.error("AI returned empty fields", optimizedHtml);
        return Response.json({ error: "Empty content from AI" }, { status: 500 });
      }
  for (const OLD_DESC of updatedDescreptionAI ){
console.log('DESC_AI.id',DESC_AI.id)
console.log('OLD_DESC',OLD_DESC)
    if(DESC_AI.id===OLD_DESC.id){
      // console.log("VERIFU IS TESTED",DESC_AI.id===OLD_DESC.id)
      // console.log('is true is very nice ')
      const response=await admin.graphql(query,{
        variables:{
          "input": {
            "id": OLD_DESC.id,
            "descriptionHtml": DESC_AI.detailedDescription,
            "metafields": [
              {
                "namespace": "custom",
                "key": "descriptionsai",
                "type": "json",
                "value": JSON.stringify(DESC_AI.shortDescription)
              }
            ]
        }
      }
      })

 responses=response
    }

  }

}




 console.log('hhhhhhhhhhhhhhhhhhhhhhhhh',optimizedHtml,responses)


    // const normalizedData = {
    //     short: optimizedHtml.shortDescription || optimizedHtml["Short Description"] || "",
    //     detailed: optimizedHtml.detailedDescription || optimizedHtml["Detailed Description"] || "",
    //     productID:optimizedHtml.productsID
    //   };
    //   if (normalizedData.productID !== item.id) {
    //     throw new Error(`ID mismatch! Expected ${item.id}, got ${item.descriptionHtml}`);
    //   }
  
    //   if (!normalizedData.short || !normalizedData.detailed || !normalizedData.productID) {
    //     console.error("AI returned empty fields", optimizedHtml);
    //     return Response.json({ error: "Empty content from AI" }, { status: 500 });
    //   }
    return Response.json(optimizedHtml,responses);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to generate content" }, { status: 500 });
  }
// const resulte=await Promise.all(
//   updatedDescreptionAI.map(async (item:any) => {
//     try {
//       const optimizedHtml = await generateSeoHtml(item.descreption,item.id,API_KEY_GEMINI);
//       console.log('new descreption is her and optimise ',optimizedHtml)
//       const normalizedData = {
//           short: optimizedHtml.shortDescription || optimizedHtml["Short Description"] || "",
//           detailed: optimizedHtml.detailedDescription || optimizedHtml["Detailed Description"] || "",
//           productID:optimizedHtml.productsID
//         };
//         if (normalizedData.productID !== item.id) {
//           throw new Error(`ID mismatch! Expected ${item.id}, got ${item.descriptionHtml}`);
//         }
    
//         if (!normalizedData.short || !normalizedData.detailed || !normalizedData.productID) {
//           console.error("AI returned empty fields", optimizedHtml);
//           return Response.json({ error: "Empty content from AI" }, { status: 500 });
//         }
//       return Response.json({ 
//           short: optimizedHtml.shortDescription, 
//           detailed: optimizedHtml.detailedDescription 
//         });
//     } catch (error) {
//       console.error(error);
//       return Response.json({ error: "Failed to generate content" }, { status: 500 });
//     }
//   })
// )
//  return resulte
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
      product: string;
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
        // .filter((v: any) => v.inventoryPolicy === "CONTINUE")
        .map((v: any) => ({
          id: v.id,
          descreption: v.descriptionHtml
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
                            descreption: v.descriptionHtml
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



async function generateSeoHtmlgimini(GEMINI_API_KEY:string,description: string) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  
  // Using Gemini 3 Flash for speed and intelligence
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" ,
    generationConfig: { responseMimeType: "application/json" }
  });

  interface Prompt {
   
    role: string;
    objective: string;
    outputFormat: {
      shortDescription: string;
        detailedDescription: string;
    };
    stylingGuidelines: {
        tone: string;
        colorPsychology: string;
        seoStrategy: string;
    };
    constraints: {
        shortDescription: string[];
        detailedDescription: string[];
    };
    inputData: string;
}

  const prompt = `You are a JSON API. Process ALL ${description.length} products and return a JSON array.

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
  4. Return a JSON array with EXACTLY ${description.length} objects
  5. Each object MUST have this structure:
     {
       "id": "original_product_id",
       "shortDescription": "PROFESSIONAL_HTML_STRING with bullet points and elegant styling",
       "detailedDescription": "COMPLETE_HTML5_ARTICLE with proper semantic structure, color psychology, and responsive design"
        "sizeInfo": [
       { "label": "Measurement name", "value": "Measurement value" }
        ]
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
    11. SIZE INFORMATION EXTRACTION:
      - Detect any size-related data (Size, Dimensions, Measurement, Length, Width, Height, Weight, Chest, Waist, Sleeve, Fit, etc.)
      - Extract it into a structured array called "sizeInfo"
      - Format:
         "sizeInfo": [
         { "label": "Chest", "value": "102 cm" },
         { "label": "Length", "value": "68 cm" }
        ]
   - If size data appears in a table, convert each row into label/value pairs
   - If no size information exists, return: "sizeInfo": []
   - Do NOT include size information inside HTML tables if already extracted — avoid duplication

  Example response format:
  [
    {
      "id": "gid://shopify/Product/123",
      "shortDescription": "<ul class='premium-bullets' style='list-style: none; padding: 0;'><li style='margin-bottom: 12px; padding-left: 28px; position: relative;'><span style='position: absolute; left: 0; color: #8B7355;'>●</span><strong style='color: #2C3E50;'>[PREMIUM CRAFTSMANSHIP]</strong> Exquisitely tailored...</li></ul>",
      "detailedDescription": "<article style='max-width: 1200px; margin: 0 auto;'><header><h1 style='color: #2C3E50; font-family: \"Playfair Display\", serif;'>Masterful Design Meets Uncompromising Quality</h1></header><section>...</section></article>"
   "sizeInfo": [
      { "label": "Chest", "value": "102 cm" },
      { "label": "Length", "value": "68 cm" },
      { "label": "Fit", "value": "Regular Fit" }
    ]
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





