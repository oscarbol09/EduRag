import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useRequireRole } from "@/hooks/useRequireRole";
import { AppProvider } from "@/lib/context";
import type { User } from "@/lib/types";

const mockPush = vi.fn();
const mockUseRouter = vi.fn(() => ({ push: mockPush }));

vi.mock("next/navigation", () => ({
  useRouter: () => mockUseRouter(),
}));

function TestComponent({ role }: { role: User["role"] }) {
  const { isAuthorized, isChecking } = useRequireRole(role);
  return (
    <div>
      <span data-testid="authorized">{String(isAuthorized)}</span>
      <span data-testid="checking">{String(isChecking)}</span>
    </div>
  );
}

describe("useRequireRole", () => {
  beforeEach(() => {
    mockPush.mockClear();
    localStorage.clear();
  });

  it("redirects to /login when no token", () => {
    render(
      <AppProvider>
        <TestComponent role="teacher" />
      </AppProvider>
    );
    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  it("does not redirect while loading", () => {
    localStorage.setItem("token", "fake-token");

    render(
      <AppProvider>
        <TestComponent role="teacher" />
      </AppProvider>
    );

    // Still loading — user not fetched yet, should not redirect
    expect(mockPush).not.toHaveBeenCalled();
  });
});
