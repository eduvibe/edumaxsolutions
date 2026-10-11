// Server-side guard for /bravo/activate. Runs in Node: the page is a server component.
import { describe, expect, it } from "vitest";
import BravoActivatePage, { metadata } from "@/app/(main)/bravo/activate/page";

function redirectDigest(error: unknown): string {
  return String((error as { digest?: unknown })?.digest ?? "");
}

describe("/bravo/activate server guard", () => {
  it("redirects a visit with no order handoff to the public Bravo CBT page", async () => {
    let caught: unknown = null;
    try {
      await BravoActivatePage({ searchParams: Promise.resolve({}) });
    } catch (error) {
      caught = error;
    }
    expect(caught).not.toBeNull();
    expect(redirectDigest(caught)).toContain("NEXT_REDIRECT");
    expect(redirectDigest(caught)).toContain(";/bravo;");
  });

  it("treats an empty order parameter as no handoff", async () => {
    await expect(BravoActivatePage({ searchParams: Promise.resolve({ order: "" }) })).rejects.toMatchObject({
      digest: expect.stringContaining(";/bravo;"),
    });
  });

  it("renders the protected flow shell when an order reference is supplied (token is checked client-side)", async () => {
    const element = await BravoActivatePage({ searchParams: Promise.resolve({ order: "BCBT_0123456789ABCDEF01234567" }) });
    expect(element).toBeTruthy();
  });

  it("is excluded from search indexes", () => {
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });
});
