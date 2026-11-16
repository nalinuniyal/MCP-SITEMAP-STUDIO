import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProjectNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
      <h1 className="text-lg font-semibold">Project not found</h1>
      <p className="text-sm text-muted-foreground">It may have been deleted, or you don&apos;t have access to it.</p>
      <Button variant="outline" asChild>
        <Link href="/projects">Back to projects</Link>
      </Button>
    </div>
  );
}
