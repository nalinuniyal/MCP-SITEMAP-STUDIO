import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StickyNote } from "lucide-react";
import { getProject } from "@/lib/services/projects";
import { listNotes } from "@/lib/services/notes";
import { requireUser } from "@/lib/auth/dal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shell/page-header";
import { NoteComposer, NoteItem, type NoteView } from "@/components/projects/notes";

export const metadata: Metadata = { title: "Notes" };

export default async function ProjectNotesPage({ params }: PageProps<"/projects/[projectId]/notes">) {
  const { projectId } = await params;
  const [user, found] = await Promise.all([requireUser(), getProject(projectId)]);
  if (!found) notFound();
  const notes = await listNotes(projectId);
  const canEdit = found.role !== "viewer";

  const views: NoteView[] = notes.map((n) => {
    const author = n.author as { display_name: string | null; email: string | null } | null;
    return {
      id: n.id,
      body: n.body,
      pinned: n.pinned,
      created_at: n.created_at,
      updated_at: n.updated_at,
      authorName: n.created_by === user.id ? "You" : (author?.display_name ?? author?.email ?? "Former member"),
      isMine: n.created_by === user.id,
    };
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>New note</CardTitle>
          </CardHeader>
          <CardContent>
            <NoteComposer projectId={projectId} />
          </CardContent>
        </Card>
      )}
      <Card>
        {views.length === 0 ? (
          <EmptyState icon={StickyNote} title="No notes yet">
            Notes are shared with everyone on the project. Pin the important ones to the overview.
          </EmptyState>
        ) : (
          <ul className="divide-y">
            {views.map((n) => (
              <NoteItem key={n.id} note={n} projectId={projectId} canEdit={canEdit} isOwner={found.role === "owner"} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
