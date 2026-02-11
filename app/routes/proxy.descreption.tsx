import { type LoaderFunctionArgs } from "@remix-run/node";



export async function loader({context,request}:LoaderFunctionArgs){
    const response = await fetch("https://toothsomely-unremanded-chadwick.ngrok-free.dev/api/generate", {method:"post",headers: {
        "Content-Type": "application/json"
      }
,      
        body:JSON.stringify(
            {
                options: {
                    temperature: 0.7
                  },
                stream: false,
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
            }
        ),
      
       
        
      });
let res=await response.text()

      console.log("hello res im her",res);

      return Response.json({ improvedHtml: res });
    
}

