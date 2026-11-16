-- =============================================================================
-- MCP Sitemap Studio: initial schema
--
-- Every table that holds customer data is scoped to a project, and every
-- project-scoped table is protected by Row Level Security that resolves the
-- caller's role through public.project_members. Nothing here trusts the
-- client: ownership columns are stamped by triggers from auth.uid().
--
-- Roles (lowest to highest): viewer < editor < owner
--   viewer  read everything in the project
--   editor  create/update/delete project content (files, notes, versions, runs)
--   owner   everything, plus project settings, membership and deletion
-- =============================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.platform as enum (
  'salesforce_commerce_cloud',
  'shopify',
  'magento',
  'react',
  'angular',
  'vue',
  'nextjs',
  'custom_ecommerce',
  'server_rendered',
  'custom_spa',
  'other'
);

create type public.app_type as enum ('spa', 'mpa', 'hybrid');
create type public.project_status as enum ('active', 'archived');
create type public.project_role as enum ('viewer', 'editor', 'owner');
create type public.sitemap_file_kind as enum ('js', 'txt');
create type public.sitemap_file_source as enum ('upload', 'template', 'builder', 'editor', 'ai_proposal');
create type public.template_visibility as enum ('system', 'private');
create type public.finding_severity as enum ('error', 'warning', 'info');
create type public.finding_source as enum ('static', 'runtime');
create type public.validation_status as enum ('queued', 'running', 'completed', 'failed');
create type public.validation_category as enum (
  'syntax',
  'missing_configuration',
  'page_types',
  'events',
  'catalog',
  'product_category',
  'identity',
  'dom_selectors',
  'navigation',
  'spa_lifecycle',
  'duplicate_events',
  'error_handling',
  'performance'
);
create type public.test_mode as enum ('simulated', 'observed');
create type public.test_client as enum ('browser_extension', 'server_simulation');
create type public.test_status as enum ('pending', 'running', 'completed', 'failed', 'cancelled');
create type public.event_status as enum ('ok', 'warning', 'error');
create type public.ai_proposal_status as enum ('none', 'proposed', 'applied', 'rejected');

-- -----------------------------------------------------------------------------
-- Shared helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Numeric rank for role comparisons.
create or replace function public.project_role_rank(r public.project_role)
returns int
language sql
immutable
set search_path = ''
as $$
  select case r when 'viewer' then 1 when 'editor' then 2 when 'owner' then 3 end;
$$;

-- -----------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text check (char_length(display_name) <= 80),
  -- Default for "may Claude/AI see my code". Each AI request must still record
  -- explicit consent in ai_analyses.consent_given_at (Phase 4).
  ai_consent_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Templates (library content arrives in Phase 2; table exists now because
-- projects reference their template source)
-- -----------------------------------------------------------------------------
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  platform public.platform not null,
  app_type public.app_type not null,
  description text not null default '',
  supported_features text[] not null default '{}',
  configuration_requirements text not null default '',
  implementation_instructions text not null default '',
  example_events jsonb not null default '[]'::jsonb,
  -- Templates are reference implementations, never guaranteed production-ready.
  is_reference_implementation boolean not null default true,
  visibility public.template_visibility not null default 'private',
  owner_id uuid references public.profiles (id) on delete cascade,
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint templates_owner_matches_visibility check (
    (visibility = 'system' and owner_id is null)
    or (visibility = 'private' and owner_id is not null)
  )
);

create index templates_platform_idx on public.templates (platform);
create index templates_owner_idx on public.templates (owner_id);

create trigger templates_set_updated_at
before update on public.templates
for each row execute function public.set_updated_at();

create table public.template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates (id) on delete cascade,
  version text not null check (version ~ '^\d+\.\d+\.\d+$'),
  code text not null check (octet_length(code) <= 524288),
  changelog text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

create index template_versions_template_idx on public.template_versions (template_id);

alter table public.templates
  add constraint templates_current_version_fk
  foreign key (current_version_id) references public.template_versions (id) on delete set null;

-- -----------------------------------------------------------------------------
-- Projects and membership
-- -----------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  client_name text check (char_length(client_name) <= 120),
  platform public.platform not null,
  website_url text check (
    website_url is null
    or (website_url ~* '^https?://[^\s/$.?#].[^\s]*$' and char_length(website_url) <= 2048)
  ),
  app_type public.app_type not null,
  description text not null default '' check (char_length(description) <= 4000),
  template_source_id uuid references public.templates (id) on delete set null,
  status public.project_status not null default 'active',
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner_idx on public.projects (owner_id);
create index projects_last_activity_idx on public.projects (last_activity_at desc);
create index projects_template_source_idx on public.projects (template_source_id);

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.project_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index project_members_user_idx on public.project_members (user_id);

-- Security definer so policies can consult membership without recursing
-- into project_members' own RLS.
create or replace function public.has_project_role(
  p_project_id uuid,
  p_min_role public.project_role default 'viewer'
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members m
    where m.project_id = p_project_id
      and m.user_id = (select auth.uid())
      and public.project_role_rank(m.role) >= public.project_role_rank(p_min_role)
  );
$$;

revoke all on function public.has_project_role(uuid, public.project_role) from public;
grant execute on function public.has_project_role(uuid, public.project_role) to authenticated;

-- Owner is always the caller on insert, and can never be reassigned through
-- a plain UPDATE (ownership transfer will be an explicit RPC later).
create or replace function public.projects_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is null then
      raise exception 'not authenticated' using errcode = '42501';
    end if;
    new.owner_id := auth.uid();
  elsif new.owner_id is distinct from old.owner_id then
    raise exception 'project ownership cannot be changed here' using errcode = '42501';
  end if;
  new.name := btrim(new.name);
  return new;
end;
$$;

create trigger projects_before_write
before insert or update on public.projects
for each row execute function public.projects_before_write();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create or replace function public.projects_add_owner_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger projects_add_owner_member
after insert on public.projects
for each row execute function public.projects_add_owner_member();

-- Bumps projects.last_activity_at whenever project content changes.
create or replace function public.touch_project_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid := coalesce(new.project_id, old.project_id);
begin
  update public.projects set last_activity_at = now() where id = pid;
  return coalesce(new, old);
end;
$$;

-- Stamps created_by/author columns from the session, ignoring client input.
create or replace function public.stamp_actor()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Project notes
-- -----------------------------------------------------------------------------
create table public.project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 20000),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_notes_project_idx on public.project_notes (project_id, created_at desc);

create trigger project_notes_stamp before insert on public.project_notes
for each row execute function public.stamp_actor();
create trigger project_notes_set_updated_at before update on public.project_notes
for each row execute function public.set_updated_at();
create trigger project_notes_touch after insert or update or delete on public.project_notes
for each row execute function public.touch_project_activity();

-- -----------------------------------------------------------------------------
-- Sitemap files
--
-- Sitemap code is stored as text (max 512 KiB) rather than in object storage:
-- it is small, edited constantly, snapshotted into versions and analysed
-- line-by-line, and keeping it in Postgres puts it under the same RLS as
-- everything else. Uploaded code is data only; it is never executed server-side.
-- -----------------------------------------------------------------------------
create table public.sitemap_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (name ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$'),
  kind public.sitemap_file_kind not null,
  source public.sitemap_file_source not null default 'upload',
  content text not null check (octet_length(content) <= 524288),
  size_bytes integer generated always as (octet_length(content)) stored,
  content_sha256 text generated always as (encode(extensions.digest(content, 'sha256'), 'hex')) stored,
  original_filename text check (char_length(original_filename) <= 255),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name)
);

create index sitemap_files_project_idx on public.sitemap_files (project_id, updated_at desc);
create index sitemap_files_created_idx on public.sitemap_files (created_at desc);

create trigger sitemap_files_stamp before insert on public.sitemap_files
for each row execute function public.stamp_actor();
create trigger sitemap_files_set_updated_at before update on public.sitemap_files
for each row execute function public.set_updated_at();
create trigger sitemap_files_touch after insert or update or delete on public.sitemap_files
for each row execute function public.touch_project_activity();

-- -----------------------------------------------------------------------------
-- Project versions (immutable snapshots of all files)
-- -----------------------------------------------------------------------------
create table public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  version_number integer not null,
  label text check (char_length(label) <= 120),
  message text not null default '' check (char_length(message) <= 2000),
  -- [{ "file_id", "name", "kind", "content", "content_sha256" }]
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'array'),
  restored_from_version_id uuid references public.project_versions (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, version_number)
);

create index project_versions_project_idx on public.project_versions (project_id, version_number desc);

create or replace function public.project_versions_assign_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Serialise numbering per project.
  perform 1 from public.projects where id = new.project_id for update;
  select coalesce(max(version_number), 0) + 1 into new.version_number
  from public.project_versions where project_id = new.project_id;
  return new;
end;
$$;

create trigger project_versions_assign_number before insert on public.project_versions
for each row execute function public.project_versions_assign_number();
create trigger project_versions_stamp before insert on public.project_versions
for each row execute function public.stamp_actor();
create trigger project_versions_touch after insert on public.project_versions
for each row execute function public.touch_project_activity();

-- -----------------------------------------------------------------------------
-- Validation (engine arrives in Phase 3)
-- -----------------------------------------------------------------------------
create table public.validation_rules (
  id text primary key check (id ~ '^MCP-[A-Z]+-[0-9]{3}$'),
  category public.validation_category not null,
  default_severity public.finding_severity not null,
  title text not null,
  description text not null,
  -- Rules that can only be confirmed by observing a live site.
  requires_runtime boolean not null default false,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger validation_rules_set_updated_at before update on public.validation_rules
for each row execute function public.set_updated_at();

create table public.validation_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  project_version_id uuid references public.project_versions (id) on delete set null,
  source public.finding_source not null default 'static',
  status public.validation_status not null default 'queued',
  engine_version text not null default '0.0.0',
  error_count integer not null default 0,
  warning_count integer not null default 0,
  info_count integer not null default 0,
  failure_reason text,
  created_by uuid references public.profiles (id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index validation_runs_project_idx on public.validation_runs (project_id, created_at desc);
create index validation_runs_created_idx on public.validation_runs (created_at desc);

create trigger validation_runs_stamp before insert on public.validation_runs
for each row execute function public.stamp_actor();
create trigger validation_runs_touch after insert on public.validation_runs
for each row execute function public.touch_project_activity();

create table public.validation_findings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.validation_runs (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  rule_id text references public.validation_rules (id) on delete set null,
  sitemap_file_id uuid references public.sitemap_files (id) on delete set null,
  file_name text,
  line integer check (line > 0),
  column_number integer check (column_number > 0),
  end_line integer check (end_line > 0),
  severity public.finding_severity not null,
  source public.finding_source not null,
  -- A finding is only "confirmed" when it was actually observed at runtime.
  confirmed boolean not null default false,
  message text not null,
  explanation text not null default '',
  suggestion text not null default '',
  code_example text not null default '',
  created_at timestamptz not null default now(),
  constraint validation_findings_static_never_confirmed check (not confirmed or source = 'runtime')
);

create index validation_findings_run_idx on public.validation_findings (run_id);
create index validation_findings_project_idx on public.validation_findings (project_id, severity);

-- Findings must belong to the same project as their run.
create or replace function public.validation_findings_check_project()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.validation_runs r where r.id = new.run_id and r.project_id = new.project_id
  ) then
    raise exception 'finding project does not match run project' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger validation_findings_check_project before insert or update on public.validation_findings
for each row execute function public.validation_findings_check_project();

-- -----------------------------------------------------------------------------
-- Browser testing (Phase 5)
-- -----------------------------------------------------------------------------
create table public.test_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  target_url text not null check (target_url ~* '^https?://' and char_length(target_url) <= 2048),
  app_type public.app_type not null,
  -- 'simulated' results are never presented as real browser observations.
  mode public.test_mode not null,
  client public.test_client not null,
  status public.test_status not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  constraint test_sessions_mode_matches_client check (
    (mode = 'observed' and client = 'browser_extension')
    or (mode = 'simulated' and client = 'server_simulation')
  )
);

create index test_sessions_project_idx on public.test_sessions (project_id, created_at desc);

create trigger test_sessions_stamp before insert on public.test_sessions
for each row execute function public.stamp_actor();

create table public.observed_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.test_sessions (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  event_name text not null check (char_length(event_name) <= 200),
  occurred_at timestamptz not null,
  page_url text check (char_length(page_url) <= 2048),
  properties jsonb not null default '{}'::jsonb,
  -- Only populated when the user opted in to capturing identity attributes.
  identity jsonb,
  expected_payload jsonb,
  status public.event_status not null default 'ok',
  error_details text,
  created_at timestamptz not null default now()
);

create index observed_events_session_idx on public.observed_events (session_id, occurred_at);
create index observed_events_project_idx on public.observed_events (project_id);

create or replace function public.observed_events_check_project()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.test_sessions s where s.id = new.session_id and s.project_id = new.project_id
  ) then
    raise exception 'event project does not match session project' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger observed_events_check_project before insert or update on public.observed_events
for each row execute function public.observed_events_check_project();

-- -----------------------------------------------------------------------------
-- AI analysis history (Phase 4)
-- -----------------------------------------------------------------------------
create table public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  sitemap_file_id uuid references public.sitemap_files (id) on delete set null,
  provider text not null check (char_length(provider) <= 60),
  model text not null check (char_length(model) <= 120),
  prompt_kind text not null check (char_length(prompt_kind) <= 60),
  prompt text not null,
  response text,
  proposed_patch text,
  proposal_status public.ai_proposal_status not null default 'none',
  input_tokens integer,
  output_tokens integer,
  -- Code is never sent to an AI provider without explicit consent per request.
  consent_given_at timestamptz not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index ai_analyses_project_idx on public.ai_analyses (project_id, created_at desc);

create trigger ai_analyses_stamp before insert on public.ai_analyses
for each row execute function public.stamp_actor();

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.templates enable row level security;
alter table public.template_versions enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_notes enable row level security;
alter table public.sitemap_files enable row level security;
alter table public.project_versions enable row level security;
alter table public.validation_rules enable row level security;
alter table public.validation_runs enable row level security;
alter table public.validation_findings enable row level security;
alter table public.test_sessions enable row level security;
alter table public.observed_events enable row level security;
alter table public.ai_analyses enable row level security;

-- Profiles: you see yourself and people you share a project with.
create policy profiles_select on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.project_members mine
    join public.project_members theirs on theirs.project_id = mine.project_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = profiles.id
  )
);
create policy profiles_update on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Templates: system templates are readable by any signed-in user; private
-- templates only by their owner. Only owners write private templates.
create policy templates_select on public.templates for select to authenticated
using (visibility = 'system' or owner_id = (select auth.uid()));
create policy templates_insert on public.templates for insert to authenticated
with check (visibility = 'private' and owner_id = (select auth.uid()));
create policy templates_update on public.templates for update to authenticated
using (visibility = 'private' and owner_id = (select auth.uid()))
with check (visibility = 'private' and owner_id = (select auth.uid()));
create policy templates_delete on public.templates for delete to authenticated
using (visibility = 'private' and owner_id = (select auth.uid()));

create policy template_versions_select on public.template_versions for select to authenticated
using (exists (
  select 1 from public.templates t where t.id = template_id
  and (t.visibility = 'system' or t.owner_id = (select auth.uid()))
));
create policy template_versions_insert on public.template_versions for insert to authenticated
with check (exists (
  select 1 from public.templates t where t.id = template_id
  and t.visibility = 'private' and t.owner_id = (select auth.uid())
));

-- Projects
-- owner_id check lets INSERT ... RETURNING see the row before the owner
-- membership (added by an AFTER trigger) is visible.
create policy projects_select on public.projects for select to authenticated
using (owner_id = (select auth.uid()) or public.has_project_role(id, 'viewer'));
create policy projects_insert on public.projects for insert to authenticated
with check (owner_id = (select auth.uid()));
create policy projects_update on public.projects for update to authenticated
using (public.has_project_role(id, 'owner'))
with check (public.has_project_role(id, 'owner'));
create policy projects_delete on public.projects for delete to authenticated
using (public.has_project_role(id, 'owner'));

-- Membership: members can see the member list; only owners change it.
create policy project_members_select on public.project_members for select to authenticated
using (public.has_project_role(project_id, 'viewer'));
create policy project_members_insert on public.project_members for insert to authenticated
with check (public.has_project_role(project_id, 'owner') and role <> 'owner');
create policy project_members_update on public.project_members for update to authenticated
using (public.has_project_role(project_id, 'owner') and role <> 'owner')
with check (public.has_project_role(project_id, 'owner') and role <> 'owner');
create policy project_members_delete on public.project_members for delete to authenticated
using (public.has_project_role(project_id, 'owner') and role <> 'owner');

-- Project content: viewers read, editors write.
create policy project_notes_select on public.project_notes for select to authenticated
using (public.has_project_role(project_id, 'viewer'));
create policy project_notes_insert on public.project_notes for insert to authenticated
with check (public.has_project_role(project_id, 'editor'));
create policy project_notes_update on public.project_notes for update to authenticated
using (public.has_project_role(project_id, 'editor') and (created_by = (select auth.uid()) or public.has_project_role(project_id, 'owner')))
with check (public.has_project_role(project_id, 'editor'));
create policy project_notes_delete on public.project_notes for delete to authenticated
using (public.has_project_role(project_id, 'editor') and (created_by = (select auth.uid()) or public.has_project_role(project_id, 'owner')));

create policy sitemap_files_select on public.sitemap_files for select to authenticated
using (public.has_project_role(project_id, 'viewer'));
create policy sitemap_files_insert on public.sitemap_files for insert to authenticated
with check (public.has_project_role(project_id, 'editor'));
create policy sitemap_files_update on public.sitemap_files for update to authenticated
using (public.has_project_role(project_id, 'editor'))
with check (public.has_project_role(project_id, 'editor'));
create policy sitemap_files_delete on public.sitemap_files for delete to authenticated
using (public.has_project_role(project_id, 'editor'));

-- Versions are immutable: no update policy.
create policy project_versions_select on public.project_versions for select to authenticated
using (public.has_project_role(project_id, 'viewer'));
create policy project_versions_insert on public.project_versions for insert to authenticated
with check (public.has_project_role(project_id, 'editor'));
create policy project_versions_delete on public.project_versions for delete to authenticated
using (public.has_project_role(project_id, 'owner'));

create policy validation_rules_select on public.validation_rules for select to authenticated
using (true);

create policy validation_runs_select on public.validation_runs for select to authenticated
using (public.has_project_role(project_id, 'viewer'));
create policy validation_runs_insert on public.validation_runs for insert to authenticated
with check (public.has_project_role(project_id, 'editor'));
create policy validation_runs_update on public.validation_runs for update to authenticated
using (public.has_project_role(project_id, 'editor'))
with check (public.has_project_role(project_id, 'editor'));
create policy validation_runs_delete on public.validation_runs for delete to authenticated
using (public.has_project_role(project_id, 'editor'));

create policy validation_findings_select on public.validation_findings for select to authenticated
using (public.has_project_role(project_id, 'viewer'));
create policy validation_findings_insert on public.validation_findings for insert to authenticated
with check (public.has_project_role(project_id, 'editor'));

create policy test_sessions_select on public.test_sessions for select to authenticated
using (public.has_project_role(project_id, 'viewer'));
create policy test_sessions_insert on public.test_sessions for insert to authenticated
with check (public.has_project_role(project_id, 'editor'));
create policy test_sessions_update on public.test_sessions for update to authenticated
using (public.has_project_role(project_id, 'editor'))
with check (public.has_project_role(project_id, 'editor'));
create policy test_sessions_delete on public.test_sessions for delete to authenticated
using (public.has_project_role(project_id, 'editor'));

create policy observed_events_select on public.observed_events for select to authenticated
using (public.has_project_role(project_id, 'viewer'));
create policy observed_events_insert on public.observed_events for insert to authenticated
with check (public.has_project_role(project_id, 'editor'));

create policy ai_analyses_select on public.ai_analyses for select to authenticated
using (public.has_project_role(project_id, 'viewer'));
create policy ai_analyses_insert on public.ai_analyses for insert to authenticated
with check (public.has_project_role(project_id, 'editor'));
create policy ai_analyses_update on public.ai_analyses for update to authenticated
using (public.has_project_role(project_id, 'editor'))
with check (public.has_project_role(project_id, 'editor'));

-- -----------------------------------------------------------------------------
-- Dashboard aggregate (respects RLS: security invoker)
-- -----------------------------------------------------------------------------
create or replace function public.dashboard_stats()
returns table (
  project_count bigint,
  active_project_count bigint,
  sitemap_file_count bigint,
  validation_run_count bigint,
  open_error_count bigint,
  open_warning_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with latest_runs as (
    select distinct on (r.project_id) r.id
    from public.validation_runs r
    where r.status = 'completed'
    order by r.project_id, r.completed_at desc nulls last, r.created_at desc
  )
  select
    (select count(*) from public.projects),
    (select count(*) from public.projects where status = 'active'),
    (select count(*) from public.sitemap_files),
    (select count(*) from public.validation_runs),
    (select count(*) from public.validation_findings f where f.run_id in (select id from latest_runs) and f.severity = 'error'),
    (select count(*) from public.validation_findings f where f.run_id in (select id from latest_runs) and f.severity = 'warning');
$$;

grant execute on function public.dashboard_stats() to authenticated;
