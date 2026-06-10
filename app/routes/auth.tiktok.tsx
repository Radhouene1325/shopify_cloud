import { redirect } from "@remix-run/cloudflare";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { getTikTokSessionStorage } from "../tiktokSession.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const state = crypto.randomUUID(); // Genera state anti-CSRF
  
  // Salva state in session (opzionale ma consigliato)
  const sessionStorage = getTikTokSessionStorage(context);
  const session = await sessionStorage.getSession();
  session.set("tiktok_state", state);
  
  const params = new URLSearchParams({
    client_key: context.cloudflare.env.TIKTOK_CLIENT_KEY!,
    redirect_uri: "https://platinumshop.it/auth/tiktok/callback",
    scope: "user.info.profile,user.info.basic,video.publish,video.upload,user.info.stats",
    response_type: "code",
    state: state,
  });

  // Aggiungi questi se usi Login Kitwww.tiktok.com n'autorise pas la connexion.
  // params.append("scope", "user.info.basic");
  
  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;

  return redirect(authUrl, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}