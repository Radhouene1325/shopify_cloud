export default function TikTokConnect() {
  const handleConnect = () => {
    // Apri in una nuova finestra (App Bridge v4 compatibile)
    window.open("/auth/tiktok", "_blank");
  };

  return (
    <button onClick={handleConnect}>
      Connetti con TikTok
    </button>
  );
}