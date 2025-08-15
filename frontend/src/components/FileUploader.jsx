import React, { useRef, useState } from "react";
import axios from "axios";
import FlashcardList from "./FlashcardList";
import QuizList from "./QuizList";
import { CloudArrowUpIcon, TrashIcon } from "@heroicons/react/24/outline";

const FileUploader = ({ onTextExtracted }) => {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingFlashcards, setLoadingFlashcards] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [preprocessedText, setPreprocessedText] = useState("");
  const [wordCount, setWordCount] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [quiz, setQuiz] = useState([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(""); // "flashcards" or "quiz"

  const handleFileChange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  setLoading(true);

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await axios.post(
      "http://localhost:5000/api/upload",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    const previewText = response.data.preview;
    setPreprocessedText(previewText);
    setWordCount(response.data.word_count);
    setSelectedFile(file); // ✅ Move here — only after success

    onTextExtracted?.(previewText);
  } catch (err) {
    console.error("Upload failed:", err);

    if (err.response && err.response.data && err.response.data.error) {
      alert(err.response.data.error);
    } else {
      alert("Failed to upload or extract file.");
    }
    setSelectedFile(null); // ✅ Make sure no file shows on failure
  } finally {
    setLoading(false);
  }
};



  const requestFlashcards = async (count) => {
    setLoadingFlashcards(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/generate_flashcards",
        { text: preprocessedText, count }
      );
      setFlashcards(response.data.flashcards || []);
    } catch (err) {
      console.error("Flashcard generation failed:", err);
    } finally {
      setLoadingFlashcards(false);
    }
  };

  const requestQuiz = async (count) => {
    setLoadingQuiz(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/generate_quiz",
        { text: preprocessedText, count }
      );
      setQuiz(response.data.quiz || []);
    } catch (err) {
      console.error("Quiz generation failed:", err);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleDeleteFile = () => {
    setSelectedFile(null);
    setPreprocessedText("");
    setWordCount(null);
    setFlashcards([]);
    setQuiz([]);
    fileInputRef.current.value = "";
  };

  const handleModalSelect = (count) => {
    setModalOpen(false);
    if (modalType === "flashcards") {
      requestFlashcards(count);
    } else if (modalType === "quiz") {
      requestQuiz(count);
    }
  };

  return (
    <>
      {/* Upload Section */}
      <div className="bg-white p-8 rounded-2xl border border-gray-500 shadow-lg text-center max-w-2xl mx-auto mt-10">
        <div className="flex items-center justify-center gap-2 mb-4">
          <CloudArrowUpIcon className="w-8 h-8" />
          <h2 className="text-xl font-semibold text-gray-700">Upload here</h2>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf,.docx,.ppt,.pptx"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-8 py-3 rounded-full bg-gray-700 text-white hover:bg-gray-900 cursor-pointer transition"
        >
          {loading ? "Uploading..." : "Choose File"}
        </button>

        {selectedFile && !loading && (
          <>
            <p className="mt-3 text-lime-900 text-m">
              📄 {selectedFile.name} uploaded
            </p>
            <div className="mt-4 flex justify-center gap-4 items-center">
              <button
                onClick={() => {
                  setModalType("flashcards");
                  setModalOpen(true);
                }}
                disabled={loadingFlashcards}
                className="px-4 py-4 bg-gray-700 text-white rounded-2xl hover:bg-gray-900 cursor-pointer flex items-center gap-2"
              >
                {loadingFlashcards && (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                )}
                Generate Flashcards
              </button>
              <button
                onClick={() => {
                  setModalType("quiz");
                  setModalOpen(true);
                }}
                disabled={loadingQuiz}
                className="px-4 py-4 bg-gray-700 text-white rounded-2xl hover:bg-gray-900 cursor-pointer flex items-center gap-2"
              >
                {loadingQuiz && (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                )}
                Generate Quiz
              </button>
              <TrashIcon
                className="w-8 h-8 text-red-600 cursor-pointer hover:text-red-800 transition"
                onClick={handleDeleteFile}
              />
            </div>
          </>
        )}
      </div>

      {/* Flashcards and Quiz Section */}
      <div className="mt-12 px-4 pb-10">
        {flashcards.length > 0 && <FlashcardList flashcards={flashcards} />}
        {quiz.length > 0 && <QuizList quiz={quiz} />}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center backdrop-blur-lg bg-black/60 z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-center">
              How many {modalType === "flashcards" ? "flashcards" : "questions"} do you want?
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[5, 10, 15].map((num) => (
                <button
                  key={num}
                  onClick={() => handleModalSelect(num)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-900 cursor-pointer"
                >
                  {num}
                </button>
              ))}
            </div>
            <button
              onClick={() => setModalOpen(false)}
              className="mt-4 w-full bg-gray-300 text-gray-800 rounded-lg py-2 hover:bg-gray-400 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default FileUploader;
