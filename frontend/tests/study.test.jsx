import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import FileUploader from "../src/components/FileUploader";
import { api } from "../src/api";

vi.mock("../src/api", () => ({ api: { post: vi.fn() } }));

const notes = "A triangle has three sides.";
const filename = "geometry.txt";

function selectFile(name = filename) {
  const file = new File([notes], name);
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
  vi.spyOn(console, "error").mockImplementation(() => {});
  let rejectUpload;
  api.post.mockReturnValueOnce(new Promise((_, reject) => { rejectUpload = reject; }));
  render(<FileUploader />);
  selectFile();
  expect(screen.getByRole("button", { name: /uploading/i }).disabled).toBe(true);
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
  expect(api.post).toHaveBeenNthCalledWith(2, "/api/generate_flashcards", { text: notes, count: 10 });
  const question = await screen.findByText("Geometry question 1?");
  const card = question.closest(".transform-style-preserve-3d");
  expect(card.classList.contains("rotate-y-180")).toBe(false);
  fireEvent.click(question);
  expect(card.classList.contains("rotate-y-180")).toBe(true);
  expect(screen.getByText("Three sides.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "2" }));
  expect(screen.getByText("Geometry question 2?")).toBeTruthy();
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
  expect(api.post).toHaveBeenNthCalledWith(2, "/api/generate_quiz", { text: notes, count: 5 });
  expect(await screen.findByText("Q1: Geometry question 1?")).toBeTruthy();
  fireEvent.click(screen.getByRole("radio", { name: "Three" }));
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  expect(screen.getByText("Correct!")).toBeTruthy();
});

test("reports a generation error and allows another attempt", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  render(<FileUploader />);
  await uploadNotes();
  api.post.mockRejectedValueOnce({
    response: { status: 429, data: { error: "The AI service is busy." } },
  });
  const generate = screen.getByRole("button", { name: /generate flashcards/i });
  fireEvent.click(generate);
  fireEvent.click(screen.getByRole("button", { name: "15" }));
  expect(api.post).toHaveBeenNthCalledWith(2, "/api/generate_flashcards", { text: notes, count: 15 });
  expect((await screen.findByRole("alert")).textContent).toBe("The AI service is busy.");
  expect(generate.disabled).toBe(false);
  expect(screen.queryByRole("heading", { name: "Flashcards" })).toBeNull();
});
