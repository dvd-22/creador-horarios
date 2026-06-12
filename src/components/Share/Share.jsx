import { Share2 } from "lucide-react";

const isShareSupported = !!(
  typeof navigator !== "undefined" && navigator.share
);

async function handleShareSchedule(
  event,
  title,
  showDisclaimer,
  showDownloadModal,
) {
  const url = window.location.href;
  if (!isShareSupported) {
    const btn = event.currentTarget;
    if (!btn) return;
    const textoOriginal = btn.innerHTML;

    await navigator.clipboard.writeText(url);

    btn.innerHTML = "Enlace copiado";

    setTimeout(() => {
      btn.innerHTML = textoOriginal;
      showDisclaimer(false);
      showDownloadModal(true);
    }, 900);
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
  } catch { }
}

export function ShareBtn({ title, showDisclaimer, showDownloadModal }) {
  return (
    <button
      className="flex justify-center items-center gap-3 w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white py-2 px-4 rounded-lg transition-colors touch-manipulation"
      style={{ touchAction: "manipulation" }}
      onClick={(e) => {
        handleShareSchedule(e, title, showDisclaimer, showDownloadModal);
      }}
    >
      Compartir
      <Share2 size={16} />
    </button>
  );
}
