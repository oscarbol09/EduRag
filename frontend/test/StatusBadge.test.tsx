import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/StatusBadge";

describe("StatusBadge", () => {
  it("renders published status", () => {
    render(<StatusBadge status="published" />);
    expect(screen.getByText("Publicado")).toBeInTheDocument();
  });

  it("renders draft status", () => {
    render(<StatusBadge status="draft" />);
    expect(screen.getByText("Borrador")).toBeInTheDocument();
  });

  it("renders queued status", () => {
    render(<StatusBadge status="queued" />);
    expect(screen.getByText("En cola")).toBeInTheDocument();
  });

  it("renders custom label when provided", () => {
    render(<StatusBadge status="custom" labels={{ custom: "Personalizado" }} />);
    expect(screen.getByText("Personalizado")).toBeInTheDocument();
  });

  it("applies correct color classes", () => {
    render(<StatusBadge status="published" />);
    const badge = screen.getByText("Publicado");
    expect(badge).toHaveClass("bg-green-100", "text-green-700");
  });
});