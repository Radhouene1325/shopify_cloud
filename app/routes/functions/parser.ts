// /**
//  * Cleans and normalizes an array of strings.
//  * - Removes code block markers (``` or ```json)
//  * - Converts all single-quoted attributes to double quotes
//  * - Escapes quotes inside style attributes
//  * @param {string[]} arr - Array of strings to parse
//  * @returns {string[]} - Cleaned and normalized array of strings
//  */
// /**
//  * Cleans and normalizes an array of strings.
//  * @param {string[]} arr - Array of strings to parse
//  * @returns {string[]} - Cleaned and normalized array of strings
//  */
// export const cleanStringArray = (arr: string[]): string[] => {
//   if (!Array.isArray(arr)) throw new TypeError("Input must be an array");

//   return arr.map(item => {
//     if (typeof item !== "string") return item;
  
//       let repaired = item;
  
//       // Remove code block wrappers (``` or ```json)
//       repaired = repaired.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  
//       // Optionally, extract content inside [ ... ] (if array-like content is inside a string)
//       const arrayMatch = repaired.match(/\[[\s\S]*\]/);
//       if (arrayMatch) {
//         repaired = arrayMatch[0];
//       }
  
//       // Escape quotes inside style attributes
//       repaired = repaired.replace(/style='([^']*)'/gi, (_, content) => {
//         return `style="${content.replace(/"/g, '\\"')}"`;
//       });
  
//       // Convert all other key='value' to key="value"
//       repaired = repaired.replace(/(\w+)='([^']*)'/g, (_, attr, content) => {
//         return `${attr}="${content.replace(/"/g, '\\"')}"`;
//       });
  
//       return repaired.trim();
//     });
//   }
  
//   // Example usage:

//   /*
//   Output:
//   [
//     '[{"name":"John","style":"color:\\"red\\";"}]',
//     '<div style="font-size:14px" data-info="hello"></div>'
//   ]
//   */
//   /**
//  * Strong parser for arrays of objects with HTML/Markdown strings
//  * @param {any[]} input - Array of objects (or nested arrays)
//  * @param {string[]} fields - Fields to clean (default: shortDescription & detailedDescription)
//  * @returns {any[]} - New array with cleaned strings
//  */
// export default function strongCleanObjectArray(
//   input: any[],
//   fields: string[] = ["shortDescription", "detailedDescription"]
// ): any[] 
//{
//   if (!Array.isArray(input)) throw new TypeError("Input must be an array");

//   // Recursive cleaning function
//   const cleanValue = (value: any): any => {
//     if (typeof value === "string") {
//       let repaired = value;

//       // Remove Markdown code blocks ``` or ```json
//       repaired = repaired.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

//       // Escape quotes inside style attributes
//       repaired = repaired.replace(/style='([^']*)'/gi, (_, content) => {
//         return `style="${content.replace(/"/g, '\\"')}"`;
//       });

//       // Convert other key='value' to key="value"
//       repaired = repaired.replace(/(\w+)='([^']*)'/g, (_, attr, content) => {
//         return `${attr}="${content.replace(/"/g, '\\"')}"`;
//       });

//       // Trim extra whitespace
//       return repaired.trim();
//     } else if (Array.isArray(value)) {
//       return value.map(cleanValue);
//     } else if (typeof value === "object" && value !== null) {
//       return strongCleanObjectArray([value], Object.keys(value))[0]; // recurse on object
//     } else {
//       return value;
//     }
//   };

//   // Process each object in the array
//   return input.map(obj => {
//     if (typeof obj !== "object" || obj === null) return obj;

//     const cleaned = { ...obj };
//     fields.forEach(field => {
//       if (obj[field] !== undefined) {
//         cleaned[field] = cleanValue(obj[field]);
//       }
//     });
//     return cleaned;
//   });
// }

// Example usa

/**
 * Strong parser for arrays of objects keeping HTML strings
 * @param {any[]} input - Array of objects
 * @param {string[]} fields - Fields to clean (default: shortDescription & detailedDescription)
 * @returns {any[]} - New array with cleaned HTML strings
 */
export default function strongCleanObjectArray(  input: any[],
  fields: string[] = ["shortDescription", "detailedDescription"]
): any[]  {
  if (!Array.isArray(input)) throw new TypeError("Input must be an array");

  const cleanValue = (value: any): any => {
    if (typeof value === "string") {
      let repaired = value;

      // Remove Markdown code blocks ``` or ```json
      repaired = repaired.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

      // Escape quotes inside style attributes
      repaired = repaired.replace(/style='([^']*)'/gi, (_, content) => {
        return `style="${content.replace(/"/g, '\\"')}"`;
      });

      // Convert other key='value' to key="value"
      repaired = repaired.replace(/(\w+)='([^']*)'/g, (_, attr, content) => {
        return `${attr}="${content.replace(/"/g, '\\"')}"`;
      });

      // Trim extra whitespace
      return repaired.trim();
    } else if (Array.isArray(value)) {
      return value.map(cleanValue);
    } else if (typeof value === "object" && value !== null) {
      return cleanObjectArray([value], Object.keys(value))[0];
    } else {
      return value;
    }
  };

  return input.map(obj => {
    if (typeof obj !== "object" || obj === null) return obj;
    const cleaned = { ...obj };
    fields.forEach(field => {
      if (obj[field] !== undefined) {
        cleaned[field] = cleanValue(obj[field]);
      }
    });
    return cleaned;
  });
}

// ================= Example =================

