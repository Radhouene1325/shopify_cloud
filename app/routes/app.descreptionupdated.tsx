


import {type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useActionData, Form, useNavigation, useLoaderData, useFetcher, useSubmit } from "@remix-run/react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { shopify } from "../shopify.server";
import { Badge, Banner, BlockStack, Box, Button, Card, Checkbox, DataTable, Divider, EmptyState, InlineStack, Page, Pagination, Spinner, Tag, Text, Thumbnail, Tooltip, useBreakpoints } from "@shopify/polaris";
import { useCallback, useEffect, useMemo, useState } from "react";
  // sk-c8552ae161ed4db684bb1268bf4ba758
  import { Deepseek } from 'node-deepseek';
import pako from "pako"
  
import  { generateSeoHtmlGemini } from "./functions/parser";
import { productsupdated } from "./functions/query/updateprooductquery";
import { generateSeoMetadata, getTaxonomyIdForCategory } from "./functions/propmtsSEO/buildSEOPrompt";
import { uint8ToBase64 } from "./functions/uint8ToBase64/uint8ToBase64";
import { sendPrompt } from "./functions/deepseekai/deepseekai";
import pLimit from 'p-limit';
  interface DESCREPTION{
    descreption:string,
    id:string,
    tags:string[]
  }

  // export async function sendPrompt(prompt: string, API_KEY_GEMINI: string) {
  //   try {
  //     const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${API_KEY_GEMINI}`
  //       },
  //       body: JSON.stringify({
  //         model: 'deepseek-chat',
  //         messages: [  {
  //           role: "system",
  //           content:
  //             "You are a strict JSON generator. Return ONLY valid JSON. No markdown. No explanation. No code fences. CRITICAL: All quotes inside string values MUST be escaped with backslashes (\\\"). All HTML content must have properly escaped quotes. Ensure the JSON is complete and valid.",
  //         },{ role: 'user', content: prompt }],
  //         temperature: 0.7,
  //         max_tokens: 8192
  //       })
  //     });
      
  
  //     if (!response.ok) {
  //       const errorText = await response.text();
  //       console.error('DeepSeek API error:', response.status, errorText);
  //       throw new Error(`API error: ${response.status} - ${errorText}`);
  //     }
  
  //     const data = await response.json() as DeepSeekResponse;
  //     const choice = data?.choices?.[0];
  //     let resulter = choice?.message?.content;
  //     if (choice?.finish_reason === 'length') {
  //       throw new Error('Response truncated: Output hit token limit. Try processing fewer products or shortening product descriptions.');
  //     }
  //     if (!resulter) {
  //       throw new Error('No content in API response');
  //     }
  //     // Only pass a string to the cleaning function if it's defined
  //     // let tested = typeof resulter === 'string' ? strongCleanObjectArray([resulter]) : [];
  //     // console.log("tes the function is ok hello ", tested);
      
  //     // Clean the response - remove markdown code fences if present
  //     if (typeof resulter === 'string') {
  //       // Remove markdown code fences (```json ... ``` or ``` ... ```)
  //       resulter = resulter.trim();
  //       resulter = resulter.replace(/^```(?:json)?\s*/i, ''); // Remove opening fence
  //       resulter = resulter.replace(/\s*```$/i, ''); // Remove closing fence
  //       resulter = resulter.trim();
  //     }
      
  //     // Try multiple parsing strategies
  //     let parsed: any = null;
      
  //     // Strategy 1: Try standard JSON.parse
  //     // try {
  //     //   parsed = JSON.parse(resulter);
  //     //   console.log('Successfully parsed with JSON.parse');
  //     // } catch (jsonError) {
  //     //   console.warn('JSON.parse failed, trying JSON5:', jsonError);
        
  //     //   // Strategy 2: Try JSON5 (more lenient parser)
  //     //   try {
  //     //     parsed = JSON5.parse(resulter);
  //     //     console.log('Successfully parsed with JSON5');
  //     //   } catch (json5Error) {
  //     //     console.warn('JSON5.parse failed, trying to extract and repair JSON:', json5Error);
          
  //     //     // Strategy 3: Extract JSON array and try to repair common issues
  //     //     const jsonMatch = resulter.match(/\[[\s\S]*\]/);
  //     //     if (jsonMatch) {
  //     //       let jsonText = jsonMatch[0];
            
  //     //       // Try to fix common issues: unescaped quotes in HTML strings
  //     //       // This is a simple fix - replace unescaped quotes inside string values
  //     //       // Note: This is a heuristic and may not work for all cases
  //     //       try {
  //     //         // First try JSON5 on the extracted text
  //     //         parsed = JSON5.parse(jsonText);
  //     //         console.log('Successfully parsed extracted JSON with JSON5');
  //     //       } catch (e) {
  //     //         console.warn('JSON5 on extracted text failed, trying manual repair:', e);
              
  //     //         // Try to repair by finding and fixing unescaped quotes in HTML content
  //     //         // This is a more aggressive approach
  //     //         try {
  //     //           let repaired = jsonText;
                
  //     //           // Strategy: Fix common HTML attribute patterns that break JSON
  //     //           // Replace single quotes in HTML attributes with escaped double quotes
  //     //           repaired = repaired.replace(/style='([^']*)'/g, (match, content) => {
  //     //             return `style="${content.replace(/"/g, '\\"')}"`;
  //     //           });
                
  //     //           // Fix other common HTML attribute patterns
  //     //           repaired = repaired.replace(/(\w+)='([^']*)'/g, (match, attr, content) => {
  //     //             // Only fix if it's inside a string value (has quotes around)
  //     //             return `${attr}="${content.replace(/"/g, '\\"')}"`;
  //     //           });
                
  //     //           // Try JSON5 again with repaired text
  //     //           parsed = JSON5.parse(repaired);
  //     //           console.log('Successfully parsed after manual repair');
  //     //         } catch (repairError) {
  //     //           console.error('All parsing strategies failed:', repairError);
  //     //           console.error('Response length:', resulter.length);
  //     //           console.error('First 500 chars:', resulter.substring(0, 500));
  //     //           console.error('Last 500 chars:', resulter.substring(Math.max(0, resulter.length - 500)));
                
  //     //           // Check if response appears truncated (ends abruptly without closing brackets)
  //     //           const trimmed = resulter.trim();
  //     //           const lastChar = trimmed[trimmed.length - 1];
  //     //           const bracketCount = (trimmed.match(/\[/g) || []).length - (trimmed.match(/\]/g) || []).length;
  //     //           const braceCount = (trimmed.match(/\{/g) || []).length - (trimmed.match(/\}/g) || []).length;
                
  //     //           if (lastChar !== ']' && lastChar !== '}' || bracketCount > 0 || braceCount > 0) {
  //     //             console.warn('Response appears to be truncated. JSON is incomplete.');
  //     //             throw new Error('Response truncated: JSON is incomplete. Try processing fewer products at once.');
  //     //           }
                
  //     //           // Last resort: try to parse just the structure and return partial data
  //     //           throw new Error(`Failed to parse JSON: ${repairError instanceof Error ? repairError.message : 'Unknown error'}`);
  //     //         }
  //     //       }
  //     //     } else {
  //     //       throw new Error('Could not find JSON array in response');
  //     //     }
  //     //   }
  //     // }
  //     const res=parserData(resulter,parsed,JSON5)
  //     parsed=res
  //     // Ensure it's an array
  //     if (Array.isArray(parsed)) {
  //       // console.log(`Successfully parsed ${parsed.length} items`);
  //       return parsed;
  //     } else if (parsed && typeof parsed === 'object') {
  //       // If it's an object, wrap it in an array
  //       // console.log('Wrapped single object in array');
  //       return [parsed];
  //     } else {
  //       throw new Error('Parsed result is not a valid object or array');
  //     }
          
   
      
  //   } catch (error) {
  //     console.error('Error calling DeepSeek:', error);
  //     throw error;
  //   }
  // }
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
export  async function generateSeoHtml(updatedDescreptionAI:any,DEEP_SEEK_API_KEY:string) {

  
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

 
interface VARIBALES {
  handle: string;
  id: string;
  descreption: string;
  vendor: string;
  title: string;
  totalInventory: number;
  tracksInventory: number;
  max_amount: string;
  currencyCode: string;
  min_amount: string;
}

 function buildPrompt(
  chunk: VARIBALES[],
  outputField: 'shortDescription' | 'detailedDescription'
): string {
  const isShort = outputField === 'shortDescription';
  const outputStructure = isShort
    ? '{ "id": "original_product_id", "shortDescription": "RESPONSIVE_HTML_STRING" }'
    : '{ "id": "original_product_id", "detailedDescription": "RESPONSIVE_HTML_STRING_WITH_MICRODATA" }';

  let constraints: string[];
  if (isShort) {
    constraints = [
      'STRICT: La shortDescription deve contenere SOLO:',
      '  - Un contenitore principale <div> con stili responsivi',
      '  - Una lista non ordinata <ul> con 4-5 bullet points',
      '  - Ogni bullet: <li><strong>Beneficio:</strong> spiegazione breve</li>',
      '  - Un paragrafo finale <p> con call-to-action (es. spedizione gratuita)',
      '  - NIENTE ALTRO: niente titoli <h2>, <h3>, tabelle, immagini, sezioni aggiuntive',
      '  - Non usare emoji (o al massimo 1-2, ma non obbligatorie)',
      'Lunghezza massima: 150 parole.',
      'Stili consentiti: solo per spaziatura e layout (margin, padding, line-height, max-width).',
      'Il tema Shopify gestisce font, colori e dimensioni.',
      'Tutto il contenuto deve essere responsivo (320px in su).'
    ];
  } else {
    constraints = [
      'La detailedDescription DEVE includere TUTTI questi elementi (se presenti nei dati o ricavabili):',
      '  1. <h2>Product Overview</h2> con 1-2 paragrafi introduttivi.',
      '  2. <h3>Key Features</h3> con lista <ul> di 5-6 caratteristiche.',
      '  3. <h3>Benefits</h3> con 2-3 paragrafi che spiegano i vantaggi.',
      '  4. <h3>Specifications</h3> con tabella responsiva a due colonne (Feature | Value).',
      '  5. Se sono presenti informazioni sulle taglie (misure, conversioni EU/US, lunghezza piede), creare una sezione <h3>Size Chart</h3> con tabella a 4 colonne (EU | US | UK | Foot Length cm) o colonne appropriate.',
      '  6. Tutte le immagini originali (<img>) devono essere preservate e avvolte in <div style="max-width:100%;margin:1em 0;"><img style="max-width:100%;height:auto;display:block;" ...></div>',
      '  7. Un paragrafo finale <p> con CTA (es. "Free shipping on orders over €50!").',
      '',
      '  ✅ MICRODATA SCHEMA.ORG (OBBLIGATORIO – deve superare il Google Rich Results Test):',
      '    - Tutto il contenuto visibile deve essere racchiuso in un <div> con:',
      '        <section class="pro-features" itemscope itemtype="https://schema.org/Product" style="max-width:100%;overflow-wrap:break-word;">',
      '    - Subito dopo l\'apertura del div, aggiungere i seguenti meta tag (invisibili) – **sono MANDATORI**:',
      `        <meta itemprop="name" content="${chunk[0]?.title || 'Product Name'}">`,
      `        <meta itemprop="description" content="SEO description based on: ${chunk[0]?.descreption?.substring(0, 160) || 'Product description'}">`,
      `        <link itemprop="image" href="https://platinumshop.it/products/${chunk[0]?.handle || 'product'}/image">`,
      `        <div itemprop="brand" itemscope itemtype="https://schema.org/Brand">`,
      `          <meta itemprop="name" content="${chunk[0]?.vendor || 'PlatiNum'}">`,
      `        </div>`,
      `        <div itemprop="offers" itemscope itemtype="https://schema.org/Offer">`,
      `          <meta itemprop="url" content="https://platinumshop.it/products/${chunk[0]?.handle || 'product'}">`,
      `          <meta itemprop="priceCurrency" content="${chunk[0]?.currencyCode || 'EUR'}">`,
                  `<meta itemprop="priceValidUntil" content="2026-12-31">`,  
      `          <meta itemprop="price" content="${chunk[0]?.min_amount || chunk[0]?.max_amount || '0.00'}">`,
      '          <link itemprop="availability" href="https://schema.org/InStock">',
      '        </div>', '</section>',
      '    - I placeholder ({{...}}) vanno sostituiti con valori estratti dal contenuto della descrizione originale:',
      '        * PRODUCT_NAME: nome del prodotto (es. "Birkenstock Arizona White-Gold") – **questo campo è obbligatorio**',
      '        * SEO_DESCRIPTION: una frase breve e accattivante che riassume il prodotto (può essere presa dal primo paragrafo o generata)',
      '        * MAIN_IMAGE_URL: URL della prima immagine trovata nella descrizione (se nessuna, omettere il tag <link>)',
      '        * BRAND_NAME: marca del prodotto (es. "Birkenstock", "Skechers", "XTI") – se non chiara, usare "PlatiNum"',
      '        * PRODUCT_URL: se non presente, omettere il meta (o usare "#")',
      '        * PRICE: prezzo del prodotto (es. "79.95") – **se non trovato, usare "0.00"** per evitare errori',
      '    - Dopo i meta tag, inizia il contenuto visibile descritto nei punti 1-7.',
      '',
      '  ✅ REQUISITI GOOGLE RICH RESULTS:',
      '    - Il campo `name` è obbligatorio.',
      '    - Il campo `offers` (prezzo, valuta, disponibilità) è obbligatorio (se non hai recensioni o valutazioni).',
      '    - Se hai recensioni, puoi usare `review` o `aggregateRating` al posto di `offers`, ma per semplicità includi sempre `offers`.',
      '    - Assicurati che il prezzo sia un numero con punto (es. "89.95") e la valuta sia "EUR".',
      '',
      '  (Opzionale) Le caratteristiche possono essere marcate anche con itemprop="additionalProperty":',
      '    <article itemprop="additionalProperty" itemscope itemtype="https://schema.org/PropertyValue">',
      '      <h3 itemprop="name">Feature Name</h3>',
      '      <p itemprop="description">Feature description</p>',
      '      <meta itemprop="propertyID" content="feature-id">',
      '    </article>',
      '',
      '  La tabella delle specifiche e quella delle taglie devono essere avvolte in un contenitore con overflow-x:auto per lo scorrimento orizzontale su mobile.',
      '  Usare SOLO stili inline per layout/responsività (margin, padding, line-height, max-width, overflow, border).',
      '  Non usare colori, font-size, font-family (lasciarli al tema).',
      '  Il risultato deve essere perfettamente visibile da 320px a 1920px.'
    ];
  }

  return `You are a JSON API specialized in creating professional, PERFECTLY RESPONSIVE Shopify product descriptions with embedded Schema.org microdata.

ROLE: Senior E-commerce Copywriter + Responsive Design Expert + Schema.org Specialist
- Expert in Amazon A+ Content, Shopify optimization, conversion copywriting
- Specialist in mobile-first responsive design (320px to 1920px)
- Focus on benefits-driven, scannable, accessible content
- Expert in structured data for rich snippets and **Google Rich Results Test compliance**

OBJECTIVE: Transform raw product data into clean, semantic, RESPONSIVE HTML that:
- Works perfectly on ALL devices (mobile, tablet, desktop)
- Uses minimal inline styles (spacing/layout only)
- Lets Shopify theme control typography and colors
- Drives conversions through benefit-focused copy
- Preserves all existing images with responsive wrappers
- Follows e-commerce best practices
- **Includes complete Schema.org microdata with ALL required fields (name, offers, brand, image, description) to pass Google Rich Results Test**
- **Distingue nettamente short e detailed description**: la short è solo bullet points + CTA; la detailed include tutte le sezioni (sommario, caratteristiche, benefici, specifiche, tabella taglie se disponibile, immagini, CTA) **e i microdata all'inizio**.

OUTPUT FORMAT:
{
  ${
    isShort
      ? '"shortDescription": "RESPONSIVE_HTML (solo bullet points e CTA)"'
      : '"detailedDescription": "RESPONSIVE_HTML (struttura completa con microdata all\'inizio)"'
  }
}

TONE & STYLE:
- Professional and trustworthy
- Benefit-driven (not feature-heavy)
- Sophisticated yet accessible
- Emotionally resonant for premium products
- Concise and scannable on small screens

BRAND-SPECIFIC GUIDELINES:
- Birkenstock: "legendary comfort", "anatomical footbed", "premium craftsmanship"
- Skechers: "Memory Foam", "all-day comfort", "lightweight design"
- Joma: "performance technology" (VTS, Phylon, ReactiveBall), "athletic excellence"
- Adidas/Nike: "iconic style", "heritage", "innovation"
- Vans: "classic design", "skateboard culture", "versatile style"
- UGG: "luxury comfort", "premium materials", "timeless design"
- Barefoot (Mustang, Victoria): "natural movement", "barefoot feel", "foot health"
- XTI: "vegan certified", "sustainable fashion"
- Natural World: "eco-friendly", "sustainable materials", "organic cotton"

TRUST SIGNALS (include naturally):
- "Premium quality"
- "Free shipping" (Italian market)
- "Satisfaction guaranteed"
- "Authentic [brand]"
- "Durable construction"
- "All-day comfort"

CONSTRAINTS:
${JSON.stringify(constraints, null, 2).replace(/\n/g, '\n')}

RESPONSIVE INLINE STYLES (allowed for layout/spacing only):
✅ max-width, width, min-width
✅ margin, padding (use em units for scalability)
✅ line-height (1.6 for body, 1.3 for headings)
✅ overflow-x, overflow-wrap, word-wrap
✅ border, border-collapse (tables only)
✅ display, vertical-align
✅ -webkit-overflow-scrolling:touch (smooth mobile scroll)

FORBIDDEN STYLES:
❌ font-size, font-family, color, background-color
❌ position:absolute/fixed
❌ Custom classes or IDs
❌ External CSS or <style> tags
❌ JavaScript or onclick

ALLOWED HTML TAGS:
✅ <div> (ONLY for responsive wrappers and microdata container)
✅ <h2>, <h3>, <p>, <ul>, <li>, <table>, <tr>, <td>, <strong>, <em>, <img>
✅ <meta>, <link> (only inside the microdata wrapper, for invisible data)

ESEMPIO shortDescription (CORRETTO, solo bullet + CTA):
<div style="max-width:100%;overflow-wrap:break-word;">
<ul style="padding-left:1.2em;margin:0.5em 0;line-height:1.6;">
<li style="margin-bottom:0.5em;"><strong>Legendary Comfort:</strong> Birkenstock's signature molded footbed provides superior arch support</li>
<li style="margin-bottom:0.5em;"><strong>Modern Style:</strong> Sleek white-gold colorway pairs perfectly with any casual outfit</li>
<li style="margin-bottom:0.5em;"><strong>All-Day Wearability:</strong> Platform sole adds height while maintaining stability</li>
<li style="margin-bottom:0.5em;"><strong>Premium Quality:</strong> Durable construction built to last season after season</li>
</ul>
<p style="margin-top:1em;font-style:italic;">Free shipping on orders over €50. Shop authentic Birkenstock sneakers today!</p>
</div>

ESEMPIO detailedDescription (CON MICRODATA E TABELLA TAGLIE):
<div itemscope itemtype="https://schema.org/Product" style="max-width:100%;overflow-wrap:break-word;word-wrap:break-word;">

<!-- MICRODATA INVISIBILI (MANDATORI per Google Rich Results) -->
<meta itemprop="name" content="${chunk[0]?.title || 'Birkenstock Arizona White-Gold'}">
<meta itemprop="description" content="Legendary comfort meets modern style in these ${chunk[0]?.vendor || 'Birkenstock'} sandals with elegant finish.">
<link itemprop="image" href="https://platinumshop.it/products/${chunk[0]?.handle || 'birkenstock-arizona'}/image.jpg">
<div itemprop="brand" itemscope itemtype="https://schema.org/Brand">
  <meta itemprop="name" content="${chunk[0]?.vendor || 'Birkenstock'}">
</div>
<div itemprop="offers" itemscope itemtype="https://schema.org/Offer">
  <meta itemprop="url" content="https://platinumshop.it/products/${chunk[0]?.handle || 'birkenstock-arizona-whitegold'}">
  <meta itemprop="priceCurrency" content="${chunk[0]?.currencyCode || 'EUR'}">
  <meta itemprop="price" content="${chunk[0]?.min_amount || '89.95'}">
  <link itemprop="availability" href="https://schema.org/InStock">
</div>

<!-- CONTENUTO VISIBILE -->
<h2 style="margin:1em 0 0.5em;line-height:1.3;">Product Overview</h2>
<p style="margin:0.8em 0;line-height:1.6;">Experience the perfect fusion of ${chunk[0]?.vendor || 'Birkenstock'}'s legendary comfort and contemporary style...</p>

<h3 style="margin:1.2em 0 0.5em;line-height:1.3;">Key Features</h3>
<ul style="padding-left:1.2em;margin:0.8em 0;line-height:1.6;">
<li style="margin-bottom:0.5em;">Signature ${chunk[0]?.vendor || 'Birkenstock'} molded insole for superior arch support</li>
<li style="margin-bottom:0.5em;">Elegant finish for versatile styling</li>
</ul>

<h3 style="margin:1.2em 0 0.5em;line-height:1.3;">Size Chart</h3>
<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin:1em 0;">
<table style="width:100%;min-width:280px;border-collapse:collapse;border:1px solid #ddd;">
<tr style="border-bottom:1px solid #ddd;background-color:#f2f2f2;">
<th style="padding:0.6em 0.8em;border-right:1px solid #ddd;font-weight:bold;text-align:left;">EU</th>
<th style="padding:0.6em 0.8em;border-right:1px solid #ddd;font-weight:bold;text-align:left;">US</th>
<th style="padding:0.6em 0.8em;border-right:1px solid #ddd;font-weight:bold;text-align:left;">UK</th>
<th style="padding:0.6em 0.8em;font-weight:bold;text-align:left;">Foot Length (cm)</th>
</tr>
<tr style="border-bottom:1px solid #ddd;">
<td style="padding:0.6em 0.8em;border-right:1px solid #ddd;">36</td>
<td style="padding:0.6em 0.8em;border-right:1px solid #ddd;">5.5</td>
<td style="padding:0.6em 0.8em;border-right:1px solid #ddd;">3.5</td>
<td style="padding:0.6em 0.8em;">23.0</td>
</tr>
</table>
</div>

<h3 style="margin:1.2em 0 0.5em;line-height:1.3;">Specifications</h3>
<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin:1em 0;">
<table style="width:100%;min-width:280px;border-collapse:collapse;border:1px solid #ddd;">
<tr style="border-bottom:1px solid #ddd;">
<td style="padding:0.6em 0.8em;border-right:1px solid #ddd;font-weight:bold;width:40%;vertical-align:top;">Brand:</td>
<td style="padding:0.6em 0.8em;width:60%;vertical-align:top;">${chunk[0]?.vendor || 'Birkenstock'}</td>
</tr>
<tr style="border-bottom:1px solid #ddd;">
<td style="padding:0.6em 0.8em;border-right:1px solid #ddd;font-weight:bold;width:40%;vertical-align:top;">Price:</td>
<td style="padding:0.6em 0.8em;width:60%;vertical-align:top;">${chunk[0]?.currencyCode || 'EUR'} ${chunk[0]?.min_amount || '89.95'}</td>
</tr>
<tr style="border-bottom:1px solid #ddd;">
<td style="padding:0.6em 0.8em;border-right:1px solid #ddd;font-weight:bold;width:40%;vertical-align:top;">Availability:</td>
<td style="padding:0.6em 0.8em;width:60%;vertical-align:top;">${(chunk[0]?.totalInventory ?? 0) > 0 ? 'In Stock' : 'Out of Stock'} (${chunk[0]?.totalInventory || 0} units)</td>
</tr>
</table>
</div>

<p style="margin-top:1.5em;font-style:italic;">Free shipping on orders over €50. Shop now!</p>
</div>

CRITICAL IMAGE HANDLING:
When you find images in original content like:
<img src="https://example.com/image.jpg" alt="Product">

Transform to responsive format:
<div style="max-width:100%;margin:1em 0;">
<img src="https://example.com/image.jpg" style="max-width:100%;height:auto;display:block;" alt="Product">
</div>

DATA TO PROCESS (analyze each independently - ALL FIELDS AVAILABLE):
${JSON.stringify(chunk.map(p => ({ 
  id: p.id, 
  handle: p.handle,
  title: p.title,
  vendor: p.vendor,
  descreption: p.descreption,
  totalInventory: p.totalInventory,
  tracksInventory: p.tracksInventory,
  min_amount: p.min_amount,
  max_amount: p.max_amount,
  currencyCode: p.currencyCode
})), null, 2)}

PROCESSING INSTRUCTIONS:
1. Analizza ogni prodotto separatamente usando i dati forniti sopra.
2. Estrai: brand (dal campo vendor), caratteristiche, specifiche, immagini, informazioni sulle taglie, nome prodotto (title), prezzo (min_amount/max_amount), valuta (currencyCode), inventario (totalInventory).
3. **Per shortDescription**: genera SOLO bullet points e CTA, nient'altro.
4. **Per detailedDescription**: 
   - Costruisci il wrapper principale con \`itemscope\` e i meta tag per i microdata (come da esempio). **I meta tag per name e offers sono obbligatori**.
   - Usa i valori reali dai dati: title per name, vendor per brand, min_amount per price, currencyCode per priceCurrency, handle per costruire l'URL (https://platinumshop.it/products/{handle}).
   - Includi TUTTE le sezioni: overview, key features, benefits, specifications, size chart (se disponibile), immagini, CTA.
   - Se totalInventory > 0, usa https://schema.org/InStock, altrimenti https://schema.org/OutOfStock.
5. Avvolgi tutto in un contenitore <div> responsivo con \`itemscope\`.
6. Usa esclusivamente stili inline per spaziatura e layout.
7. Rendi le tabelle scrollabili orizzontalmente su mobile con wrapper \`overflow-x:auto\`.
8. Avvolgi ogni immagine in un <div> responsivo.
9. Preserva tutte le immagini originali.
10. Aggiungi segnali di fiducia e una CTA convincente.
11. Assicura la perfetta visualizzazione su dispositivi da 320px a 1920px.

Return JSON array with EXACTLY ${chunk.length} objects.
Format: ${outputStructure}

CRITICAL: 
- Escape all quotes in HTML: \\"
- Return ONLY the JSON array
- NO markdown code blocks
- NO explanatory text
- Just pure JSON
- Perfect responsive on ALL devices
- **Per detailedDescription, la presenza dei microdata è obbligatoria e deve superare il Google Rich Results Test – includi SEMPRE name e offers**`;
}

async function processProduct(product: VARIBALES): Promise<{ id: string; shortDescription: string; detailedDescription: string }> {
  const chunk = [product]; // BATCH_SIZE = 1
console.log("chunk is her hello ",chunk)
  const shortPrompt = buildPrompt(chunk as VARIBALES[], 'shortDescription');
  const detailedPrompt = buildPrompt(chunk as VARIBALES[], 'detailedDescription');

  let shortResults: { id: string; shortDescription?: string }[] = [];
      let detailedResults: { id: string; detailedDescription?: string }[] = [];

    
        try {
          [shortResults, detailedResults] = await Promise.all([
            sendPrompt(shortPrompt, DEEP_SEEK_API_KEY) as Promise<{ id: string; shortDescription?: string }[]>,
            sendPrompt(detailedPrompt, DEEP_SEEK_API_KEY) as Promise<{ id: string; detailedDescription?: string }[]>
          ]);
          console.log('short results:', shortResults);
          console.log('detailed results:', detailedResults);
        } catch (err) {
          console.error('Error in API calls:', err);
        }
  // Execute both API calls concurrently
  // const [shortResults, detailedResults] = await Promise.all([
  //   sendPrompt(shortPrompt, DEEP_SEEK_API_KEY),
  //   sendPrompt(detailedPrompt, DEEP_SEEK_API_KEY)
  // ]);
console.log('short is her',shortResults)
console.log('detaisl is her worked',detailedResults)
  // Ensure responses are arrays
  const shortArray = Array.isArray(shortResults) ? shortResults : [];
  const detailedArray = Array.isArray(detailedResults) ? detailedResults : [];

  // Merge using Maps for O(1) lookup
  const shortMap = new Map(shortArray.map(item => [item.id, item]));
  const detailedMap = new Map(detailedArray.map(item => [item.id, item]));

  const short = shortMap.get(product.id);
  const detailed = detailedMap.get(product.id);

  return {
    id: product.id,
    shortDescription: short?.shortDescription ?? '',
    detailedDescription: detailed?.detailedDescription ?? ''
  };
}



async function processStream(products: VARIBALES[]) {
  const CONCURRENCY = 5;
  const limit = pLimit(CONCURRENCY);

  await Promise.all(
    products.map(product =>
      limit(async () => {
        try {
          const result = await processProduct(product);
          console.log('result is here', result);
          allResults.push(result);
          console.log(`Processed ${product.id}`);
        } catch (err) {
          console.error(`Failed to process ${product.id}:`, err);
        }
      })
    )
  );
}



(async () => {
  try {
    const chunks = chunkArray(updatedDescreptionAI, BATCH_SIZE); // still chunked if needed
    // But since BATCH_SIZE=1, chunks is just an array of single-product arrays.
    // We'll flatten it for simpler processing.
    const products = chunks.flat(); // or directly use updatedDescreptionAI
console.log('products ins stream',products)
    // Option 1: Use streaming (good for > 1000 products)
    await processStream(products);

    // Option 2: Use concurrent map (simpler)
    // await processConcurrent(products);
console.log("all resultes is her hello",allResults)
    console.log(`Total products processed: ${allResults.length}/${updatedDescreptionAI.length}`);
    return allResults;
  } catch (err) {
    console.error('Fatal error:', err);
    throw err;
  }
})();



    // const chunkPromises = chunks.map(async (chunk, idx) => {
    //   // console.log(`Processing chunk ${idx + 1}/${chunks.length} (${chunk.length} products) - split into 2 API calls`);

    //   // Call 1: shortDescription only (keeps output under token limit)
    //   const shortPrompt = buildPrompt(chunk as VARIBALES[], 'shortDescription');
    //   // Call 2: detailedDescription only
    //   const detailedPrompt = buildPrompt(chunk as VARIBALES[], 'detailedDescription');

    //   let shortResults: { id: string; shortDescription?: string }[] = [];
    //   let detailedResults: { id: string; detailedDescription?: string }[] = [];

    //   try {
    //     [shortResults, detailedResults] = await Promise.all([
    //       sendPrompt(shortPrompt, API_KEY_GEMINI) as Promise<{ id: string; shortDescription?: string }[]>,
    //       sendPrompt(detailedPrompt, API_KEY_GEMINI) as Promise<{ id: string; detailedDescription?: string }[]>
    //     ]);
    //   } catch (err) {
    //     console.error(`Error processing chunk ${idx + 1}:`, err);
    //     throw err;
    //   }

    //   if (!Array.isArray(shortResults) || !Array.isArray(detailedResults)) {
    //     throw new Error(`Chunk ${idx + 1} returned invalid format`);
    //   }

    //   // Merge by id: { id, shortDescription, detailedDescription }
    //   const merged = (chunk as { id: string; descreption: string }[]).map((p: { id: string; descreption: string }) => {
    //     const short = shortResults.find((r) => r.id === p.id);
    //     const detailed = detailedResults.find((r) => r.id === p.id);
    //     return {
    //       id: p.id,
    //       shortDescription: short?.shortDescription ?? '',
    //       detailedDescription: detailed?.detailedDescription ?? ''
    //     };
    //   });

    //   return merged;
    // });

    // // Wait for all chunks to complete
    // const results = await Promise.all(chunkPromises);

    // // Flatten results into a single array
    // results.forEach(r => allResults.push(...r));

    // // console.log(`Total products processed: ${allResults.length}/${updatedDescreptionAI.length}`);

    // return allResults;


  }




 // 2. Remix Action (Server Side)
export async function action({context ,request }: ActionFunctionArgs) {
 let {admin}=await shopify(context).authenticate.admin(request)
 let {session}=await shopify(context).authenticate.admin(request)
 
 let formData=await request.formData()
 const updatedDescreptionAI:DESCREPTION = JSON.parse(formData.get('descreptionAI') as string);
 console.log('formdata is er hehe',updatedDescreptionAI)
 if (!Array.isArray(updatedDescreptionAI)) {
   console.error("Invalid or missing 'descreptionAI' data");
   return Response.json({ error: "Invalid or missing 'descreptionAI' data" }, { status: 400 });
 }
const queue =context.cloudflare.env.SEO_QUEUE
console.log('ques is her verified ',JSON.stringify(queue))
console.log('quest is her is verifed ')

const payload = {
  shop: session.shop,
  sessionId: session.id,
  accessToken: session.accessToken,
  products: updatedDescreptionAI
};

const compressed = pako.gzip(JSON.stringify(payload));
 const compressedBase64 = uint8ToBase64(compressed);
 await queue.send({
  body: compressedBase64 // body must be a string according to queue type
});
return Response.json({
  status:"queued",
  total:updatedDescreptionAI.length
})

    const API_KEY_DEEP_SEEK=context.cloudflare?.envariant?.DEEP_SEEK_API_KEY
    // console.log('api key is her ',API_KEY_DEEP_SEEK)

    const API_KEY_GEMINI_GEMINI=context.cloudflare?.envariant?.GEMINI_API_KEY
    // console.log('api key is her ',API_KEY_GEMINI_GEMINI)
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
  let seotitle_descreption_handel
  try {
    try{
      console.log('thes from gimini')
      const optimizedHtml_gimini = await generateSeoHtmlgimini(API_KEY_GEMINI_GEMINI as string,updatedDescreptionAI,)
      const seo= await generateSeoMetadata(updatedDescreptionAI,API_KEY_GEMINI_GEMINI as string)
      seotitle_descreption_handel=seo
      optimizedHtml=optimizedHtml_gimini
    }
    catch{
      console.log('thes from deepseek')
      const optimizedHtml_deep_seek =  await generateSeoHtml(updatedDescreptionAI,API_KEY_DEEP_SEEK);
      const seo= await generateSeoMetadata(updatedDescreptionAI,API_KEY_DEEP_SEEK as string)
      seotitle_descreption_handel=seo
      optimizedHtml=optimizedHtml_deep_seek
    }
 
    //  console.log('SEO_OPTIMISE_TITLE_DECPRETION_HANDEL ',seotitle_descreption_handel)

let responses

const oldDescreptionsMap=new Map(updatedDescreptionAI.map(item=>[item.id,item]))

for( const DESC_AI of optimizedHtml){
    if (!DESC_AI.id|| !DESC_AI.detailedDescription || !DESC_AI.shortDescription) {
        console.error("AI returned empty fields", optimizedHtml);
        return Response.json({ error: "Empty content from AI" }, { status: 500 });
      }
  // for (const OLD_DESC of updatedDescreptionAI ){
      const OLD_DESC=oldDescreptionsMap.get(DESC_AI.id)
      console.log(OLD_DESC.id)
      if (!OLD_DESC)continue;
      if (!seotitle_descreption_handel)return
      for (const SEO of seotitle_descreption_handel){

         if(DESC_AI.id===OLD_DESC.id && SEO.id===OLD_DESC.id){
        // console.log("VERIFU IS TESTED",DESC_AI.id===OLD_DESC.id)
        // console.log('is true is very nice ')
        // Merge tags: preserve existing + add DESC_AI (productUpdate overwrites, so we must include all)
      const CATEGORY_TAMMOXY_ID=await getTaxonomyIdForCategory(admin,SEO.category)
console.log('her is the value of tamoxy',CATEGORY_TAMMOXY_ID)
const productSchema = {
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": SEO.seoTitle || OLD_DESC.title, // ✅ REQUIRED
  "description": SEO.seoDescription || OLD_DESC.title,
  "image":OLD_DESC.image,
  "sku": OLD_DESC.sku || OLD_DESC.id?.split('/').pop() || '',
  "mpn": OLD_DESC.barcode || OLD_DESC.id?.split('/').pop() || '',
  "brand": {
    "@type": "Brand",
    "name": OLD_DESC.vendor || "PlatiNum"
  },
  "offers": {
    "@type": "Offer",
    "url": `https://platinumshop.it/products/${SEO.handle}`,
    "priceCurrency": "EUR",
    "price": OLD_DESC.price ? parseFloat(OLD_DESC.price.toString()).toFixed(2) : "0.00",
    // "availability": OLD_DESC.available 
    //   ? "https://schema.org/InStock" 
    //   : "https://schema.org/OutOfStock",
    "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    "itemCondition": "https://schema.org/NewCondition",
    "seller": {
      "@type": "Organization",
      "name": "PlatiNum"
    }
  }
};





        const mergedTags = [...new Set([
          ...(OLD_DESC.tags || []),
          (SEO.category|| []),
          "DESC_AI"])];
        // const response = 
        await admin.graphql(productsupdated, {
          variables: {
            product: {
              id: OLD_DESC.id,
              descriptionHtml: DESC_AI.detailedDescription,
              tags: mergedTags,
              category:CATEGORY_TAMMOXY_ID,
              handle:SEO.handle,
              productType:SEO.productType,
              seo:{
                description:SEO.seoDescription,
                title:SEO.seoTitle
              },
              metafields: [
                {
                  namespace: "custom",
                  key: "descriptionsai",
                  type: "json",
                  value: JSON.stringify(DESC_AI.shortDescription)
                },
                {
                  namespace: "custom",
                  key: "seo_title",
                  type: "json",
                  value: JSON.stringify(SEO.seoTitle)
                },
                {
                  namespace: "custom",
                  key: "seo_descreption",
                  type: "json",
                  value: JSON.stringify(SEO.seoDescription)
                },
                {
                  namespace: "seo",
                  key: "schema_org",
                  type: "json",
                  value: JSON.stringify(productSchema)
                }
              ]
            }
          }
        });
             
          
  
          // responses=response
      
      
       
        }
      }

   

   

}






    return Response.json(optimizedHtml,  {headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300"
    }});
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to generate content" }, { status: 500 });
  }

}




// export default function Descriptionupdated(){

//     const initial = useLoaderData<typeof loader>();
//     console.log('initia deta is her helo ',initial)
    
//     const fetcher = useFetcher();
//     const submit =useSubmit()
//     const actionData=useActionData()
//     const navigation=useNavigation()
//     const isSubmitting=navigation.state==="submitting"
//   console.log('action data is her',actionData)
//   console.log('fetcher data is her',fetcher)
  
//     const [rows, setRows] = useState(initial?.variants);
//     const [pageInfo, setPageInfo] = useState(initial?.pageInfo);
  
//     // cursor history
//     const [cursorStack, setCursorStack] = useState<string[]>([]);
  
//     interface SelectedVariant {
//       id: string;
//       descreption: string,
//       tags:string[]
//     }
  
//     const [selected, setSelected] = useState<SelectedVariant[]>([]);
  
//     // Handle pagination result
//     useEffect(() => {
//       if (fetcher.data) {
//         setRows(fetcher?.data?.variants);
//         setPageInfo(fetcher?.data?.pageInfo);
//       }
//     }, [fetcher.data]);
  
//     // Auto-select CONTINUE variants on each page
//     useEffect(() => {
//       const autoSelected: SelectedVariant[] = rows
//       .filter((v: any) => !v.tags?.includes('DESC_AI'))
//         // .filter((v: any) => v.inventoryPolicy === "CONTINUE")
//         .map((v: any) => ({
//           id: v.id,
//           descreption:v.descriptionHtml,
//           tags:v.tags,
//           handel:v.handle,
//           vendor:v.vendor,
//           image:variant?.featuredMedia?.image?.url??'',
//           productType:v.productType
//         }));
  
//       setSelected(autoSelected);
//     }, [rows]);
//   console.log('selected',selected)
  
//   const handleSubmitFormData = () => {
//     // if(selected.length===0) return 
//     const formData = new FormData();
//     formData.append("descreptionAI", JSON.stringify(selected));
    
//     submit(formData, { 
//       method: "post",
//       encType: "application/x-www-form-urlencoded" 
//     });
//   };
  
//     const prevCursor =
//       cursorStack.length > 1
//         ? cursorStack[cursorStack.length - 2]
//         : undefined;
  
//     return (
//       <>
//       <div style={{ padding: 24 }}>
//         <h1>Out of stock variants</h1>
  
//         <table width="100%" border={1} cellPadding={8}>
//           <thead>
//             <tr>
//               <th>Select</th>
              
//             <th>Product image</th> 
//               <th>title</th>
//               <th>product ID</th>
//               <th>descreption</th>
//               <th>tags</th>
//               <th>handel</th>
//               {/* <th>Inventory</th>
//               <th>Policy</th> */}
//             </tr>
//           </thead>
  
//           <tbody>
//             {rows.map((v: any) => (
//               <tr key={v.id}>
//                 <td>
//                   <input
//                     type="checkbox"
//                     checked={selected.some(s => s.id === v.id)}
//                     onChange={(e) => {
//                       if (e.target.checked) {
//                         setSelected(prev => [
//                           ...prev,
//                           {
//                             // ...v, // spread all properties of v to satisfy SelectedVariant type
//                             id: variant?.id,
//                             descreption: variant?.descriptionHtml,
//                             tags:variant?.tags,
//                             handel:variant?.handle,
//                             vendor:v.vendor,
//                             image:variant?.featuredMedia?.image?.url??'',
//                             productType:v.productType
//                           }
//                         ]);
//                       } else {
//                         setSelected(prev =>
//                           prev.filter(s => s.id !== v.id)
//                         );
//                       }
//                     }}
//                   />
//                 </td>
//                 {/* <td>{v.product.title}</td>
//                 <td>{v.product.id}</td> */}
//                 <td>
//                   <img src={v.featuredMedia?.image?.url ?? ''} alt={v.featuredMedia?.image?.altText ?? ''} width={200} height={200} />
//                 </td>
//                 <td>{v.vendor} </td>
//                  <td>{v.title}</td>
//                 <td>{v.id}</td>
//                 <td>{v.descriptionHtml}</td>
//                 <td>
//                 {v.tags.map((tag:string,index:number)=>(
//                   <span className="badge" key={index}>{tag}</span>
//                 )
                 
//                 )}
//                 </td>
//                 <td>{v.handle}</td>
//                 {/* <td>{v.inventoryQuantity}</td>
//                 <td>{v.inventoryPolicy}</td> */}
//               </tr>
//             ))}
//           </tbody>
//         </table>
  
//         {/* Next page */}
//         {pageInfo.hasNextPage && (
//           <button
//             disabled={fetcher.state === "loading"}
//             onClick={() => {
//               setCursorStack(prev => [...prev, pageInfo.endCursor]);
//               fetcher.load(`?cursor=${pageInfo.endCursor}`);
//             }}
//           >
//             {fetcher.state === "loading" ? "Loading..." : "Next page →"}
//           </button>
//         )}
  
//         {/* Previous page */}
//         {prevCursor && (
//           <button
//             disabled={fetcher.state === "loading"}
//             onClick={() => {
//               setCursorStack(prev => prev.slice(0, -1));
//               fetcher.load(`?cursor=${prevCursor}`);
//             }}
//           >
//             ← Previous page
//           </button>
//         )}
  
//         {/* updated thedata */}
//         <Button
//                   variant="primary"
//                   onClick={handleSubmitFormData}
//                   loading={isSubmitting}
//                   size="large"
//                 >
//                   Create updated policy
//                 </Button>
//       </div>

//       {/* {Array.isArray(actionData) && actionData?.map((e: { detailedDescription?: string }, idx: number) => (
//       <>
//         <div key={idx} dangerouslySetInnerHTML={{ __html: e.detailedDescription || "" }} />
//         <p>
//           {e.detailedDescription
//             ? (() => {
//                 try {
//                   return JSON.parse(e.detailedDescription);
//                 } catch {
//                   return e.detailedDescription;
//                 }
//               })()
//             : ""}
//         </p>
//       </>
//       ))} */}
//   </>
  
//     );
//   }
  
interface Variant {
  id: string;
  title: string;
  descriptionHtml: string;
  tags: string[];
  handle: string;
  vendor: string;
  productType: string;
  inventoryQuantity?: number;
  inventoryPolicy?: string;
  totalInventory?:number
  tracksInventory?:boolean
  featuredMedia?: {
    image?: {
      url: string;
      altText?: string;
    };
  };
  priceRangeV2?:{
    maxVariantPrice?:{
      amount:string
      currencyCode:string
    }

    minVariantPrice?:{
      amount:string
      currencyCode:string
     }

  }
}

interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  endCursor: string;
  startCursor: string;
}

interface LoaderData {
  variants: Variant[];
  pageInfo: PageInfo;
}

// Your exact selection structure
interface SelectedVariant {
  id: string;
  descreption: string;  // Note: matches your spelling
  tags: string[];
  handel: string;       // Note: matches your spelling
  vendor: string;
  image: string;
  productType: string;
}

// Loader & Action


export default function DescriptionManager() {
  // Hooks
  const initial = useLoaderData<LoaderData>();
  const fetcher = useFetcher<LoaderData>();
  const submit = useSubmit();
  const actionData = useActionData<{ success?: boolean; error?: string }>();
  const navigation = useNavigation();
  const { smDown } = useBreakpoints();

  // State
  const [rows, setRows] = useState<Variant[]>(initial?.variants || []);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(initial?.pageInfo || null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [selected, setSelected] = useState<SelectedVariant[]>([]);
  const [isSelectAllIndeterminate, setIsSelectAllIndeterminate] = useState(false);
console.log("rows is her see",rows)
console.log('intital data is her ',initial)
console.log("fetch is her succes",fetcher)
  const isLoading = fetcher.state === "loading";
  const isSubmitting = navigation.state === "submitting";

  // Update rows when fetcher data changes
  useEffect(() => {
    if (fetcher.data) {
      setRows(fetcher.data.variants);
      setPageInfo(fetcher.data.pageInfo);
      // Keep existing selections that are still in new rows, remove others
      setSelected((prev) => 
        prev.filter((s) => fetcher?.data?.variants.some((v: Variant) => v.id === s.id))
      );
    }
  }, [fetcher.data]);

  // Update select all checkbox state
  useEffect(() => {
    if (rows.length === 0) {
      setIsSelectAllIndeterminate(false);
      return;
    }
    const allSelected = rows.every((v) => selected.some((s) => s.id === v.id));
    const someSelected = rows.some((v) => selected.some((s) => s.id === v.id));
    setIsSelectAllIndeterminate(someSelected && !allSelected);
  }, [selected, rows]);

  // Check if a variant is selected
  const isSelected = useCallback((id: string) => {
    return selected.some((s) => s.id === id);
  }, [selected]);

  // Handle select all
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const allSelected: SelectedVariant[] = rows.map((v) => ({
        id: v.id,
        descreption: v.descriptionHtml || "",
        tags: v.tags || [],
        handel: v.handle,
        vendor: v.vendor,
        image: v.featuredMedia?.image?.url || "",
        productType: v.productType,
        title:v.title,
        totalInventory:v?.totalInventory,
        tracksInventory:v?.tracksInventory,
        max_amount:v?.priceRangeV2?.maxVariantPrice?.amount,
        currencyCode:v?.priceRangeV2?.maxVariantPrice?.currencyCode,
        min_amount:v.priceRangeV2?.minVariantPrice?.amount

       

      }));
      setSelected(allSelected);
    } else {
      setSelected([]);
    }
  }, [rows]);

  // Handle individual row selection
  const handleSelectRow = useCallback((variant: Variant, checked: boolean) => {
    if (checked) {
      setSelected((prev) => [
        ...prev,
        {
          id: variant.id,
          descreption: variant.descriptionHtml || "",
          tags: variant.tags || [],
          handel: variant.handle,
          vendor: variant.vendor,
          image: variant.featuredMedia?.image?.url || "",
          productType: variant.productType,
          title:variant.title,
          totalInventory:variant?.totalInventory,
          tracksInventory:variant?.tracksInventory,
          max_amount:variant?.priceRangeV2?.maxVariantPrice?.amount,
          currencyCode:variant?.priceRangeV2?.maxVariantPrice?.currencyCode,
          min_amount:variant.priceRangeV2?.minVariantPrice?.amount
  
         
        },
      ]);
    } else {
      setSelected((prev) => prev.filter((s) => s.id !== variant.id));
    }
  }, []);

  // Toggle row selection (add if not exists, remove if exists)
  const toggleSelection = useCallback((variant: Variant) => {
    const exists = selected.some((s) => s.id === variant.id);
    if (exists) {
      setSelected((prev) => prev.filter((s) => s.id !== variant.id));
    } else {
      setSelected((prev) => [
        ...prev,
        {
          id: variant.id,
          descreption: variant.descriptionHtml || "",
          tags: variant.tags || [],
          handel: variant.handle,
          vendor: variant.vendor,
          image: variant.featuredMedia?.image?.url || "",
          productType: variant.productType,
        },
      ]);
    }
  }, [selected]);
  // Auto-select variants without DESC_AI tag
  const handleAutoSelect = useCallback(() => {
    const newSelected: SelectedVariant[] = rows
      .filter((v) => !v.tags?.includes("DESC_AI"))
      .map((v) => ({
        id: v.id,
        descreption: v.descriptionHtml || "",
        tags: v.tags || [],
        handel: v.handle,
        vendor: v.vendor,
        image: v.featuredMedia?.image?.url || "",
        productType: v.productType,
      }));
    setSelected(newSelected);
  }, [rows]);

  // Pagination handlers
  const handleNextPage = useCallback(() => {
    if (pageInfo?.endCursor) {
      setCursorStack((prev) => [...prev, pageInfo.endCursor]);
      fetcher.load(`?cursor=${pageInfo.endCursor}`);
    }
  }, [pageInfo, fetcher]);

  const handlePreviousPage = useCallback(() => {
    if (cursorStack.length > 0) {
      const newStack = cursorStack.slice(0, -1);
      setCursorStack(newStack);
      const prevCursor = newStack[newStack.length - 1];
      fetcher.load(prevCursor ? `?cursor=${prevCursor}` : "?cursor=");
    }
  }, [cursorStack, fetcher]);

  // Submit handler
  const handleSubmit = useCallback(() => {
    if (selected.length === 0) return;

    const formData = new FormData();
    formData.append("descreptionAI", JSON.stringify(selected));
    
    submit(formData, {
      method: "post",
      encType: "application/x-www-form-urlencoded",
    });
  }, [selected, submit]);
console.log('selected is her ',selected)
  // Table headings with Select All checkbox
  const headings = [
    <Checkbox
      key="select-all"
      label="Select all variants"
      labelHidden
      checked={rows.length > 0 && rows.every((v) => isSelected(v.id))}
      indeterminate={isSelectAllIndeterminate}
      onChange={handleSelectAll}
      disabled={rows.length === 0}
    />,
    "Image",
    "Product Details",
    "Description",
    "Tags",
    "Handle",
  ];
console.log('rows is seccesfuly her ',rows)
  // Table rows
  const rowsData = useMemo(() => {
    return rows.map((variant) => [
      <Checkbox
        key={`checkbox-${variant.id}`}
        label={`Select ${variant.title}`}
        labelHidden
        checked={isSelected(variant.id)}
        onChange={(checked) => handleSelectRow(variant, checked)}
      />,
      <Thumbnail
        key={`thumb-${variant.id}`}
        source={variant.featuredMedia?.image?.url || ""}
        alt={variant.featuredMedia?.image?.altText || variant.title}
        size="medium"
      />,
      <BlockStack key={`details-${variant.id}`} gap="100">
        <Text as="span" variant="bodyMd" fontWeight="semibold">
          {variant.title}
        </Text>
        <Text as="span" variant="bodySm" tone="subdued">
          {variant.vendor} • {variant.productType}
        </Text>
        <Text as="span" variant="bodySm" fontWeight="medium" fontFamily="monospace">
          ID: {variant.id.split("/").pop()}
        </Text>
      </BlockStack>,
      <Box key={`desc-${variant.id}`} maxWidth="300px">
        <div
          style={{
            maxHeight: "80px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            fontSize: "13px",
            lineHeight: "1.4",
            color: variant.descriptionHtml ? "inherit" : "#999",
          }}
          dangerouslySetInnerHTML={{
            __html: variant.descriptionHtml || "<em>No description available</em>",
          }}
        />
      </Box>,
      <InlineStack key={`tags-${variant.id}`} gap="100" wrap>
        {variant.tags?.length > 0 ? (
          variant.tags.map((tag) => (
            <Tag key={tag} tone={tag === "DESC_AI" ? "success" : "neutral"}>
              {tag}
            </Tag>
          ))
        ) : (
          <Text as="span" tone="subdued" variant="bodySm">
            No tags
          </Text>
        )}
      </InlineStack>,
      <Text key={`handle-${variant.id}`} as="span" variant="bodySm" tone="subdued" breakWord>
        /{variant.handle}
      </Text>,
    ]);
  }, [rows, isSelected, handleSelectRow]);

  // Empty state
  if (rows.length === 0 && !isLoading) {
    return (
      <Page title="Description Manager">
        <Card>
          <EmptyState
            heading="No variants found"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>There are no product variants to display.</p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title="Description Manager"
      subtitle={`${selected.length} variants selected for update`}
      primaryAction={
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={selected.length === 0}
        >
          Update Descriptions
        </Button>
      }
      secondaryActions={[
        {
          content: "Refresh",
          onAction: () => fetcher.load(window.location.search),
          loading: isLoading,
        },
      ]}
    >
      <BlockStack gap="400">
        {/* Status Banners */}
        {actionData?.success && (
          <Banner title="Success" tone="success" onDismiss={() => {}}>
            <p>Successfully updated {selected.length} product descriptions.</p>
          </Banner>
        )}
        {actionData?.error && (
          <Banner title="Error" tone="critical">
            <p>{actionData.error}</p>
          </Banner>
        )}

        {/* Stats Bar */}
        <Card padding="400">
          <InlineStack gap="400" align="space-between" blockAlign="center" wrap={false}>
            <InlineStack gap="400">
              <Box>
                <Text as="p" variant="bodySm" tone="subdued">
                  Total on Page
                </Text>
                <Text as="p" variant="headingMd">
                  {rows.length}
                </Text>
              </Box>
              <Box>
                <Text as="p" variant="bodySm" tone="subdued">
                  Selected
                </Text>
                <Text as="p" variant="headingMd" tone="success">
                  {selected.length}
                </Text>
              </Box>
              <Box>
                <Text as="p" variant="bodySm" tone="subdued">
                  Already Processed
                </Text>
                <Text as="p" variant="headingMd">
                  {rows.filter((v) => v.tags?.includes("DESC_AI")).length}
                </Text>
              </Box>
            </InlineStack>
            
            <Tooltip content="Select variants without DESC_AI tag">
              <Button
                size="slim"
                onClick={handleAutoSelect}
                disabled={rows.filter((v) => !v.tags?.includes("DESC_AI")).length === 0}
              >
                Auto-select New
              </Button>
            </Tooltip>
          </InlineStack>
        </Card>

        {/* Data Table */}
        <Card padding="0">
          {isLoading ? (
            <Box padding="600" alignItems="center" display="flex" justifyContent="center">
              <Spinner size="large" />
            </Box>
          ) : (
            <>
              <DataTable
                columnContentTypes={[
                  "text", // Checkbox
                  "text", // Image
                  "text", // Details
                  "text", // Description
                  "text", // Tags
                  "text", // Handle
                ]}
                headings={headings}
                rows={rowsData}
                verticalAlign="middle"
                hoverable
                truncate={false}
              />
              
              {/* Pagination */}
              <Divider />
              <Box padding="400">
                <InlineStack align="center">
                  <Pagination
                    hasPrevious={cursorStack.length > 0}
                    onPrevious={handlePreviousPage}
                    hasNext={pageInfo?.hasNextPage || false}
                    onNext={handleNextPage}
                    label={`Page ${cursorStack.length + 1}`}
                  />
                </InlineStack>
              </Box>
            </>
          )}
        </Card>

        {/* Debug: Show selected data structure */}
        {process.env.NODE_ENV === "development" && selected.length > 0 && (
          <Card>
            <Box padding="400">
              <Text as="h3" variant="headingSm">Debug: Selected Data Structure</Text>
              <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                <pre style={{ fontSize: "11px", overflow: "auto" }}>
                  {JSON.stringify(selected.slice(0, 2), null, 2)}
                  {selected.length > 2 && `\n... and ${selected.length - 2} more`}
                </pre>
              </Box>
            </Box>
          </Card>
        )}

        {/* Mobile Bulk Actions */}
        {smDown && selected.length > 0 && (
          <Box
            position="fixed"
            insetBlockEnd="0"
            insetInlineStart="0"
            insetInlineEnd="0"
            padding="400"
            background="bg-surface"
            borderBlockStartWidth="100"
            borderColor="border"
            zIndex="100"
          >
            <Button
              variant="primary"
              fullWidth
              onClick={handleSubmit}
              loading={isSubmitting}
            >
              Update {selected.length} Descriptions
            </Button>
          </Box>
        )}
      </BlockStack>
    </Page>
  );
}




export const loader = async ({request,context}:LoaderFunctionArgs) => {
  const { admin } = await shopify(context).authenticate.admin(request);
  const url=new URL(request.url)
  const cursor=url.searchParams.get('cursor')
  console.log('cursor her ',cursor)
  let query=    `#graphql
  query GetProducts($cursor:String) {
    products(first: 50,after:$cursor) {
        edges{
            node{
              category{
                ancestorIds
                fullName
                id
                isLeaf
                name
                parentId
                attributes(first:30){
                  edges{
                    node{
                    ... on  TaxonomyAttribute{
                        id
                      }
                      ... on TaxonomyChoiceListAttribute{
                        id
                        name
                        
                      }
                      ... on TaxonomyMeasurementAttribute {
                        id
                        name
                        options{
                          key value
                        }
                      }
                    }
                  }
                }
              }
              publishedAt
              createdAt
              totalInventory
              tracksInventory
              updatedAt
              productParents(first:1) {
                  edges{
                    node{
                      totalInventory
                      tracksInventory
                      title
                      updatedAt
                      vendor
                      publishedAt
                      createdAt
                      productType
                      
                      onlineStorePreviewUrl
                      id
                      hasOutOfStockVariants
                      hasOnlyDefaultVariant
                      handle
                    }
                  }
              }

              priceRangeV2{
                maxVariantPrice{
                   amount
                   currencyCode
                }
                minVariantPrice{
                  amount
                   currencyCode
                }
              }
              productType

              options(first: 10) {
                id
                name
                linkedMetafield{
                  namespace
                  key
                }
                position
                values
                optionValues{
                  hasVariants
                  id
                  linkedMetafieldValue
                  name
                  swatch{
                    color
                    image{
                      id
                      alt
                      image{
                        url
                        id
                      }
                    }
                  }
                  
                  
                }
              }
                title
                id
                descriptionHtml
                tags
                handle
                vendor
                featuredMedia {
          ... on MediaImage {
            id
            image {
              url
              altText
              width
              height
            }
          }
        }
                media(first: 10) {
                  edges{
                    node{
                      ... on MediaImage {
                id
                image {
                  url
                  altText
                  width
                  height
                }
              }
                      # alt
                      # id
                      # preview{
                      #   image{
                      #     id
                      #     altText
                      #     thumbhash
                      #     # url{
                      #     #   transform{
                      #     #     scale
                      #     #   }
                      #     # }

                      #   }
                      # }
                    }
                  }
                }
                variants(first: 10) {
                  edges {
                    node {
                      id
                      title
                      selectedOptions{
                        name
                        value
                        optionValue{
                          id
                          name
                          hasVariants
                          linkedMetafieldValue
                          swatch{
                            color
                            image{
                              id 
                              alt
                              image{
                                id
                                url
                              }
                            }
                          }
                        }
                      }
                      inventoryItem{
                        countryCodeOfOrigin
                   
                        inventoryLevels(first: 10) {
                          edges {
                            node {
                              location{
                                id
                                activatable
                                address{
                                  address1
                                  address2
                                  city
                                  country
                                  countryCode
                                  formatted
                                  province
                                  
                                  zip
                                }
                              }
                            }
                          }
                        }

                        countryHarmonizedSystemCodes(first: 10) {
                          edges {
                            node {
                              countryCode
                              harmonizedSystemCode
                            }
                          }
                        }

                        sku
                        provinceCodeOfOrigin
                        requiresShipping
                        trackedEditable{
                          locked
                          reason
                        }
                        
                        tracked
                        
                      }
                    }
                  }
                }
            }
        }
        nodes{
          category{
            ancestorIds
            childrenIds
            fullName
            isLeaf
            isRoot
            level
            name
            parentId
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
  // console.log('res is her ',res.data)
  const productsdescreption={
    variants: res?.data.products.edges.map((e: any) => e.node),
        pageInfo: res?.data.products.pageInfo,
        category: res?.data.products.nodes.map((e: any) => e.category)
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



export async function generateSeoHtmlgimini(GEMINI_API_KEY:string,description:DESCREPTION) {
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
        "tablet": "Font sizes: h1: 28-32px, h2: 24-26px, body: 16-17px on tablets.",
        "desktop": "Font sizes: h1: 32-36px, h2: 26-28px, body: 16-17px on desktop."
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
      shortDescription: "<ul class='premium-bullets' style='list-style: none; padding: 0; margin: 0; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; line-height: 1.6;'>\n  <li style='margin-bottom: 12px; padding-left: 28px; position: relative;'>\n    <span style='position: absolute; left: 0; color: #8B7355; font-size: 17px;'>●</span>\n    <strong style='color: #2C3E50;'>[PREMIUM MATERIAL]</strong> Description text here...\n  </li>\n  <!-- More list items -->\n  <li style='margin-top: 16px; text-align: center;'>\n    <span style='background: #2C3E50; color: white; padding: 10px 20px; border-radius: 30px; display: inline-block; font-weight: 500; letter-spacing: 0.5px;'>✨ ELEVATE YOUR EXPERIENCE TODAY ✨</span>\n  </li>\n</ul>",
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



