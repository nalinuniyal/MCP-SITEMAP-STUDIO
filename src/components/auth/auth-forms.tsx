"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { FieldError, FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/action-state";
import { requestPasswordReset, signIn, signUp, updatePassword } from "@/app/(auth)/actions";

function Field({
  name,
  label,
  type = "text",
  autoComplete,
  errors,
  hint,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  errors?: string[];
  hint?: React.ReactNode;
  defaultValue?: string;
}) {
  const errorId = `${name}-error`;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={name}>{label}</Label>
        {hint}
      </div>
      <Input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? errorId : undefined}
      />
      <FieldError id={errorId} messages={errors} />
    </div>
  );
}

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action] = useActionState(signIn, idleState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <FormMessage tone="success">{notice}</FormMessage>
      <FormMessage>{state.message}</FormMessage>
      <Field name="email" label="Email" type="email" autoComplete="email" errors={state.fieldErrors?.email} />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        errors={state.fieldErrors?.password}
        hint={
          <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
            Forgot password?
          </Link>
        }
      />
      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signUp, idleState);
  if (state.status === "success") return <FormMessage tone="success">{state.message}</FormMessage>;
  return (
    <form action={action} className="space-y-4">
      <FormMessage>{state.message}</FormMessage>
      <Field name="displayName" label="Name" autoComplete="name" errors={state.fieldErrors?.displayName} />
      <Field name="email" label="Work email" type="email" autoComplete="email" errors={state.fieldErrors?.email} />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        errors={state.fieldErrors?.password}
      />
      <p className="text-xs text-muted-foreground">At least 10 characters.</p>
      <SubmitButton className="w-full" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, idleState);
  if (state.status === "success") return <FormMessage tone="success">{state.message}</FormMessage>;
  return (
    <form action={action} className="space-y-4">
      <FormMessage>{state.message}</FormMessage>
      <Field name="email" label="Email" type="email" autoComplete="email" errors={state.fieldErrors?.email} />
      <SubmitButton className="w-full" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action] = useActionState(updatePassword, idleState);
  return (
    <form action={action} className="space-y-4">
      <FormMessage>{state.message}</FormMessage>
      <Field
        name="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        errors={state.fieldErrors?.password}
      />
      <Field
        name="confirm"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        errors={state.fieldErrors?.confirm}
      />
      <SubmitButton className="w-full" pendingLabel="Saving…">
        Update password
      </SubmitButton>
    </form>
  );
}
