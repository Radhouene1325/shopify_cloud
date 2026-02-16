/**
 * Cleans and normalizes an array of strings.
 * - Removes code block markers (``` or ```json)
 * - Converts all single-quoted attributes to double quotes
 * - Escapes quotes inside style attributes
 * @param {string[]} arr - Array of strings to parse
 * @returns {string[]} - Cleaned and normalized array of strings
 */
/**
 * Cleans and normalizes an array of strings.
 * @param {string[]} arr - Array of strings to parse
 * @returns {string[]} - Cleaned and normalized array of strings
 */
export const cleanStringArray = (arr: string[]): string[] => {
  if (!Array.isArray(arr)) throw new TypeError("Input must be an array");

  return arr.map(item => {
    if (typeof item !== "string") return item;
  
      let repaired = item;
  
      // Remove code block wrappers (``` or ```json)
      repaired = repaired.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  
      // Optionally, extract content inside [ ... ] (if array-like content is inside a string)
      const arrayMatch = repaired.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        repaired = arrayMatch[0];
      }
  
      // Escape quotes inside style attributes
      repaired = repaired.replace(/style='([^']*)'/gi, (_, content) => {
        return `style="${content.replace(/"/g, '\\"')}"`;
      });
  
      // Convert all other key='value' to key="value"
      repaired = repaired.replace(/(\w+)='([^']*)'/g, (_, attr, content) => {
        return `${attr}="${content.replace(/"/g, '\\"')}"`;
      });
  
      return repaired.trim();
    });
  }
  
  // Example usage:

  /*
  Output:
  [
    '[{"name":"John","style":"color:\\"red\\";"}]',
    '<div style="font-size:14px" data-info="hello"></div>'
  ]
  */
  