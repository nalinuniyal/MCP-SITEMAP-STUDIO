import type { Enums } from "@/types/database";

export type Platform = Enums<"platform">;
export type AppType = Enums<"app_type">;
export type ProjectStatus = Enums<"project_status">;

export const PLATFORMS: { value: Platform; label: string; defaultAppType: AppType }[] = [
  { value: "salesforce_commerce_cloud", label: "Salesforce Commerce Cloud", defaultAppType: "mpa" },
  { value: "shopify", label: "Shopify", defaultAppType: "mpa" },
  { value: "magento", label: "Magento / Adobe Commerce", defaultAppType: "mpa" },
  { value: "react", label: "React application", defaultAppType: "spa" },
  { value: "angular", label: "Angular application", defaultAppType: "spa" },
  { value: "vue", label: "Vue application", defaultAppType: "spa" },
  { value: "nextjs", label: "Next.js application", defaultAppType: "hybrid" },
  { value: "custom_ecommerce", label: "Custom ecommerce", defaultAppType: "mpa" },
  { value: "server_rendered", label: "Traditional server-rendered", defaultAppType: "mpa" },
  { value: "custom_spa", label: "Custom SPA", defaultAppType: "spa" },
  { value: "other", label: "Other", defaultAppType: "mpa" },
];

export const APP_TYPES: { value: AppType; label: string; short: string; hint: string }[] = [
  { value: "spa", label: "Single-page application", short: "SPA", hint: "Client-side routing; the sitemap must re-evaluate on route changes." },
  { value: "mpa", label: "Multi-page application", short: "MPA", hint: "Full page loads; the sitemap initialises on every navigation." },
  { value: "hybrid", label: "Hybrid", short: "Hybrid", hint: "Server-rendered entry with client-side navigation (e.g. Next.js, Nuxt)." },
];

export const platformLabel = (p: Platform) => PLATFORMS.find((x) => x.value === p)?.label ?? p;
export const appTypeShort = (a: AppType) => APP_TYPES.find((x) => x.value === a)?.short ?? a;

export const PLATFORM_VALUES = PLATFORMS.map((p) => p.value) as [Platform, ...Platform[]];
export const APP_TYPE_VALUES = APP_TYPES.map((a) => a.value) as [AppType, ...AppType[]];

/** Upload limits, mirrored by database CHECK constraints. */
export const FILE_LIMITS = {
  maxBytes: 512 * 1024,
  maxFilesPerUpload: 10,
  maxFilesPerProject: 50,
  allowedExtensions: ["js", "txt"] as const,
};
