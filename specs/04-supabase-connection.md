# SPEC 04 — Supabase connection

> **Status:** Implemented
> **Depends on:** SPEC 01
> **Date:** 2026-11-24
> **Objective:** Add the Supabase connection to the project with a browser client, a server client, and their environment variables.

---

## Scope

**In:**

- Install `@supabase/supabase-js` and `@supabase/ssr`.
- Browser client in `lib/supabase/client.ts`.
- Server client in `lib/supabase/server.ts`, cookie-aware through `@supabase/ssr` and the async `cookies()` of Next 16.
- Environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: placeholders in `.env.example`, real values in the untracked `.env.local`.

**Out of scope (for future specs):**

- Tables, RLS policies, migrations, seed data, generated database types.
- Authentication and the session-refresh proxy.
- Service-role key or admin client.
- Any use of the clients in pages or components, and any UI change.

---

## Data model

This feature introduces no new data structures.

```ts
// Environment variables
// NEXT_PUBLIC_SUPABASE_URL              -> https://<project-ref>.supabase.co
// NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  -> publishable key, safe for the browser

// lib/supabase/client.ts
export function createClient(); // createBrowserClient(url, key)

// lib/supabase/server.ts
export async function createClient(); // createServerClient(url, key, { cookies })
```

Conventions:

- The server client is created per call, never as a module-level singleton, because it depends on the request's cookies.
- The `setAll` cookie handler in the server client is wrapped in `try/catch` (Server Components cannot write cookies), as `@supabase/ssr` documents.

---

## Implementation plan

Before step 1, read the relevant guides in `node_modules/next/dist/docs/` (per `AGENTS.md`), especially `cookies()` and environment variables, and the current `@supabase/ssr` Next.js setup guide.

1. **Dependencies and env.** Install `@supabase/supabase-js` and `@supabase/ssr`. Add both variables as placeholders to `.env.example` and the real values to `.env.local`. Manual check: `npm run build` passes; `.env.local` is not tracked by git.
2. **Browser client.** Create `lib/supabase/client.ts`. Manual check: `npx tsc --noEmit` passes.
3. **Server client.** Create `lib/supabase/server.ts`. Manual check: `npx tsc --noEmit`, `npm run lint` and `npm run build` pass.

---

## Acceptance criteria

- [ ] `npm run lint` and `npm run build` finish without errors.
- [ ] `package.json` lists `@supabase/supabase-js` and `@supabase/ssr`.
- [ ] `lib/supabase/client.ts` and `lib/supabase/server.ts` each export a `createClient` function.
- [ ] `.env.example` is tracked and contains both variable names with placeholder values only.
- [ ] `.env.local` is not tracked and no real URL or key appears in any tracked file.
- [ ] No existing page, component or route was modified.

---

## Decisions

- **Yes:** `@supabase/supabase-js` + `@supabase/ssr` with separate browser and server clients. Cookie-based sessions are what the App Router needs, so the auth spec needs no rework.
- **No:** Only `@supabase/supabase-js`. Sessions would be invisible to Server Components.
- **Yes:** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Current naming; the key is public by design.
- **No:** Legacy `ANON_KEY` naming, and the service-role key (no feature needs it yet).
- **No:** Health check, database types, or session proxy. Each belongs to a later spec if needed.

---

## What is **not** in this spec

- Tables, RLS, migrations, database types.
- Authentication and the session proxy.
- Service-role / admin client.
- Usage of the clients in the app, or any UI change.

Each one of those, if it lands, goes in its own spec.
