import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import FlashcardList from "../src/components/FlashcardList";

const { reducedMotion } = vi.hoisted(() => ({ reducedMotion: vi.fn() }));

vi.mock("motion/react", () => ({
  useReducedMotion: reducedMotion,
  AnimatePresence: ({ children }) => children,
  LazyMotion: ({ children }) => children,
  domAnimation: {},
}));

vi.mock("motion/react-m", () => ({
  span: ({ animate, children, custom, variants, className, "aria-hidden": hidden }) => (
    <span className={className} aria-hidden={hidden} data-rotation={animate?.rotateY}
      data-enter-x={variants?.enter(custom).x} data-exit-x={variants?.exit(custom).x}>
      {children}
    </span>
  ),
}));

const cards = [
  { question: "First question?", answer: "First answer." },
  { question: "Second question?", answer: "Second answer." },
  { question: "Third question?", answer: "Third answer." },
];

afterEach(() => {
  cleanup();
  reducedMotion.mockReset();
});

test("only the active side is announced and reveal reverses the rotation", () => {
  const { container } = render(<FlashcardList flashcards={cards} />);
  const button = screen.getByRole("button", { name: /reveal answer.*first question/i });
  const flip = container.querySelector(".flashcard-flip");
  expect(flip.dataset.rotation).toBe("0");
  expect(flip.closest('[aria-hidden="true"]')).toBeTruthy();
  expect(screen.getByRole("status").textContent).not.toContain(cards[0].answer);
  fireEvent.click(button);
  expect(flip.dataset.rotation).toBe("180");
  expect(screen.getByRole("button", { name: /show question.*first answer/i })).toBe(button);
  expect(screen.getByRole("status").textContent).not.toContain(cards[0].question);
  fireEvent.click(button);
  expect(flip.dataset.rotation).toBe("0");
});

test("navigation follows direction, resets the face, and keeps the reveal button focused", () => {
  const { container } = render(<FlashcardList flashcards={cards} />);
  const previous = screen.getByRole("button", { name: "Previous card" });
  const next = screen.getByRole("button", { name: "Next card" });
  const card = screen.getByRole("button", { name: /reveal answer/i });
  expect(previous.disabled).toBe(true);
  card.focus();
  fireEvent.click(card);
  fireEvent.keyDown(card, { key: "ArrowRight" });
  expect(container.querySelector(".flashcard-slide").dataset).toMatchObject({ enterX: "32", exitX: "-32" });
  expect(card.getAttribute("aria-label")).toContain("Second question?");
  expect(container.querySelector(".flashcard-flip").dataset.rotation).toBe("0");
  fireEvent.keyDown(card, { key: "ArrowLeft" });
  expect(container.querySelector(".flashcard-slide").dataset).toMatchObject({ enterX: "-32", exitX: "32" });
  expect(document.activeElement).toBe(card);
  fireEvent.keyDown(card, { key: "ArrowLeft" });
  expect(card.getAttribute("aria-label")).toContain("First question?");
  fireEvent.click(next);
  fireEvent.click(previous);
  fireEvent.click(next);
  fireEvent.click(next);
  fireEvent.click(next);
  expect(next.disabled).toBe(true);
  expect(card.getAttribute("aria-label")).toContain("Third question?");
});

test("reduced motion presents the answer and next question without any motion layers", () => {
  reducedMotion.mockReturnValue(true);
  const { container, rerender } = render(<FlashcardList flashcards={cards} />);
  const card = screen.getByRole("button", { name: /reveal answer/i });
  fireEvent.click(card);
  expect(within(card).getByText(cards[0].answer)).toBeTruthy();
  expect(within(card).queryByText(cards[0].question)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Next card" }));
  expect(within(card).getByText(cards[1].question)).toBeTruthy();
  expect(container.querySelector(".flashcard-slide, .flashcard-flip")).toBeNull();
  rerender(<FlashcardList flashcards={cards.map((item) => ({ ...item, question: `New ${item.question}` }))} />);
  expect(screen.getByRole("button", { name: /reveal answer.*new first question/i })).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain("Card 1 of 3");
});
