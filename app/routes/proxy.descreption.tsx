


import { type ActionFunctionArgs } from "@remix-run/node";
import { useActionData, Form, useNavigation } from "@remix-run/react";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Logic to call Gemini
async function generateSeoHtml(description: string,API_KEY_GEMINI:string) {
  // ⚠️ WARNING: Use process.env.GEMINI_KEY in production!
  console.log('is her both of ',description ,"api key is her ", API_KEY_GEMINI)
  const genAI = new GoogleGenerativeAI(API_KEY_GEMINI);
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

  const prompt = `
You are a professional SEO expert and UI/UX Copywriter.
    Task: Transform the following raw HTML product description into a professional, SEO-optimized masterpiece.

    STRICT RULES:
    1. IMAGE PRESERVATION: Do NOT remove any <img> tags. Keep them in their original positions.
    2. JSON DATA: If you find JSON data (like size charts or specs), convert it into a clean 4-column HTML <table>.

    3. DUAL CONTENT: Provide TWO versions:
        im need the designe more frendly and burefol
       - A "Short Description" (Catchy, high-conversion summary).
       - A "Detailed Description" (Deep SEO, features, benefits, and hierarchy).
    4. HIERARCHY: Use <h1> for product name, <h2> for benefits, and <ul> for features.
    5. SALES COPY: Use persuasive, "human-centric" language.
    6. CLEAN HTML: No inline styles unless necessary for the table borders. Use semantic tags.
    7. and im need to return for me object with key value for exmple Short Description:the short descreption and Detailed Description:juste the detail descpretion only the html 
    RAW DESCRIPTION TO PROCESS:  
    Original HTML: ${description}
  `;

  const result = await model.generateContent(prompt);
  return result.response.json();
}

// 2. Remix Action (Server Side)
export async function action({context ,request }: ActionFunctionArgs) {
 
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
    const API_KEY_GEMINI=context.cloudflare?.env?.GEMINI_API_KEY
    console.log('api key is her ',API_KEY_GEMINI)
  if (!htmlDescription) {
    return Response.json({ error: "Please provide a description" }, { status: 400 });
  }

  try {
    const optimizedHtml = await generateSeoHtml(htmlDescription,API_KEY_GEMINI);
    console.log('new descreption is her and optimise ',optimizedHtml)
    return Response.json({ optimizedHtml });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to generate content" }, { status: 500 });
  }
}

// 3. UI Component (Client Side)
// export default function SeoOptimizer() {
//   const actionData = useActionData<typeof action>();
//   const navigation = useNavigation();
//   const isSubmitting = navigation.state === "submitting";

//   return (
//     <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
//       <h1>SEO Product Optimizer</h1>
      
//       <Form method="post">
//         <label>
//           Paste Product HTML Description:
//           <textarea
//             name="description"
//             rows={10}
//             style={{ width: "100%", display: "block", marginTop: "10px" }}
//             placeholder="<p>Red shoes, size 10...</p>"
//           />
//         </label>
//         <button 
//           type="submit" 
//           disabled={isSubmitting}
//           style={{ marginTop: "1rem", padding: "10px 20px" }}
//         >
//           {isSubmitting ? "Optimizing..." : "Generate SEO Version"}
//         </button>
//       </Form>

//       {actionData?.optimizedHtml && (
//         <div style={{ marginTop: "2rem", borderTop: "1px solid #ccc" }}>
//           <h2>Optimized SEO HTML:</h2>
//           <pre style={{ background: "#f4f4f4", padding: "1rem", whiteSpace: "pre-wrap" }}>
//             {actionData.optimizedHtml}
//           </pre>
//         </div>
//       )}
//     </div>
//   );
// }
  