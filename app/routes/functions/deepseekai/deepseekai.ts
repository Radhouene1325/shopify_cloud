import { parserData } from "@/parser/parser_data";
import JSON5 from "json5";

import retry from 'async-retry';
const API_TIMEOUT = 30000;          // 30 seconds per API call

const MAX_RETRIES = 3;


interface DeepSeekResponse {
    choices?: Array<{
      message?: {
        content?: string;
      };
      finish_reason?: string;
    }>;
  }
export async function sendPrompt(prompt: string, DEEP_SEEK_API_KEY: string) {
    const controller = new AbortController(); // ✅ create controller

    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEP_SEEK_API_KEY}`
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
          }),
          signal:controller.signal
        });
        
    
        if (!response.ok) {
          const errorText = await response.text();
          console.error('DeepSeek API error:', response.status, errorText);
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }
    
        const data = await response.json() as DeepSeekResponse;
        console.log('data from dess seek is arrived ',data)
        const choice = data?.choices?.[0];
        let resulter = choice?.message?.content;
        if (choice?.finish_reason === 'length') {
          throw new Error('Response truncated: Output hit token limit. Try processing fewer products or shortening product descriptions.');
        }
        if (!resulter) {
          throw new Error('No content in API response');
        }
       
        if (typeof resulter === 'string') {
          // Remove markdown code fences (```json ... ``` or ``` ... ```)
          resulter = resulter.trim();
          resulter = resulter.replace(/^```(?:json)?\s*/i, ''); // Remove opening fence
          resulter = resulter.replace(/\s*```$/i, ''); // Remove closing fence
          resulter = resulter.trim();
        }
        
        // Try multiple parsing strategies
        let parsed: any = null;
        
  
        const res=parserData(resulter,parsed,JSON5)
        parsed=res
        // Ensure it's an array
        if (Array.isArray(parsed)) {
          // console.log(`Successfully parsed ${parsed.length} items`);
          return parsed;
        } else if (parsed && typeof parsed === 'object') {
          // If it's an object, wrap it in an array
          // console.log('Wrapped single object in array');
          return [parsed];
        } else {
          throw new Error('Parsed result is not a valid object or array');
        }
            
     
        
      } catch (error:any) {
        if (error.name === 'AbortError') throw new Error('Request timeout');
        throw error;
      }

   
  }