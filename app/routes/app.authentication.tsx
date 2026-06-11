// app/routes/app._index.tsx (o dove hai il pulsante)
import { useSearchParams } from "@remix-run/react";
import { useEffect, useState } from "react";

export default function TikTokConnect() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (searchParams.get("success") === "tiktok_connected") {
      setStatus("✅ Account TikTok connesso con successo!");
    }
    if (searchParams.get("error") === "tiktok_denied") {
      setStatus("❌ Autorizzazione negata da TikTok");
    }
  }, [searchParams]);

  const handleConnect = () => {
    window.open("/auth/tiktok", "_blank", "width=600,height=700");
  };

  return (
    <div>
      {status && <div style={{ marginBottom: 16, fontWeight: "bold" }}>{status}</div>}
      
      <button onClick={handleConnect}>
        Connetti con TikTok
      </button>
    </div>
  );
}