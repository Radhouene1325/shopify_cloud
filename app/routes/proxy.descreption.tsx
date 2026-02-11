import { type LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ context, request }: LoaderFunctionArgs) {
    try {
      const response = await fetch(
        "https://toothsomely-unremanded-chadwick.ngrok-free.dev/api/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
  
            // 🔐 If using ngrok basic auth
            // "Authorization": "Bearer 39Ws0YopwEUdJGAz5QCZNn3fjlG_4nFN3Jw5rkuGyfNnVAmw2",
  
            // 🔐 OR if you secured via Bearer token (custom middleware)
            // "Authorization": "Bearer YOUR_SECRET_TOKEN"
          },
          body: JSON.stringify({
            model: "deepseek-coder:latest",
            stream: false,
            options: {
              temperature: 0.7,
            },
            prompt: ` You are an expert eCommerce SEO specialist. Rewrite the following product description into: - Professional HTML - SEO optimized - Use semantic tags- Add headings (H2, H3) - Add bullet benefits - Add call-to-action - Keep Shopify compatible - Return ONLY clean HTML - Generate a short video presentation script for the product images - If JSON exists in the description, convert it into a professional 3-column table HTML:<h1>SPECIFICATIONS</h1> <p><span>CN</span>`,
          }),
        }
      );
  
    //   if (!response.ok) {
    //     throw new Error("Ollama error: " + response.statusText);
    //   }
  
      const data = await response.json();
      
      console.log("Ollama full response:", data);

  
      return Response.json({
        improvedHtml: data, // ✅ correct field from Ollama
        
      });
    } catch (error: any) {
      console.error("Error:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }
  }
  