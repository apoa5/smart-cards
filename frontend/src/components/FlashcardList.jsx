import React, { useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  ArrowsPointingOutIcon,
} from "@heroicons/react/24/solid";

const FlashcardList = ({ flashcards }) => {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [slideDirection, setSlideDirection] = useState("");
  const [focusMode, setFocusMode] = useState(false);

  if (!flashcards.length) return null;

  const card = flashcards[index];

  const handlePrev = () => {
    if (index > 0) {
      setSlideDirection("left");
      setTimeout(() => {
        setIndex((prev) => prev - 1);
        setRevealed(false); // reset to question side
        setSlideDirection("");
      }, 300);
    }
  };

  const handleNext = () => {
    if (index < flashcards.length - 1) {
      setSlideDirection("right");
      setTimeout(() => {
        setIndex((prev) => prev + 1);
        setRevealed(false); // reset to question side
        setSlideDirection("");
      }, 300);
    }
  };

  const toggleAnswer = () => {
    setRevealed((prev) => !prev);
  };



  return (
    <div className="mt-10 pt-10 border-t border-gray-300">
      {/* Header */}
      <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 justify-center">
        <ClipboardDocumentListIcon className="w-7 h-7" />
        Flashcards
      </h3>


      {/* Main Layout: Flashcard + Number Navigation */}
      <div className="flex flex-col items-center gap-12 justify-center">
        {/* Flashcard Area */}
        <div className="relative w-full max-w-md h-[300px] perspective">
          {/* Left Arrow */}
          <button
            onClick={handlePrev}
            disabled={index === 0}
            className="absolute -left-12 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-md disabled:opacity-30 hover:bg-gray-200 cursor-pointer z-10"
          >
            <ChevronLeftIcon className="h-6 w-6 text-gray-600" />
          </button>

          {/* Card Stack */}
          <div
            className={`relative w-full h-full transition-transform duration-300`}
          >
            {/* Back Cards for stacking effect */}
            {flashcards.slice(index + 1, index + 3).map((_, idx) => (
              <div
                key={idx}
                className="absolute inset-0 bg-gray-300 rounded-2xl shadow-md scale-95 translate-y-2 opacity-40"
                style={{
                  transform: `translateY(${(idx + 1) * 10}px) scale(${1 - (idx + 1) * 0.05
                    })`,
                }}
              />
            ))}

            {/* Main Card with Flip Animation */}
            <div
              className={`absolute inset-0 transition-transform duration-300 transform ${slideDirection === "left"
                ? "-translate-x-full opacity-0"
                : slideDirection === "right"
                  ? "translate-x-full opacity-0"
                  : "translate-x-0 opacity-100"
                }`}
            >
              <div
                className={`relative w-full h-full transform-style-preserve-3d transition-transform duration-500 ${revealed ? "rotate-y-180" : ""
                  }`}
                onClick={toggleAnswer}
              >
                {/* Front (Question) */}
                <div className="absolute inset-0 backface-hidden bg-white rounded-2xl shadow-md p-6 flex flex-col justify-center border border-gray-300">
                  <h4 className="text-xl font-bold text-gray-900 mb-4">
                    {card.question}
                  </h4>
                  <p className="text-gray-400 italic">
                    Click to reveal the answer
                  </p>
                </div>

                {/* Back (Answer) */}
                <div className="absolute inset-0 backface-hidden bg-white rounded-2xl shadow-md p-6 flex flex-col justify-center border border-gray-300 transform rotate-y-180">
                  <p className="text-gray-700">{card.answer}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Arrow */}
          <button
            onClick={handleNext}
            disabled={index === flashcards.length - 1}
            className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-md disabled:opacity-30 hover:bg-gray-200 cursor-pointer z-10"
          >
            <ChevronRightIcon className="h-6 w-6 text-gray-600" />
          </button>

          {/* Progress */}
          <p className="text-sm text-gray-500 mt-4 text-center">
            Card {index + 1} of {flashcards.length}
          </p>
        </div>
        <div className="flex items-center justify-center gap-4">
          {/* Number Navigation */}
          <div className="w-60 flex-shrink-0 p-4 bg-white rounded-lg shadow-md border border-gray-300">
            <div className="grid grid-cols-5 gap-4">
              {flashcards.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setIndex(i);
                    setRevealed(false);
                  }}
                  className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition
            ${i === index
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
              onClick={() => setFocusMode(true)} // your handler
            >
              <ArrowsPointingOutIcon className="w-5 h-5" />
            </button>

            {/* Tooltip */}
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 
                   bg-gray-800 text-white text-xs rounded px-2 py-1 
                   opacity-0 group-hover:opacity-100 
                   transition pointer-events-none whitespace-nowrap">
              Focus mode
            </span>
          </div>

        </div>

      </div>
      {/* Focus Mode Modal */}
      {focusMode && (
        <div className="fixed inset-0 backdrop-blur-lg bg-black/70 z-50 flex items-center justify-center">
          <button
            className="fixed top-6 right-6 text-gray-900 w-10 h-10 bg-white 
                 hover:bg-gray-300 cursor-pointer rounded-full p-2 z-50"
            onClick={() => setFocusMode(false)}
          >
            ✕
          </button>
          <div className="flex flex-col items-center gap-12 justify-center">
            {/* Flashcard Area */}
            <div className="relative w-full max-w-md min-w-[24rem] h-[300px] perspective">
              {/* Left Arrow */}
              <button
                onClick={handlePrev}
                disabled={index === 0}
                className="absolute -left-12 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-md disabled:opacity-30 hover:bg-gray-200 cursor-pointer z-10"
              >
                <ChevronLeftIcon className="h-6 w-6 text-gray-600" />
              </button>

              {/* Card Stack */}
              <div
                className={`relative w-full h-full transition-transform duration-300`}
              >
                {/* Back Cards for stacking effect */}
                {flashcards.slice(index + 1, index + 3).map((_, idx) => (
                  <div
                    key={idx}
                    className="absolute inset-0 bg-gray-300 rounded-2xl shadow-md scale-95 translate-y-2 opacity-40"
                    style={{
                      transform: `translateY(${(idx + 1) * 10}px) scale(${1 - (idx + 1) * 0.05
                        })`,
                    }}
                  />
                ))}

                {/* Main Card with Flip Animation */}
                <div
                  className={`absolute inset-0 transition-transform duration-300 transform ${slideDirection === "left"
                    ? "-translate-x-full opacity-0"
                    : slideDirection === "right"
                      ? "translate-x-full opacity-0"
                      : "translate-x-0 opacity-100"
                    }`}
                >
                  <div
                    className={`relative w-full h-full transform-style-preserve-3d transition-transform duration-500 ${revealed ? "rotate-y-180" : ""
                      }`}
                    onClick={toggleAnswer}
                  >
                    {/* Front (Question) */}
                    <div className="absolute inset-0 backface-hidden bg-white rounded-2xl shadow-md p-6 flex flex-col justify-center border border-gray-300">
                      <h4 className="text-xl font-bold text-gray-900 mb-4">
                        {card.question}
                      </h4>
                      <p className="text-gray-400 italic">
                        Click to reveal the answer
                      </p>
                    </div>

                    {/* Back (Answer) */}
                    <div className="absolute inset-0 backface-hidden bg-white rounded-2xl shadow-md p-6 flex flex-col justify-center border border-gray-300 transform rotate-y-180">
                      <p className="text-gray-700">{card.answer}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Arrow */}
              <button
                onClick={handleNext}
                disabled={index === flashcards.length - 1}
                className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-md disabled:opacity-30 hover:bg-gray-200 cursor-pointer z-10"
              >
                <ChevronRightIcon className="h-6 w-6 text-gray-600" />
              </button>

              {/* Progress */}
              <p className="text-sm text-gray-500 mt-4 text-center">
                Card {index + 1} of {flashcards.length}
              </p>
            </div>
            {/* Number Navigation */}
            <div className="w-60 flex-shrink-0 p-4 bg-white rounded-lg shadow-md border border-gray-300">
              <div className="grid grid-cols-5 gap-4">
                {flashcards.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setIndex(i);
                      setRevealed(false);
                    }}
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition
            ${i === index
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



      {/* Extra CSS */}
      <style>{`
        .perspective {
          perspective: 1000px;
        }
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
};

export default FlashcardList;
