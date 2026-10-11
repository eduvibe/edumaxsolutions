// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BravoActivateFlow } from "@/components/bravo/BravoActivateFlow";

const ORDER_REF = "BCBT_0123456789ABCDEF01234567";
const TOKEN = "t".repeat(43);

// Text that only a valid, server-validated order should ever show.
const CHECKOUT_DETAILS = [
  "Pay Online",
  "Bank Transfer",
  "Account Number",
  "3004434394",
  "Kuda MFB",
  "Narration",
  "Transfer to",
  "Complete your order",
  "Product ID",
  "BCBT-YDR9-G5WQ-0860",
  "Pay ₦",
  "Order Summary",
  "Email for your activation key",
  "Step",
  "Product → Activate",
  "Choose New Activation",
];

function setUrl(path: string) {
  window.history.replaceState(null, "", path);
}

function expectNoCheckoutDetails(container: HTMLElement) {
  const text = container.textContent ?? "";
  for (const detail of CHECKOUT_DETAILS) expect(text).not.toContain(detail);
  expect(text).not.toContain(ORDER_REF);
  expect(text).not.toContain(TOKEN);
  expect(container.querySelector("input")).toBeNull();
  expect(container.querySelector("ol")).toBeNull();
  expect(container.querySelector("button")).toBeNull();
}

describe("/bravo/activate without a valid app handoff", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.sessionStorage.clear();
    fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: "not_found" }), { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    setUrl("/");
  });

  it("with no order parameter, shows only the generic unavailable message and never calls the API", async () => {
    setUrl("/bravo/activate");
    const { container } = render(<BravoActivateFlow />);
    expect(await screen.findByText("This page is not available")).toBeTruthy();
    expectNoCheckoutDetails(container);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("with an order reference but no token in the fragment or session, shows nothing about the order", async () => {
    setUrl(`/bravo/activate?order=${ORDER_REF}`);
    const { container } = render(<BravoActivateFlow />);
    expect(await screen.findByText("This page is not available")).toBeTruthy();
    expectNoCheckoutDetails(container);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("with a wrong or expired token (server 404), shows the same generic message and no order details", async () => {
    setUrl(`/bravo/activate?order=${ORDER_REF}#t=${TOKEN}`);
    const { container } = render(<BravoActivateFlow />);
    expect(await screen.findByText("This page is not available")).toBeTruthy();
    expectNoCheckoutDetails(container);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not reveal whether an order exists when the server errors", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ error: "internal_error" }), { status: 500 }));
    setUrl(`/bravo/activate?order=${ORDER_REF}#t=${TOKEN}`);
    const { container } = render(<BravoActivateFlow />);
    expect(await screen.findByText("This page is not available")).toBeTruthy();
    expectNoCheckoutDetails(container);
  });

  it("removes the token from the address bar on arrival", async () => {
    setUrl(`/bravo/activate?order=${ORDER_REF}#t=${TOKEN}`);
    render(<BravoActivateFlow />);
    await screen.findByText("This page is not available");
    expect(window.location.hash).toBe("");
    expect(window.location.search).toBe(`?order=${ORDER_REF}`);
  });

  it("links only back to the public Bravo CBT page", async () => {
    setUrl("/bravo/activate");
    const { container } = render(<BravoActivateFlow />);
    await screen.findByText("This page is not available");
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(new Set(hrefs)).toEqual(new Set(["/bravo"]));
  });
});

describe("/bravo/activate with a valid server-validated order", () => {
  it("shows the protected checkout summary, the payment panel and the bank transfer tab", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            orderRef: ORDER_REF,
            status: "pending_payment",
            productId: "BCBT-YDR9-G5WQ-0860",
            plan: "first",
            amountNaira: 4000,
            email: "pa***@example.com",
            emailOnFile: true,
            checkoutExpired: false,
          }),
          { status: 200 }
        )
      )
    );
    setUrl(`/bravo/activate?order=${ORDER_REF}#t=${TOKEN}`);
    render(<BravoActivateFlow />);

    expect(await screen.findByText("Complete your order")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Pay ₦4,000 online/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Bank Transfer/ })).toBeTruthy();
    // Saved email is shown only masked, and no email input is asked for.
    expect(screen.getByText("pa***@example.com")).toBeTruthy();
    expect(document.getElementById("pay-email")).toBeNull();
    // Token is not left in the address bar.
    expect(window.location.hash).toBe("");
    vi.unstubAllGlobals();
    cleanup();
  });
});
