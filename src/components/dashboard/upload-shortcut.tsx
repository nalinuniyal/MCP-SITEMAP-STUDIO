"use client";

import Link from "next/link";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** "Upload code" quick action: pick the project the files belong to. */
export function UploadShortcut({ projects }: { projects: { id: string; name: string }[] }) {
  if (projects.length === 0) {
    return (
      <Button variant="outline" asChild>
        <Link href="/projects/new?then=upload">
          <Upload /> Upload code
        </Link>
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Upload /> Upload code
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Upload into project</DropdownMenuLabel>
        {projects.map((p) => (
          <DropdownMenuItem key={p.id} asChild>
            <Link href={`/projects/${p.id}/files#upload`} className="truncate">
              {p.name}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/projects/new?then=upload">New project…</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
