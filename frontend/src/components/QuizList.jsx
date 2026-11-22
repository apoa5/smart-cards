import { useId, useRef, useState } from "react";
import { ArrowsPointingOutIcon, ArrowPathIcon, BookOpenIcon } from "@heroicons/react/24/solid";
import StudyDialog from "./StudyDialog";
import { StudyArrows, StudyNumbers } from "./StudyNavigation";

function QuestionView({ quiz, index, selected, answer, onSelect, onChange, onSubmit }) {
  const feedback = useRef(null);
  const group = useId();
  const question = quiz[index];
  const answered = answer !== undefined;

  return (
    <div className="w-full max-w-2xl">
      <div className="relative px-10 sm:px-12">
        <StudyArrows index={index} total={quiz.length} onSelect={onSelect} item="question" />
        <form className="min-h-[250px] rounded-2xl border border-gray-300 bg-white p-4 text-left text-gray-800 shadow-lg sm:px-8 sm:py-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (!selected || answered) return;
            feedback.current?.focus();
            onSubmit();
          }}>
          <fieldset disabled={answered}>
            <legend className="mb-4 wrap-anywhere text-lg font-semibold">Q{index + 1}: {question.question}</legend>
            <div className="space-y-2">
              {question.options.map((option) => (
                <label key={option} className="flex items-start gap-2 rounded py-1 wrap-anywhere">
                  <input type="radio" name={group} value={option}
                    checked={(answer ?? selected) === option} onChange={() => onChange(option)}
                    className="mt-1 h-4 w-4 shrink-0 accent-lime-900" />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div ref={feedback} role="status" tabIndex={-1}>
            {answered && (
              <p className={`mt-4 font-medium ${answer === question.correct_answer ? "text-green-700" : "text-red-700"}`}>
                {answer === question.correct_answer ? "Correct!" : `Wrong! Correct answer: ${question.correct_answer}`}
              </p>
            )}
          </div>
          {!answered && (
            <button type="submit" disabled={!selected}
              className="mt-6 w-full rounded-lg bg-gray-300 py-2 font-medium text-gray-800 enabled:cursor-pointer enabled:hover:bg-gray-400 disabled:opacity-50">
              Submit
            </button>
          )}
        </form>
      </div>
      <p role="status" className="mt-4 text-center text-sm text-gray-600">
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
    <section className="mt-10 border-t border-gray-300 pt-10">
      <h3 ref={headingRef} tabIndex={-1}
        className="mb-6 flex items-center justify-center gap-2 text-2xl font-bold text-gray-800">
        <BookOpenIcon aria-hidden="true" className="h-7 w-7" />
        Quiz
      </h3>
      <div className="flex flex-col items-center gap-6">
        {view}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {navigation}
          <button type="button" aria-label="Open quiz focus mode" aria-haspopup="dialog"
            className="cursor-pointer rounded-lg bg-lime-900 p-3 text-white hover:bg-lime-950"
            onClick={() => setFocusMode(true)}>
            <ArrowsPointingOutIcon aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </div>
      {showScore && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <p role="status" className="text-xl font-bold text-gray-800">Your Score: {score} / {quiz.length}</p>
          <button type="button" onClick={reset}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-900">
            <ArrowPathIcon aria-hidden="true" className="h-5 w-5" />
            Reset Quiz
          </button>
        </div>
      )}
      {focusMode && (
        <StudyDialog title="Quiz focus mode" onDismiss={() => setFocusMode(false)} className="w-full sm:w-[44rem]">
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
