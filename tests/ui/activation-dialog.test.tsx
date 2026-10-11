// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BravoHero } from "@/components/sections/bravo/BravoHero";
import { BravoCta } from "@/components/sections/bravo/BravoCta";
import { ACTIVATION_INFO_COPY, ACTIVATION_INFO_TITLE } from "@/components/sections/bravo/ActivationInfoDialog";

afterEach(() => cleanup());

const PROTECTED_PATTERNS = [/\/bravo\/activate/, /order=/, /#t=/, /BCBT_[A-F0-9]{6}/, /statusToken/i, /Bearer/i];

function expectNoProtectedDetails(text: string) {
  for (const pattern of PROTECTED_PATTERNS) expect(text).not.toMatch(pattern);
}

describe("marketing page: Get Activation Key opens a modal", () => {
  it("contains no navigation to the private activate route", () => {
    const { container } = render(
      <>
        <BravoHero />
        <BravoCta />
      </>
    );
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href") ?? "");
    expect(hrefs.filter((h) => h.includes("/bravo/activate"))).toEqual([]);
  });

  it("opens the explanation dialog with the approved copy, and nothing protected", () => {
    render(<BravoHero />);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Get Activation Key" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain(ACTIVATION_INFO_TITLE);
    expect(dialog.textContent).toContain(ACTIVATION_INFO_COPY);
    expect(dialog.textContent).toContain("Paystack");
    expectNoProtectedDetails(dialog.textContent ?? "");
    expect(dialog.querySelectorAll("a, input, form")).toHaveLength(0);
  });

  it("opens the same dialog from the inline 'How activation works' link", () => {
    render(<BravoHero />);
    fireEvent.click(screen.getByRole("button", { name: /How activation works/ }));
    expect(screen.getByRole("dialog").textContent).toContain(ACTIVATION_INFO_COPY);
  });

  it("closes with the Close button", async () => {
    render(<BravoCta />);
    fireEvent.click(screen.getByRole("button", { name: "Get Activation Key" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("closes with the footer 'Got it' button", async () => {
    render(<BravoCta />);
    fireEvent.click(screen.getByRole("button", { name: "Get Activation Key" }));
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("closes on Escape", async () => {
    render(<BravoCta />);
    fireEvent.click(screen.getByRole("button", { name: "Get Activation Key" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("closes on an outside click", async () => {
    render(<BravoCta />);
    fireEvent.click(screen.getByRole("button", { name: "Get Activation Key" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    // Radix attaches its outside-press listener on the next tick after opening.
    await new Promise((resolve) => setTimeout(resolve, 0));
    // A press outside the dialog content, on the overlay or the page body.
    fireEvent.pointerDown(document.body, { pointerType: "mouse", button: 0 });
    fireEvent.mouseDown(document.body, { button: 0 });
    fireEvent.pointerUp(document.body, { pointerType: "mouse", button: 0 });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("does not close when pressing inside the dialog text", async () => {
    render(<BravoCta />);
    fireEvent.click(screen.getByRole("button", { name: "Get Activation Key" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.pointerDown(dialog, { pointerType: "mouse", button: 0 });
    fireEvent.mouseDown(dialog, { button: 0 });
    // Give any (incorrect) outside-click handler time to run before asserting it did not.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("can be reopened after closing", async () => {
    render(<BravoHero />);
    const trigger = screen.getByRole("button", { name: "Get Activation Key" });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog").textContent).toContain(ACTIVATION_INFO_TITLE);
  });
});
