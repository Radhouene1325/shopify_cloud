


import { type ActionFunctionArgs } from "@remix-run/node";
import { useActionData, Form, useNavigation } from "@remix-run/react";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Logic to call Gemini
async function generateSeoHtml(description: string,API_KEY_GEMINI:string) {
  // ⚠️ WARNING: Use process.env.GEMINI_KEY in production!
  console.log('is her both of ',description ,"api key is her ", API_KEY_GEMINI)
  const genAI = new GoogleGenerativeAI(API_KEY_GEMINI);
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" ,generationConfig: {
    responseMimeType: "application/json",
  }});
  
  const prompt = `
  You are a Senior E-commerce SEO Specialist and UX Copywriter for a high-end Amazon storefront. 
  Your goal is to transform raw product data into a high-converting, SEO-optimized masterpiece.
  
  STRICT JSON OUTPUT FORMAT:
  {
    "shortDescription": "HTML_STRING",
    "detailedDescription": "HTML_STRING"
  }
  
  RULES FOR "shortDescription" (Amazon "Above the Fold" Style):
  - Focus on "Benefit-First" copy. Why should the customer care?
  - Use <ul> with 5-6 bullet points. Start each bullet with a bolded [CAPITALIZED KEY BENEFIT].
  - Include a clear, persuasive "Call to Action" at the end.
  - Design: Clean, high-white-space layout.
  
  RULES FOR "detailedDescription" (Amazon "A+ Content" Style):
  - HIERARCHY: Use <h1> for a catchy Product Title. Use <h2> for sectional headings (e.g., "Premium Quality," "Versatile Style").
  - IMAGE PRESERVATION: Every <img> tag from the source MUST remain in the flow. Do not delete them.
  - JSON TO TABLE: Convert any JSON size/spec data into a 4-column <table>. Use <thead> for headers. Add "cellpadding='10'" and "border='1'" for a clean look.
  - PSYCHOLOGY: Use sensory words and address pain points.
  - CLEAN HTML: Use semantic tags (<section>, <article>, <strong>). No messy inline styles.
  
  RAW PRODUCT DATA:
  ${description}
  `;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text(); 
  return JSON.parse(responseText);
}

// 2. Remix Action (Server Side)
export async function action({context ,request }: ActionFunctionArgs) {
return Response.json('hello world')
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
  