import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Navbar } from "@/components/Navbar";

describe("Navbar", () => {
  it("renders home link when no backTo", () => {
    render(<Navbar />);
    expect(screen.getByText("EduRAG")).toBeInTheDocument();
    expect(screen.getByText("EduRAG")).toHaveAttribute("href", "/");
  });

  it("renders back link when backTo is provided", () => {
    render(<Navbar backTo="/teacher" backLabel="Volver al panel" />);
    expect(screen.getByText("← Volver al panel")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(<Navbar backTo="/" title="Mi Panel" />);
    expect(screen.getByText("Mi Panel")).toBeInTheDocument();
  });

  it("renders action buttons", () => {
    render(
      <Navbar
        actions={<button>Acción</button>}
      />
    );
    expect(screen.getByText("Acción")).toBeInTheDocument();
  });
});