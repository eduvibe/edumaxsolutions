// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { OrderStatusView } from "@/components/bravo/OrderStatusView";
import { statusTokenStorageKey } from "@/lib/bravo/client-utils";

const REF = "BCBT_0123456789ABCDEF01234567";
const TOKEN = "tok_test_status_token_value";
const GENERIC = /Payment is being confirmed/;

function setUrl(path: string) {
  window.history.replaceState(null, "", path);
}

function renderAt(path: string) {
  setUrl(path);
  return render(<OrderStatusView />);
}

function expectGenericOnly(container: HTMLElement) {
  expect(screen.getByText(GENERIC)).toBeTruthy();
  const text = container.textContent ?? "";
  expect(text).toMatch(/Return to Bravo CBT/);
  expect(text).toMatch(/emailed/);
  // No order data, key, reference, or handoff instructions.
  expect(text).not.toContain(REF);
  expect(text).not.toMatch(/Product ID/);
  expect(text).not.toMatch(/same browser/i);
  expect(text).not.toMatch(/status link/i);
  expect(text).not.toMatch(/BCBT_/);
}

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
  setUrl("/");
});

describe("Paystack callback without an authorized handoff", () => {
  it("shows only the generic confirmation for a callback with no saved token, and never calls the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { container } = renderAt(`/bravo/activate/status?order=${REF}&trxref=abc&reference=abc`);
    expectGenericOnly(container);
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the generic view when the order reference is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { container } = renderAt("/bravo/activate/status");
    expectGenericOnly(container);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the generic view for a malformed order reference", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { container } = renderAt("/bravo/activate/status?order=not-a-ref");
    expectGenericOnly(container);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not reveal order data when the server rejects the token as unknown (404)", async () => {
    window.sessionStorage.setItem(statusTokenStorageKey(REF), TOKEN);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { "content-type": "application/json" } }))
    );
    const { container } = renderAt(`/bravo/activate/status?order=${REF}`);
    await waitFor(() => expect(screen.getByText(GENERIC)).toBeTruthy());
    expectGenericOnly(container);
  });
});

describe("in-browser flow with a saved status token (unchanged behaviour)", () => {
  it("polls the order with the saved token and shows the processing state", async () => {
    window.sessionStorage.setItem(statusTokenStorageKey(REF), TOKEN);
    const fetchMock = vi.fn(async (input: string) => {
      expect(input).toContain(`/api/bravo/orders/${REF}`);
      return new Response(
        JSON.stringify({
          orderRef: REF,
          status: "pending_payment",
          productId: "BCBT-YDR9-G5WQ-0860",
          plan: "first",
          amountNaira: 4000,
          email: null,
          emailSent: false,
          activationKey: null,
          message: "",
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAt(`/bravo/activate/status?order=${REF}`);
    await waitFor(() => expect(screen.getByText("Waiting for payment confirmation")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalled();
    expect(screen.queryByText(GENERIC)).toBeNull();
  });
});
