import { jsonrepair } from "jsonrepair";

export const parserData = (resulter: string, parsed: unknown, JSON5: { parse: (text: string) => unknown }) => {
    try {
        parsed = JSON.parse(resulter);
        console.log('Successfully parsed with JSON.parse');
        return parsed
       
      } catch (jsonError) {
        console.warn('JSON.parse failed, trying JSON5:', jsonError);
        
        // Strategy 2: Try JSON5 (more lenient parser)
        try {
          parsed = JSON5.parse(resulter);
          console.log('Successfully parsed with JSON5');
          return parsed
        } catch (json5Error) {
          console.warn('JSON5.parse failed, trying jsonrepair:', json5Error);

          // Strategy 3: Use jsonrepair to fix common AI JSON issues (unescaped quotes in HTML, etc.)
          try {
            const repaired = jsonrepair(resulter);
            parsed = JSON.parse(repaired);
            console.log('Successfully parsed with jsonrepair');
            return parsed;
          } catch (repairError) {
            console.warn('jsonrepair failed, trying manual repair:', repairError);
          }

          // Strategy 4: Extract JSON array and try to repair common issues
          const jsonMatch = resulter.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            let jsonText = jsonMatch[0];

            try {
              parsed = JSON5.parse(jsonText);
              console.log('Successfully parsed extracted JSON with JSON5');
              return parsed;
            } catch (e) {
              try {
                const repaired = jsonrepair(jsonText);
                parsed = JSON.parse(repaired);
                console.log('Successfully parsed extracted JSON with jsonrepair');
                return parsed;
              } catch (_) {
                /* fall through to manual repair */
              }
              console.warn('JSON5 on extracted text failed, trying manual repair:', e);
              
              // Try to repair by finding and fixing unescaped quotes in HTML content
              // This is a more aggressive approach
              try {
                let repaired = jsonText;
                
                // Strategy: Fix common HTML attribute patterns that break JSON
                // Replace single quotes in HTML attributes with escaped double quotes
                repaired = repaired.replace(/style='([^']*)'/g, (match, content) => {
                  return `style="${content.replace(/"/g, '\\"')}"`;
                });
                
                // Fix other common HTML attribute patterns
                repaired = repaired.replace(/(\w+)='([^']*)'/g, (match, attr, content) => {
                  // Only fix if it's inside a string value (has quotes around)
                  return `${attr}="${content.replace(/"/g, '\\"')}"`;
                });
                
                // Try JSON5 again with repaired text
                parsed = JSON5.parse(repaired);
                console.log('Successfully parsed after manual repair');
                return parsed
              } catch (repairError) {
                console.error('All parsing strategies failed:', repairError);
                console.error('Response length:', resulter.length);
                console.error('First 500 chars:', resulter.substring(0, 500));
                console.error('Last 500 chars:', resulter.substring(Math.max(0, resulter.length - 500)));
                
                // Check if response appears truncated (ends abruptly without closing brackets)
                const trimmed = resulter.trim();
                const lastChar = trimmed[trimmed.length - 1];
                const bracketCount = (trimmed.match(/\[/g) || []).length - (trimmed.match(/\]/g) || []).length;
                const braceCount = (trimmed.match(/\{/g) || []).length - (trimmed.match(/\}/g) || []).length;
                
                if (lastChar !== ']' && lastChar !== '}' || bracketCount > 0 || braceCount > 0) {
                  console.warn('Response appears to be truncated. JSON is incomplete.');
                  throw new Error('Response truncated: JSON is incomplete. Try processing fewer products at once.');
                }
                
                // Last resort: try to parse just the structure and return partial data
                throw new Error(`Failed to parse JSON: ${repairError instanceof Error ? repairError.message : 'Unknown error'}`);
              }
            }
          } else {
            throw new Error('Could not find JSON array in response');
          }
        }
      }
}