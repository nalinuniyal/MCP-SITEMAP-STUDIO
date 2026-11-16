import { describe, expect, it } from "vitest";
import { projectInputSchema } from "./project";
import { safeRedirectPath } from "@/lib/auth/routes";

const base = { name: "Acme", platform: "shopify", appType: "mpa" };

describe("projectInputSchema", () => {
  it("normalises optional fields", () => {
    const r = projectInputSchema.parse({ ...base, clientName: "  ", websiteUrl: "", description: "  hi " });
    expect(r).toMatchObject({ clientName: null, websiteUrl: null, description: "hi" });
  });

  it("accepts http(s) URLs and normalises them", () => {
    expect(projectInputSchema.parse({ ...base, websiteUrl: "https://Example.com" }).websiteUrl).toBe("https://example.com/");
  });

  it.each(["javascript:alert(1)", "ftp://x.com", "example.com", "https://user:pw@example.com", "data:text/html,x"])(
    "rejects %s",
    (websiteUrl) => {
      expect(projectInputSchema.safeParse({ ...base, websiteUrl }).success).toBe(false);
    },
  );

  it("rejects unknown platforms and app types", () => {
    expect(projectInputSchema.safeParse({ ...base, platform: "wordpress" }).success).toBe(false);
    expect(projectInputSchema.safeParse({ ...base, appType: "pwa" }).success).toBe(false);
  });

  it("requires a name", () => {
    expect(projectInputSchema.safeParse({ ...base, name: "   " }).success).toBe(false);
  });
});

describe("safeRedirectPath", () => {
  it.each([
    ["/projects/1?tab=files", "/projects/1?tab=files"],
    ["//evil.com", "/dashboard"],
    ["/\\evil.com", "/dashboard"],
    ["https://evil.com", "/dashboard"],
    ["javascript:alert(1)", "/dashboard"],
    ["/ok\nSet-Cookie:x", "/dashboard"],
    [null, "/dashboard"],
  ])("%s -> %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });
});
