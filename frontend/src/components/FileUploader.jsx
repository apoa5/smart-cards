import { useEffect, useRef, useState } from "react";
import { CloudArrowUpIcon, TrashIcon } from "@heroicons/react/24/outline";
import { api } from "../api";
import { studyError } from "../studyErrors";
import FlashcardList from "./FlashcardList";
import QuizList from "./QuizList";
import StudyDialog from "./StudyDialog";

const actionStyle = "editorial-secondary-button study-mode-action";
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
      <section className="document-panel" aria-labelledby="document-title">
        <div className="document-panel-main">
          <div className="document-panel-copy">
            <span className="document-icon"><CloudArrowUpIcon aria-hidden="true" /></span>
            <div>
              <h2 id="document-title">Your study document</h2>
              <p>TXT, PDF, DOCX, or PPTX · Maximum 4 MB</p>
            </div>
          </div>
          <input ref={input} type="file" aria-label="Study document"
            accept=".txt,.pdf,.docx,.pptx" className="hidden" onChange={selectFile} />
          <button ref={chooseButton} type="button" onClick={() => input.current?.click()}
            className={document ? "editorial-secondary-button" : "editorial-button"}>
            {document ? "Replace file" : "Choose File"}
          </button>
        </div>
        <p ref={statusRegion} role="status" tabIndex={-1}
          className={announcement ? "study-notice" : "sr-only"}>
          {pending && (
            <span aria-hidden="true"
              className="me-2.5 inline-block size-4 rounded-full border-2 border-accent/30 border-t-accent-ink align-[-0.15em] motion-safe:animate-spin" />
          )}
          {announcement}
        </p>
        {error && <p role="alert" className="study-notice study-notice-error">{error}</p>}

        {document && (
          <div className="document-summary">
            <p className="min-w-0 wrap-anywhere">
              {document.name}
              {document.text && <> uploaded ({document.wordCount} words)</>}
            </p>
            <button type="button" aria-label="Remove document" className="document-remove"
              onClick={() => {
                clearDocument();
                chooseButton.current?.focus();
              }}>
              <TrashIcon aria-hidden="true" /> <span>Remove</span>
            </button>
          </div>
        )}
      </section>

      {document?.text && (
        <section className="study-modes" aria-labelledby="study-modes-title">
          <h2 id="study-modes-title">Choose a study format</h2>
          <div className="study-modes-grid">
            <div>
              <p className="study-mode-title">Flashcards</p>
              <p>Recall an answer, then turn over the card to check it.</p>
              <button type="button" className={actionStyle} disabled={Boolean(pending)}
                aria-haspopup="dialog" onClick={() => setPicker("flashcards")}>
                Generate Flashcards
              </button>
            </div>
            <div>
              <p className="study-mode-title">Quiz</p>
              <p>Choose an answer and get feedback on each question.</p>
              <button type="button" className={actionStyle} disabled={Boolean(pending)}
                aria-haspopup="dialog" onClick={() => setPicker("quiz")}>
                Generate Quiz
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="study-results" aria-busy={Boolean(pending)}>
        {flashcards.length > 0 && <FlashcardList flashcards={flashcards} />}
        {quiz.length > 0 && <QuizList quiz={quiz} />}
      </div>

      {picker && (
        <StudyDialog title={`How many ${labels[picker]} do you want?`} onDismiss={() => setPicker("")} className="w-80">
          <div className="grid grid-cols-3 gap-3">
            {[5, 10, 15].map((count, index) => (
              <button key={count} type="button" data-initial-focus={index === 0 ? "" : undefined}
                onClick={() => generate(count)}
                className="editorial-button">
                {count}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setPicker("")}
            className="editorial-secondary-button mt-4 w-full">
            Cancel
          </button>
        </StudyDialog>
      )}
    </>
  );
}
