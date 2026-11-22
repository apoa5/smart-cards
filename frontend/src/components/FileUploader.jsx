import { useEffect, useRef, useState } from "react";
import { CloudArrowUpIcon, TrashIcon } from "@heroicons/react/24/outline";
import { api } from "../api";
import { studyError } from "../studyErrors";
import FlashcardList from "./FlashcardList";
import QuizList from "./QuizList";
import StudyDialog from "./StudyDialog";

const actionStyle = "rounded-2xl bg-gray-700 px-4 py-4 text-white transition enabled:cursor-pointer enabled:hover:bg-gray-900 disabled:opacity-50";
const labels = { flashcards: "flashcards", quiz: "quiz questions" };

export default function FileUploader({ onTextExtracted }) {
  const input = useRef(null);
  const chooseButton = useRef(null);
  const statusRegion = useRef(null);
  const activeRequest = useRef(null);
  const [document, setDocument] = useState(null);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [flashcards, setFlashcards] = useState([]);
  const [quiz, setQuiz] = useState([]);
  const [picker, setPicker] = useState("");

  useEffect(() => () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
  }, []);

  useEffect(() => {
    if (labels[pending]) statusRegion.current?.focus();
  }, [pending]);

  function clearDocument() {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setDocument(null);
    setPending("");
    setError("");
    setStatus("");
    setFlashcards([]);
    setQuiz([]);
    setPicker("");
    input.current.value = "";
  }

  async function request(kind, path, payload, onSuccess) {
    const controller = new AbortController();
    activeRequest.current = controller;
    setError("");
    setStatus("");
    setPending(kind);
    try {
      const { data } = await api.post(path, payload, { signal: controller.signal });
      if (activeRequest.current === controller) onSuccess(data);
    } catch (failure) {
      if (activeRequest.current !== controller) return;
      if (kind === "upload") setDocument(null);
      setError(studyError(failure, kind));
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setPending("");
      }
    }
  }

  function selectFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    clearDocument();
    if (/\.(ppt|doc)$/i.test(file.name)) {
      setError("Please save legacy .ppt or .doc files as .pptx or .docx before uploading.");
      return;
    }
    if (!/\.(txt|pdf|docx|pptx)$/i.test(file.name) || /^\s*\.[a-z]+$/i.test(file.name)) {
      setError("Please choose a TXT, PDF, DOCX, or PPTX file.");
      return;
    }
    if (file.size === 0) {
      setError("This file is empty. Choose a document with readable text.");
      return;
    }
    if (file.size > 4_000_000) {
      setError("File too large. Upload a file of 4 MB or less.");
      return;
    }
    setDocument({ name: file.name });
    const form = new FormData();
    form.append("file", file);
    void request("upload", "/api/upload", form, ({ preview, word_count }) => {
      if (typeof preview !== "string" || !preview.trim()) {
        setDocument(null);
        setError("No readable text was found. Choose a document with text.");
        return;
      }
      setDocument({ name: file.name, text: preview, wordCount: word_count });
      setStatus(`${file.name} is ready for study generation.`);
      onTextExtracted?.(preview);
    });
  }

  function generate(count) {
    if (activeRequest.current || !document?.text || !picker) return;
    const kind = picker;
    const setItems = kind === "flashcards" ? setFlashcards : setQuiz;
    const path = kind === "flashcards" ? "/api/generate_flashcards" : "/api/generate_quiz";
    setPicker("");
    setItems([]);
    void request(kind, path, { text: document.text, count }, (data) => {
      const items = data?.[kind];
      if (!Array.isArray(items) || !items.length) {
        setError("No study items were returned. Try again.");
        return;
      }
      setItems(items);
      setStatus(`${items.length} ${labels[kind]} ready.`);
    });
  }

  const announcement = pending === "upload"
    ? `Uploading ${document?.name ?? "document"}…`
    : pending ? `Generating ${labels[pending]}…` : status;

  return (
    <>
      <section className="mx-auto mt-10 max-w-2xl rounded-2xl border border-gray-500 bg-white p-5 text-center shadow-lg sm:p-8">
        <div className="mb-4 flex items-center justify-center gap-2">
          <CloudArrowUpIcon aria-hidden="true" className="h-8 w-8" />
          <h2 className="text-xl font-semibold text-gray-700">Upload here</h2>
        </div>
        <input ref={input} type="file" aria-label="Study document"
          accept=".txt,.pdf,.docx,.pptx" className="hidden" onChange={selectFile} />
        <button ref={chooseButton} type="button" onClick={() => input.current?.click()}
          className="cursor-pointer rounded-full bg-gray-700 px-8 py-3 text-white transition hover:bg-gray-900">
          {document ? "Replace file" : "Choose File"}
        </button>
        <p className="mt-3 text-sm text-gray-600">TXT, PDF, DOCX, or PPTX · Maximum 4 MB</p>
        <p ref={statusRegion} role="status" tabIndex={-1}
          className={announcement ? "mt-3 text-sm text-gray-700" : "sr-only"}>
          {announcement}
        </p>
        {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}

        {document && (
          <>
            {document.text && (
              <p className="mt-3 wrap-anywhere text-lime-900">
                📄 {document.name} uploaded ({document.wordCount} words)
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {document.text && (
                <>
                  <button type="button" className={actionStyle} disabled={Boolean(pending)}
                    aria-haspopup="dialog" onClick={() => setPicker("flashcards")}>
                    Generate Flashcards
                  </button>
                  <button type="button" className={actionStyle} disabled={Boolean(pending)}
                    aria-haspopup="dialog" onClick={() => setPicker("quiz")}>
                    Generate Quiz
                  </button>
                </>
              )}
              <button type="button" aria-label="Remove document"
                className="cursor-pointer rounded-lg p-2 text-red-600 transition hover:bg-red-50 hover:text-red-800"
                onClick={() => {
                  clearDocument();
                  chooseButton.current?.focus();
                }}>
                <TrashIcon aria-hidden="true" className="h-7 w-7" />
              </button>
            </div>
          </>
        )}
      </section>

      <div className="mt-12 pb-10" aria-busy={Boolean(pending)}>
        {flashcards.length > 0 && <FlashcardList flashcards={flashcards} />}
        {quiz.length > 0 && <QuizList quiz={quiz} />}
      </div>

      {picker && (
        <StudyDialog title={`How many ${labels[picker]} do you want?`} onDismiss={() => setPicker("")} className="w-80">
          <div className="grid grid-cols-3 gap-3">
            {[5, 10, 15].map((count, index) => (
              <button key={count} type="button" data-initial-focus={index === 0 ? "" : undefined}
                onClick={() => generate(count)}
                className="cursor-pointer rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-900">
                {count}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setPicker("")}
            className="mt-4 w-full cursor-pointer rounded-lg bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400">
            Cancel
          </button>
        </StudyDialog>
      )}
    </>
  );
}
