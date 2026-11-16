import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { getFile } from "@/lib/services/files";
import { uuidSchema } from "@/lib/validation/project";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBytes, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "File" };

export default async function FileViewerPage({ params }: PageProps<"/projects/[projectId]/files/[fileId]">) {
  const { projectId, fileId } = await params;
  if (!uuidSchema.safeParse(fileId).success) notFound();
  const file = await getFile(fileId);
  if (!file || file.project_id !== projectId) notFound();
  const lines = file.content.split(/\r?\n/);
  const gutter = String(lines.length).length;

  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={`/projects/${projectId}/files`}>
          <ArrowLeft /> Files
        </Link>
      </Button>
      <Card className="overflow-hidden">
        <CardHeader className="items-center">
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {lines.length.toLocaleString()} lines · {formatBytes(file.size_bytes)} · updated {timeAgo(file.updated_at)} ·{" "}
              <span className="font-mono" title={`SHA-256 ${file.content_sha256}`}>
                sha256:{file.content_sha256.slice(0, 12)}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">read-only</Badge>
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/files/${file.id}/download`}>
                <Download /> Download
              </a>
            </Button>
          </div>
        </CardHeader>
        <div className="max-h-[70vh] overflow-auto bg-muted/30">
          <pre className="text-xs leading-5">
            <code>
              {lines.map((line, i) => (
                <div key={i} className="flex hover:bg-muted/60">
                  <span
                    className="sticky left-0 shrink-0 border-r bg-muted/80 pr-3 pl-3 text-right text-muted-foreground select-none"
                    style={{ width: `${gutter + 3}ch` }}
                  >
                    {i + 1}
                  </span>
                  <span className="pr-4 pl-4 whitespace-pre">{line || " "}</span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      </Card>
      <p className="text-xs text-muted-foreground">
        Editing with the Monaco code editor, side-by-side comparison and version saves arrive in Phase 2.
      </p>
    </div>
  );
}
