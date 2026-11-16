"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { FieldError, FormMessage } from "@/components/ui/form-message";
import { APP_TYPES, PLATFORMS, type AppType, type Platform } from "@/lib/domain/constants";
import { idleState, type ActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";

type Defaults = {
  name?: string;
  clientName?: string | null;
  platform?: Platform;
  appType?: AppType;
  websiteUrl?: string | null;
  description?: string;
};

export function ProjectForm({
  action,
  projectId,
  defaults = {},
  submitLabel,
  then,
  readOnly = false,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  projectId?: string;
  defaults?: Defaults;
  submitLabel: string;
  then?: string;
  readOnly?: boolean;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const [appType, setAppType] = useState<AppType | "">(defaults.appType ?? "");
  const [appTypeTouched, setAppTypeTouched] = useState(Boolean(defaults.appType));
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
      {projectId && <input type="hidden" name="projectId" value={projectId} />}
      {then && <input type="hidden" name="then" value={then} />}
      {state.status === "error" && <FormMessage>{state.message}</FormMessage>}

      <fieldset disabled={readOnly} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Project name</Label>
            <Input id="name" name="name" required maxLength={120} defaultValue={defaults.name} placeholder="Acme US storefront" aria-invalid={fe.name ? true : undefined} />
            <FieldError id="name-error" messages={fe.name} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clientName">
              Client <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="clientName" name="clientName" maxLength={120} defaultValue={defaults.clientName ?? ""} placeholder="Acme Corp" />
            <FieldError id="clientName-error" messages={fe.clientName} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="websiteUrl">
            Website URL <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="websiteUrl"
            name="websiteUrl"
            type="url"
            inputMode="url"
            maxLength={2048}
            defaultValue={defaults.websiteUrl ?? ""}
            placeholder="https://www.example.com"
            aria-invalid={fe.websiteUrl ? true : undefined}
          />
          <FieldError id="websiteUrl-error" messages={fe.websiteUrl} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="platform">Platform</Label>
          <NativeSelect
            id="platform"
            name="platform"
            required
            defaultValue={defaults.platform ?? ""}
            aria-invalid={fe.platform ? true : undefined}
            onChange={(e) => {
              const p = PLATFORMS.find((x) => x.value === e.target.value);
              if (p && !appTypeTouched) setAppType(p.defaultAppType);
            }}
          >
            <option value="" disabled>
              Choose a platform…
            </option>
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </NativeSelect>
          <FieldError id="platform-error" messages={fe.platform} />
        </div>

        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Application type</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {APP_TYPES.map((t) => (
              <label
                key={t.value}
                className={cn(
                  "flex cursor-pointer flex-col gap-1 rounded-md border bg-card p-3 text-sm transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
                  appType === t.value ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  <input
                    type="radio"
                    name="appType"
                    value={t.value}
                    required
                    checked={appType === t.value}
                    onChange={() => {
                      setAppType(t.value);
                      setAppTypeTouched(true);
                    }}
                    className="accent-[var(--primary)]"
                  />
                  {t.label}
                </span>
                <span className="text-xs text-muted-foreground">{t.hint}</span>
              </label>
            ))}
          </div>
          <FieldError id="appType-error" messages={fe.appType} />
        </fieldset>

        <div className="space-y-1.5">
          <Label htmlFor="description">
            Description <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="description"
            name="description"
            rows={3}
            maxLength={4000}
            defaultValue={defaults.description ?? ""}
            placeholder="Scope, environments, known quirks of the site…"
          />
          <FieldError id="description-error" messages={fe.description} />
        </div>
      </fieldset>

      {!readOnly && (
        <div className="flex justify-end">
          <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        </div>
      )}
    </form>
  );
}
