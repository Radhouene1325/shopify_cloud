


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
  //   const fieldLabel = isShort ? 'shortDescription (bullet points only)' : 'detailedDescription (full article only)';
  //   const outputStructure = isShort
  //     ? '{ "id": "original_product_id", "shortDescription": "PROFESSIONAL_HTML_STRING" }'
  //     : '{ "id": "original_product_id", "detailedDescription": "COMPLETE_HTML5_ARTICLE" }';

  //   return `You are a JSON API. Process ALL ${chunk.length} products and return a JSON array with ONLY ${fieldLabel}.

  //   PROMPT TEMPLATE FOR EACH PRODUCT:
  //   {
  //     "role": "Senior E-commerce & Ad Copy Specialist, expert in high-conversion listings for Amazon and social ads (Google/Facebook/TikTok)",
  //     "objective": "Transform raw technical data into a visually engaging Amazon listing using professional HTML, color psychology, and ad‑ready hooks for easy repurposing across platforms.",
  //     "outputFormat": {
  //       ${isShort
  //         ? '"shortDescription": "PROFESSIONAL_HTML_STRING (SEO-optimized bullet points with strategic color accents and strong CTA)"'
  //         : '"detailedDescription": "PROFESSIONAL_HTML_STRING (A+ Content with complete HTML5 structure, color psychology, responsive design, and a 4‑column specs table)"'
  //       }
  //     },
  //     "stylingGuidelines": {
  //       "tone": "Luxury, sophisticated, authoritative, yet emotionally resonant — also punchy enough for social snippets.",
  //       "colorPalette": {
  //         "primary": "#2C3E50", "secondary": "#8B7355", "accent": "#C4A484",
  //         "background": "#F9F9F9", "text": "#333333", "highlight": "#E8D5C4",
  //         "tableHeader": "#F0E9E2", "tableBorder": "#D4C4B5"
  //       }
  //     },
  //     ${isShort
  //       ? '"constraints": ["5-6 bullets maximum.", "Start each bullet with bolded [BENEFIT].", "Use subtle emoji (●, ▶) before each bullet.", "End with a clear, urgent CTA that works for ads."]'
  //       : '"constraints": ["Use <h1>, <h2>, <section>.", "Convert specs into a styled <table> with exactly 4 columns (Feature | Specification | Benefit | Compatibility).", "Preserve ALL <img> tags. Limit to 3-4 sections to stay concise.", "Include a closing CTA adaptable for Google/Facebook/TikTok ads."]'
  //     }
  //   }

  //   DATA TO PROCESS:
  //   ${JSON.stringify(chunk.map(p => ({ id: p.id, content: p.descreption })))}

  //   Return a JSON array with EXACTLY ${chunk.length} objects. Each object: ${outputStructure}
  //   CRITICAL: All quotes in strings MUST be escaped (\\"). Return ONLY the JSON array, no markdown.`;
  // }
/// thes descrepton prompts is profetionello 
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
  //     "role": "Senior E-commerce & Ad Copy Specialist, expert in high-conversion listings for Amazon and social ads (Google/Facebook/TikTok)",
  //     "objective": "Transform raw technical data into a visually engaging Amazon listing using professional HTML, color psychology, and ad‑ready hooks for easy repurposing across platforms.",
  //     "outputFormat": {
  //       ${isShort
  //         ? '"shortDescription": "PROFESSIONAL_HTML_STRING (SEO-optimized bullet points with strategic color accents and strong CTA)"'
  //         : '"detailedDescription": "PROFESSIONAL_HTML_STRING (A+ Content with complete HTML5 structure, color psychology, responsive design, and a 4‑column specs table)"'
  //       }
  //     },
  //     "stylingGuidelines": {
  //       "tone": "Luxury, sophisticated, authoritative, yet emotionally resonant — also punchy enough for social snippets.",
  //       "colorPalette": {
  //         "primary": "#2C3E50", "secondary": "#8B7355", "accent": "#C4A484",
  //         "background": "#F9F9F9", "text": "#333333", "highlight": "#E8D5C4",
  //         "tableHeader": "#F0E9E2", "tableBorder": "#D4C4B5"
  //       }
  //     },
  //     ${isShort
  //       ? '"constraints": ["5-6 bullets maximum.", "Start each bullet with bolded [BENEFIT].", "Use subtle emoji (●, ▶) before each bullet.", "End with a clear, urgent CTA that works for ads.", "Use inline styles or unique class names to prevent theme conflicts."]'
  //       : '"constraints": ["Use <h1>, <h2>, <section>.", "Convert specs into a styled <table> with exactly 4 columns: Feature | Specification | Benefit | Compatibility.", "Preserve ALL <img> tags. Limit to 3-4 sections to stay concise.", "Include a closing CTA adaptable for Google/Facebook/TikTok ads.", "Generate inline CSS or use style tags with unique class names to avoid conflicts with existing theme styles."]'
  //     }
  //   }

  //   DATA TO PROCESS:
  //   ${JSON.stringify(chunk.map(p => ({ id: p.id, content: p.descreption })))}

  //   Return a JSON array with EXACTLY ${chunk.length} objects. Each object: ${outputStructure}
  //   CRITICAL: All quotes in strings MUST be escaped (\\"). Return ONLY the JSON array, no markdown.`;
  // }



///// and thes propmpts is very profetionelle 
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
  //     "role": "Senior E-commerce & Ad Copy Specialist, expert in high-conversion listings for Amazon and social ads (Google/Facebook/TikTok)",
  //     "objective": "Transform raw technical data into a visually engaging Amazon listing using professional HTML, color psychology, ad‑ready hooks, and interactive elements that boost engagement and trust.",
  //     "outputFormat": {
  //       ${isShort
  //         ? '"shortDescription": "PROFESSIONAL_HTML_STRING (SEO-optimized bullet points with strategic color accents, emojis for engagement, and strong CTA)"'
  //         : '"detailedDescription": "PROFESSIONAL_HTML_STRING (A+ Content with complete HTML5 structure, color psychology, responsive design, a 4‑column specs table, and an interactive \\"See More / See Less\\" section that reveals full details in a magazine‑style layout)"'
  //       }
  //     },
  //     "stylingGuidelines": {
  //       "tone": "Luxury, sophisticated, authoritative, yet emotionally resonant — also punchy enough for social snippets. Include positive buying signals and subtle marketing cues that build trust and urgency.",
  //       "colorPalette": {
  //         "primary": "#2C3E50", "secondary": "#8B7355", "accent": "#C4A484",
  //         "background": "#F9F9F9", "text": "#333333", "highlight": "#E8D5C4",
  //         "tableHeader": "#F0E9E2", "tableBorder": "#D4C4B5"
  //       }
  //     },
  //     ${isShort
  //       ? '"constraints": ["5-6 bullets maximum.", "Start each bullet with bolded [BENEFIT].", "Use emojis (🎁, ✅, ⭐, 🔥) before or after key benefits to increase visual appeal and engagement.", "End with a clear, urgent CTA that works for ads.", "Include subtle trust signals (e.g., \\"Premium Quality\\", \\"Satisfaction Guaranteed\\") within bullets.", "Use inline styles or unique class names to prevent theme conflicts."]'
  //       : '"constraints": ["Use <h1>, <h2>, <section>.", "Convert specs into a styled <table> with exactly 4 columns: Feature | Specification | Benefit | Compatibility.", "Preserve ALL <img> tags. Limit to 3-4 sections to stay concise.", "Include an interactive \\"See More / See Less\\" section: initially show a shorter preview (first paragraph or key highlights). Clicking \\"See More\\" expands to the full detailed description in a professional magazine‑style layout (use CSS :checked or simple JavaScript with inline event handlers). The expanded view should include all product details, additional trust badges, and positive buying signals.", "Use emojis (🎯, 💎, 🏆, 🌟) throughout the text to emphasize features and benefits, increasing emotional connection.", "Include a closing CTA adaptable for Google/Facebook/TikTok ads, and optionally a \\"Shop Now\\" button.", "Generate inline CSS or use style tags with unique class names to avoid conflicts with existing theme styles."]'
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
  //     : '{ "id": "original_product_id", "detailedDescription": "COMPLETE_HTML5_ARTICLE" }';
  
  //   // Build constraints based on outputField with enhanced mobile responsiveness
  //   let constraints: string[];
  //   if (isShort) {
  //     constraints = [
  //       '5-6 bullets maximum.',
  //       'Start each bullet with bolded [BENEFIT].',
  //       'Use emojis (🎁, ✅, ⭐, 🔥) before or after key benefits to increase visual appeal and engagement.',
  //       'End with a clear, urgent CTA that works for ads.',
  //       'Include subtle trust signals (e.g., "Premium Quality", "Satisfaction Guaranteed") within bullets.',
  //       'If the total short description length exceeds ~80 characters on mobile, implement a "See More / See Less" toggle: initially show only the first 2 bullets or a concise preview, with a "See More" button that expands to reveal all bullets. Use inline CSS/JS (or simple :checked hack) to toggle visibility. Ensure the button is at least 44x44px for easy tapping.',
  //       'Use inline styles or unique class names to prevent theme conflicts.',
  //       'Make the entire short description container fluid (width: 100%) and test that it scales perfectly on screens down to 320px wide.',
  //       'Avoid fixed widths; use max-width and percentages.'
  //     ];
  //   } else {
  //     constraints = [
  //       'Use <h1>, <h2>, <section> with responsive font sizes (use vw, rem, or media queries).',
  //       'Convert specs into a styled <table> with exactly 4 columns: Feature | Specification | Benefit | Compatibility. On mobile (max-width: 600px), transform the table into a stacked card layout (each row becomes a block) or use overflow-x:auto to allow horizontal scrolling, whichever provides better readability. Include instructions in the CSS to handle this.',
  //       'Preserve ALL <img> tags. Limit to 3-4 sections to stay concise.',
  //       'Include an interactive "See More / See Less" section: initially show a shorter preview (first paragraph or key highlights). Clicking "See More" expands to the full detailed description in a professional magazine‑style layout (use CSS :checked or simple JavaScript with inline event handlers). The expanded view should include all product details, additional trust badges, and positive buying signals. The toggle button must be easily tappable on mobile (min 44x44px).',
  //       'Use emojis (🎯, 💎, 🏆, 🌟) throughout the text to emphasize features and benefits, increasing emotional connection.',
  //       'Include a closing CTA adaptable for Google/Facebook/TikTok ads, and optionally a "Shop Now" button.',
  //       'Generate inline CSS or use style tags with unique class names to avoid conflicts with existing theme styles.',
  //       'Ensure the entire detailed description is fully responsive: use fluid images (max-width:100%), flexible grid layouts (flexbox/grid with percentages), and media queries to adjust padding, font sizes, and stacking order on small screens. Test conceptually for 320px to 1200px.',
  //       'Consider using CSS clamp() for font sizes to scale smoothly.'
  //     ];
  //   }
  
  //   return `You are a JSON API. Process EACH of the ${chunk.length} products INDIVIDUALLY and return a JSON array with ONLY ${fieldLabel}. Analyze each product's data separately to ensure no cross-product contamination.
  
  //     PROMPT TEMPLATE FOR EACH PRODUCT:
  //     {
  //       "role": "Senior E-commerce & Ad Copy Specialist, expert in high-conversion listings for Amazon and social ads (Google/Facebook/TikTok)",
  //       "objective": "Transform raw technical data into a visually engaging Amazon listing using professional HTML, color psychology, ad‑ready hooks, and interactive elements that boost engagement and trust. Process each product's data independently. The final HTML must be fully responsive and deliver an excellent user experience on mobile phones (down to 320px width).",
  //       "outputFormat": {
  //         ${
  //           isShort
  //             ? '"shortDescription": "PROFESSIONAL_HTML_STRING (SEO-optimized bullet points with strategic color accents, emojis for engagement, strong CTA, and a mobile‑friendly \\"See More / See Less\\" toggle that ensures readability on small screens.)"'
  //             : '"detailedDescription": "PROFESSIONAL_HTML_STRING (A+ Content with complete HTML5 structure, color psychology, responsive design, a 4‑column specs table that adapts gracefully on mobile, and an interactive \\"See More / See Less\\" section that reveals full details in a magazine‑style layout.)"'
  //         }
  //       },
  //       "stylingGuidelines": {
  //         "tone": "Luxury, sophisticated, authoritative, yet emotionally resonant — also punchy enough for social snippets. Include positive buying signals and subtle marketing cues that build trust and urgency.",
  //         "colorPalette": {
  //           "primary": "#2C3E50", "secondary": "#8B7355", "accent": "#C4A484",
  //           "background": "#F9F9F9", "text": "#333333", "highlight": "#E8D5C4",
  //           "tableHeader": "#F0E9E2", "tableBorder": "#D4C4B5"
  //         }
  //       },
  //       "constraints": ${JSON.stringify(constraints, null, 2).replace(/\n/g, '\n      ')}
  //     }
  
  //     DATA TO PROCESS (process each object independently):
  //     ${JSON.stringify(chunk.map(p => ({ id: p.id, content: p.descreption })))}
  
  //     Return a JSON array with EXACTLY ${chunk.length} objects. Each object: ${outputStructure}
  //     CRITICAL: All quotes in strings MUST be escaped (\\\\"). Return ONLY the JSON array, no markdown.`;
  // }


  function buildPrompt(
    chunk: { id: string; descreption: string }[],
    outputField: 'shortDescription' | 'detailedDescription'
  ): string {
    const isShort = outputField === 'shortDescription';
    const fieldLabel = isShort
      ? 'shortDescription (bullet points only)'
      : 'detailedDescription (full article only)';
  
    const outputStructure = isShort
      ? '{ "id": "original_product_id", "shortDescription": "PROFESSIONAL_HTML_STRING" }'
      : '{ "id": "original_product_id", "detailedDescription": "COMPLETE_HTML5_ARTICLE" }';
  
    // Build constraints based on outputField with enhanced mobile responsiveness and working toggle
    let constraints: string[];
    if (isShort) {
      constraints = [
        '5-6 bullets maximum.',
        'Start each bullet with bolded [BENEFIT].',
        'Use emojis (🎁, ✅, ⭐, 🔥) before or after key benefits to increase visual appeal and engagement.',
        'End with a clear, urgent CTA that works for ads.',
        'Include subtle trust signals (e.g., "Premium Quality", "Satisfaction Guaranteed") within bullets.',
        'Implement a working "See More / See Less" toggle if the short description contains more than 2-3 bullet points (or if the content exceeds ~80 characters on mobile).',
        'Use a CSS-only method: wrap the short description in a container with a hidden checkbox and a <label> for the button. The first 2-3 bullets are always visible. Place the remaining bullets inside a <span class="more-content"> that is initially hidden (display: none). When the checkbox is checked, use the sibling selector (e.g., #toggle:checked ~ .more-content { display: inline; }) to show them. Change the button text from "See More" to "See Less" using CSS pseudo-elements based on checkbox state (e.g., label::after content).',
        'Ensure the label/button is at least 44x44px for easy tapping on mobile.',
        'The toggle must be fully functional: clicking "See More" reveals hidden bullets and changes the button text to "See Less"; clicking "See Less" hides them again.',
        'Test that the toggle does not conflict with any existing CSS or JavaScript. If a JavaScript solution is preferred, include a small inline script with event listeners, but CSS method is recommended for simplicity.',
        'Use inline styles or unique class names to prevent theme conflicts.',
        'Make the entire short description container fluid (width: 100%) and test that it scales perfectly on screens down to 320px wide.',
        'Avoid fixed widths; use max-width and percentages.'
      ];
    } else {
      constraints = [
        'Use <h1>, <h2>, <section> with responsive font sizes (use vw, rem, or media queries).',
        'Convert specs into a styled <table> with exactly 4 columns: Feature | Specification | Benefit | Compatibility. On mobile (max-width: 600px), transform the table into a stacked card layout (each row becomes a block) or use overflow-x:auto to allow horizontal scrolling, whichever provides better readability. Include instructions in the CSS to handle this.',
        'Preserve ALL <img> tags. Limit to 3-4 sections to stay concise.',
        'Include an interactive "See More / See Less" section: initially show a shorter preview (first paragraph or key highlights). Clicking "See More" expands to the full detailed description in a professional magazine‑style layout. Use CSS :checked hack or a simple inline JavaScript function to toggle visibility. The expanded view should include all product details, additional trust badges, and positive buying signals. The toggle button must be easily tappable on mobile (min 44x44px).',
        'Use emojis (🎯, 💎, 🏆, 🌟) throughout the text to emphasize features and benefits, increasing emotional connection.',
        'Include a closing CTA adaptable for Google/Facebook/TikTok ads, and optionally a "Shop Now" button.',
        'Generate inline CSS or use style tags with unique class names to avoid conflicts with existing theme styles.',
        'Ensure the entire detailed description is fully responsive: use fluid images (max-width:100%), flexible grid layouts (flexbox/grid with percentages), and media queries to adjust padding, font sizes, and stacking order on small screens. Test conceptually for 320px to 1200px.',
        'Consider using CSS clamp() for font sizes to scale smoothly.'
      ];
    }
  
    return `You are a JSON API. Process EACH of the ${chunk.length} products INDIVIDUALLY and return a JSON array with ONLY ${fieldLabel}. Analyze each product's data separately to ensure no cross-product contamination.
  
      PROMPT TEMPLATE FOR EACH PRODUCT:
      {
        "role": "Senior E-commerce & Ad Copy Specialist, expert in high-conversion listings for Amazon and social ads (Google/Facebook/TikTok)",
        "objective": "Transform raw technical data into a visually engaging Amazon listing using professional HTML, color psychology, ad‑ready hooks, and interactive elements that boost engagement and trust. Process each product's data independently. The final HTML must be fully responsive and deliver an excellent user experience on mobile phones (down to 320px width).",
        "outputFormat": {
          ${
            isShort
              ? '"shortDescription": "PROFESSIONAL_HTML_STRING (SEO-optimized bullet points with strategic color accents, emojis for engagement, strong CTA, and a fully functional mobile‑friendly \\"See More / See Less\\" toggle that works correctly.)"'
              : '"detailedDescription": "PROFESSIONAL_HTML_STRING (A+ Content with complete HTML5 structure, color psychology, responsive design, a 4‑column specs table that adapts gracefully on mobile, and an interactive \\"See More / See Less\\" section that reveals full details in a magazine‑style layout.)"'
          }
        },
        "stylingGuidelines": {
          "tone": "Luxury, sophisticated, authoritative, yet emotionally resonant — also punchy enough for social snippets. Include positive buying signals and subtle marketing cues that build trust and urgency.",
          "colorPalette": {
            "primary": "#2C3E50", "secondary": "#8B7355", "accent": "#C4A484",
            "background": "#F9F9F9", "text": "#333333", "highlight": "#E8D5C4",
            "tableHeader": "#F0E9E2", "tableBorder": "#D4C4B5"
          }
        },
        "constraints": ${JSON.stringify(constraints, null, 2).replace(/\n/g, '\n      ')}
      }
  
      DATA TO PROCESS (process each object independently):
      ${JSON.stringify(chunk.map(p => ({ id: p.id, content: p.descreption })))}
  
      Return a JSON array with EXACTLY ${chunk.length} objects. Each object: ${outputStructure}
      CRITICAL: All quotes in strings MUST be escaped (\\\\"). Return ONLY the JSON array, no markdown.`;
  }


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

  // function buildPrompt(
  //   chunk: { id: string; descreption: string }[],
  //   outputField: 'shortDescription' | 'detailedDescription'
  // ): string {
  //   const isShort = outputField === 'shortDescription';
  //   const fieldLabel = isShort
  //     ? 'shortDescription (magical bullet points only)'
  //     : 'detailedDescription (captivating full article only)';
  
  //   const outputStructure = isShort
  //     ? '{ "id": "original_product_id", "shortDescription": "HTML_STRING" }'
  //     : '{ "id": "original_product_id", "detailedDescription": "SEO_FRIENDLY_HTML_ARTICLE" }';
  
  //   return `You are a JSON API that creates stunning, SEO-optimized product descriptions. Process ALL ${chunk.length} products and return a JSON array with ONLY ${fieldLabel}.
  
  // 🔒 CRITICAL CONSTRAINT: Use EXTREMELY SPECIFIC selectors with unique prefixes to prevent ANY style leakage to other theme elements. Never use generic element selectors like "div", "h1", "table" alone - always prefix with unique class.
  
  // 🎯 CORE MISSION: Create beautiful, conversion-focused product descriptions using clean HTML/CSS that works in ANY Shopify theme WITHOUT affecting other elements.
  
  // PROMPT TEMPLATE FOR EACH PRODUCT:
  // {
  //   "role": "Senior SEO Strategist & E-commerce UX Designer",
  //   "objective": "Transform raw product data into a gorgeous, SEO-optimized product description with ISOLATED styles that won't affect the theme.",
  //   "designDirection": "Warm, professional, trustworthy, and conversion-focused with isolated styling.",
  //   "outputFormat": {
  //     ${
  //       isShort
  //         ? '"shortDescription": "SEO-Optimized bullet section with friendly design using ISOLATED styles"'
  //         : '"detailedDescription": "Complete SEO-friendly HTML5 article with Amazon-style tables using ISOLATED styles"'
  //     }
  //   },
  //   "SEORequirements": [
  //     "One optimized H1 tag using main keyword intent",
  //     "Clear H2 hierarchy for search engines",
  //     "Keyword-rich natural language",
  //     "Short, scannable paragraphs",
  //     "Conversion-focused copywriting",
  //     "Mobile-optimized",
  //     "Semantic HTML5 structure",
  //     "Proper heading hierarchy"
  //   ],
  //   ${
  //     isShort
  //       ? `"constraints": [
  //           "5-6 bullet points maximum",
  //           "Use UL and LI with custom bullet styling",
  //           "Start each bullet with emoji (✓, ✨, 🚀, 💡, ⭐, ✅)",
  //           "Include a warm CTA at the end",
  //           "Use EXTREMELY SPECIFIC class names like 'pd-bullet-list'"
  //         ]`
  //       : `"constraints": [
  //           "Use ONLY classes with 'pd-' prefix (stands for product-description)",
  //           "NEVER use bare element selectors like 'table' or 'div'",
  //           "Convert ALL technical specifications into beautiful tables",
  //           "Detect size data and create separate 'Size & Fit Guide'",
  //           "Tables must be responsive with horizontal scroll",
  //           "Preserve ALL img tags with proper alt text",
  //           "Use warm color palette: #3B82F6, #4B5563, #F9FAFB",
  //           "All hover effects must use pd- prefixed classes"
  //         ]`
  //   },
  //   "ColorPalette": {
  //     "primary": "#3B82F6",
  //     "primaryDark": "#2563EB",
  //     "text": "#4B5563",
  //     "textDark": "#1F2937",
  //     "background": "#FFFFFF",
  //     "backgroundAlt": "#F9FAFB",
  //     "border": "#E5E7EB"
  //   }
  // }
  
  // 📋 CRITICAL STYLE ISOLATION APPROACH:
  
  // <style>
  // /* 🛡️ ALL SELECTORS MUST START WITH 'pd-' - THIS IS NON-NEGOTIABLE */
  // /* This prevents ANY style from leaking into the theme */
  
  // .pd-container {
  //   all: initial; /* RESETS ALL INHERITED STYLES */
  //   display: block;
  //   max-width: 1280px;
  //   margin: 0 auto;
  //   padding: 0 1rem;
  //   font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  //   line-height: 1.6;
  //   color: #4B5563;
  // }
  
  // /* All styles must be scoped with pd- prefix */
  // .pd-container .pd-title {
  //   all: unset; /* Reset any inherited styles */
  //   display: block;
  //   font-size: 2.5rem;
  //   font-weight: 700;
  //   color: #1F2937 !important; /* Override theme styles */
  //   margin-bottom: 1rem !important;
  //   line-height: 1.2 !important;
  // }
  
  // .pd-container .pd-section-title {
  //   all: unset;
  //   display: inline-block;
  //   font-size: 2rem;
  //   font-weight: 700;
  //   color: #1F2937 !important;
  //   margin-bottom: 2rem !important;
  //   padding-bottom: 0.5rem !important;
  //   border-bottom: 3px solid #3B82F6 !important;
  // }
  
  // .pd-container .pd-feature-grid {
  //   all: unset;
  //   display: grid;
  //   grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  //   gap: 1.5rem;
  //   margin: 2rem 0 !important;
  // }
  
  // .pd-container .pd-feature-card {
  //   all: unset;
  //   display: block;
  //   background: #FFFFFF;
  //   border-radius: 16px;
  //   padding: 1.5rem !important;
  //   box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  //   border: 1px solid #E5E7EB;
  //   transition: transform 0.3s ease;
  // }
  
  // .pd-container .pd-feature-card:hover {
  //   transform: translateY(-4px);
  //   box-shadow: 0 20px 25px rgba(0,0,0,0.1);
  // }
  
  // /* 🛡️ TABLE STYLES - COMPLETELY ISOLATED */
  // .pd-container .pd-table-wrapper {
  //   all: unset;
  //   display: block;
  //   overflow-x: auto;
  //   border-radius: 12px;
  //   border: 1px solid #E5E7EB;
  //   margin: 1.5rem 0 !important;
  // }
  
  // .pd-container .pd-table {
  //   all: unset;
  //   display: table;
  //   width: 100%;
  //   border-collapse: collapse;
  //   min-width: 600px;
  //   font-size: 1rem;
  // }
  
  // .pd-container .pd-table thead {
  //   all: unset;
  //   display: table-header-group;
  // }
  
  // .pd-container .pd-table th {
  //   all: unset;
  //   display: table-cell;
  //   background: #F3F4F6;
  //   padding: 1rem 1.5rem !important;
  //   font-weight: 600 !important;
  //   color: #1F2937 !important;
  //   border-bottom: 2px solid #E5E7EB !important;
  //   text-align: left;
  // }
  
  // .pd-container .pd-table tbody {
  //   all: unset;
  //   display: table-row-group;
  // }
  
  // .pd-container .pd-table tr {
  //   all: unset;
  //   display: table-row;
  // }
  
  // .pd-container .pd-table td {
  //   all: unset;
  //   display: table-cell;
  //   padding: 1rem 1.5rem !important;
  //   border-bottom: 1px solid #E5E7EB !important;
  //   color: #4B5563 !important;
  // }
  
  // .pd-container .pd-table tr:nth-child(even) td {
  //   background: #F9FAFB;
  // }
  
  // .pd-container .pd-table tr:hover td {
  //   background: #EFF6FF !important;
  // }
  
  // /* Size cards */
  // .pd-container .pd-size-grid {
  //   all: unset;
  //   display: grid;
  //   grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  //   gap: 1rem;
  //   margin: 1.5rem 0 !important;
  // }
  
  // .pd-container .pd-size-card {
  //   all: unset;
  //   display: block;
  //   background: #F9FAFB;
  //   border-radius: 12px;
  //   padding: 1.5rem !important;
  //   text-align: center;
  //   border: 1px solid #E5E7EB;
  // }
  
  // .pd-container .pd-size-emoji {
  //   all: unset;
  //   display: block;
  //   font-size: 2rem;
  //   margin-bottom: 0.5rem;
  // }
  
  // .pd-container .pd-size-label {
  //   all: unset;
  //   display: block;
  //   font-size: 0.875rem;
  //   color: #6B7280;
  //   margin-bottom: 0.25rem;
  // }
  
  // .pd-container .pd-size-value {
  //   all: unset;
  //   display: block;
  //   font-size: 1.25rem;
  //   font-weight: 700;
  //   color: #1F2937;
  // }
  
  // /* CTA Section */
  // .pd-container .pd-cta-section {
  //   all: unset;
  //   display: block;
  //   margin-top: 4rem !important;
  //   text-align: center;
  // }
  
  // .pd-container .pd-cta-box {
  //   all: unset;
  //   display: block;
  //   background: linear-gradient(135deg, #3B82F6, #2563EB);
  //   border-radius: 24px;
  //   padding: 3rem 2rem !important;
  //   color: white;
  // }
  
  // .pd-container .pd-cta-title {
  //   all: unset;
  //   display: block;
  //   font-size: 2.5rem;
  //   font-weight: 700;
  //   color: white !important;
  //   margin-bottom: 1rem !important;
  // }
  
  // .pd-container .pd-cta-text {
  //   all: unset;
  //   display: block;
  //   font-size: 1.25rem;
  //   opacity: 0.9;
  //   margin-bottom: 2rem !important;
  // }
  
  // .pd-container .pd-cta-button {
  //   all: unset;
  //   display: inline-block;
  //   background: white;
  //   color: #3B82F6 !important;
  //   padding: 1rem 3rem !important;
  //   border-radius: 9999px;
  //   font-weight: 600;
  //   font-size: 1.125rem;
  //   cursor: pointer;
  //   transition: all 0.3s ease;
  // }
  
  // .pd-container .pd-cta-button:hover {
  //   transform: translateY(-2px);
  //   box-shadow: 0 20px 25px rgba(0,0,0,0.2);
  // }
  
  // /* Bullet points for short description */
  // .pd-container .pd-bullet-list {
  //   all: unset;
  //   display: block;
  //   list-style: none;
  //   padding: 0 !important;
  //   margin: 1.5rem 0 !important;
  // }
  
  // .pd-container .pd-bullet-item {
  //   all: unset;
  //   display: flex;
  //   align-items: flex-start;
  //   gap: 0.75rem;
  //   margin-bottom: 1rem !important;
  // }
  
  // .pd-container .pd-bullet-emoji {
  //   all: unset;
  //   display: inline-block;
  //   font-size: 1.25rem;
  //   flex-shrink: 0;
  // }
  
  // .pd-container .pd-bullet-text {
  //   all: unset;
  //   display: inline;
  //   color: #4B5563;
  // }
  
  // /* Images */
  // .pd-container .pd-image {
  //   all: unset;
  //   display: block;
  //   max-width: 100%;
  //   height: auto;
  //   border-radius: 12px;
  //   margin: 1.5rem 0 !important;
  //   box-shadow: 0 20px 25px rgba(0,0,0,0.1);
  // }
  
  // /* Mobile responsiveness */
  // @media (max-width: 640px) {
  //   .pd-container .pd-title {
  //     font-size: 2rem !important;
  //   }
  //   .pd-container .pd-section-title {
  //     font-size: 1.5rem !important;
  //   }
  //   .pd-container .pd-feature-grid {
  //     grid-template-columns: 1fr !important;
  //   }
  //   .pd-container .pd-cta-box {
  //     padding: 2rem 1rem !important;
  //   }
  //   .pd-container .pd-cta-title {
  //     font-size: 1.75rem !important;
  //   }
  // }
  // </style>
  
  // 📋 COMPLETE HTML STRUCTURE EXAMPLE:
  
  // <!-- ✅ SAFE APPROACH - STYLES WON'T LEAK -->
  // <div class="pd-container">
    
  //   <!-- HERO SECTION -->
  //   <header>
  //     <h1 class="pd-title">Premium Product Name with Keywords</h1>
  //     <p class="pd-text">Engaging introduction with natural keywords...</p>
  //     <img class="pd-image" src="image.jpg" alt="Descriptive alt text with keywords">
  //   </header>
  
  //   <!-- FEATURES SECTION -->
  //   <section>
  //     <h2 class="pd-section-title">Key Features & Benefits</h2>
      
  //     <div class="pd-feature-grid">
  //       <!-- FEATURE CARD -->
  //       <div class="pd-feature-card">
  //         <span class="pd-feature-emoji">✨</span>
  //         <h3 class="pd-feature-title">Premium Quality</h3>
  //         <p class="pd-feature-text">Benefit-focused description...</p>
  //       </div>
        
  //       <div class="pd-feature-card">
  //         <span class="pd-feature-emoji">🚀</span>
  //         <h3 class="pd-feature-title">Fast Shipping</h3>
  //         <p class="pd-feature-text">Benefit-focused description...</p>
  //       </div>
  //     </div>
  //   </section>
  
  //   <!-- TECHNICAL SPECIFICATIONS - AMAZON STYLE -->
  //   <section>
  //     <h2 class="pd-section-title">Technical Specifications</h2>
      
  //     <div class="pd-table-wrapper">
  //       <table class="pd-table">
  //         <thead>
  //           <tr>
  //             <th>Specification</th>
  //             <th>Details</th>
  //           </tr>
  //         </thead>
  //         <tbody>
  //           <tr>
  //             <td>Material</td>
  //             <td>Premium Cotton Blend</td>
  //           </tr>
  //           <tr>
  //             <td>Dimensions</td>
  //             <td>10" x 8" x 2"</td>
  //           </tr>
  //           <tr>
  //             <td>Weight</td>
  //             <td>1.2 lbs</td>
  //           </tr>
  //         </tbody>
  //       </table>
  //     </div>
  //   </section>
  
  //   <!-- SIZE & FIT GUIDE (if data exists) -->
  //   <section>
  //     <h2 class="pd-section-title">Size & Fit Guide</h2>
      
  //     <div class="pd-size-grid">
  //       <div class="pd-size-card">
  //         <span class="pd-size-emoji">📐</span>
  //         <span class="pd-size-label">Width</span>
  //         <span class="pd-size-value">12 inches</span>
  //       </div>
  //       <div class="pd-size-card">
  //         <span class="pd-size-emoji">⚖️</span>
  //         <span class="pd-size-label">Weight</span>
  //         <span class="pd-size-value">1.5 lbs</span>
  //       </div>
  //       <div class="pd-size-card">
  //         <span class="pd-size-emoji">📦</span>
  //         <span class="pd-size-label">Capacity</span>
  //         <span class="pd-size-value">20L</span>
  //       </div>
  //     </div>
  //   </section>
  
  //   <!-- CTA SECTION -->
  //   <section class="pd-cta-section">
  //     <div class="pd-cta-box">
  //       <h3 class="pd-cta-title">Ready to Transform Your Experience? 🚀</h3>
  //       <p class="pd-cta-text">Join thousands of satisfied customers</p>
  //       <button class="pd-cta-button">Shop Now →</button>
  //     </div>
  //   </section>
  // </div>
  
  // 📦 DATA TO PROCESS:
  // ${JSON.stringify(chunk.map(p => ({ id: p.id, content: p.descreption })))}
  
  // Return a JSON array with EXACTLY ${chunk.length} objects.
  // Each object: ${outputStructure}
  
  // ⚠️ CRITICAL RULES FOR STYLE ISOLATION:
  // 1. 🔴 NEVER use bare element selectors (h1, div, table, etc.)
  // 2. 🟢 ALWAYS prefix ALL classes with 'pd-'
  // 3. 🟢 Use "all: unset" or "all: initial" at start of each rule
  // 4. 🟢 Use !important on critical properties to override theme
  // 5. 🟢 Always wrap everything in <div class="pd-container">
  // 6. 🟢 Test that styles don't affect other page elements
  // 7. 🔴 NO STYLE LEAKAGE ALLOWED
  
  // Remember: Your styles should ONLY affect elements inside pd-container. Nothing else on the page should change! 🛡️
  // `;
  // }


  // function buildPrompt(
  //   chunk: { id: string; descreption: string }[],
  //   outputField: 'shortDescription' | 'detailedDescription'
  // ): string {
  //   const isShort = outputField === 'shortDescription';
  //   const fieldLabel = isShort
  //     ? 'shortDescription (magical bullet points only)'
  //     : 'detailedDescription (captivating full article with see more/less)';
  
  //   const outputStructure = isShort
  //     ? '{ "id": "original_product_id", "shortDescription": "HTML_STRING" }'
  //     : '{ "id": "original_product_id", "detailedDescription": "SEO_FRIENDLY_HTML_ARTICLE_WITH_SEE_MORE" }';
  
  //   return `You are a JSON API that creates stunning, professional product descriptions with PROPER TEXT SIZING AND TABLE FORMATTING. Process ALL ${chunk.length} products and return a JSON array with ONLY ${fieldLabel}.
  
  // 🔒 CRITICAL: Use EXTREMELY SPECIFIC selectors with 'pd-' prefix. Ensure ALL TEXT IS READABLE with proper font sizes!
  
  // 🎯 CORE MISSION: Create AliExpress-style professional product descriptions with PROPER TEXT SIZES (not too small), BEAUTIFULLY FORMATTED TABLES, and WORKING "See More/Less" functionality.
  
  // PROMPT TEMPLATE FOR EACH PRODUCT:
  // {
  //   "role": "Senior E-commerce UX Designer & Conversion Specialist",
  //   "objective": "Transform raw product data into a professional, trust-building product description with PROPER TEXT SIZES and BEAUTIFUL TABLES.",
  //   "designDirection": "Professional, clean, with LARGE READABLE TEXT and well-structured tables.",
  //   "outputFormat": {
  //     ${
  //       isShort
  //         ? '"shortDescription": "Professional bullet points with proper text sizing"'
  //         : '"detailedDescription": "Complete AliExpress-style product page with PROPER TEXT SIZES and BEAUTIFUL TABLES"'
  //     }
  //   }
  // }
  
  // 📋 COMPLETE HTML WITH PROPER TEXT SIZES AND TABLE FORMATTING:
  
  // <style>
  // /* PROFESSIONAL DESIGN WITH PROPER TEXT SIZES */
  // .pd-container * {
  //   margin: 0;
  //   padding: 0;
  //   box-sizing: border-box;
  // }
  
  // .pd-container {
  //   all: initial;
  //   display: block;
  //   max-width: 1280px;
  //   margin: 0 auto;
  //   padding: 2rem 1rem;
  //   font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  //   line-height: 1.6;
  //   color: #1E293B;
  //   background: #FFFFFF;
  // }
  
  // /* ===== PROPER TEXT SIZES - NOT TOO SMALL ===== */
  // .pd-title {
  //   font-size: 2.8rem !important;  /* LARGE TITLE */
  //   font-weight: 700;
  //   color: #0F172A !important;
  //   margin-bottom: 1.5rem !important;
  //   line-height: 1.2 !important;
  // }
  
  // .pd-section-title {
  //   font-size: 2.2rem !important;  /* LARGE SECTION TITLES */
  //   font-weight: 700;
  //   color: #0F172A !important;
  //   margin-bottom: 1.5rem !important;
  //   padding-bottom: 0.75rem;
  //   border-bottom: 3px solid #3B82F6;
  //   display: inline-block;
  // }
  
  // .pd-subsection-title {
  //   font-size: 1.8rem !important;  /* SUBSECTION TITLES */
  //   font-weight: 600;
  //   color: #1E293B !important;
  //   margin: 1.5rem 0 1rem !important;
  // }
  
  // .pd-text-large {
  //   font-size: 1.4rem !important;  /* LARGE BODY TEXT */
  //   color: #334155;
  // }
  
  // .pd-text-medium {
  //   font-size: 1.2rem !important;  /* MEDIUM BODY TEXT */
  //   color: #475569;
  // }
  
  // .pd-text-small {
  //   font-size: 3rem !important;    /* SMALL TEXT - STILL READABLE */
  //   color: #64748B;
  // }
  
  // /* PRICE SECTION - LARGE AND CLEAR */
  // .pd-price-section {
  //   display: flex;
  //   align-items: center;
  //   gap: 1.5rem;
  //   margin-bottom: 2rem;
  //   padding: 1.5rem;
  //   background: #F8FAFC;
  //   border-radius: 16px;
  //   flex-wrap: wrap;
  // }
  
  // .pd-current-price {
  //   font-size: 3.2rem !important;  /* VERY LARGE PRICE */
  //   font-weight: 700;
  //   color: #3B82F6 !important;
  // }
  
  // .pd-old-price {
  //   font-size: 2rem !important;    /* LARGE OLD PRICE */
  //   color: #94A3B8 !important;
  //   text-decoration: line-through;
  // }
  
  // .pd-discount-badge {
  //   background: #10B981;
  //   color: white !important;
  //   padding: 0.5rem 1.5rem;
  //   border-radius: 9999px;
  //   font-size: 1.4rem !important;  /* LARGE BADGE TEXT */
  //   font-weight: 600;
  // }
  
  // /* STOCK SECTION */
  // .pd-stock-section {
  //   display: flex;
  //   gap: 2rem;
  //   margin-bottom: 2rem;
  //   padding: 1.5rem;
  //   background: #F1F5F9;
  //   border-radius: 16px;
  //   flex-wrap: wrap;
  // }
  
  // .pd-stock-status {
  //   display: flex;
  //   align-items: center;
  //   gap: 1rem;
  //   flex-wrap: wrap;
  // }
  
  // .pd-in-stock {
  //   color: #10B981;
  //   font-weight: 600;
  //   font-size: 1.3rem !important;
  // }
  
  // .pd-low-stock {
  //   color: #F59E0B;
  //   font-weight: 600;
  //   font-size: 1.3rem !important;
  // }
  
  // .pd-sales-counter {
  //   color: #64748B;
  //   font-size: 1.2rem !important;
  // }
  
  // /* TRUST BADGES - LARGER */
  // .pd-trust-badges {
  //   display: grid;
  //   grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  //   gap: 1.5rem;
  //   margin: 2.5rem 0;
  //   padding: 1.5rem;
  //   background: #FFFFFF;
  //   border: 2px solid #E2E8F0;
  //   border-radius: 16px;
  // }
  
  // .pd-trust-item {
  //   display: flex;
  //   align-items: center;
  //   gap: 0.75rem;
  //   font-size: 1.2rem !important;  /* LARGER TRUST TEXT */
  //   color: #475569;
  // }
  
  // .pd-trust-icon {
  //   font-size: 1.8rem !important;  /* LARGER ICONS */
  // }
  
  // /* IMAGE GALLERY - WITH PROPER TEXT SIZES */
  // .pd-image-gallery {
  //   display: grid;
  //   grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  //   gap: 2rem;
  //   margin: 2.5rem 0;
  // }
  
  // .pd-image-card {
  //   background: #FFFFFF;
  //   border: 2px solid #E2E8F0;
  //   border-radius: 20px;
  //   overflow: hidden;
  //   transition: transform 0.3s ease;
  // }
  
  // .pd-product-image {
  //   width: 100%;
  //   height: 280px;
  //   object-fit: cover;
  //   border-bottom: 2px solid #E2E8F0;
  // }
  
  // .pd-image-title {
  //   font-size: 1.5rem !important;  /* LARGER IMAGE TITLES */
  //   font-weight: 600;
  //   color: #0F172A !important;
  //   padding: 1.2rem 1.2rem 0.5rem;
  // }
  
  // .pd-image-description {
  //   font-size: 1.1rem !important;  /* LARGER IMAGE DESCRIPTIONS */
  //   color: #64748B;
  //   padding: 0 1.2rem 1.2rem;
  //   line-height: 1.5;
  // }
  
  // /* ===== BEAUTIFUL TABLES - PROPER SIZING ===== */
  // .pd-table-container {
  //   margin: 2rem 0;
  //   border: 2px solid #E2E8F0;
  //   border-radius: 20px;
  //   overflow: hidden;
  //   box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  // }
  
  // .pd-specs-table {
  //   width: 100%;
  //   border-collapse: collapse;
  //   font-size: 1.2rem !important;  /* PROPER TABLE TEXT SIZE */
  // }
  
  // .pd-specs-table tr {
  //   border-bottom: 1px solid #E2E8F0;
  // }
  
  // .pd-specs-table tr:last-child {
  //   border-bottom: none;
  // }
  
  // .pd-specs-table td {
  //   padding: 1.5rem !important;    /* MORE PADDING */
  // }
  
  // .pd-specs-table td:first-child {
  //   font-weight: 600;
  //   color: #475569;
  //   width: 40%;
  //   background: #F8FAFC;
  //   font-size: 1.2rem !important;
  // }
  
  // .pd-specs-table td:last-child {
  //   color: #0F172A;
  //   background: #FFFFFF;
  //   font-size: 1.2rem !important;
  //   font-weight: 500;
  // }
  
  // /* DIMENSIONS CARDS - LARGER */
  // .pd-dimensions-grid {
  //   display: grid;
  //   grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  //   gap: 1.5rem;
  //   margin: 2rem 0;
  // }
  
  // .pd-dimension-card {
  //   background: #F8FAFC;
  //   border-radius: 16px;
  //   padding: 2rem 1.5rem;
  //   text-align: center;
  //   border: 2px solid #E2E8F0;
  // }
  
  // .pd-dimension-icon {
  //   font-size: 3rem !important;    /* LARGER ICONS */
  //   margin-bottom: 1rem;
  // }
  
  // .pd-dimension-label {
  //   font-size: 1.2rem !important;
  //   color: #64748B;
  //   margin-bottom: 0.5rem;
  // }
  
  // .pd-dimension-value {
  //   font-size: 1.8rem !important;  /* LARGER VALUES */
  //   font-weight: 700;
  //   color: #0F172A;
  // }
  
  // /* SHIPPING CARDS - LARGER */
  // .pd-shipping-grid {
  //   display: grid;
  //   grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  //   gap: 1.5rem;
  //   margin: 2rem 0;
  // }
  
  // .pd-shipping-card {
  //   padding: 1.8rem 1rem;
  //   background: #F8FAFC;
  //   border-radius: 16px;
  //   text-align: center;
  //   border: 2px solid #E2E8F0;
  // }
  
  // .pd-shipping-method {
  //   font-weight: 600;
  //   color: #0F172A;
  //   margin-bottom: 0.75rem;
  //   font-size: 1.3rem !important;
  // }
  
  // .pd-shipping-time {
  //   color: #3B82F6;
  //   font-size: 1.2rem !important;
  //   margin-bottom: 0.5rem;
  // }
  
  // .pd-shipping-cost {
  //   color: #10B981;
  //   font-weight: 600;
  //   font-size: 1.3rem !important;
  // }
  
  // /* REVIEW SECTION - LARGER */
  // .pd-reviews-section {
  //   margin: 2.5rem 0;
  //   padding: 2rem;
  //   background: linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%);
  //   border-radius: 20px;
  //   border: 2px solid #E2E8F0;
  // }
  
  // .pd-rating-summary {
  //   display: flex;
  //   align-items: center;
  //   gap: 1.5rem;
  //   margin-bottom: 1.5rem;
  //   flex-wrap: wrap;
  // }
  
  // .pd-average-rating {
  //   font-size: 3rem !important;    /* LARGE RATING */
  //   font-weight: 700;
  //   color: #F59E0B;
  // }
  
  // .pd-stars {
  //   color: #F59E0B;
  //   font-size: 2rem !important;    /* LARGE STARS */
  // }
  
  // .pd-review-count {
  //   color: #64748B;
  //   font-size: 1.3rem !important;
  // }
  
  // .pd-review-highlights {
  //   display: grid;
  //   grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  //   gap: 1rem;
  // }
  
  // .pd-review-tag {
  //   background: white;
  //   padding: 0.75rem 1.5rem;
  //   border-radius: 9999px;
  //   border: 2px solid #E2E8F0;
  //   font-size: 1.1rem !important;
  //   color: #334155;
  //   text-align: center;
  // }
  
  // /* WARRANTY BADGE - LARGER */
  // .pd-warranty-badge {
  //   display: inline-flex;
  //   align-items: center;
  //   gap: 0.75rem;
  //   background: #EFF6FF;
  //   color: #3B82F6 !important;
  //   padding: 1rem 2rem;
  //   border-radius: 50px;
  //   font-weight: 600;
  //   margin: 1.5rem 0;
  //   font-size: 1.3rem !important;
  // }
  
  // /* FEATURES GRID - LARGER */
  // .pd-features-grid {
  //   display: grid;
  //   grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  //   gap: 1.5rem;
  //   margin: 1.5rem 0;
  // }
  
  // .pd-feature-item {
  //   display: flex;
  //   gap: 1.2rem;
  //   padding: 1.5rem;
  //   background: #F8FAFC;
  //   border-radius: 16px;
  //   border: 2px solid #E2E8F0;
  // }
  
  // .pd-feature-icon {
  //   font-size: 2.2rem !important;
  //   flex-shrink: 0;
  // }
  
  // .pd-feature-text {
  //   color: #334155;
  //   font-size: 1.1rem !important;
  // }
  
  // .pd-feature-text strong {
  //   color: #0F172A;
  //   display: block;
  //   margin-bottom: 0.4rem;
  //   font-size: 1.2rem !important;
  // }
  
  // /* SEE MORE/LESS BUTTONS - LARGER */
  // .pd-toggle-btn {
  //   background: #3B82F6;
  //   color: white !important;
  //   padding: 0.75rem 2rem;
  //   border-radius: 50px;
  //   font-size: 1.2rem !important;
  //   font-weight: 500;
  //   border: none;
  //   cursor: pointer;
  // }
  
  // .pd-section-header {
  //   padding: 1.5rem;
  // }
  
  // .pd-section-title {
  //   font-size: 1.8rem !important;
  // }
  
  // /* MOBILE RESPONSIVENESS */
  // @media (max-width: 768px) {
  //   .pd-title {
  //     font-size: 2.4rem !important;
  //   }
    
  //   .pd-section-title {
  //     font-size: 2rem !important;
  //   }
    
  //   .pd-current-price {
  //     font-size: 2.8rem !important;
  //   }
    
  //   .pd-old-price {
  //     font-size: 1.8rem !important;
  //   }
    
  //   .pd-specs-table {
  //     font-size: 1.1rem !important;
  //   }
    
  //   .pd-specs-table td {
  //     padding: 1.2rem !important;
  //   }
    
  //   .pd-dimension-value {
  //     font-size: 1.5rem !important;
  //   }
  // }
  
  // @media (max-width: 480px) {
  //   .pd-title {
  //     font-size: 2rem !important;
  //   }
    
  //   .pd-section-title {
  //     font-size: 1.8rem !important;
  //   }
    
  //   .pd-current-price {
  //     font-size: 2.4rem !important;
  //   }
    
  //   .pd-specs-table {
  //     font-size: 1rem !important;
  //   }
    
  //   .pd-specs-table td {
  //     padding: 1rem !important;
  //   }
  // }
  // </style>
  
  // <!-- MAIN CONTAINER WITH PROPER TEXT SIZES -->
  // <div class="pd-container">
    
  //   <!-- HEADER WITH LARGE TITLE -->
  //   <header class="pd-header">
  //     <h1 class="pd-title">Men's England Style Hooded Jacket: Your Perfect Lightweight Companion for Spring & Autumn</h1>
      
     
  //   </header>
    
  //   <!-- TRUST BADGES - LARGE ICONS AND TEXT -->
  //   <div class="pd-trust-badges">
  //     <div class="pd-trust-item"><span class="pd-trust-icon">🚚</span> Free Shipping</div>
  //     <div class="pd-trust-item"><span class="pd-trust-icon">🔒</span> Secure Payment</div>
  //     <div class="pd-trust-item"><span class="pd-trust-icon">↩️</span> 30-Day Returns</div>
  //     <div class="pd-trust-item"><span class="pd-trust-icon">✓</span> 1-Year Warranty</div>
  //   </div>
    
  //   <!-- IMAGE GALLERY WITH LARGE TITLES -->
  //   <div class="pd-image-gallery">
  //     <div class="pd-image-card">
  //       <img class="pd-product-image" src="image1.jpg" alt="Premium Front View">
  //       <h4 class="pd-image-title">Premium Front View</h4>
  //       <p class="pd-image-description">Elegant English style with clean solid patterns and conventional cuffs</p>
  //     </div>
  //     <div class="pd-image-card">
  //       <img class="pd-product-image" src="image2.jpg" alt="Detail View">
  //       <h4 class="pd-image-title">Detail View</h4>
  //       <p class="pd-image-description">Smooth zipper closure with functional hood and decorative pockets</p>
  //     </div>
  //     <div class="pd-image-card">
  //       <img class="pd-product-image" src="image3.jpg" alt="Lifestyle Shot">
  //       <h4 class="pd-image-title">Lifestyle Shot</h4>
  //       <p class="pd-image-description">Perfect for casual adventures, shopping trips, and everyday moments</p>
  //     </div>
  //   </div>
    
  //   <!-- SECTION 1: KEY FEATURES WITH LARGE TEXT AND PROPER TABLE -->
  //   <div class="pd-collapsible-section">
  //     <div class="pd-section-header">
  //       <h2 class="pd-section-title">✨ Key Features & Benefits</h2>
  //       <button class="pd-toggle-btn" onclick="toggleSection('pd-features-content', this)">See More</button>
  //     </div>
  //     <div class="pd-section-content" id="pd-features-content">
  //       <div class="pd-table-container">
  //         <table class="pd-specs-table">
  //           <tr><td>Material</td><td>Premium Cotton Blend with Polyester Lining</td></tr>
  //           <tr><td>Style</td><td>English Classic with Modern Fit</td></tr>
  //           <tr><td>Closure</td><td>Smooth Zipper with Button Protection</td></tr>
  //           <tr><td>Hood</td><td>Adjustable Functional Hood</td></tr>
  //           <tr><td>Pockets</td><td>2 Side Pockets + 2 Inner Pockets</td></tr>
  //           <tr><td>Cuffs</td><td>Conventional Button Cuffs</td></tr>
  //           <tr><td>Weather</td><td>Windproof & Water-Resistant</td></tr>
  //         </table>
  //       </div>
  //     </div>
  //   </div>
    
  //   <!-- SECTION 2: TECHNICAL SPECIFICATIONS WITH BEAUTIFUL TABLE -->
  //   <div class="pd-collapsible-section">
  //     <div class="pd-section-header">
  //       <h2 class="pd-section-title">📊 Technical Specifications</h2>
  //       <button class="pd-toggle-btn" onclick="toggleSection('pd-specs-content', this)">See More</button>
  //     </div>
  //     <div class="pd-section-content" id="pd-specs-content">
  //       <div class="pd-table-container">
  //         <table class="pd-specs-table">
  //           <tr><td>Material Composition</td><td>65% Cotton, 35% Polyester</td></tr>
  //           <tr><td>Lining</td><td>100% Polyester (Breathable)</td></tr>
  //           <tr><td>Weight</td><td>Medium Weight (Perfect for 15-25°C)</td></tr>
  //           <tr><td>Care Instructions</td><td>Machine Wash Cold, Tumble Dry Low</td></tr>
  //           <tr><td>Season</td><td>Spring, Autumn, Cool Summer Evenings</td></tr>
  //           <tr><td>Country of Origin</td><td>China (Quality Controlled)</td></tr>
  //         </table>
  //       </div>
  //     </div>
  //   </div>
    
  //   <!-- SIZE & DIMENSIONS WITH LARGE CARDS -->
  //   <h2 class="pd-section-title">📏 Size & Fit Guide</h2>
  //   <div class="pd-dimensions-grid">
  //     <div class="pd-dimension-card">
  //       <div class="pd-dimension-icon">📐</div>
  //       <div class="pd-dimension-label">Shoulder</div>
  //       <div class="pd-dimension-value">18.5"</div>
  //     </div>
  //     <div class="pd-dimension-card">
  //       <div class="pd-dimension-icon">📏</div>
  //       <div class="pd-dimension-label">Chest</div>
  //       <div class="pd-dimension-value">42"</div>
  //     </div>
  //     <div class="pd-dimension-card">
  //       <div class="pd-dimension-icon">📦</div>
  //       <div class="pd-dimension-label">Length</div>
  //       <div class="pd-dimension-value">28"</div>
  //     </div>
  //     <div class="pd-dimension-card">
  //       <div class="pd-dimension-icon">⚖️</div>
  //       <div class="pd-dimension-label">Sleeve</div>
  //       <div class="pd-dimension-value">24.5"</div>
  //     </div>
  //   </div>
    
  //   <!-- SHIPPING INFORMATION WITH LARGE CARDS -->
  //   <h2 class="pd-section-title">🚚 Shipping Options</h2>
  //   <div class="pd-shipping-grid">
  //     <div class="pd-shipping-card">
  //       <div class="pd-shipping-method">Standard Shipping</div>
  //       <div class="pd-shipping-time">7-14 Business Days</div>
  //       <div class="pd-shipping-cost">FREE</div>
  //     </div>
  //     <div class="pd-shipping-card">
  //       <div class="pd-shipping-method">Express Shipping</div>
  //       <div class="pd-shipping-time">5-7 Business Days</div>
  //       <div class="pd-shipping-cost">$9.99</div>
  //     </div>
  //     <div class="pd-shipping-card">
  //       <div class="pd-shipping-method">Priority Shipping</div>
  //       <div class="pd-shipping-time">3-5 Business Days</div>
  //       <div class="pd-shipping-cost">$19.99</div>
  //     </div>
  //   </div>
    
  //   <!-- REVIEW HIGHLIGHTS -->
  //   <div class="pd-reviews-section">
  //     <div class="pd-rating-summary">
  //       <span class="pd-average-rating">4.8</span>
  //       <span class="pd-stars">★★★★★</span>
  //       <span class="pd-review-count">(2,347 reviews)</span>
  //     </div>
  //     <div class="pd-review-highlights">
  //       <span class="pd-review-tag">👍 Quality 4.9</span>
  //       <span class="pd-review-tag">🚚 Shipping 4.7</span>
  //       <span class="pd-review-tag">💪 Durability 4.8</span>
  //       <span class="pd-review-tag">✨ Design 4.9</span>
  //     </div>
  //   </div>
    
  //   <!-- WARRANTY BADGE -->
  //   <div class="pd-warranty-badge">
  //     <span>✓</span>
  //     <span>1-Year Warranty & Lifetime Customer Support</span>
  //   </div>
  // </div>
  
  // <!-- JAVASCRIPT FOR SEE MORE/LESS -->
  // <script>
  // (function() {
  //   window.toggleSection = function(contentId, btnElement) {
  //     const content = document.getElementById(contentId);
  //     if (!content) return;
  //     content.classList.toggle('pd-expanded');
  //     btnElement.textContent = content.classList.contains('pd-expanded') ? 'See Less' : 'See More';
  //   };
  // })();
  // </script>
  
  // 📦 DATA TO PROCESS:
  // ${JSON.stringify(chunk.map(p => ({ id: p.id, content: p.descreption })))}
  
  // ⚠️ CRITICAL TEXT SIZE REQUIREMENTS:
  // ✅ TITLES: 2.8rem (VERY LARGE)
  // ✅ SECTION TITLES: 2.2rem (LARGE)
  // ✅ PRICES: 3.2rem (VERY LARGE)
  // ✅ TABLE TEXT: 1.2rem (PROPER SIZE)
  // ✅ DIMENSION VALUES: 1.8rem (LARGE)
  // ✅ BODY TEXT: 1.2-1.4rem (READABLE)
  // ✅ TRUST BADGES: 1.2rem with 1.8rem icons
  // ✅ REVIEW STARS: 2rem (LARGE)
  // ✅ All text is PROPERLY SIZED for easy reading
  // ✅ Tables have PROPER PADDING and FORMATTING
  // ✅ Cards have LARGE ICONS and VALUES
  
  // Remember: TEXT MUST BE LARGE AND READABLE! No tiny fonts! 📏✨
  // `;
  // }


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
      // console.log(`Processing chunk ${idx + 1}/${chunks.length} (${chunk.length} products) - split into 2 API calls`);

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

    // console.log(`Total products processed: ${allResults.length}/${updatedDescreptionAI.length}`);

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



