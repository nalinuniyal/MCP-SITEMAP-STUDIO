"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { FieldError, FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/action-state";
import { updateProfileAction } from "@/app/(app)/settings/actions";

export function ProfileForm({ displayName, email }: { displayName: string | null; email: string }) {
  const [state, action] = useActionState(updateProfileAction, idleState);
  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
  }, [state]);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled readOnly />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="displayName">Name</Label>
        <Input id="displayName" name="displayName" defaultValue={displayName ?? ""} maxLength={80} required />
        <FieldError id="displayName-error" messages={state.fieldErrors?.displayName} />
      </div>
      {state.status === "error" && state.message && <FormMessage>{state.message}</FormMessage>}
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
      </div>
    </form>
  );
}
