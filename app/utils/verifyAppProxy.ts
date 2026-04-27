/**
 * Verifies a Shopify App Proxy request signature using the Web Crypto API.
 * This works natively in Cloudflare Workers (no Node.js crypto needed).
 *
 * Shopify signs the request by:
 * 1. Taking all query params except `signature`
 * 2. Sorting them alphabetically
 * 3. Joining as "key=value" pairs with "&"
 * 4. Computing HMAC-SHA256 with the app secret
 * 5. Comparing to the `signature` param
 */
export async function verifyAppProxySignature(
  request: Request,
  apiSecret: string
): Promise<boolean> {
  const url = new URL(request.url);
  const params = url.searchParams;

  const signature = params.get("signature");
  if (!signature) {
    console.warn("[verifyAppProxy] No signature param found in URL");
    return false;
  }

  // Build sorted param string, excluding "signature"
  const sortedParams = Array.from(params.entries())
    .filter(([key]) => key !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  console.log("[verifyAppProxy] Params to sign:", sortedParams);

  // Import the secret key for HMAC-SHA256
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiSecret);
  const messageData = encoder.encode(sortedParams);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Compute HMAC
  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);

  // Convert to hex string
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  console.log("[verifyAppProxy] computed:", computedSignature);
  console.log("[verifyAppProxy] received:", signature);

  // Constant-time comparison to avoid timing attacks
  return computedSignature === signature;
}
