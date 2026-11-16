import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileCode2, ShieldCheck, Trash2 } from "lucide-react";
import { getProject } from "@/lib/services/projects";
import { listProjectFiles } from "@/lib/services/files";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shell/page-header";
import { FileUpload } from "@/components/projects/file-upload";
import { ConfirmAction } from "@/components/projects/confirm-action";
import { deleteFileAction } from "../../actions";
import { formatBytes, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Files" };

export default async function ProjectFilesPage({ params }: PageProps<"/projects/[projectId]/files">) {
  const { projectId } = await params;
  const found = await getProject(projectId);
  if (!found) notFound();
  const canEdit = found.role !== "viewer";
  const files = await listProjectFiles(projectId);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="overflow-hidden lg:col-span-2">
        <CardHeader>
          <div>
            <CardTitle>Sitemap files</CardTitle>
            <CardDescription>{files.length} file{files.length === 1 ? "" : "s"} in this project</CardDescription>
          </div>
        </CardHeader>
        {files.length === 0 ? (
          <EmptyState icon={FileCode2} title="No files yet">
            {canEdit ? "Upload the sitemap the site uses today to start tracking it." : "Nothing has been uploaded to this project."}
          </EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Source</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="hidden text-right md:table-cell">Updated</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="max-w-64">
                    <Link
                      href={`/projects/${projectId}/files/${f.id}`}
                      className="block truncate font-mono text-xs font-medium hover:text-primary"
                    >
                      {f.name}
                    </Link>
                    {f.original_filename && f.original_filename !== f.name && (
                      <span className="block truncate text-xs text-muted-foreground">from {f.original_filename}</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline">{f.source}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{formatBytes(f.size_bytes)}</TableCell>
                  <TableCell className="hidden text-right text-xs text-muted-foreground md:table-cell">
                    {timeAgo(f.updated_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-0.5">
                      <Button variant="ghost" size="icon-sm" asChild>
                        <a href={`/api/files/${f.id}/download`} aria-label={`Download ${f.name}`}>
                          <Download />
                        </a>
                      </Button>
                      {canEdit && (
                        <ConfirmAction
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label={`Delete ${f.name}`}>
                              <Trash2 />
                            </Button>
                          }
                          title={`Delete ${f.name}?`}
                          description="The file is removed from this project. Saved versions keep their own copy."
                          confirmLabel="Delete file"
                          action={deleteFileAction}
                          fields={{ projectId, fileId: f.id }}
                          successMessage={`Deleted ${f.name}`}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <div className="space-y-4">
        {canEdit && (
          <Card>
            <CardHeader>
              <CardTitle>Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload projectId={projectId} />
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="flex gap-3 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-success" />
            <p>
              Files are stored as plain text in your project, visible only to project members. Uploaded code is never
              executed on the server and is never sent to an AI service without your explicit consent.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
