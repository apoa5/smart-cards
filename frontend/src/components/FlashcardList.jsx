import { useState } from "react";
import { ArrowsPointingOutIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/solid";
import StudyDialog from "./StudyDialog";
import { StudyArrows, StudyNumbers } from "./StudyNavigation";

function CardView({ flashcards, index, revealed, onSelect, onFlip }) {
  const card = flashcards[index];
  return (
    <div className="w-full max-w-lg">
      <div className="study-content relative px-[3.15rem] sm:px-14">
        <StudyArrows index={index} total={flashcards.length} onSelect={onSelect} item="card" />
        <div className="relative h-[300px] isolate">
          {flashcards.slice(index + 1, index + 3).map((_, position) => (
            <div key={position} aria-hidden="true"
              className="absolute inset-0 rounded-xl border border-rule bg-paper-alt opacity-75"
              style={{ transform: `translateY(${(position + 1) * 10}px) scale(${1 - (position + 1) * 0.05})` }} />
          ))}
          <button type="button" onClick={onFlip}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" && index > 0) {
                event.preventDefault();
                onSelect(index - 1);
              } else if (event.key === "ArrowRight" && index < flashcards.length - 1) {
                event.preventDefault();
                onSelect(index + 1);
              }
            }}
            aria-label={revealed ? `Show question. Answer: ${card.answer}` : `Reveal answer. Question: ${card.question}`}
            className={`relative z-10 block h-full w-full cursor-pointer overflow-y-auto rounded-xl border border-rule-strong p-4 shadow-paper transition-colors duration-150 sm:p-9 ${
              revealed ? "bg-sage-paper" : "bg-paper"
            }`}>
            {revealed ? (
              <span aria-hidden="true" className="flex min-h-full flex-col justify-center wrap-anywhere text-lg text-ink-secondary sm:text-xl">
                {card.answer}
              </span>
            ) : (
              <span aria-hidden="true" className="flex min-h-full flex-col justify-center">
                <span className="mb-5 block wrap-anywhere text-xl font-semibold text-ink sm:text-[1.65rem] sm:leading-snug">{card.question}</span>
                <span className="text-sm font-medium text-accent-ink underline decoration-rule-strong underline-offset-4">Reveal the answer</span>
              </span>
            )}
          </button>
        </div>
      </div>
      <p role="status" className="mt-5 text-center text-sm text-ink-muted">
        Card {index + 1} of {flashcards.length}
        <span className="sr-only">. {revealed ? card.answer : card.question}</span>
      </p>
    </div>
  );
}

export default function FlashcardList({ flashcards }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  if (!flashcards.length) return null;

  function select(position) {
    setIndex(position);
    setRevealed(false);
  }

  const view = <CardView flashcards={flashcards} index={index} revealed={revealed}
    onSelect={select} onFlip={() => setRevealed((showing) => !showing)} />;
  const navigation = <StudyNumbers index={index} total={flashcards.length} onSelect={select} item="card" />;
  return (
    <section className="study-result">
      <h3 className="study-result-title">
        <ClipboardDocumentListIcon aria-hidden="true" className="h-5 w-5" />
        Flashcards
      </h3>
      <div className="flex flex-col items-center gap-6">
        {view}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {navigation}
          <button type="button" aria-label="Open flashcard focus mode" aria-haspopup="dialog"
            className="cursor-pointer rounded-lg border border-rule-strong bg-sage-paper p-3 text-accent-ink hover:bg-accent-tint"
            onClick={() => setFocusMode(true)}>
            <ArrowsPointingOutIcon aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </div>
      {focusMode && (
        <StudyDialog title="Flashcard focus mode" onDismiss={() => setFocusMode(false)} className="w-full sm:w-[36rem]">
          <button type="button" data-initial-focus onClick={() => setFocusMode(false)}
            className="editorial-secondary-button mb-4">
            Close focus mode
          </button>
          <div className="flex flex-col items-center gap-4">{view}{navigation}</div>
        </StudyDialog>
      )}
    </section>
  );
}
