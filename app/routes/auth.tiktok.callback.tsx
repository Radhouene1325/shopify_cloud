import { json, redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request,context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Gestione errori da TikTok
  if (error) {
    console.error("TikTok OAuth error:", error);
    return redirect("/app?error=tiktok_denied");
  }

  if (!code) {
    return json({ error: "Missing authorization code" }, { status: 400 });
  }

  // Verifica state (anti-CSRF) - opzionale ma consigliato
  // const sessionState = await sessionStorage.getSession(request.headers.get("Cookie"));
  // if (state !== sessionState.get("tiktok_state")) {
  //   return json({ error: "Invalid state" }, { status: 400 });
  // }

  try {
    // SCAMBIA IL CODE PER ACCESS TOKEN
    const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: new URLSearchParams({
        client_key: context.cloudflare.env.TIKTOK_CLIENT_KEY!,
        client_secret: context.cloudflare.env.TIKTOK_CLIENT_SECRET!,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: "https://platinumshop.it/auth/tiktok/callback",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error("Token exchange failed:", tokenData);
      return redirect("/app?error=tiktok_token_failed");
    }

    const { access_token, refresh_token, open_id, scope } = tokenData.data;

    // SALVA IL TOKEN (es. nel database Prisma/Shopify)
    // Esempio: salva associato allo shop corrente
    // await db.tiktokConnection.create({
    //   data: {
    //     shopDomain: session.shop,
    //     accessToken: access_token,
    //     refreshToken: refresh_token,
    //     openId: open_id,
    //     scope: scope,
    //     expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // ~24h
    //   },
    // });

    console.log("TikTok connected! Open ID:", open_id);

    // Redirect di successo alla tua app
    return redirect("/app?success=tiktok_connected");

  } catch (err) {
    console.error("TikTok callback error:", err);
    return redirect("/app?error=tiktok_unknown");
  }
}