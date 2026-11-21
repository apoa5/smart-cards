import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import App from "../src/App";

vi.mock("../src/supabaseClient", () => {
  throw new Error("Public routes must not load the Supabase client");
});

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
  expect(screen.queryByRole("button", { name: /log out/i })).toBeNull();
  expect(window.location.pathname).toBe("/dashboard");
});
