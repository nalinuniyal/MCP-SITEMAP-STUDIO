"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { FileUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { FILE_LIMITS } from "@/lib/domain/constants";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { uploadFilesAction, type UploadState } from "@/app/(app)/projects/actions";

const ACCEPT = ".js,.txt,text/javascript,application/javascript,text/plain";

/**
 * Client-side checks are for fast feedback only; the server action repeats
 * every check (extension, size, UTF-8, count) before anything is stored.
 */
function precheck(file: File): string | null {
  const ext = file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase();
  if (!(FILE_LIMITS.allowedExtensions as readonly string[]).includes(ext)) return "Only .js and .txt files";
  if (file.size === 0) return "File is empty";
  if (file.size > FILE_LIMITS.maxBytes) return `Larger than ${FILE_LIMITS.maxBytes / 1024} KB`;
  return null;
}

export function FileUpload({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [state, action] = useActionState<UploadState, FormData>(async (prev, formData) => {
    const result = await uploadFilesAction(prev, formData);
    if (result.status === "success") setFiles([]);
    return result;
  }, { status: "idle" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      formRef.current?.reset();
    }
  }, [state]);

  // Keep the hidden input in sync with the selected list (drop + remove support).
  useEffect(() => {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    inputRef.current.files = dt.files;
  }, [files]);

  function add(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => {
      const next = [...prev];
      for (const f of Array.from(list)) {
        if (!next.some((x) => x.name === f.name && x.size === f.size)) next.push(f);
      }
      return next.slice(0, FILE_LIMITS.maxFilesPerUpload);
    });
  }

  const problems = files.map(precheck);
  const valid = files.length > 0 && problems.every((p) => p === null);

  return (
    <form ref={formRef} action={action} className="space-y-3" id="upload">
      <input type="hidden" name="projectId" value={projectId} />
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
          dragging ? "border-primary bg-primary/5" : "hover:bg-muted/40",
        )}
      >
        <FileUp className="size-5 text-muted-foreground" />
        <span className="text-sm font-medium">Drop sitemap files here, or click to browse</span>
        <span className="text-xs text-muted-foreground">
          .js or .txt · up to {FILE_LIMITS.maxBytes / 1024} KB each · {FILE_LIMITS.maxFilesPerUpload} files per upload
        </span>
        <input
          ref={inputRef}
          type="file"
          name="files"
          multiple
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => add(e.target.files)}
        />
      </label>

      {files.length > 0 && (
        <ul className="divide-y rounded-md border text-sm">
          {files.map((f, i) => (
            <li key={`${f.name}-${f.size}`} className="flex items-center gap-3 px-3 py-2">
              <span className="flex-1 truncate font-mono text-xs">{f.name}</span>
              {problems[i] ? (
                <span className="text-xs text-destructive">{problems[i]}</span>
              ) : (
                <span className="text-xs text-muted-foreground tabular-nums">{formatBytes(f.size)}</span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${f.name}`}
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {state.status === "error" && <FormMessage>{state.message}</FormMessage>}
      {state.rejected && state.rejected.length > 0 && (
        <FormMessage>
          <p className="font-medium">Not uploaded:</p>
          <ul className="mt-1 space-y-0.5 text-xs">
            {state.rejected.map((r) => (
              <li key={r.originalName}>
                <span className="font-mono">{r.originalName}</span>: {r.reason}
              </li>
            ))}
          </ul>
        </FormMessage>
      )}

      <div className="flex justify-end">
        <SubmitButton disabled={!valid} pendingLabel="Uploading…">
          Upload {files.length > 0 ? `${files.length} file${files.length === 1 ? "" : "s"}` : "files"}
        </SubmitButton>
      </div>
    </form>
  );
}
