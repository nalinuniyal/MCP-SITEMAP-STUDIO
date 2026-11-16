import { z } from "zod";
import { APP_TYPE_VALUES, PLATFORM_VALUES } from "@/lib/domain/constants";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

export const websiteUrlSchema = z
  .string()
  .trim()
  .max(2048, "URL is too long")
  .transform((v) => (v.length === 0 ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null)
  .refine(
    (v) => {
      if (v === null) return true;
      try {
        const u = new URL(v);
        return (u.protocol === "https:" || u.protocol === "http:") && Boolean(u.hostname) && !u.username && !u.password;
      } catch {
        return false;
      }
    },
    { message: "Enter a full http(s) URL, for example https://www.example.com" },
  )
  .transform((v) => (v === null ? null : new URL(v).toString()));

export const projectInputSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(120, "Must be 120 characters or fewer"),
  clientName: optionalText(120),
  platform: z.enum(PLATFORM_VALUES, { message: "Choose a platform" }),
  appType: z.enum(APP_TYPE_VALUES, { message: "Choose an application type" }),
  websiteUrl: websiteUrlSchema,
  description: z.string().trim().max(4000, "Must be 4000 characters or fewer").default(""),
});

export type ProjectInput = z.infer<typeof projectInputSchema>;

export function parseProjectForm(formData: FormData) {
  return projectInputSchema.safeParse({
    name: formData.get("name") ?? "",
    clientName: formData.get("clientName") ?? "",
    platform: formData.get("platform") ?? "",
    appType: formData.get("appType") ?? "",
    websiteUrl: formData.get("websiteUrl") ?? "",
    description: formData.get("description") ?? "",
  });
}

export const noteInputSchema = z.object({
  body: z.string().trim().min(1, "Note can't be empty").max(20000, "Notes are limited to 20,000 characters"),
});

export const uuidSchema = z.string().uuid();
