// import { json, redirect } from "@remix-run/cloudflare";
// import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
// import { getTikTokSessionStorage } from "../tiktokSession.server";

// export async function loader({ request, context }: LoaderFunctionArgs) {
//   const url = new URL(request.url);
//   const code = url.searchParams.get("code");
//   const state = url.searchParams.get("state");
//   const error = url.searchParams.get("error");

//   // Gestione errori da TikTok
//   if (error) {
//     console.error("TikTok OAuth error:", error);
//     return redirect("/app?error=tiktok_denied");
//   }

//   if (!code) {
//     return json({ error: "Missing authorization code" }, { status: 400 });
//   }

//   // Verifica state (anti-CSRF) - opzionale ma consigliato
//   const sessionStorage = getTikTokSessionStorage(context);
//   const sessionState = await sessionStorage.getSession(request.headers.get("Cookie"));
//   if (state !== sessionState.get("tiktok_state")) {
//     return json({ error: "Invalid state" }, { status: 400 });
//   }
// console.log('client_key',context.cloudflare.env.TIKTOK_CLIENT_KEY)
// console.log('client_secret',context.cloudflare.env.TIKTOK_CLIENT_SECRET)
// console.log('code',code)
// console.log('redirect_uri',"https://platinumshop.it/auth/tiktok/callback")
//   try {
//     // SCAMBIA IL CODE PER ACCESS TOKEN       https://open.tiktokapis.com/v2/oauth/token/
//     const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/x-www-form-urlencoded",
//         "Cache-Control": "no-cache",
//       },
//       body: new URLSearchParams({
//         client_key: context.cloudflare.env.TIKTOK_CLIENT_KEY!,
//         client_secret: context.cloudflare.env.TIKTOK_CLIENT_SECRET!,
//         grant_type:"client_credentials",
//         code: code,
//         redirect_uri: "https://platinumshop.it/auth/tiktok/callback",
//       }),
//     });

//     const tokenData = await tokenResponse.json();

//     if (!tokenResponse.ok || tokenData.error) {
//       console.error("Token exchange failed:", tokenData);
//       return redirect("/app?error=tiktok_token_failed");
//     }

//     const { access_token, refresh_token, open_id, scope } = tokenData.data;

//     // SALVA IL TOKEN (es. nel database Prisma/Shopify)
//     // Esempio: salva associato allo shop corrente
//     // await db.tiktokConnection.create({
//     //   data: {
//     //     shopDomain: session.shop,
//     //     accessToken: access_token,
//     //     refreshToken: refresh_token,
//     //     openId: open_id,
//     //     scope: scope,
//     //     expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // ~24h
//     //   },
//     // });

//     console.log("TikTok connected! Open ID:", open_id);

//     // Redirect di successo alla tua app
//     return redirect("/app?success=tiktok_connected");

//   } catch (err) {
//     console.error("TikTok callback error:", err);
//     return redirect("/app?error=tiktok_unknown");
//   }
// }


import { json, redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    console.error("TikTok OAuth error:", error);
    return redirect("/app?error=tiktok_denied");
  }

  if (!code) {
    return json({ error: "Missing authorization code" }, { status: 400 });
  }

  try {
    // Scambia il code per access_token
    const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: new URLSearchParams({
        client_key: "awmwf66t2r6mvans",
        client_secret: "Uv0PwnjeoFC6fdj3eMpYAkPUs9zbY5fR",
        code: code,
        grant_type: "client_credentials",
        redirect_uri: "https://0g5p1w-50.myshopify.com/auth/tiktok/callback",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error("Token exchange failed:", tokenData);
      return redirect("/app?error=tiktok_token_failed");
    }

    const { access_token, refresh_token, open_id } = tokenData.data;

    // TODO: Salva access_token, refresh_token, open_id nel tuo database
    // associandoli allo shop Shopify corrente

    console.log("TikTok connected! Open ID:", open_id);

    // Chiudi la finestra popup e torna all'app
    return new Response(
      `<!DOCTYPE html>
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.location.href = "/app?success=tiktok_connected";
              window.close();
            } else {
              window.location.href = "/app?success=tiktok_connected";
            }
          </script>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } }
    );

  } catch (err) {
    console.error("TikTok callback error:", err);
    return redirect("/app?error=tiktok_unknown");
  }
}