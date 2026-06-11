import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmModal } from "@/components/ConfirmModal";

describe("ConfirmModal", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <ConfirmModal isOpen={false} title="Test" onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders title and description when open", () => {
    render(
      <ConfirmModal
        isOpen
        title="¿Eliminar chatbot?"
        description="Esta acción no se puede deshacer."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText("¿Eliminar chatbot?")).toBeInTheDocument();
    expect(screen.getByText("Esta acción no se puede deshacer.")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmModal isOpen title="Test" onConfirm={onConfirm} onCancel={vi.fn()} />
    );

    await user.click(screen.getByText("Confirmar"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button is clicked", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmModal isOpen title="Test" onConfirm={vi.fn()} onCancel={onCancel} />
    );

    await user.click(screen.getByText("Cancelar"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when overlay is clicked", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <ConfirmModal isOpen title="Test" onConfirm={vi.fn()} onCancel={onCancel} />
    );

    const overlay = container.querySelector('[aria-hidden="true"]');
    if (overlay) await user.click(overlay);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when Escape is pressed", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmModal isOpen title="Test" onConfirm={vi.fn()} onCancel={onCancel} />
    );

    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("has correct aria attributes", () => {
    render(
      <ConfirmModal
        isOpen
        title="Aviso importante"
        description="Descripción del aviso"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "confirm-modal-title");
    expect(dialog).toHaveAttribute("aria-describedby", "confirm-modal-desc");
  });

  it("renders danger variant correctly", () => {
    render(
      <ConfirmModal
        isOpen
        title="Eliminar"
        variant="danger"
        confirmLabel="Sí, eliminar"
        cancelLabel="No, mantener"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText("Sí, eliminar")).toBeInTheDocument();
    expect(screen.getByText("No, mantener")).toBeInTheDocument();
  });
});
