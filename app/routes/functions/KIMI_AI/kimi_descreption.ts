// app/routes/api/optimize-descriptions.ts

// Kimi/Moonshot AI API configuration
const KIMI_API_URL = "https://api.moonshot.cn/v1/chat/completions";

export async function kimi(descriptions,KIMI_API_KEY) {
  // Validate request method


  try {
    // Parse request body
  
    // Validate input
    if (!Array.isArray(descriptions) || descriptions.length === 0) {
      return Response.json(
        { error: "descriptions must be a non-empty array" },
        { status: 400 }
      );
    }

    // Optimize each description using Kimi API
    //   descriptions.map(async (description) => {
        const response = await fetch(KIMI_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${KIMI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "moonshot-v1-8k", // or moonshot-v1-32k, moonshot-v1-128k
            messages: [
              {
                role: "system",
                content: "You are a professional copywriter. Optimize the following description to be more engaging, clear, and concise. Return only the optimized text without any explanations."
              },
              {
                role: "user",
                content: `Optimize this description: "${descriptions}"`
              }
            ],
            temperature: 0.7,
            max_tokens: 5000,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Kimi API error: ${error}`);
        }

        const data = await response.json();
        console.log(data)
        const x= data?.choices[0]?.message?.content?.trim();
        console.log(x)
      
    

    return Response.json({ 
      success: true, 
      x 
    });

  } catch (error) {
    console.error("Optimization error:", error);
    return Response.json(
      { error: "Failed to optimize descriptions" },
      { status: 500 }
    );
  }
}