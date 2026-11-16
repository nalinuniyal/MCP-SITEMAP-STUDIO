import { FILE_LIMITS } from "@/lib/domain/constants";

export type FileKind = (typeof FILE_LIMITS.allowedExtensions)[number];

export type AcceptedFile = { name: string; originalName: string; kind: FileKind; content: string };
export type RejectedFile = { originalName: string; reason: string };

/**
 * Turns an untrusted client file name into a safe stored name:
 * basename only, restricted character set, extension preserved.
 * Must satisfy the DB check: ^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$
 */
export function sanitizeFileName(raw: string): string | null {
  const base = raw.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return null;
  const ext = base.slice(dot + 1).toLowerCase();
  if (!(FILE_LIMITS.allowedExtensions as readonly string[]).includes(ext)) return null;
  const stem = base
    .slice(0, dot)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[^A-Za-z0-9]+/, "")
    .replace(/[-.]+$/, "")
    .slice(0, 110);
  if (!stem) return null;
  return `${stem}.${ext}`;
}

export function fileKindOf(name: string): FileKind | null {
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  return (FILE_LIMITS.allowedExtensions as readonly string[]).includes(ext) ? (ext as FileKind) : null;
}

/** Picks a name not already taken: sitemap.js, sitemap-2.js, sitemap-3.js ... */
export function uniqueFileName(name: string, taken: Set<string>): string {
  if (!taken.has(name)) return name;
  const dot = name.lastIndexOf(".");
  const stem = name.slice(0, dot);
  const ext = name.slice(dot);
  for (let i = 2; i < 1000; i++) {
    const candidate = `${stem.slice(0, 110)}-${i}${ext}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error("Could not find a free file name");
}

/**
 * Validates raw bytes as a text sitemap file. The browser-reported MIME type
 * is ignored: only the extension, size and actual contents are trusted.
 * The content is treated purely as data and is never executed.
 */
export function validateFileContent(bytes: Uint8Array): { ok: true; content: string } | { ok: false; reason: string } {
  if (bytes.byteLength === 0) return { ok: false, reason: "File is empty" };
  if (bytes.byteLength > FILE_LIMITS.maxBytes) {
    return { ok: false, reason: `File is larger than ${FILE_LIMITS.maxBytes / 1024} KB` };
  }
  let content: string;
  try {
    content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, reason: "File is not valid UTF-8 text" };
  }
  if (content.includes("\u0000")) return { ok: false, reason: "File contains binary data" };
  // Strip a UTF-8 BOM so line/column numbers line up in later phases.
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
  return { ok: true, content };
}

export async function validateUploads(
  files: File[],
  existingNames: Iterable<string>,
): Promise<{ accepted: AcceptedFile[]; rejected: RejectedFile[] }> {
  const accepted: AcceptedFile[] = [];
  const rejected: RejectedFile[] = [];
  const taken = new Set(existingNames);

  if (files.length > FILE_LIMITS.maxFilesPerUpload) {
    return {
      accepted,
      rejected: [{ originalName: `${files.length} files`, reason: `Upload at most ${FILE_LIMITS.maxFilesPerUpload} files at a time` }],
    };
  }

  for (const file of files) {
    const originalName = (file.name || "unnamed").slice(0, 255);
    const safe = sanitizeFileName(originalName);
    if (!safe) {
      rejected.push({ originalName, reason: "Only .js and .txt files are supported" });
      continue;
    }
    if (file.size > FILE_LIMITS.maxBytes) {
      rejected.push({ originalName, reason: `File is larger than ${FILE_LIMITS.maxBytes / 1024} KB` });
      continue;
    }
    const result = validateFileContent(new Uint8Array(await file.arrayBuffer()));
    if (!result.ok) {
      rejected.push({ originalName, reason: result.reason });
      continue;
    }
    const name = uniqueFileName(safe, taken);
    taken.add(name);
    accepted.push({ name, originalName, kind: fileKindOf(name)!, content: result.content });
  }
  return { accepted, rejected };
}
