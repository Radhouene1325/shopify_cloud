import { createCookieSessionStorage } from "@remix-run/cloudflare";
import type { AppLoadContext } from "@remix-run/cloudflare";

export function getTikTokSessionStorage(context: AppLoadContext) {
  return createCookieSessionStorage({
    cookie: {
      name: "_tiktok_session",
      sameSite: "lax",
      path: "/",
      httpOnly: true,
      secrets: [context.cloudflare.env.TIKTOK_CLIENT_SECRET|| "default_tiktok_secret"],
      secure: process.env.NODE_ENV === "production",
    },
  });
}
