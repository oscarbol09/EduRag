import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/EmptyState";

describe("EmptyState", () => {
  it("renders title", () => {
    render(<EmptyState title="Sin resultados" />);
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<EmptyState title="Vacío" description="No hay elementos" />);
    expect(screen.getByText("No hay elementos")).toBeInTheDocument();
  });

  it("renders action link when provided", () => {
    render(
      <EmptyState
        title="Vacío"
        action={{ label: "Crear", href: "/create" }}
      />
    );
    const link = screen.getByText("Crear");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/create");
  });

  it("does not render action when not provided", () => {
    render(<EmptyState title="Vacío" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});