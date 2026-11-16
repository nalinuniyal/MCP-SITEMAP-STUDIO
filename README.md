# MCP Sitemap Studio

A developer workspace for **Salesforce Marketing Cloud Personalization** (formerly
Interaction Studio / Evergage) sitemaps: organise implementations by client and
website, keep sitemap code under access control, and (in later phases)
validate, test and debug it across SPA and MPA sites.

> Independent developer tool. Not affiliated with or endorsed by Salesforce.

**Status:** Phase 1 (foundation) is complete. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
for the architecture, database schema, external dependencies and roadmap.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui
(Radix) · Lucide · Supabase (Postgres + Auth, Row Level Security) · zod · Vitest

## Getting started

1. **Create a Supabase project** at <https://supabase.com> (free tier is fine).
2. **Apply the schema**:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   (Or paste the files in `supabase/migrations/` into the SQL editor, in order.)
3. **Configure Auth**: in Authentication → URL Configuration, set the Site URL
   and add `http://localhost:3000/auth/callback` (and your production URL) to
   the redirect allow-list.
4. **Environment**: `cp .env.example .env.local` and fill in the URL and
   publishable (or anon) key.
5. **Run**:
   ```bash
   npm install
   npm run dev
   ```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types and run `tsc` |
| `npm test` | Unit tests (validation, upload safety, redirects) |
| `npm run test:db` | Applies migrations to a throwaway local PostgreSQL and runs the RLS test suite (needs PostgreSQL 15+ binaries; set `PG_BIN` if `initdb` isn't on PATH; won't run as root) |

## Security model (short)

- Authorisation is enforced by Postgres RLS with per-project roles
  (viewer / editor / owner). The app never uses a service-role key.
- Uploaded files: `.js`/`.txt` only, ≤ 512 KB, ≤ 10 per upload, valid UTF-8,
  names sanitised. Stored as text, never executed, downloaded as `text/plain`
  attachments.
- Open-redirect-safe auth redirects, security headers on every response.
- Customer code is never sent to an AI provider without explicit per-request
  consent (enforced in the schema for Phase 4).
