import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProvider, useApp } from "@/lib/context";
import type { User } from "@/lib/types";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function mockJsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
    headers: new Headers(),
    body: null,
    text: vi.fn(),
  };
}

// Test component that consumes useApp
let lastLoginError: unknown = null;
function TestConsumer() {
  const { auth, login, register, logout, chatbots } = useApp();
  return (
    <div>
      <span data-testid="role">{auth.user?.role ?? "none"}</span>
      <span data-testid="token">{auth.token ? "has-token" : "no-token"}</span>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <span data-testid="email">{auth.user?.email ?? ""}</span>
      <span data-testid="chatbots">{chatbots.length}</span>
      <button data-testid="btn-login" onClick={async () => { try { await login("a@b.com", "pass"); } catch (e) { lastLoginError = e; } }}>
        Login
      </button>
      <button data-testid="btn-register" onClick={async () => { try { await register("new@b.com", "pass"); } catch (e) { lastLoginError = e; } }}>
        Register
      </button>
      <button data-testid="btn-logout" onClick={() => logout()}>
        Logout
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AppProvider>
      <TestConsumer />
    </AppProvider>
  );
}

describe("AppProvider", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
    lastLoginError = null;
  });

  it("starts with no user and no token", () => {
    renderWithProvider();
    expect(screen.getByTestId("role").textContent).toBe("none");
    expect(screen.getByTestId("token").textContent).toBe("no-token");
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });

  it("loads user from existing token on mount", async () => {
    localStorage.setItem("token", "existing-token");
    const userData: User = {
      id: "1", email: "stored@test.com", role: "teacher",
      auth_method: "email_password", created_at: "", is_active: true,
    };
    mockFetch.mockResolvedValue(mockJsonResponse(userData));

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("email").textContent).toBe("stored@test.com");
    });
    expect(screen.getByTestId("role").textContent).toBe("teacher");
  });

  it("removes invalid token on mount", async () => {
    localStorage.setItem("token", "bad-token");
    mockFetch.mockResolvedValue(mockJsonResponse({ detail: "Invalid token" }, 401));

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("token").textContent).toBe("no-token");
    });
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("login updates auth state and stores token", async () => {
    const userData: User = {
      id: "1", email: "a@b.com", role: "teacher",
      auth_method: "email_password", created_at: "", is_active: true,
    };
    mockFetch.mockResolvedValue(mockJsonResponse({ token: "login-token", user: userData }));

    renderWithProvider();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("btn-login"));

    await waitFor(() => {
      expect(screen.getByTestId("email").textContent).toBe("a@b.com");
    });
    expect(screen.getByTestId("role").textContent).toBe("teacher");
    expect(screen.getByTestId("token").textContent).toBe("has-token");
    expect(localStorage.getItem("token")).toBe("login-token");
  });

  it("register updates auth state and stores token", async () => {
    const userData: User = {
      id: "2", email: "new@b.com", role: "student",
      auth_method: "email_password", created_at: "", is_active: true,
    };
    mockFetch.mockResolvedValue(mockJsonResponse({ token: "reg-token", user: userData }));

    renderWithProvider();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("btn-register"));

    await waitFor(() => {
      expect(screen.getByTestId("email").textContent).toBe("new@b.com");
    });
    expect(screen.getByTestId("role").textContent).toBe("student");
    expect(localStorage.getItem("token")).toBe("reg-token");
  });

  it("logout removes token and resets auth state", async () => {
    localStorage.setItem("token", "tok");
    const userData: User = {
      id: "1", email: "a@b.com", role: "teacher",
      auth_method: "email_password", created_at: "", is_active: true,
    };
    mockFetch.mockResolvedValue(mockJsonResponse(userData));

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("email").textContent).toBe("a@b.com");
    });

    const user = userEvent.setup();
    await user.click(screen.getByTestId("btn-logout"));

    expect(screen.getByTestId("email").textContent).toBe("");
    expect(screen.getByTestId("token").textContent).toBe("no-token");
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("login error clears loading state", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    renderWithProvider();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("btn-login"));

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
    expect(screen.getByTestId("token").textContent).toBe("no-token");
  });
});
