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
    client_key: "awmwf66t2r6mvans",
    redirect_uri: "https://0g5p1w-50.myshopify.com/auth/tiktok/callback",
    scope: "user.info.basic,user.info.profile,user.info.stats,video.publish,video.upload",
    response_type: "code",
    state,
  });

  const authUrl = `https://www.tiktok.com/auth/authorize/?${params.toString()}`;

  return redirect(authUrl, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}