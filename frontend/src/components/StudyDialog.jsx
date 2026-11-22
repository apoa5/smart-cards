import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useId, useRef } from "react";

export function FocusModeClose({ onClick }) {
  return (
    <button type="button" data-initial-focus aria-label="Close focus mode" onClick={onClick}
      className="fixed top-4 right-4 z-20 grid size-11 cursor-pointer place-items-center rounded-lg border border-rule-strong bg-paper text-accent-ink shadow-paper hover:bg-accent-tint">
      <XMarkIcon aria-hidden="true" className="size-6" />
    </button>
  );
}

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
      className={`m-auto max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto rounded-xl border border-rule-strong bg-paper p-5 text-ink shadow-paper sm:p-7 backdrop:bg-ink/55 ${className}`}
    >
      <h3 id={titleId} className="mb-5 text-center font-editorial text-2xl leading-tight">{title}</h3>
      {children}
    </dialog>
  );
}
