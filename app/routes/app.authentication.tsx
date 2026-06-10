import { useState } from "react";
import { useSearchParams } from "@remix-run/react";

export default function TikTokConnect() {
  const [searchParams] = useSearchParams();
  const success = searchParams.get("success");
  const error = searchParams.get("error");

  return (
    <div>
      {success === "tiktok_connected" && (
        <div style={{ color: "green" }}>✅ Account TikTok connesso!</div>
      )}
      
      {error === "tiktok_denied" && (
        <div style={{ color: "red" }}>❌ Autorizzazione negata da TikTok</div>
      )}

      <a href="/auth/tiktok">
        <button>Connetti con TikTok</button>
      </a>
    </div>
  );
}