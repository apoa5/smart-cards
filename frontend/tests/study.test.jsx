import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import FileUploader from "../src/components/FileUploader";
import { api } from "../src/api";

vi.mock("../src/api", () => ({ api: { post: vi.fn() } }));

// jsdom exposes <dialog> without the browser's modal methods.
HTMLDialogElement.prototype.showModal ??= function () { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close ??= function () { this.removeAttribute("open"); };

const notes = "A triangle has three sides.";
const filename = "geometry.txt";

function selectFile(name = filename, content = notes) {
  const file = new File([content], name);
  const input = document.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

async function uploadNotes() {
  api.post.mockResolvedValueOnce({ data: { preview: notes, word_count: 5 } });
  const file = selectFile();
  await screen.findByText(/geometry.txt uploaded \(5 words\)/);
  expect(api.post.mock.calls[0][0]).toBe("/api/upload");
  expect(api.post.mock.calls[0][1].get("file")).toBe(file);
}

afterEach(() => {
  cleanup();
  api.post.mockReset();
  vi.restoreAllMocks();
});

test("rejects an unsupported file before calling the API", () => {
  render(<FileUploader />);
  selectFile("geometry.csv");
  expect(screen.getByRole("alert").textContent).toMatch(/choose a TXT, PDF, DOCX, or PPTX/i);
  expect(api.post).not.toHaveBeenCalled();
});

test("shows pending upload state and reports a server failure", async () => {
  let rejectUpload;
  api.post.mockReturnValueOnce(new Promise((_, reject) => { rejectUpload = reject; }));
  render(<FileUploader />);
  selectFile();
  expect(screen.getByRole("status").textContent).toMatch(/uploading geometry.txt/i);
  expect(screen.getByRole("button", { name: /replace file/i }).disabled).toBe(false);
  rejectUpload({ response: { status: 400, data: { error: "Could not read this document." } } });
  expect((await screen.findByRole("alert")).textContent).toBe("Could not read this document.");
  expect(screen.getByRole("button", { name: /choose file/i }).disabled).toBe(false);
  expect(screen.queryByRole("button", { name: /generate flashcards/i })).toBeNull();
});

test("uploads notes, requests ten flashcards, and renders the cards", async () => {
  render(<FileUploader />);
  await uploadNotes();
  const flashcards = Array.from({ length: 10 }, (_, index) => ({
    question: `Geometry question ${index + 1}?`, answer: "Three sides.",
  }));
  api.post.mockResolvedValueOnce({ data: { flashcards } });
  fireEvent.click(screen.getByRole("button", { name: /generate flashcards/i }));
  fireEvent.click(screen.getByRole("button", { name: "10" }));
  expect(api.post).toHaveBeenNthCalledWith(2, "/api/generate_flashcards", { text: notes, count: 10 }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  const card = await screen.findByRole("button", { name: /reveal answer.*geometry question 1/i });
  fireEvent.click(card);
  expect(screen.getByRole("button", { name: /show question.*three sides/i })).toBe(card);
  fireEvent.keyDown(card, { key: "ArrowRight" });
  expect(screen.getByRole("button", { name: /reveal answer.*geometry question 2/i })).toBe(card);
  expect(screen.getByRole("button", { name: "card 2" }).getAttribute("aria-current")).toBe("true");
});

test("requests five quiz questions and gives feedback on an answer", async () => {
  render(<FileUploader />);
  await uploadNotes();
  const quiz = Array.from({ length: 5 }, (_, index) => ({
    question: `Geometry question ${index + 1}?`,
    options: ["One", "Two", "Three", "Four"],
    correct_answer: "Three",
  }));
  api.post.mockResolvedValueOnce({ data: { quiz } });
  fireEvent.click(screen.getByRole("button", { name: /generate quiz/i }));
  fireEvent.click(screen.getByRole("button", { name: "5" }));
  expect(api.post).toHaveBeenNthCalledWith(2, "/api/generate_quiz", { text: notes, count: 5 }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(await screen.findByText("Q1: Geometry question 1?")).toBeTruthy();
  fireEvent.click(screen.getByRole("radio", { name: "Three" }));
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  expect(screen.getByText("Correct!")).toBeTruthy();
});

test("reports a generation error and allows another attempt", async () => {
  render(<FileUploader />);
  await uploadNotes();
  api.post.mockRejectedValueOnce({
    response: { status: 429, data: { error: "The AI service is busy." } },
  });
  const generate = screen.getByRole("button", { name: /generate flashcards/i });
  fireEvent.click(generate);
  fireEvent.click(screen.getByRole("button", { name: "15" }));
  expect(api.post).toHaveBeenNthCalledWith(2, "/api/generate_flashcards", { text: notes, count: 15 }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect((await screen.findByRole("alert")).textContent).toBe("The AI service is busy.");
  expect(generate.disabled).toBe(false);
  expect(screen.queryByRole("heading", { name: "Flashcards" })).toBeNull();
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((fulfill, fail) => { resolve = fulfill; reject = fail; });
  return { promise, resolve, reject };
}

test.each([
  ["empty", "notes.txt", "", /file is empty/i],
  ["legacy", "notes.doc", notes, /save legacy/i],
  ["oversize", "notes.txt", new Uint8Array(4_000_001), /4 MB or less/i],
])("rejects a %s file before uploading", (_, name, content, message) => {
  render(<FileUploader />);
  selectFile(name, content);
  expect(screen.getByRole("alert").textContent).toMatch(message);
  expect(api.post).not.toHaveBeenCalled();
});

test("announces generation and blocks duplicate submissions for both study types", async () => {
  render(<FileUploader />);
  await uploadNotes();
  const generation = deferred();
  api.post.mockReturnValueOnce(generation.promise);
  const cards = screen.getByRole("button", { name: /generate flashcards/i });
  const quiz = screen.getByRole("button", { name: /generate quiz/i });
  fireEvent.click(cards);
  const choice = within(screen.getByRole("dialog")).getByRole("button", { name: "5" });
  fireEvent.click(choice);
  fireEvent.click(choice);
  fireEvent.click(cards);
  fireEvent.click(quiz);
  expect(cards.disabled).toBe(true);
  expect(quiz.disabled).toBe(true);
  expect(screen.getByRole("status").textContent).toMatch(/generating flashcards/i);
  expect(document.activeElement).toBe(screen.getByRole("status"));
  expect(api.post).toHaveBeenCalledTimes(2);
  await act(async () => generation.resolve({ data: { flashcards: [{ question: "New card?", answer: "Yes." }] } }));
  expect(cards.disabled).toBe(false);
  expect(quiz.disabled).toBe(false);
});

test("announces application limits using Retry-After when available", async () => {
  render(<FileUploader />);
  await uploadNotes();
  api.post.mockRejectedValueOnce({
    response: { status: 429, data: { error: "SmartCards request limit reached. Try again later.", code: "rate_limited" },
      headers: { "retry-after": "120" } },
  });
  fireEvent.click(screen.getByRole("button", { name: /generate quiz/i }));
  fireEvent.click(screen.getByRole("button", { name: "5" }));
  expect((await screen.findByRole("alert")).textContent).toBe(
    "SmartCards request limit reached. Try again in about 2 minutes.",
  );
});

test.each([
  [undefined, /check your connection/i],
  [{ status: 502, data: { error: "Backend credential details" } }, /upload is temporarily unavailable/i],
  [{ status: 413, data: "<html>Internal gateway response</html>" }, /4 MB or less/i],
])("shows upload failure guidance without exposing server details", async (response, message) => {
  render(<FileUploader />);
  api.post.mockRejectedValueOnce({ response });
  selectFile();
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toMatch(message);
  expect(alert.textContent).not.toMatch(/credential details|Internal gateway/);
});

test("replacing a pending upload ignores even a late successful response", async () => {
  render(<FileUploader />);
  const oldUpload = deferred();
  api.post.mockReturnValueOnce(oldUpload.promise);
  selectFile();
  const oldSignal = api.post.mock.calls[0][2].signal;
  api.post.mockResolvedValueOnce({ data: { preview: "New notes", word_count: 2 } });
  selectFile("replacement.txt");
  await screen.findByText(/replacement.txt uploaded/);
  expect(oldSignal.aborted).toBe(true);
  await act(async () => oldUpload.resolve({ data: { preview: "Stale notes", word_count: 2 } }));
  expect(screen.queryByText(/geometry.txt uploaded/)).toBeNull();
  expect(screen.getByText(/replacement.txt uploaded/)).toBeTruthy();
});

test.each(["replace", "remove"])("%s while generation is pending discards stale results", async (action) => {
  render(<FileUploader />);
  await uploadNotes();
  const generation = deferred();
  api.post.mockReturnValueOnce(generation.promise);
  fireEvent.click(screen.getByRole("button", { name: /generate flashcards/i }));
  fireEvent.click(screen.getByRole("button", { name: "5" }));
  const signal = api.post.mock.calls[1][2].signal;
  if (action === "replace") {
    api.post.mockResolvedValueOnce({ data: { preview: "New notes", word_count: 2 } });
    selectFile("replacement.txt");
    await screen.findByText(/replacement.txt uploaded/);
  } else {
    fireEvent.click(screen.getByRole("button", { name: "Remove document" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /choose file/i }));
  }
  expect(signal.aborted).toBe(true);
  await act(async () => generation.resolve({ data: { flashcards: [{ question: "Stale question?", answer: "Old." }] } }));
  expect(screen.queryByText("Stale question?")).toBeNull();
  expect(screen.queryByRole("alert")).toBeNull();
});

test("item-count and focus dialogs set initial focus and restore it on Escape", async () => {
  render(<FileUploader />);
  await uploadNotes();
  const generate = screen.getByRole("button", { name: /generate flashcards/i });
  generate.focus();
  fireEvent.click(generate);
  const picker = screen.getByRole("dialog", { name: /how many flashcards/i });
  const first = within(picker).getByRole("button", { name: "5" });
  expect(document.activeElement).toBe(first);
  fireEvent(picker, new Event("cancel", { cancelable: true }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(generate);

  api.post.mockResolvedValueOnce({ data: { flashcards: [{ question: "A card?", answer: "Yes." }] } });
  fireEvent.click(generate);
  fireEvent.click(screen.getByRole("button", { name: "5" }));
  const focus = await screen.findByRole("button", { name: "Open flashcard focus mode" });
  focus.focus();
  fireEvent.click(focus);
  const dialog = screen.getByRole("dialog", { name: "Flashcard focus mode" });
  expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Close focus mode" }));
  fireEvent(dialog, new Event("cancel", { cancelable: true }));
  expect(document.activeElement).toBe(focus);
});

test("shows a wait message when an application 429 does not expose Retry-After", async () => {
  render(<FileUploader />);
  await uploadNotes();
  api.post.mockRejectedValueOnce({
    response: { status: 429, data: { error: "SmartCards request limit reached. Try again later.", code: "rate_limited" } },
  });
  fireEvent.click(screen.getByRole("button", { name: /generate flashcards/i }));
  fireEvent.click(screen.getByRole("button", { name: "5" }));
  expect((await screen.findByRole("alert")).textContent).toBe(
    "SmartCards request limit reached. Wait a little before trying again.",
  );
});

test("quiz feedback and selection remain available when revisiting an answered question", async () => {
  render(<FileUploader />);
  await uploadNotes();
  api.post.mockResolvedValueOnce({ data: { quiz: [
    { question: "First?", options: ["A", "B", "C", "D"], correct_answer: "A" },
    { question: "Second?", options: ["E", "F", "G", "H"], correct_answer: "E" },
  ] } });
  fireEvent.click(screen.getByRole("button", { name: /generate quiz/i }));
  fireEvent.click(screen.getByRole("button", { name: "5" }));
  const option = await screen.findByRole("radio", { name: "A" });
  expect(screen.getByRole("button", { name: "Submit" }).disabled).toBe(true);
  fireEvent.click(option);
  fireEvent.submit(screen.getByRole("button", { name: "Submit" }).form);
  expect(document.activeElement.textContent).toBe("Correct!");
  fireEvent.click(screen.getByRole("button", { name: "Next question" }));
  fireEvent.click(screen.getByRole("button", { name: "Previous question" }));
  expect(screen.getByRole("radio", { name: "A" }).checked).toBe(true);
  expect(screen.getByText("Correct!")).toBeTruthy();
});
