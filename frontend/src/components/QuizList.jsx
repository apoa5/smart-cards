import React, { useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  BookOpenIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowsPointingOutIcon,
} from "@heroicons/react/24/solid";

const QuizList = ({ quiz }) => {
  const [index, setIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState("");
  const [feedback, setFeedback] = useState("");
  const [answers, setAnswers] = useState(Array(quiz.length).fill(null));
  const [answeredQuestions, setAnsweredQuestions] = useState(Array(quiz.length).fill(false));
  const [selectedAnswers, setSelectedAnswers] = useState(Array(quiz.length).fill(""));
  const [showScore, setShowScore] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  if (!quiz.length) return null;

  const question = quiz[index];

  const handleSubmit = () => {
    if (!selectedOption) return;

    const isCorrect = selectedOption === question.correct_answer;
    setFeedback(
      isCorrect ? (
        <span className="flex items-center gap-2 text-green-600">
          <CheckCircleIcon className="w-5 h-5" />
          Correct!
        </span>
      ) : (
        <span className="flex items-center gap-2 text-red-600">
          <XCircleIcon className="w-5 h-5" />
          Wrong! Correct answer: {question.correct_answer}
        </span>
      )
    );

    const updatedAnswers = [...answers];
    updatedAnswers[index] = isCorrect;
    setAnswers(updatedAnswers);

    const updatedAnswered = [...answeredQuestions];
    updatedAnswered[index] = true;
    setAnsweredQuestions(updatedAnswered);

    const updatedSelectedAnswers = [...selectedAnswers];
    updatedSelectedAnswers[index] = selectedOption;
    setSelectedAnswers(updatedSelectedAnswers);

    if (index === quiz.length - 1) {
      setShowScore(true);
    }
  };

  const handleNext = () => {
    if (index < quiz.length - 1) {
      setIndex(index + 1);
      setFeedback("");
      setSelectedOption(selectedAnswers[index + 1] || "");
    }
  };

  const handlePrev = () => {
    if (index > 0) {
      setIndex(index - 1);
      setFeedback("");
      setSelectedOption(selectedAnswers[index - 1] || "");
    }
  };

  const resetQuiz = () => {
    setIndex(0);
    setSelectedOption("");
    setFeedback("");
    setAnswers(Array(quiz.length).fill(null));
    setAnsweredQuestions(Array(quiz.length).fill(false));
    setSelectedAnswers(Array(quiz.length).fill(""));
    setShowScore(false);
  };

  const score = answers.filter((ans) => ans === true).length;

  // Reusable question card
  const QuestionCard = () => (
    <div className="relative w-full max-w-xl min-w-[24rem]">
      {/* Prev Arrow */}
      <button
        onClick={handlePrev}
        disabled={index === 0}
        className="absolute -left-12 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-md disabled:opacity-30 hover:bg-gray-200 cursor-pointer"
      >
        <ChevronLeftIcon className="h-6 w-6 text-gray-600" />
      </button>

      {/* Question Card */}
      <div className="px-8 py-6 bg-white border border-gray-300 text-gray-800 rounded-2xl shadow-lg min-h-[250px] flex flex-col">
        <p className="text-lg font-semibold mb-4">
          Q{index + 1}: {question.question}
        </p>
        <form className="space-y-3">
          {question.options.map((option, idx) => (
            <label key={idx} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`option-${index}`}
                value={option}
                checked={selectedOption === option}
                onChange={(e) => setSelectedOption(e.target.value)}
                disabled={answeredQuestions[index]}
                className="w-4 h-4 appearance-none border-2 border-gray-900 rounded-full bg-white checked:bg-lime-900 checked:border-gray-900 cursor-pointer"
              />
              {option}
            </label>
          ))}
        </form>

        {feedback && <div className="mt-4 font-medium">{feedback}</div>}

        {!answeredQuestions[index] && (
          <button
            type="button"
            onClick={handleSubmit}
            className="mt-6 w-full bg-gray-300 text-gray-800 font-medium py-2 rounded-lg hover:bg-gray-400 cursor-pointer transition"
          >
            Submit
          </button>
        )}
      </div>

      {/* Next Arrow */}
      <button
        onClick={handleNext}
        disabled={index === quiz.length - 1}
        className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-md disabled:opacity-30 hover:bg-gray-200 cursor-pointer"
      >
        <ChevronRightIcon className="h-6 w-6 text-gray-600" />
      </button>

      {/* Progress */}
      <p className="text-sm text-gray-500 mt-4 text-center">
        Question {index + 1} of {quiz.length}
      </p>
    </div>
  );

  return (
    <div className="mt-10 pt-10 border-t border-gray-300">
      {/* Header */}
      <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 justify-center">
        <BookOpenIcon className="w-7 h-7" />
        Quiz
      </h3>

      <div className="flex flex-col items-center gap-6 justify-center">
        {/* Quiz Card */}
        <QuestionCard />

        {/* Number Navigation + Focus Button */}
        <div className="flex items-center justify-center gap-4">
          {/* Number Navigation */}
          <div className="w-60 flex-shrink-0 p-4 bg-white rounded-lg shadow-md border border-gray-300">
            <div className="grid grid-cols-5 gap-4">
              {quiz.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setIndex(i);
                    setFeedback("");
                    setSelectedOption(selectedAnswers[i] || "");
                  }}
                  className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition
                    ${
                      i === index
                        ? "bg-lime-900 text-white"
                        : "bg-gray-200 text-gray-800 hover:bg-gray-300 cursor-pointer"
                    }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Focus Icon Button with Tooltip */}
          <div className="relative group">
            <button
              className="bg-lime-900 text-white p-3 rounded-lg hover:bg-lime-950 cursor-pointer transition"
              onClick={() => setFocusMode(true)}
            >
              <ArrowsPointingOutIcon className="w-5 h-5" />
            </button>
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 
              bg-gray-800 text-white text-xs rounded px-2 py-1 
              opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap">
              Focus mode
            </span>
          </div>
        </div>
      </div>

      {/* Score Section */}
      {showScore && (
        <div className="mt-6 flex items-center gap-4 justify-center">
          <p className="text-xl font-bold text-gray-800">
            Your Score: {score} / {quiz.length}
          </p>
          <button
            onClick={resetQuiz}
            className="flex items-center gap-1 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-900 cursor-pointer transition"
          >
            <ArrowPathIcon className="w-5 h-5" />
            Reset Quiz
          </button>
        </div>
      )}

      {/* Focus Mode Modal */}
      {focusMode && (
        <div className="fixed inset-0 backdrop-blur-lg bg-black/70 z-50 flex items-center justify-center">
          <button
            className="fixed top-6 right-6 text-gray-900 w-10 h-10 bg-white hover:bg-gray-300 cursor-pointer rounded-full p-2 z-50"
            onClick={() => setFocusMode(false)}
          >
            ✕
          </button>
          <div className="flex flex-col items-center gap-12 justify-center">
            <QuestionCard />
            {/* Number Navigation inside modal */}
            <div className="w-60 flex-shrink-0 p-4 bg-white rounded-lg shadow-md border border-gray-300">
              <div className="grid grid-cols-5 gap-4">
                {quiz.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setIndex(i);
                      setFeedback("");
                      setSelectedOption(selectedAnswers[i] || "");
                    }}
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition
                      ${
                        i === index
                          ? "bg-lime-900 text-white"
                          : "bg-gray-200 text-gray-800 hover:bg-gray-300 cursor-pointer"
                      }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizList;
