import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getProject, getProjectCounts } from "@/lib/services/projects";
import { uuidSchema } from "@/lib/validation/project";
import { Badge } from "@/components/ui/badge";
import { AppTypeBadge } from "@/components/projects/project-badges";
import { ProjectTabs } from "@/components/projects/project-tabs";
import { platformLabel } from "@/lib/domain/constants";
import { hostOf } from "@/lib/format";

export default async function ProjectLayout({ children, params }: LayoutProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  if (!uuidSchema.safeParse(projectId).success) notFound();
  const [found, counts] = await Promise.all([getProject(projectId), getProjectCounts(projectId)]);
  if (!found) notFound();
  const { project, role } = found;

  return (
    <div>
      <div className="border-b bg-card/40">
        <div className="mx-auto w-full max-w-6xl space-y-4 px-4 pt-6 sm:px-6 lg:pt-8">
          <div className="space-y-1">
            <Link href="/projects" className="text-xs text-muted-foreground hover:text-foreground">
              Projects
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight">{project.name}</h1>
              <AppTypeBadge appType={project.app_type} />
              {project.status === "archived" && <Badge variant="outline">Archived</Badge>}
              {role !== "owner" && <Badge variant="secondary">{role}</Badge>}
            </div>
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              {project.client_name && <span>{project.client_name}</span>}
              {project.client_name && <span aria-hidden>·</span>}
              <span>{platformLabel(project.platform)}</span>
              {project.website_url && (
                <>
                  <span aria-hidden>·</span>
                  <a
                    href={project.website_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1 font-mono text-xs hover:text-foreground"
                  >
                    {hostOf(project.website_url)} <ExternalLink className="size-3" />
                  </a>
                </>
              )}
            </p>
          </div>
          <ProjectTabs projectId={project.id} counts={counts} />
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">{children}</div>
    </div>
  );
}
