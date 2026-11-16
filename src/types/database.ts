/**
 * Database types for the Supabase client.
 *
 * Hand-written to match supabase/migrations. Once a Supabase project is linked
 * you can regenerate this file with:
 *   npx supabase gen types typescript --linked > src/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Platform =
  | "salesforce_commerce_cloud"
  | "shopify"
  | "magento"
  | "react"
  | "angular"
  | "vue"
  | "nextjs"
  | "custom_ecommerce"
  | "server_rendered"
  | "custom_spa"
  | "other";
type AppType = "spa" | "mpa" | "hybrid";
type ProjectStatus = "active" | "archived";
type ProjectRole = "viewer" | "editor" | "owner";
type SitemapFileKind = "js" | "txt";
type SitemapFileSource = "upload" | "template" | "builder" | "editor" | "ai_proposal";
type TemplateVisibility = "system" | "private";
type FindingSeverity = "error" | "warning" | "info";
type FindingSource = "static" | "runtime";
type ValidationStatus = "queued" | "running" | "completed" | "failed";
type ValidationCategory =
  | "syntax"
  | "missing_configuration"
  | "page_types"
  | "events"
  | "catalog"
  | "product_category"
  | "identity"
  | "dom_selectors"
  | "navigation"
  | "spa_lifecycle"
  | "duplicate_events"
  | "error_handling"
  | "performance";
type TestMode = "simulated" | "observed";
type TestClient = "browser_extension" | "server_simulation";
type TestStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
type EventStatus = "ok" | "warning" | "error";
type AiProposalStatus = "none" | "proposed" | "applied" | "rejected";

type Rel<Name extends string, Col extends string, Ref extends string> = {
  foreignKeyName: Name;
  columns: [Col];
  isOneToOne: false;
  referencedRelation: Ref;
  referencedColumns: ["id"];
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          ai_consent_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          ai_consent_default?: boolean;
        };
        Update: {
          display_name?: string | null;
          ai_consent_default?: boolean;
        };
        Relationships: [];
      };
      templates: {
        Row: {
          id: string;
          slug: string;
          name: string;
          platform: Platform;
          app_type: AppType;
          description: string;
          supported_features: string[];
          configuration_requirements: string;
          implementation_instructions: string;
          example_events: Json;
          is_reference_implementation: boolean;
          visibility: TemplateVisibility;
          owner_id: string | null;
          current_version_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          slug: string;
          name: string;
          platform: Platform;
          app_type: AppType;
          description?: string;
          supported_features?: string[];
          configuration_requirements?: string;
          implementation_instructions?: string;
          example_events?: Json;
          is_reference_implementation?: boolean;
          visibility?: TemplateVisibility;
          owner_id?: string | null;
          current_version_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["templates"]["Insert"]>;
        Relationships: [];
      };
      template_versions: {
        Row: {
          id: string;
          template_id: string;
          version: string;
          code: string;
          changelog: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: { template_id: string; version: string; code: string; changelog?: string };
        Update: { changelog?: string };
        Relationships: [Rel<"template_versions_template_id_fkey", "template_id", "templates">];
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          client_name: string | null;
          platform: Platform;
          website_url: string | null;
          app_type: AppType;
          description: string;
          template_source_id: string | null;
          status: ProjectStatus;
          last_activity_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          platform: Platform;
          app_type: AppType;
          owner_id?: string;
          client_name?: string | null;
          website_url?: string | null;
          description?: string;
          template_source_id?: string | null;
          status?: ProjectStatus;
        };
        Update: {
          name?: string;
          platform?: Platform;
          app_type?: AppType;
          client_name?: string | null;
          website_url?: string | null;
          description?: string;
          template_source_id?: string | null;
          status?: ProjectStatus;
        };
        Relationships: [Rel<"projects_template_source_id_fkey", "template_source_id", "templates">];
      };
      project_members: {
        Row: { project_id: string; user_id: string; role: ProjectRole; created_at: string };
        Insert: { project_id: string; user_id: string; role?: ProjectRole };
        Update: { role?: ProjectRole };
        Relationships: [
          Rel<"project_members_project_id_fkey", "project_id", "projects">,
          Rel<"project_members_user_id_fkey", "user_id", "profiles">,
        ];
      };
      project_notes: {
        Row: {
          id: string;
          project_id: string;
          created_by: string | null;
          body: string;
          pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: { project_id: string; body: string; pinned?: boolean };
        Update: { body?: string; pinned?: boolean };
        Relationships: [
          Rel<"project_notes_project_id_fkey", "project_id", "projects">,
          Rel<"project_notes_created_by_fkey", "created_by", "profiles">,
        ];
      };
      sitemap_files: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          kind: SitemapFileKind;
          source: SitemapFileSource;
          content: string;
          size_bytes: number;
          content_sha256: string;
          original_filename: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          project_id: string;
          name: string;
          kind: SitemapFileKind;
          content: string;
          source?: SitemapFileSource;
          original_filename?: string | null;
        };
        Update: { name?: string; content?: string; kind?: SitemapFileKind };
        Relationships: [Rel<"sitemap_files_project_id_fkey", "project_id", "projects">];
      };
      project_versions: {
        Row: {
          id: string;
          project_id: string;
          version_number: number;
          label: string | null;
          message: string;
          snapshot: Json;
          restored_from_version_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          project_id: string;
          snapshot: Json;
          label?: string | null;
          message?: string;
          restored_from_version_id?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [Rel<"project_versions_project_id_fkey", "project_id", "projects">];
      };
      validation_rules: {
        Row: {
          id: string;
          category: ValidationCategory;
          default_severity: FindingSeverity;
          title: string;
          description: string;
          requires_runtime: boolean;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      validation_runs: {
        Row: {
          id: string;
          project_id: string;
          project_version_id: string | null;
          source: FindingSource;
          status: ValidationStatus;
          engine_version: string;
          error_count: number;
          warning_count: number;
          info_count: number;
          failure_reason: string | null;
          created_by: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          project_id: string;
          project_version_id?: string | null;
          source?: FindingSource;
          status?: ValidationStatus;
          engine_version?: string;
        };
        Update: {
          status?: ValidationStatus;
          error_count?: number;
          warning_count?: number;
          info_count?: number;
          failure_reason?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Relationships: [Rel<"validation_runs_project_id_fkey", "project_id", "projects">];
      };
      validation_findings: {
        Row: {
          id: string;
          run_id: string;
          project_id: string;
          rule_id: string | null;
          sitemap_file_id: string | null;
          file_name: string | null;
          line: number | null;
          column_number: number | null;
          end_line: number | null;
          severity: FindingSeverity;
          source: FindingSource;
          confirmed: boolean;
          message: string;
          explanation: string;
          suggestion: string;
          code_example: string;
          created_at: string;
        };
        Insert: {
          run_id: string;
          project_id: string;
          severity: FindingSeverity;
          source: FindingSource;
          message: string;
          rule_id?: string | null;
          sitemap_file_id?: string | null;
          file_name?: string | null;
          line?: number | null;
          column_number?: number | null;
          end_line?: number | null;
          confirmed?: boolean;
          explanation?: string;
          suggestion?: string;
          code_example?: string;
        };
        Update: Record<string, never>;
        Relationships: [Rel<"validation_findings_run_id_fkey", "run_id", "validation_runs">];
      };
      test_sessions: {
        Row: {
          id: string;
          project_id: string;
          target_url: string;
          app_type: AppType;
          mode: TestMode;
          client: TestClient;
          status: TestStatus;
          metadata: Json;
          created_by: string | null;
          started_at: string | null;
          ended_at: string | null;
          created_at: string;
        };
        Insert: {
          project_id: string;
          target_url: string;
          app_type: AppType;
          mode: TestMode;
          client: TestClient;
          status?: TestStatus;
          metadata?: Json;
        };
        Update: { status?: TestStatus; metadata?: Json; started_at?: string | null; ended_at?: string | null };
        Relationships: [Rel<"test_sessions_project_id_fkey", "project_id", "projects">];
      };
      observed_events: {
        Row: {
          id: string;
          session_id: string;
          project_id: string;
          event_name: string;
          occurred_at: string;
          page_url: string | null;
          properties: Json;
          identity: Json | null;
          expected_payload: Json | null;
          status: EventStatus;
          error_details: string | null;
          created_at: string;
        };
        Insert: {
          session_id: string;
          project_id: string;
          event_name: string;
          occurred_at: string;
          page_url?: string | null;
          properties?: Json;
          identity?: Json | null;
          expected_payload?: Json | null;
          status?: EventStatus;
          error_details?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [Rel<"observed_events_session_id_fkey", "session_id", "test_sessions">];
      };
      ai_analyses: {
        Row: {
          id: string;
          project_id: string;
          sitemap_file_id: string | null;
          provider: string;
          model: string;
          prompt_kind: string;
          prompt: string;
          response: string | null;
          proposed_patch: string | null;
          proposal_status: AiProposalStatus;
          input_tokens: number | null;
          output_tokens: number | null;
          consent_given_at: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          project_id: string;
          provider: string;
          model: string;
          prompt_kind: string;
          prompt: string;
          consent_given_at: string;
          sitemap_file_id?: string | null;
          response?: string | null;
          proposed_patch?: string | null;
          proposal_status?: AiProposalStatus;
          input_tokens?: number | null;
          output_tokens?: number | null;
        };
        Update: { proposal_status?: AiProposalStatus; response?: string | null };
        Relationships: [Rel<"ai_analyses_project_id_fkey", "project_id", "projects">];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      dashboard_stats: {
        Args: Record<string, never>;
        Returns: {
          project_count: number;
          active_project_count: number;
          sitemap_file_count: number;
          validation_run_count: number;
          open_error_count: number;
          open_warning_count: number;
        }[];
      };
      has_project_role: {
        Args: { p_project_id: string; p_min_role?: ProjectRole };
        Returns: boolean;
      };
    };
    Enums: {
      platform: Platform;
      app_type: AppType;
      project_status: ProjectStatus;
      project_role: ProjectRole;
      sitemap_file_kind: SitemapFileKind;
      sitemap_file_source: SitemapFileSource;
      template_visibility: TemplateVisibility;
      finding_severity: FindingSeverity;
      finding_source: FindingSource;
      validation_status: ValidationStatus;
      validation_category: ValidationCategory;
      test_mode: TestMode;
      test_client: TestClient;
      test_status: TestStatus;
      event_status: EventStatus;
      ai_proposal_status: AiProposalStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
