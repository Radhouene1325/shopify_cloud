import { getTikTokSessionStorage } from "@/tiktokSession.server";
import { LoaderFunctionArgs, redirect } from "@remix-run/node";

export async function loader({ context }: LoaderFunctionArgs) {
  const clientKey = context.cloudflare.env.TIKTOK_CLIENT_KEY;

  if (!clientKey) {
    throw new Error("Missing TIKTOK_CLIENT_KEY");
  }

  const state = crypto.randomUUID();

  const sessionStorage = getTikTokSessionStorage(context);
  const session = await sessionStorage.getSession();
  session.set("tiktok_state", state);

  const params = new URLSearchParams({
    client_key: clientKey,
    redirect_uri: "https://platinumshop.it/auth/tiktok/callback",
    scope: "user.info.basic,video.publish,video.upload",
    response_type: "code",
    state,
  });

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;

  return redirect(authUrl, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}