import { useEffect, useId, useRef } from "react";

export default function StudyDialog({ title, onDismiss, children, className = "" }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog.showModal();
    dialog.querySelector("[data-initial-focus]")?.focus();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      className={`m-auto max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-white p-4 text-gray-900 shadow-lg sm:p-6 backdrop:bg-black/60 backdrop:backdrop-blur-lg ${className}`}
    >
      <h3 id={titleId} className="mb-4 text-center text-lg font-semibold">{title}</h3>
      {children}
    </dialog>
  );
}
