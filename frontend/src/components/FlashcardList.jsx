import { useState } from "react";
import { ArrowsPointingOutIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/solid";
import StudyDialog from "./StudyDialog";
import { StudyArrows, StudyNumbers } from "./StudyNavigation";

function CardView({ flashcards, index, revealed, onSelect, onFlip }) {
  const card = flashcards[index];
  const face = "absolute inset-0 overflow-y-auto rounded-2xl border border-gray-300 bg-white p-4 shadow-md backface-hidden sm:p-6";
  return (
    <div className="w-full max-w-lg">
      <div className="relative px-10 sm:px-12">
        <StudyArrows index={index} total={flashcards.length} onSelect={onSelect} item="card" />
        <div className="relative h-[300px] perspective-distant">
          {flashcards.slice(index + 1, index + 3).map((_, position) => (
            <div key={position} aria-hidden="true"
              className="absolute inset-0 rounded-2xl bg-gray-300 opacity-40 shadow-md"
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
            className={`relative block h-full w-full cursor-pointer transform-3d rounded-2xl transition-transform duration-500 motion-reduce:transition-none ${
              revealed ? "rotate-y-180" : ""
            }`}>
            <span aria-hidden="true" className={face}>
              <span className="flex min-h-full flex-col justify-center">
                <span className="mb-4 block wrap-anywhere font-bold text-gray-900 sm:text-xl">{card.question}</span>
                <span className="text-sm text-gray-600 italic">Reveal the answer</span>
              </span>
            </span>
            <span aria-hidden="true" className={`${face} rotate-y-180`}>
              <span className="flex min-h-full flex-col justify-center wrap-anywhere text-gray-700">{card.answer}</span>
            </span>
          </button>
        </div>
      </div>
      <p role="status" className="mt-5 text-center text-sm text-gray-600">
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
    <section className="mt-10 border-t border-gray-300 pt-10">
      <h3 className="mb-6 flex items-center justify-center gap-2 text-2xl font-bold text-gray-800">
        <ClipboardDocumentListIcon aria-hidden="true" className="h-7 w-7" />
        Flashcards
      </h3>
      <div className="flex flex-col items-center gap-6">
        {view}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {navigation}
          <button type="button" aria-label="Open flashcard focus mode" aria-haspopup="dialog"
            className="cursor-pointer rounded-lg bg-lime-900 p-3 text-white hover:bg-lime-950"
            onClick={() => setFocusMode(true)}>
            <ArrowsPointingOutIcon aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </div>
      {focusMode && (
        <StudyDialog title="Flashcard focus mode" onDismiss={() => setFocusMode(false)} className="w-full sm:w-[36rem]">
          <button type="button" data-initial-focus onClick={() => setFocusMode(false)}
            className="mb-4 cursor-pointer rounded-lg bg-gray-200 px-3 py-2 hover:bg-gray-300">
            Close focus mode
          </button>
          <div className="flex flex-col items-center gap-4">{view}{navigation}</div>
        </StudyDialog>
      )}
    </section>
  );
}
