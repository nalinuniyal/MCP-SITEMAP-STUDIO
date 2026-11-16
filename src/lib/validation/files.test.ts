import { describe, expect, it } from "vitest";
import { sanitizeFileName, uniqueFileName, validateFileContent, validateUploads } from "./files";
import { FILE_LIMITS } from "@/lib/domain/constants";

const enc = (s: string) => new TextEncoder().encode(s);
const file = (name: string, body: string | Uint8Array) =>
  new File([typeof body === "string" ? body : new Uint8Array(body)], name);

// Must stay in sync with the CHECK constraint on public.sitemap_files.name.
const DB_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;

describe("sanitizeFileName", () => {
  it.each([
    ["sitemap.js", "sitemap.js"],
    ["My Sitemap (final).JS", "My-Sitemap-final.js"],
    ["../../etc/passwd.txt", "passwd.txt"],
    ["C:\\Users\\dev\\sitemap.js", "sitemap.js"],
    ["  .hidden.js", "hidden.js"],
    ["...js", null],
    ["évènement.js", "evenement.js"],
    ["sitemap.min.js", "sitemap.min.js"],
  ])("%s -> %s", (input, expected) => {
    expect(sanitizeFileName(input)).toBe(expected);
  });

  it.each(["payload.html", "sitemap.ts", "noext", "archive.js.zip", "image.svg"])("rejects %s", (name) => {
    expect(sanitizeFileName(name)).toBeNull();
  });

  it("always produces names the database accepts", () => {
    const inputs = ["a".repeat(300) + ".js", "-lead.js", "x y z.txt", "日本語.js", "ok_name-1.txt"];
    for (const i of inputs) {
      const out = sanitizeFileName(i);
      if (out) expect(out).toMatch(DB_NAME);
    }
  });
});

describe("uniqueFileName", () => {
  it("suffixes taken names", () => {
    expect(uniqueFileName("s.js", new Set(["s.js", "s-2.js"]))).toBe("s-3.js");
    expect(uniqueFileName("s.js", new Set())).toBe("s.js");
  });
});

describe("validateFileContent", () => {
  it("accepts UTF-8 and strips a BOM", () => {
    const r = validateFileContent(enc("\uFEFFconst a = 1;"));
    expect(r).toEqual({ ok: true, content: "const a = 1;" });
  });
  it("rejects empty, binary, invalid UTF-8 and oversized input", () => {
    expect(validateFileContent(new Uint8Array())).toMatchObject({ ok: false });
    expect(validateFileContent(enc("a\u0000b"))).toMatchObject({ ok: false, reason: "File contains binary data" });
    expect(validateFileContent(new Uint8Array([0xff, 0xfe, 0x00]))).toMatchObject({ ok: false });
    expect(validateFileContent(new Uint8Array(FILE_LIMITS.maxBytes + 1).fill(97))).toMatchObject({ ok: false });
  });
});

describe("validateUploads", () => {
  it("splits accepted and rejected files and avoids name clashes", async () => {
    const { accepted, rejected } = await validateUploads(
      [file("sitemap.js", "init();"), file("sitemap.js", "other();"), file("evil.exe", "MZ"), file("empty.txt", "")],
      ["sitemap.js"],
    );
    expect(accepted.map((a) => a.name)).toEqual(["sitemap-2.js", "sitemap-3.js"]);
    expect(rejected.map((r) => r.originalName)).toEqual(["evil.exe", "empty.txt"]);
  });

  it("caps the number of files per upload", async () => {
    const files = Array.from({ length: FILE_LIMITS.maxFilesPerUpload + 1 }, (_, i) => file(`f${i}.js`, "x"));
    const { accepted, rejected } = await validateUploads(files, []);
    expect(accepted).toHaveLength(0);
    expect(rejected).toHaveLength(1);
  });
});
