import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthLayout } from "@/components/AuthLayout";

describe("AuthLayout", () => {
  it("renders title", () => {
    render(<AuthLayout title="Inicia sesión"><div>form</div></AuthLayout>);
    expect(screen.getByText("Inicia sesión")).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    render(<AuthLayout title="Título" subtitle="Subtítulo"><div>form</div></AuthLayout>);
    expect(screen.getByText("Subtítulo")).toBeInTheDocument();
  });

  it("renders children", () => {
    render(<AuthLayout title="Título"><p>contenido hijo</p></AuthLayout>);
    expect(screen.getByText("contenido hijo")).toBeInTheDocument();
  });

  it("renders EduRAG link to home", () => {
    render(<AuthLayout title="Título"><div>form</div></AuthLayout>);
    const links = screen.getAllByText("EduRAG");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/");
  });
});