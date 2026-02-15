


import {type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useActionData, Form, useNavigation, useLoaderData, useFetcher, useSubmit } from "@remix-run/react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { shopify } from "../shopify.server";
import { Button } from "@shopify/polaris";
import { useEffect, useState } from "react";
  // sk-c8552ae161ed4db684bb1268bf4ba758
  import { Deepseek } from 'node-deepseek';

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
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 4000
        })
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('DeepSeek API error:', response.status, errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
  
      const data = await response.json();
      return data.choices[0].message.content;
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
  console.log('descreption html ',updatedDescreptionAI,"api key is her ", API_KEY_GEMINI,)
  // const genAI = new GoogleGenerativeAI(API_KEY_GEMINI);
  // const model = genAI.getGenerativeModel({ model:"gemini-3-flash-preview",generationConfig: {
  //   responseMimeType: "application/json",
  // }});
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
const prompt = `You are a JSON API. Process ALL ${updatedDescreptionAI.length} products and return a JSON array.

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

PRODUCTS TO PROCESS:
${updatedDescreptionAI.map((p, index) => `
--- PRODUCT ${index + 1} (ID: ${p.id}) ---
${p.descreption}
`).join('\n')}

IMPORTANT INSTRUCTIONS:
1. Process EACH product individually using the complete prompt template above
2. Apply the color psychology guidelines based on the product type and target audience
3. Use the provided HTML structure as a foundation, adapting it to each product's unique features
4. Return a JSON array with EXACTLY ${updatedDescreptionAI.length} objects
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

Example response format:
[
  {
    "id": "gid://shopify/Product/123",
    "shortDescription": "<ul class='premium-bullets' style='list-style: none; padding: 0;'><li style='margin-bottom: 12px; padding-left: 28px; position: relative;'><span style='position: absolute; left: 0; color: #8B7355;'>●</span><strong style='color: #2C3E50;'>[PREMIUM CRAFTSMANSHIP]</strong> Exquisitely tailored...</li></ul>",
    "detailedDescription": "<article style='max-width: 1200px; margin: 0 auto;'><header><h1 style='color: #2C3E50; font-family: \"Playfair Display\", serif;'>Masterful Design Meets Uncompromising Quality</h1></header><section>...</section></article>"
  }
]`;
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

  const deepseek = new Deepseek({
    apiKey: API_KEY_GEMINI,
  });
  const response = await sendPrompt(JSON.stringify(prompt),API_KEY_GEMINI );
return response


}

// 2. Remix Action (Server Side)
export async function action({context ,request }: ActionFunctionArgs) {
 let {admin}=await shopify(context).authenticate.admin(request)

 let formData=await request.formData()
 let updatedDescreptionAI=JSON.parse(formData.get('descreptionAI')as string)
 console.log('descreptionAI IS HER ',updatedDescreptionAI)
  const htmlDescription = `<h1>SPECIFICATIONS</h1>
<p><span>CN</span>: <span style="color: #333;">Henan</span></p>
<p><span>Colletto</span>: <span style="color: #333;">Collo a O</span></p>
<p><span>Composizione dei materiali</span>: <span style="color: #333;">cotton</span></p>
<p><span>Decorazione</span>: <span style="color: #333;">Applique</span></p>
<p><span>Genere</span>: <span style="color: #333;">UOMINI</span></p>
<p><span>L'arte della tessitura</span>: <span style="color: #333;">Non tessuto</span></p>
<p><span>Lunghezza esterna</span>: <span style="color: #333;">Nove centesimi</span></p>
<p><span>Lunghezza manica (cm)</span>: <span style="color: #333;">Pieno</span></p>
<p><span>Luogo di origine</span>: <span style="color: #333;">Cina (continente)</span></p>
<p><span>Marca</span>: <span style="color: #333;">NONE</span></p>
<p><span>Materiale</span>: <span style="color: #333;">Cotone,altro</span></p>
<p><span>Origine</span>: <span style="color: #333;">CN (Origine)</span></p>
<p><span>Prodotti chimici ad alto impatto</span>: <span style="color: #333;">Nessuno</span></p>
<p><span>Scena applicabile</span>: <span style="color: #333;">fare shopping</span></p>
<p><span>Se apertura completa</span>: <span style="color: #333;">Sì</span></p>
<p><span>Spessore</span>: <span style="color: #333;">Standard</span></p>
<p><span>Stagione applicabile</span>: <span style="color: #333;">Primavera e autunno</span></p>
<p><span>Stile</span>: <span style="color: #333;">Informale</span></p>
<p><span>Tipo di articolo</span>: <span style="color: #333;">Felpe Coordinati</span></p>
<p><span>Tipo di chiusura</span>: <span style="color: #333;">Cerniera</span></p>
<p><span>Tipo di chiusura dei pantaloni</span>: <span style="color: #333;">Coulisse</span></p>
<p><span>Tipo di motivo</span>: <span style="color: #333;">Stampa</span></p>
<p><span>size_info</span>: <span style="color: #333;">{"sizeInfoList":[{"length":{"cm":"100","inch":"39.37"},"size":"S","vid":100014064},{"length":{"cm":"105","inch":"41.34"},"size":"M","vid":361386},{"length":{"cm":"110","inch":"43.31"},"size":"L","vid":361385},{"length":{"cm":"115","inch":"45.28"},"size":"XL","vid":100014065},{"length":{"cm":"120","inch":"47.24"},"size":"XXL","vid":4182},{"length":{"cm":"125","inch":"49.21"},"size":"XXXL","vid":4183}]}</span></p>
<div class="detailmodule_html">
<div class="detail-desc-decorate-richtext">
<p><img src="https://ae01.alicdn.com/kf/S9987dd33850a46fda6ebc4d46eb83e78X.jpg"><img src="https://ae01.alicdn.com/kf/S771af73c67dd44eab23ea6b52bc25b34K.jpg"><img src="https://ae01.alicdn.com/kf/S0e1fed8615ea47bb9c4a9131354fcb8e2.jpg"><img src="https://ae01.alicdn.com/kf/Sb37fd1c7644f4ce280d04e9ebe0d6a59S.jpg"><img src="https://ae01.alicdn.com/kf/S3f15e83e11f94402ba93d1b05b113750W.jpg"><img src="https://ae01.alicdn.com/kf/S425b8cf5c7664067902455b6b6e97b4cJ.jpg"><img src="https://ae01.alicdn.com/kf/Sf959804d6d1c44e49232b4e5b9904b26k.jpg"><img src="https://ae01.alicdn.com/kf/Sdb2ac6d29b4349a3948628dc256da12dd.jpg"><img src="https://ae01.alicdn.com/kf/S08f06331ecc44b3b8380f0e07aa47867t.jpg"><img src="https://ae01.alicdn.com/kf/S8d2f8c1baa1347d784142120593091ec0.jpg"></p>
</div>
</div>`
    const API_KEY_GEMINI=context.cloudflare?.env?.DEEP_SEEK_API_KEY
    console.log('api key is her ',API_KEY_GEMINI)

    const API_KEY_GEMINI_TESTED=context.cloudflare?.env?.GEMINI_API_KEY
    console.log('api key is her ',API_KEY_GEMINI_TESTED)

  if (!htmlDescription) {
    return Response.json({ error: "Please provide a description" }, { status: 400 });
  }
  try {
    const optimizedHtml = 
     await generateSeoHtml(updatedDescreptionAI,API_KEY_GEMINI);
    // await generateSeoHtmlgimini(API_KEY_GEMINI_TESTED as string,updatedDescreptionAI,)
    console.log('new descreption is her and optimise ',optimizedHtml)
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
    return Response.json(JSON.parse(optimizedHtml));
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
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

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
     }
  6. Do NOT include any other text, explanations, or markdown
  7. Return ONLY the JSON array
  8. Preserve ALL original image tags in their exact sequence
  9. Ensure all HTML is properly formatted and escaped for JSON
  
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
    return result.response.text();
  } catch (error: any) {
    console.error("Gemini Error:", error.message);
    throw new Error("Failed to optimize SEO content.");
  }
}