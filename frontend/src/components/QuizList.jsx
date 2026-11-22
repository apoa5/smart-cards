import { useId, useRef, useState } from "react";
import { ArrowsPointingOutIcon, ArrowPathIcon, BookOpenIcon } from "@heroicons/react/24/solid";
import StudyDialog, { FocusModeClose } from "./StudyDialog";
import { StudyArrows, StudyNumbers } from "./StudyNavigation";

function QuestionView({ quiz, index, selected, answer, onSelect, onChange, onSubmit }) {
  const feedback = useRef(null);
  const group = useId();
  const question = quiz[index];
  const answered = answer !== undefined;

  return (
    <div className="w-full max-w-2xl">
      <div className="study-content relative px-[3.15rem] sm:px-14">
        <StudyArrows index={index} total={quiz.length} onSelect={onSelect} item="question" />
        <form className="min-h-[250px] rounded-xl border border-rule-strong bg-paper p-4 text-left text-ink shadow-paper sm:px-8 sm:py-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (!selected || answered) return;
            feedback.current?.focus();
            onSubmit();
          }}>
          <fieldset disabled={answered}>
            <legend className="mb-5 wrap-anywhere text-lg leading-snug font-semibold sm:text-xl">Q{index + 1}: {question.question}</legend>
            <div className="space-y-2">
              {question.options.map((option) => (
                <label key={option} className="quiz-option min-h-11 flex items-start gap-2 wrap-anywhere">
                  <input type="radio" name={group} value={option}
                    checked={(answer ?? selected) === option} onChange={() => onChange(option)}
                    className="mt-1 h-4 w-4 shrink-0 accent-accent" />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div ref={feedback} role="status" tabIndex={-1}>
            {answered && (
              <p className={`study-notice ${answer === question.correct_answer ? "study-notice-success" : "study-notice-error"}`}>
                {answer === question.correct_answer ? "Correct!" : `Wrong! Correct answer: ${question.correct_answer}`}
              </p>
            )}
          </div>
          {!answered && (
            <button type="submit" disabled={!selected}
              className="editorial-button mt-6 w-full">
              Submit
            </button>
          )}
        </form>
      </div>
      <p role="status" className="mt-4 text-center text-sm text-ink-muted">
        Question {index + 1} of {quiz.length}
        <span className="sr-only">. {question.question}</span>
      </p>
    </div>
  );
}

export default function QuizList({ quiz }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [answers, setAnswers] = useState({});
  const [showScore, setShowScore] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const headingRef = useRef(null);
  if (!quiz.length) return null;

  function select(position) {
    setIndex(position);
    setSelected("");
  }

  function submit() {
    setAnswers((previous) => ({ ...previous, [index]: selected }));
    if (index === quiz.length - 1) setShowScore(true);
  }

  function reset() {
    select(0);
    setAnswers({});
    setShowScore(false);
    headingRef.current?.focus();
  }

  const score = quiz.filter((question, position) => answers[position] === question.correct_answer).length;
  const view = <QuestionView quiz={quiz} index={index} selected={selected} answer={answers[index]}
    onSelect={select} onChange={setSelected} onSubmit={submit} />;
  const navigation = <StudyNumbers index={index} total={quiz.length} onSelect={select} item="question" />;

  return (
    <section className="study-result">
      <h3 ref={headingRef} tabIndex={-1}
        className="study-result-title">
        <BookOpenIcon aria-hidden="true" className="h-5 w-5" />
        Quiz
      </h3>
      <div className="flex flex-col items-center gap-6">
        {view}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {navigation}
          <button type="button" aria-label="Open quiz focus mode" aria-haspopup="dialog"
            className="cursor-pointer rounded-lg border border-rule-strong bg-sage-paper p-3 text-accent-ink hover:bg-accent-tint"
            onClick={() => setFocusMode(true)}>
            <ArrowsPointingOutIcon aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </div>
      {showScore && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <p role="status" className="text-lg font-semibold text-ink">Your Score: {score} / {quiz.length}</p>
          <button type="button" onClick={reset}
            className="editorial-secondary-button">
            <ArrowPathIcon aria-hidden="true" className="h-5 w-5" />
            Reset Quiz
          </button>
        </div>
      )}
      {focusMode && (
        <StudyDialog title="Quiz focus mode" onDismiss={() => setFocusMode(false)} className="study-focus-dialog w-full sm:w-[44rem]">
          <FocusModeClose onClick={() => setFocusMode(false)} />
          <div className="flex flex-col items-center gap-4">{view}{navigation}</div>
        </StudyDialog>
      )}
    </section>
  );
}
