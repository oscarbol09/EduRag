import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelpTooltip } from "@/components/HelpTooltip";

describe("HelpTooltip", () => {
  it("renders help button", () => {
    render(<HelpTooltip text="Texto de ayuda" />);
    expect(screen.getByLabelText("Ayuda")).toBeInTheDocument();
  });

  it("shows tooltip on mouse enter and hides on mouse leave", async () => {
    const user = userEvent.setup();
    render(<HelpTooltip text="Texto de ayuda" />);

    const button = screen.getByLabelText("Ayuda");
    expect(screen.queryByText("Texto de ayuda")).not.toBeInTheDocument();

    await user.hover(button);
    expect(screen.getByText("Texto de ayuda")).toBeInTheDocument();

    await user.unhover(button);
    expect(screen.queryByText("Texto de ayuda")).not.toBeInTheDocument();
  });

  it("shows tooltip on focus and hides on blur", async () => {
    const user = userEvent.setup();
    render(<HelpTooltip text="Texto de ayuda" />);

    const button = screen.getByLabelText("Ayuda");
    await user.tab();
    expect(button).toHaveFocus();
    expect(screen.getByText("Texto de ayuda")).toBeInTheDocument();

    await user.tab();
    expect(button).not.toHaveFocus();
    expect(screen.queryByText("Texto de ayuda")).not.toBeInTheDocument();
  });
});
