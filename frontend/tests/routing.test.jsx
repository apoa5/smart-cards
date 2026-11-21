import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import App from "../src/App";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

test("Get started opens the public dashboard", async () => {
  render(<App />);
  fireEvent.click(screen.getByRole("link", { name: /get started/i }));
  await screen.findByRole("heading", { name: "Generate Flashcards and Quizzes" });
  expect(window.location.pathname).toBe("/dashboard");
});

test("a fresh visit to /dashboard opens the study workspace without a session", () => {
  window.history.replaceState(null, "", "/dashboard");
  render(<App />);
  expect(screen.getByRole("button", { name: /choose file/i })).toBeTruthy();
  expect(window.location.pathname).toBe("/dashboard");
});

test.each(["/login", "/signup"])("%s redirects to the public dashboard", async (path) => {
  window.history.replaceState(null, "", path);
  render(<App />);
  await screen.findByRole("button", { name: /choose file/i });
  expect(window.location.pathname).toBe("/dashboard");
  expect(screen.queryByRole("heading", { name: /sign in|sign up/i })).toBeNull();
});
