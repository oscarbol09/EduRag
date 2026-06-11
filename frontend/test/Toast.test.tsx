import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastContainer, useToast } from "@/components/Toast";
import { useState } from "react";

function ToastHarness() {
  const { toasts, toast, removeToast } = useToast();
  return (
    <div>
      <button onClick={() => toast.success("Éxito")}>success</button>
      <button onClick={() => toast.error("Error")}>error</button>
      <button onClick={() => toast.info("Info")}>info</button>
      <button onClick={() => toast.warning("Aviso")}>warning</button>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

describe("useToast", () => {
  it("adds a toast and renders it", async () => {
    const user = userEvent.setup();
    render(<ToastHarness />);

    await user.click(screen.getByText("success"));
    expect(screen.getByText("Éxito")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("removes toast on close button click", async () => {
    const user = userEvent.setup();
    render(<ToastHarness />);

    await user.click(screen.getByText("error"));
    expect(screen.getByText("Error")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Cerrar notificación"));
    expect(screen.queryByText("Error")).not.toBeInTheDocument();
  });

  it("handles multiple toasts simultaneously", async () => {
    const user = userEvent.setup();
    render(<ToastHarness />);

    await user.click(screen.getByText("success"));
    await user.click(screen.getByText("warning"));

    expect(screen.getByText("Éxito")).toBeInTheDocument();
    expect(screen.getByText("Aviso")).toBeInTheDocument();
    expect(screen.getAllByRole("alert")).toHaveLength(2);
  });

  it("renders all four variants with correct icons", async () => {
    const user = userEvent.setup();
    render(<ToastHarness />);

    await user.click(screen.getByText("success"));
    await user.click(screen.getByText("error"));
    await user.click(screen.getByText("info"));
    await user.click(screen.getByText("warning"));

    expect(screen.getByText("Éxito")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText("Info")).toBeInTheDocument();
    expect(screen.getByText("Aviso")).toBeInTheDocument();
  });
});

describe("ToastContainer", () => {
  it("returns null when empty", () => {
    const { container } = render(
      <ToastContainer toasts={[]} onRemove={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});
