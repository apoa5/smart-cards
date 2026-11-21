import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import App from "../src/App";
import { supabase } from "../src/supabaseClient";

vi.mock("../src/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(),
    },
  },
}));

vi.mock("../src/api", () => ({ api: { post: vi.fn() } }));

beforeEach(() => {
  supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
  supabase.auth.signOut.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/");
});

test("the public landing call to action opens signup", async () => {
  render(<App />);
  fireEvent.click(screen.getByRole("link", { name: /get started/i }));
  await screen.findByRole("heading", { name: /sign up/i });
  expect(window.location.pathname).toBe("/signup");
});

test("a signed-out visitor opening the dashboard is redirected to login", async () => {
  window.history.replaceState(null, "", "/dashboard");
  render(<App />);
  await screen.findByRole("heading", { name: /sign in/i });
  expect(window.location.pathname).toBe("/login");
});

test.each(["/login", "/signup"])("a restored session redirects %s to the dashboard", async (path) => {
  supabase.auth.getSession.mockResolvedValue({
    data: { session: { user: { user_metadata: { username: "Sample learner" } } } },
  });
  window.history.replaceState(null, "", path);
  render(<App />);
  await screen.findByRole("button", { name: /choose file/i });
  expect(screen.getByText("Sample learner")).toBeTruthy();
  expect(window.location.pathname).toBe("/dashboard");
});

test("confirming logout signs out and the dashboard guard redirects to login", async () => {
  supabase.auth.getSession.mockResolvedValue({ data: { session: { user: {} } } });
  window.history.replaceState(null, "", "/dashboard");
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: /log out/i }));
  fireEvent.click(screen.getByRole("button", { name: "Yes" }));
  await screen.findByRole("heading", { name: /sign in/i });
  expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  expect(window.location.pathname).toBe("/login");
});
