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
      className={`m-auto max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto rounded-xl border border-rule-strong bg-paper p-5 text-ink shadow-paper sm:p-7 backdrop:bg-ink/55 ${className}`}
    >
      <h3 id={titleId} className="mb-5 text-center font-editorial text-2xl leading-tight">{title}</h3>
      {children}
    </dialog>
  );
}
