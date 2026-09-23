"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

export default function ShareTab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Read after hydration, not as lazy state: window is undefined on the server
    // and would render a different first pass than the client.
    const origin = window.location.origin;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(origin);
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, origin, {
        width: 256,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
  }, []);

  function downloadQr() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "soul-trek-qr.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-1 text-sm font-semibold text-fg">Share with volunteers</h2>
        <p className="mb-5 text-xs leading-relaxed text-muted">
          Scanning this opens the app directly — no download or install needed. On
          Android, Chrome will offer &quot;Add to Home Screen&quot; for one-tap access next time.
        </p>

        <div className="flex justify-center">
          <div className="rounded-xl bg-white p-3">
            <canvas ref={canvasRef} />
          </div>
        </div>

        <p className="mt-4 truncate text-center text-xs text-muted">{url}</p>

        <div className="mt-4 flex gap-2.5">
          <button
            onClick={copyUrl}
            className="flex-1 rounded-lg border border-line py-2.5 text-sm font-medium text-dim transition-colors active:bg-surface-2"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button
            onClick={downloadQr}
            className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-ink transition-opacity active:opacity-80"
          >
            Download QR
          </button>
        </div>
      </div>
    </div>
  );
}
