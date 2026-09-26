import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CookieBanner } from "../src/components/CookieBanner";

describe("CookieBanner Component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders cookie banner when no consent exists in localStorage", () => {
    render(<CookieBanner />);
    expect(screen.getByRole("region", { name: /aviso de cookies y privacidad/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /solo esenciales/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /aceptar todas/i })).toBeInTheDocument();
  });

  it("does not render when consent is already set in localStorage", () => {
    localStorage.setItem("edurag_cookie_consent", "all");
    const { container } = render(<CookieBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("sets localStorage to 'all' and hides banner on 'Aceptar todas'", async () => {
    const user = userEvent.setup();
    const eventSpy = vi.fn();
    window.addEventListener("cookie_consent_updated", eventSpy);

    render(<CookieBanner />);
    const acceptBtn = screen.getByRole("button", { name: /aceptar todas/i });
    await user.click(acceptBtn);

    expect(localStorage.getItem("edurag_cookie_consent")).toBe("all");
    expect(screen.queryByRole("region")).toBeNull();
    expect(eventSpy).toHaveBeenCalled();
  });

  it("sets localStorage to 'essential_only' and hides banner on 'Solo esenciales'", async () => {
    const user = userEvent.setup();
    const eventSpy = vi.fn();
    window.addEventListener("cookie_consent_updated", eventSpy);

    render(<CookieBanner />);
    const essentialBtn = screen.getByRole("button", { name: /solo esenciales/i });
    await user.click(essentialBtn);

    expect(localStorage.getItem("edurag_cookie_consent")).toBe("essential_only");
    expect(screen.queryByRole("region")).toBeNull();
    expect(eventSpy).toHaveBeenCalled();
  });
});
