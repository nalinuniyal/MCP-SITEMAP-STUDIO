"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { noteInputSchema, parseProjectForm, uuidSchema } from "@/lib/validation/project";
import { validateUploads } from "@/lib/validation/files";
import { createProject, deleteProject, getProject, setProjectStatus, updateProject } from "@/lib/services/projects";
import { deleteFile, insertFiles, listProjectFiles } from "@/lib/services/files";
import { createNote, deleteNote, updateNote } from "@/lib/services/notes";
import type { ActionState } from "@/lib/action-state";

/*
 * Every action re-checks the session and validates input. Authorisation is
 * enforced by Postgres RLS: a caller without the right project role gets
 * zero affected rows or a 42501 error, which the services turn into messages.
 */

function projectIdFrom(formData: FormData): string {
  const parsed = uuidSchema.safeParse(formData.get("projectId"));
  if (!parsed.success) throw new Error("Invalid project id");
  return parsed.data;
}

function errorState(e: unknown): ActionState {
  return { status: "error", message: e instanceof Error ? e.message : "Something went wrong" };
}

export async function createProjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = parseProjectForm(formData);
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  let id: string;
  try {
    ({ id } = await createProject(parsed.data));
  } catch (e) {
    return errorState(e);
  }
  revalidatePath("/dashboard");
  redirect(formData.get("then") === "upload" ? `/projects/${id}/files#upload` : `/projects/${id}`);
}

export async function updateProjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const projectId = projectIdFrom(formData);
  const parsed = parseProjectForm(formData);
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await updateProject(projectId, parsed.data);
  } catch (e) {
    return errorState(e);
  }
  revalidatePath(`/projects/${projectId}`, "layout");
  return { status: "success", message: "Project settings saved." };
}

export async function setProjectStatusAction(formData: FormData) {
  await requireUser();
  const projectId = projectIdFrom(formData);
  const status = formData.get("status") === "archived" ? "archived" : "active";
  await setProjectStatus(projectId, status);
  revalidatePath(`/projects/${projectId}`, "layout");
  revalidatePath("/projects");
}

export async function deleteProjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const projectId = projectIdFrom(formData);
  const found = await getProject(projectId);
  if (!found) return { status: "error", message: "Project not found." };
  if (found.role !== "owner") return { status: "error", message: "Only the project owner can delete it." };
  if (String(formData.get("confirmName") ?? "").trim() !== found.project.name) {
    return { status: "error", fieldErrors: { confirmName: ["Type the project name exactly to confirm"] } };
  }
  try {
    await deleteProject(projectId);
  } catch (e) {
    return errorState(e);
  }
  revalidatePath("/dashboard");
  redirect("/projects");
}

export type UploadState = ActionState & { uploaded?: string[]; rejected?: { originalName: string; reason: string }[] };

export async function uploadFilesAction(_prev: UploadState, formData: FormData): Promise<UploadState> {
  await requireUser();
  const projectId = projectIdFrom(formData);
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size >= 0 && f.name !== "");
  if (files.length === 0) return { status: "error", message: "Choose at least one .js or .txt file." };

  try {
    const existing = await listProjectFiles(projectId);
    const { accepted, rejected } = await validateUploads(
      files,
      existing.map((f) => f.name),
    );
    if (accepted.length === 0) {
      return { status: "error", message: "No files were uploaded.", rejected };
    }
    const inserted = await insertFiles(projectId, accepted);
    revalidatePath(`/projects/${projectId}`, "layout");
    revalidatePath("/dashboard");
    const renamed = accepted.filter((a) => a.originalName !== a.name).length;
    return {
      status: "success",
      message:
        `Uploaded ${inserted.length} file${inserted.length === 1 ? "" : "s"}.` +
        (renamed ? ` ${renamed} renamed to a safe or unique name.` : ""),
      uploaded: inserted.map((f) => f.name),
      rejected,
    };
  } catch (e) {
    return errorState(e);
  }
}

export async function deleteFileAction(formData: FormData) {
  await requireUser();
  const projectId = projectIdFrom(formData);
  const fileId = uuidSchema.parse(formData.get("fileId"));
  await deleteFile(projectId, fileId);
  revalidatePath(`/projects/${projectId}`, "layout");
  revalidatePath("/dashboard");
}

export async function createNoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const projectId = projectIdFrom(formData);
  const parsed = noteInputSchema.safeParse({ body: formData.get("body") ?? "" });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await createNote(projectId, parsed.data.body);
  } catch (e) {
    return errorState(e);
  }
  revalidatePath(`/projects/${projectId}`, "layout");
  return { status: "success" };
}

export async function updateNoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const projectId = projectIdFrom(formData);
  const noteId = uuidSchema.parse(formData.get("noteId"));
  const parsed = noteInputSchema.safeParse({ body: formData.get("body") ?? "" });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await updateNote(projectId, noteId, { body: parsed.data.body });
  } catch (e) {
    return errorState(e);
  }
  revalidatePath(`/projects/${projectId}/notes`);
  return { status: "success" };
}

export async function toggleNotePinAction(formData: FormData) {
  await requireUser();
  const projectId = projectIdFrom(formData);
  const noteId = uuidSchema.parse(formData.get("noteId"));
  await updateNote(projectId, noteId, { pinned: formData.get("pinned") === "true" });
  revalidatePath(`/projects/${projectId}`, "layout");
}

export async function deleteNoteAction(formData: FormData) {
  await requireUser();
  const projectId = projectIdFrom(formData);
  const noteId = uuidSchema.parse(formData.get("noteId"));
  await deleteNote(projectId, noteId);
  revalidatePath(`/projects/${projectId}`, "layout");
}
