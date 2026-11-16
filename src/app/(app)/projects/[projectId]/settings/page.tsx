import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";
import { getProject } from "@/lib/services/projects";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { ProjectForm } from "@/components/projects/project-form";
import { DeleteProjectForm } from "@/components/projects/delete-project";
import { setProjectStatusAction, updateProjectAction } from "../../actions";

export const metadata: Metadata = { title: "Project settings" };

export default async function ProjectSettingsPage({ params }: PageProps<"/projects/[projectId]/settings">) {
  const { projectId } = await params;
  const found = await getProject(projectId);
  if (!found) notFound();
  const { project, role } = found;
  const isOwner = role === "owner";
  const archived = project.status === "archived";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>General</CardTitle>
            <CardDescription>
              {isOwner ? "Name, platform and website for this implementation." : "Only the project owner can change these settings."}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <ProjectForm
            key={project.updated_at}
            action={updateProjectAction}
            projectId={project.id}
            submitLabel="Save changes"
            readOnly={!isOwner}
            defaults={{
              name: project.name,
              clientName: project.client_name,
              platform: project.platform,
              appType: project.app_type,
              websiteUrl: project.website_url,
              description: project.description,
            }}
          />
        </CardContent>
      </Card>

      {isOwner && (
        <>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{archived ? "Restore project" : "Archive project"}</CardTitle>
                <CardDescription>
                  {archived
                    ? "Bring the project back into the active list and dashboard."
                    : "Hide the project from the active list and dashboard. Nothing is deleted."}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form action={setProjectStatusAction}>
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="status" value={archived ? "active" : "archived"} />
                <SubmitButton variant="outline" pendingLabel={archived ? "Restoring…" : "Archiving…"}>
                  {archived ? <ArchiveRestore /> : <Archive />}
                  {archived ? "Restore project" : "Archive project"}
                </SubmitButton>
              </form>
            </CardContent>
          </Card>

          <Card className="border-destructive/40">
            <CardHeader>
              <div>
                <CardTitle className="text-destructive">Delete project</CardTitle>
                <CardDescription>
                  Permanently deletes the project with all of its files, notes, versions, validation results, test
                  sessions and AI history. This can&apos;t be undone.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <DeleteProjectForm projectId={project.id} projectName={project.name} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
