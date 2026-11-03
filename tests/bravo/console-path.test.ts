import { describe, expect, it } from "vitest";
import { getConsolePath } from "@/lib/bravo/consolePath";

describe("getConsolePath", () => {
  it("defaults to /learning/centre/7f2k9", () => {
    expect(getConsolePath({})).toBe("/learning/centre/7f2k9");
  });
  it("honours BRAVO_CONSOLE_PATH, including paths outside /learning", () => {
    expect(getConsolePath({ BRAVO_CONSOLE_PATH: "/papers" })).toBe("/papers");
    expect(getConsolePath({ BRAVO_CONSOLE_PATH: "/a/b/c/" })).toBe("/a/b/c");
  });
  it("falls back to the default for invalid values", () => {
    expect(getConsolePath({ BRAVO_CONSOLE_PATH: "papers" })).toBe("/learning/centre/7f2k9");
    expect(getConsolePath({ BRAVO_CONSOLE_PATH: "  " })).toBe("/learning/centre/7f2k9");
  });
});
