//  function buildPrompt(
//     chunk: { id: string; descreption: string }[],
//     outputField: 'shortDescription' | 'detailedDescription'
//   ): string {
//     const isShort = outputField === 'shortDescription';
//     const fieldLabel = isShort ? 'shortDescription (bullet points only)' : 'detailedDescription (full article only)';
//     const outputStructure = isShort
//       ? '{ "id": "original_product_id", "shortDescription": "PROFESSIONAL_HTML_STRING" }'
//       : '{ "id": "original_product_id", "detailedDescription": "COMPLETE_HTML5_ARTICLE" }';

//     return `You are a JSON API. Process ALL ${chunk.length} products and return a JSON array with ONLY ${fieldLabel}.

//     PROMPT TEMPLATE FOR EACH PRODUCT:
//     {
//       "role": "Senior E-commerce & Ad Copy Specialist, expert in high-conversion listings for Amazon and social ads (Google/Facebook/TikTok)",
//       "objective": "Transform raw technical data into a visually engaging Amazon listing using professional HTML, color psychology, ad‑ready hooks, and interactive elements that boost engagement and trust.",
//       "outputFormat": {
//         ${isShort
//           ? '"shortDescription": "PROFESSIONAL_HTML_STRING (SEO-optimized bullet points with strategic color accents, emojis for engagement, and strong CTA)"'
//           : '"detailedDescription": "PROFESSIONAL_HTML_STRING (A+ Content with complete HTML5 structure, color psychology, responsive design, a 4‑column specs table, and an interactive \\"See More / See Less\\" section that reveals full details in a magazine‑style layout)"'
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
//       ${isShort
//         ? '"constraints": ["5-6 bullets maximum.", "Start each bullet with bolded [BENEFIT].", "Use emojis (🎁, ✅, ⭐, 🔥) before or after key benefits to increase visual appeal and engagement.", "End with a clear, urgent CTA that works for ads.", "Include subtle trust signals (e.g., \\"Premium Quality\\", \\"Satisfaction Guaranteed\\") within bullets.", "Use inline styles or unique class names to prevent theme conflicts."]'
//         : '"constraints": ["Use <h1>, <h2>, <section>.", "Convert specs into a styled <table> with exactly 4 columns: Feature | Specification | Benefit | Compatibility.", "Preserve ALL <img> tags. Limit to 3-4 sections to stay concise.", "Include an interactive \\"See More / See Less\\" section: initially show a shorter preview (first paragraph or key highlights). Clicking \\"See More\\" expands to the full detailed description in a professional magazine‑style layout (use CSS :checked or simple JavaScript with inline event handlers). The expanded view should include all product details, additional trust badges, and positive buying signals.", "Use emojis (🎯, 💎, 🏆, 🌟) throughout the text to emphasize features and benefits, increasing emotional connection.", "Include a closing CTA adaptable for Google/Facebook/TikTok ads, and optionally a \\"Shop Now\\" button.", "Generate inline CSS or use style tags with unique class names to avoid conflicts with existing theme styles."]'
//       }
//     }

//     DATA TO PROCESS:
//     ${JSON.stringify(chunk.map(p => ({ id: p.id, content: p.descreption })))}

//     Return a JSON array with EXACTLY ${chunk.length} objects. Each object: ${outputStructure}
//     CRITICAL: All quotes in strings MUST be escaped (\\"). Return ONLY the JSON array, no markdown.`;
//   }