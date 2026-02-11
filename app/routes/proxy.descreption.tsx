import { type LoaderFunctionArgs } from "@remix-run/node";



export async function loader({context,request}:LoaderFunctionArgs){
    const response = await fetch("http://localhost:11434/api/generate", {method:"post",
        model: "deepseek-coder",
        prompt: `
    You are an expert eCommerce SEO specialist.
    
    Rewrite the following product description into:
    - Professional HTML
    - SEO optimized
    - Use semantic tags
    - Add headings (H2, H3)
    - Add bullet benefits
    - Add call-to-action
    - Keep Shopify compatible
    - Return ONLY clean HTML
    
    HTML:
    <div>
      <p>Good leather wallet for men. Brown color. Handmade.</p>
    </div>
    `,
        stream: false,
        options: {
          temperature: 0.7
        }
      });
let res=await response.json()

      console.log(res);

      return Response.json({ improvedHtml: res });
    
}

