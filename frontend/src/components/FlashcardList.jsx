import { useState } from "react";
import { AnimatePresence, LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import * as Motion from "motion/react-m";
import { ArrowsPointingOutIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/solid";
import StudyDialog, { FocusModeClose } from "./StudyDialog";
import { StudyArrows, StudyNumbers } from "./StudyNavigation";

const slide = {
  enter: (direction) => ({ x: direction * 32, opacity: 0 }),
  settled: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction * -32, opacity: 0 }),
};
const slideTiming = { duration: 0.24, ease: "easeOut" };
const flipTiming = { duration: 0.46, ease: "easeInOut" };

function CardFace({ card, answer = false }) {
  return (
    <span className={`flashcard-face ${answer ? "flashcard-answer" : "bg-paper"}`}>
      <span className="flex min-h-full flex-col justify-center wrap-anywhere">
        {answer ? (
          <span className="text-lg text-ink-secondary sm:text-xl">{card.answer}</span>
        ) : (
          <>
            <span className="mb-5 block text-xl font-semibold text-ink sm:text-[1.65rem] sm:leading-snug">{card.question}</span>
            <span className="text-sm font-medium text-accent-ink underline decoration-rule-strong underline-offset-4">Reveal the answer</span>
          </>
        )}
      </span>
    </span>
  );
}

function CardView({ flashcards, index, direction, revealed, onSelect, onFlip, reduceMotion }) {
  const card = flashcards[index];
  return (
    <div className="w-full max-w-lg">
      <div className="study-content relative px-[3.15rem] sm:px-14">
        <StudyArrows index={index} total={flashcards.length} onSelect={onSelect} item="card" />
        <div className="flashcard-viewport">
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
              } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                const side = revealed ? ".flashcard-answer" : ".flashcard-face:not(.flashcard-answer)";
                const face = event.currentTarget.querySelector(side);
                if (face && face.scrollHeight > face.clientHeight) {
                  event.preventDefault();
                  face.scrollTop += event.key === "ArrowDown" ? 48 : -48;
                }
              }
            }}
            aria-label={revealed ? `Show question. Answer: ${card.answer}` : `Reveal answer. Question: ${card.question}`}
            className="relative z-10 block h-full w-full cursor-pointer rounded-xl">
            {reduceMotion ? (
              <span aria-hidden="true" className="flashcard-static">
                <CardFace card={card} answer={revealed} />
              </span>
            ) : (
              <AnimatePresence initial={false} mode="wait" custom={direction}>
                <Motion.span key={card.question} aria-hidden="true" className="flashcard-slide"
                  custom={direction} variants={slide} initial="enter" animate="settled" exit="exit"
                  transition={slideTiming}>
                  <Motion.span className="flashcard-flip" initial={false}
                    animate={{ rotateY: revealed ? 180 : 0 }} transition={flipTiming}>
                    <CardFace card={card} />
                    <CardFace card={card} answer />
                  </Motion.span>
                </Motion.span>
              </AnimatePresence>
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

function Deck({ flashcards }) {
  const [{ index, direction, revealed }, setCard] = useState({ index: 0, direction: 1, revealed: false });
  const [focusMode, setFocusMode] = useState(false);
  const reduceMotion = useReducedMotion();

  function select(position) {
    setCard((current) => ({
      index: position,
      direction: Math.sign(position - current.index) || current.direction,
      revealed: false,
    }));
  }

  const view = <CardView flashcards={flashcards} index={index} direction={direction}
    revealed={revealed} reduceMotion={reduceMotion} onSelect={select}
    onFlip={() => setCard((current) => ({ ...current, revealed: !current.revealed }))} />;
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
        <StudyDialog title="Flashcard focus mode" onDismiss={() => setFocusMode(false)} className="study-focus-dialog w-full sm:w-[36rem]">
          <FocusModeClose onClick={() => setFocusMode(false)} />
          <div className="flex flex-col items-center gap-4">{view}{navigation}</div>
        </StudyDialog>
      )}
    </section>
  );
}

export default function FlashcardList({ flashcards }) {
  if (!flashcards.length) return null;
  return (
    <LazyMotion features={domAnimation}>
      <Deck key={JSON.stringify(flashcards)} flashcards={flashcards} />
    </LazyMotion>
  );
}
