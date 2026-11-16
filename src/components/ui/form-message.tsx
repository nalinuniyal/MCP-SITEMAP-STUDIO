import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function FormMessage({ tone = "error", children, className }: { tone?: "error" | "success"; children?: React.ReactNode; className?: string }) {
  if (!children) return null;
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
        tone === "error" ? "border-destructive/30 bg-destructive/8 text-destructive" : "border-success/30 bg-success/8 text-success",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p id={id} className="text-xs text-destructive">
      {messages[0]}
    </p>
  );
}
