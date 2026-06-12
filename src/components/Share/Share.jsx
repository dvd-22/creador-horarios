import React, { useState } from "react";
import { Share2, Check } from "lucide-react";

const isShareSupported = !!(
  typeof navigator !== "undefined" && navigator.share
);

export function ShareBtn({ title, showDisclaimer, showDownloadModal }) {
  const [copied, setCopied] = useState(false);

  const handleShareClick = async () => {
    const url = window.location.href;

    if (!isShareSupported) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);

        setTimeout(() => {
          setCopied(false);
          showDisclaimer(false);
          showDownloadModal(true);
        }, 900);
      } catch (err) {
        console.error("Failed to copy link:", err);
        // Safe fallback for older browsers/insecure contexts
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand("copy");
          setCopied(true);
          setTimeout(() => {
            setCopied(false);
            showDisclaimer(false);
            showDownloadModal(true);
          }, 900);
        } catch (e) {
          console.error("Fallback copy failed:", e);
          alert("Error al copiar el link");
        }
        document.body.removeChild(textArea);
      }
      return;
    }

    try {
      await navigator.share({
        title: title,
        text: "Mira mi horario 👻:",
        url: url,
      });
      showDisclaimer(false);
      showDownloadModal(true);
    } catch (err) {
      // Catch AbortError if the user cancels the native share sheet
      console.warn("Share sheet cancelled or failed:", err);
    }
  };

  return (
    <button
      className="flex justify-center items-center gap-3 w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white py-2 px-4 rounded-lg transition-colors touch-manipulation"
      style={{ touchAction: "manipulation" }}
      onClick={handleShareClick}
      disabled={copied}
    >
      {copied ? (
        <>
          Enlace copiado
          <Check size={16} />
        </>
      ) : (
        <>
          Compartir
          <Share2 size={16} />
        </>
      )}
    </button>
  );
}
