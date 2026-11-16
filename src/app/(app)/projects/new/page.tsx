import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { ProjectForm } from "@/components/projects/project-form";
import { createProjectAction } from "../actions";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage({ searchParams }: PageProps<"/projects/new">) {
  const { then } = await searchParams;
  return (
    <PageContainer className="max-w-3xl">
      <PageHeader
        eyebrow={
          <Link href="/projects" className="hover:text-foreground">
            Projects
          </Link>
        }
        title="New project"
        description="One project per website or client implementation. You can change these details later."
      />
      <Card>
        <CardContent className="p-5">
          <ProjectForm
            action={createProjectAction}
            submitLabel="Create project"
            then={then === "upload" ? "upload" : undefined}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
