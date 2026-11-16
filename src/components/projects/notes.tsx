"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { FieldError, FormMessage } from "@/components/ui/form-message";
import { ConfirmAction } from "./confirm-action";
import { idleState, type ActionState } from "@/lib/action-state";
import { timeAgo } from "@/lib/format";
import {
  createNoteAction,
  deleteNoteAction,
  toggleNotePinAction,
  updateNoteAction,
} from "@/app/(app)/projects/actions";

export type NoteView = {
  id: string;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  authorName: string;
  isMine: boolean;
};

export function NoteComposer({ projectId }: { projectId: string }) {
  const [state, action] = useActionState(createNoteAction, idleState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="projectId" value={projectId} />
      <Textarea
        name="body"
        rows={3}
        required
        maxLength={20000}
        placeholder="Environments, client decisions, data layer quirks, open questions…"
        aria-label="New note"
        aria-invalid={state.fieldErrors?.body ? true : undefined}
      />
      <FieldError id="body-error" messages={state.fieldErrors?.body} />
      {state.status === "error" && state.message && <FormMessage>{state.message}</FormMessage>}
      <div className="flex justify-end">
        <SubmitButton size="sm" pendingLabel="Adding…">
          Add note
        </SubmitButton>
      </div>
    </form>
  );
}

export function NoteItem({ note, projectId, canEdit, isOwner }: { note: NoteView; projectId: string; canEdit: boolean; isOwner: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await updateNoteAction(prev, formData);
    if (result.status === "success") setEditing(false);
    return result;
  }, idleState);
  const [pending, start] = useTransition();
  const canModify = canEdit && (note.isMine || isOwner);

  return (
    <li className="group space-y-2 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {note.pinned && <Pin className="size-3 text-primary" aria-label="Pinned" />}
        <span className="font-medium text-foreground">{note.authorName}</span>
        <span>·</span>
        <time dateTime={note.created_at} title={new Date(note.created_at).toLocaleString()}>
          {timeAgo(note.created_at)}
        </time>
        {note.updated_at !== note.created_at && <span>(edited)</span>}
        {canModify && !editing && (
          <div className="ml-auto flex gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={pending}
              aria-label={note.pinned ? "Unpin note" : "Pin note"}
              onClick={() =>
                start(async () => {
                  const fd = new FormData();
                  fd.set("projectId", projectId);
                  fd.set("noteId", note.id);
                  fd.set("pinned", String(!note.pinned));
                  try {
                    await toggleNotePinAction(fd);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Could not update note");
                  }
                })
              }
            >
              {note.pinned ? <PinOff /> : <Pin />}
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Edit note" onClick={() => setEditing(true)}>
              <Pencil />
            </Button>
            <ConfirmAction
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label="Delete note">
                  <Trash2 />
                </Button>
              }
              title="Delete this note?"
              description="This can't be undone."
              confirmLabel="Delete note"
              action={deleteNoteAction}
              fields={{ projectId, noteId: note.id }}
            />
          </div>
        )}
      </div>
      {editing ? (
        <form action={action} className="space-y-2">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="noteId" value={note.id} />
          <Textarea name="body" defaultValue={note.body} rows={4} required maxLength={20000} autoFocus aria-label="Edit note" />
          <FieldError id={`note-${note.id}-error`} messages={state.fieldErrors?.body} />
          {state.status === "error" && state.message && <FormMessage>{state.message}</FormMessage>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <SubmitButton size="sm" pendingLabel="Saving…">
              Save
            </SubmitButton>
          </div>
        </form>
      ) : (
        <p className="text-sm whitespace-pre-wrap">{note.body}</p>
      )}
    </li>
  );
}
