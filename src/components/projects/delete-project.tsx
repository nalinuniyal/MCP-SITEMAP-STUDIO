"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { FieldError, FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/action-state";
import { deleteProjectAction } from "@/app/(app)/projects/actions";

export function DeleteProjectForm({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [state, action] = useActionState(deleteProjectAction, idleState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="space-y-1.5">
        <Label htmlFor="confirmName" className="font-normal">
          Type <span className="font-mono font-medium">{projectName}</span> to confirm
        </Label>
        <Input id="confirmName" name="confirmName" autoComplete="off" required aria-invalid={state.fieldErrors?.confirmName ? true : undefined} />
        <FieldError id="confirmName-error" messages={state.fieldErrors?.confirmName} />
      </div>
      {state.status === "error" && state.message && <FormMessage>{state.message}</FormMessage>}
      <SubmitButton variant="destructive" pendingLabel="Deleting…">
        Delete project permanently
      </SubmitButton>
    </form>
  );
}
