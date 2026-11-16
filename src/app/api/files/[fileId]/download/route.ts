import { NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/dal";
import { getFile } from "@/lib/services/files";
import { uuidSchema } from "@/lib/validation/project";

/**
 * Downloads a sitemap file. The row is read through RLS, so only project
 * members get it. Always served as an attachment with a text/plain type so
 * the browser never executes or renders it.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/files/[fileId]/download">) {
  if (!getSupabaseEnv()) return new NextResponse("Not configured", { status: 503 });
  const { fileId } = await ctx.params;
  if (!uuidSchema.safeParse(fileId).success) return new NextResponse("Not found", { status: 404 });
  if (!(await getCurrentUser())) return new NextResponse("Unauthorized", { status: 401 });

  const file = await getFile(fileId);
  if (!file) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(file.content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file.name}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
