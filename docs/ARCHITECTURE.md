# MCP Sitemap Studio: architecture

A developer workspace for Salesforce Marketing Cloud Personalization (formerly
Interaction Studio / Evergage) sitemaps: create, upload, validate, test and
version sitemap JavaScript across SPA and MPA websites.

This document covers the architecture, folder layout, database schema,
external dependencies and the phased roadmap. Phase 1 (foundation) is
implemented; later phases are designed here so the schema and boundaries
don't need to be reworked when they land.

## 1. Architecture

```
 Browser ──────────────► Next.js 16 (App Router, Node runtime)
   │                        ├─ proxy.ts           session refresh + optimistic auth redirect
   │                        ├─ Server Components  read data through the DAL
   │                        ├─ Server Actions     validated writes (zod) → services
   │                        └─ Route handlers     file download, auth callbacks
   │                                  │
   │                                  ▼  (user's JWT; every query runs under RLS)
   │                        Supabase: Postgres + Auth
   │
   ├─ (Phase 5) Chrome extension ──► observes the real site; posts sessions/events
   └─ (Phase 4) AI requests ───────► server-side provider adapter, consent-gated
```

Principles:

- **Postgres RLS is the authorisation boundary.** The app talks to Supabase as
  the signed-in user (publishable key + user JWT). There is no service-role key
  in the app. Project roles are `viewer < editor < owner`, resolved by
  `public.has_project_role()`; ownership and authorship columns are stamped by
  triggers from `auth.uid()`, never trusted from the client.
- **Layers:** `app/` (routes, actions) → `lib/services/` (data access, one file
  per aggregate) → Supabase. Input validation lives in `lib/validation/` and is
  pure, so it is unit-tested without a database.
- **Uploaded code is data.** Sitemap files are stored as text (≤ 512 KiB),
  checked for extension, size, UTF-8 and binary content, never executed on the
  server, and downloaded as `text/plain` attachments with `nosniff` and a
  sandbox CSP.
- **Static vs runtime is explicit in the schema.** `validation_findings.source`
  is `static` or `runtime`, and a database constraint forbids a static finding
  from being marked `confirmed`. `test_sessions.mode` is `simulated` or
  `observed`, tied to the client that produced it.
- **AI is opt-in per request.** `ai_analyses.consent_given_at` is `NOT NULL`;
  the provider layer (Phase 4) sits behind an interface so the vendor can change.
- **Phase 1 renders dynamically.** All pages are per-user, so Cache Components
  is disabled for now (revisit in Phase 6).

## 2. Folder structure

```
supabase/
  migrations/            schema, RLS, triggers, rule catalog (source of truth)
  tests/                 RLS test suite + Supabase stub for plain Postgres
scripts/test-db.sh       spins up a throwaway Postgres and runs the RLS tests
src/
  proxy.ts               Next 16 proxy (formerly middleware)
  app/
    (auth)/              login, signup, forgot-password + auth server actions
    auth/                callback / confirm route handlers, update-password
    (app)/               authenticated shell
      dashboard/
      projects/          list, new, [projectId]/{overview,files,notes,settings}
      settings/          account
    api/files/[fileId]/download/
  components/
    ui/                  shadcn/ui-style primitives (Radix + Tailwind)
    shell/               sidebar, user menu, page header, setup screen
    projects/ dashboard/ auth/
  lib/
    supabase/            server, browser and proxy clients
    auth/                DAL (getCurrentUser/requireUser), safe redirects
    services/            projects, files, notes, dashboard
    validation/          zod schemas + upload validation (unit tested)
    domain/constants.ts  platforms, app types, file limits
  types/database.ts      typed schema for supabase-js
```

Planned additions: `src/lib/analysis/` (Phase 3 parser + rules, Acorn and
ESLint, pure and runnable in a worker), `src/lib/ai/` (Phase 4 provider
adapters), `extension/` (Phase 5 Chrome extension, Manifest V3).

## 3. Database schema

All tables live in `public` with RLS enabled. `auth.users` is managed by Supabase.

| Table | Purpose | Key rules |
|---|---|---|
| `profiles` | 1:1 with `auth.users`; display name, AI consent default | Created by trigger on sign-up. Visible to yourself and co-members. |
| `projects` | One website/client implementation: name, client, platform, URL, SPA/MPA/hybrid, description, template source, status | `owner_id` forced to caller; cannot be reassigned by UPDATE. Only owners update/delete. URL must be http(s). |
| `project_members` | `(project_id, user_id, role)` | Owner row added by trigger. Only owners manage members and cannot mint other owners. |
| `project_notes` | Shared notes, pinnable | Editors write; only the author or owner edits/deletes. |
| `sitemap_files` | Sitemap code as text + kind, source, original filename | Name regex blocks path tricks; size ≤ 512 KiB; `size_bytes` and `content_sha256` are generated columns. |
| `project_versions` | Immutable snapshots of all files (`jsonb`) | Sequential `version_number` assigned by trigger under a row lock. No UPDATE policy. |
| `templates`, `template_versions` | Template library and its semver versions | `system` templates readable by all signed-in users; `private` ones by their owner. `is_reference_implementation` defaults true. |
| `validation_rules` | Catalog of MCP rules (`MCP-PT-001` …) with category, severity, `requires_runtime` | Seeded by migration; read-only to users. |
| `validation_runs` | One static or runtime run, with counts | Editors write; viewers read. |
| `validation_findings` | Severity, file, line/column, explanation, suggestion, code example | Must match the run's project; static findings can never be `confirmed`. |
| `test_sessions` | Target URL, app type, `simulated`/`observed`, client | Mode must match client (`observed` ⇔ browser extension). |
| `observed_events` | Event name, timestamp, page URL, properties, optional identity, expected payload, status, error | Must match the session's project. Identity only when the user opted in. |
| `ai_analyses` | Provider, model, prompt, response, proposed patch, status | `consent_given_at` required. Proposals are stored, never auto-applied. |

`public.dashboard_stats()` is a `security invoker` function, so dashboard
totals are computed under the caller's RLS. "Open issues" counts findings
from each project's latest completed run.

`npm run test:db` applies the migrations to a scratch Postgres with a small
Supabase stub and runs `supabase/tests/rls.test.sql`: stranger isolation
(including writes with a known project id), viewer read-only, editor limits,
owner-only settings/deletion, ownership protection, actor stamping, the
static-finding constraint, version numbering and cascade delete.

## 4. External dependencies and integrations

| Dependency | Needed for | Status |
|---|---|---|
| Supabase project (URL + publishable key) | Auth and database | **Required to run.** Not provisioned by this repo. Without it the app shows a setup screen. |
| Supabase Auth email (SMTP / templates) | Confirmation and password reset emails | Works with Supabase's default mailer (rate limited); configure SMTP for production. Add `<site>/auth/callback` to the Auth redirect allow-list. |
| AI provider key (e.g. Anthropic) | Phase 4 assistant | Not integrated yet. Server-side env var only. |
| Chrome extension | Phase 5 real-site testing and event capture | Not built yet. Real observations require it; server-side simulation will be labelled as simulated. |
| Salesforce MCP account / dataset | Comparing against the real Personalization backend | Not integrated. The app does not call Salesforce APIs; event inspection will be based on what the browser observes. |

## 5. Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1. Foundation | App setup, auth (sign-up, sign-in, reset, sign-out), schema + RLS for all modules, dashboard, project CRUD, archive/delete, file upload/view/download/delete, notes | **Done** |
| 2. Sitemap development | Template library (10 platform categories, preview/clone/download), Monaco editor (multi-file, diff, search/replace, format), builder (page types, catalog, identity, events, selectors, navigation → generated JS with raw-JS escape hatch), save versions, export | Next |
| 3. Validation engine | Acorn/Babel parse, ESLint, MCP rules from `validation_rules`, findings with line numbers and fixes, history | |
| 4. AI assistant | Provider interface, consent flow, explanations, review prompts, proposed patches with diff review, compare implementations | |
| 5. Browser testing | MV3 extension, SPA route/history/mutation monitoring, MPA navigation, console/network/selector capture, event inspector with expected vs observed | |
| 6. Production readiness | Security review (CSP with nonces, rate limits), E2E tests against a Supabase test project, performance, deployment | |
