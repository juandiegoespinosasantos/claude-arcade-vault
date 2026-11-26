# SPEC 06 — Games table and leaderboard

> **Status:** Approved
> **Depends on:** SPEC 01, SPEC 04, SPEC 05
> **Date:** 2026-11-25
> **Objective:** Move the game catalog and the leaderboards to Supabase, and save real game scores through a validated Server Action.

---

## Why this spec exists

SPEC 01 built every screen on a hardcoded catalog and randomly generated leaderboards. SPEC 04 added the Supabase clients but no tables. SPEC 05 added the first real game, whose scores only reach `localStorage`. This is the first spec that stores shared data. It also takes the first write-access decision while authentication is still fake.

---

## Scope

**In:**

- Supabase tables `games` and `scores`, a `game_stats` view, indexes, grants and RLS, as SQL migrations in `supabase/migrations/`, applied through the Supabase MCP server.
- Seed data: the 9 current catalog games and 15 fake scores per game.
- Generated database types in `lib/supabase/database.types.ts`, used by all Supabase clients.
- A cookie-less read client (`lib/supabase/public.ts`) and a server-only admin client (`lib/supabase/admin.ts`) that uses the new `SUPABASE_SECRET_KEY`.
- The catalog is read from Supabase on the home preview, library, game detail, player and Hall of Fame. The `GAMES` array and `getGame` are removed.
- "MEJOR PUNTUACIÓN", "Mejor global" and "Partidas" are computed from the saved scores.
- Real leaderboards on the game detail page (top 10) and the Hall of Fame (podium and top 12 per game). `seededScores` is removed.
- Real "TU MEJOR MARCA" row, based on the current `av_user` name.
- A Server Action that validates, rate-limits and inserts a score for games with a real engine.
- Saving, saved and error states with retry in the "FIN DEL JUEGO" modal.
- Cached reads with tags, invalidated when a score is saved.
- Spanish error state with a retry button for catalog and leaderboard areas, and an empty state for a leaderboard without scores.

**Out of scope (for future specs):**

- Real authentication, user accounts, and linking scores to users.
- Anti-cheat: signed sessions, replay checks, or server-side score simulation.
- The home page widgets "ÚLTIMAS PUNTUACIONES" and "TOP JUGADORES · HOY", which stay static in `lib/home.ts`.
- Saving scores of simulated games to Supabase.
- Uploading scores already stored in `localStorage["av_scores"]`.
- Admin screens to create, edit or delete games or scores.
- Realtime updates, pagination, date filters (daily or weekly boards).
- Persistent or distributed rate limiting.
- A local Supabase stack (`supabase start`) and automated tests.

---

## Data model

### Database

```sql
-- public.games
id                 text primary key        -- URL slug, e.g. 'asteroids'
title              text not null
short_description  text not null
long_description   text not null
category           text not null           -- check: 'ARCADE' | 'PUZZLE' | 'SHOOTER' | 'VERSUS'
cover              text not null           -- CSS class in globals.css
color              text not null           -- check: 'cyan' | 'magenta' | 'yellow' | 'green'
engine             text                    -- check: null or 'asteroids'
controls           text                    -- null means "TECLADO / TÁCTIL"
sort_order         integer not null unique -- catalog order, asteroids = 1
created_at         timestamptz not null default now()

-- public.scores
id           bigint generated always as identity primary key
game_id      text not null references public.games (id) on delete cascade
player_name  text not null     -- check: trimmed, 1 to 10 characters
score        integer not null  -- check: between 0 and 10000000
is_seed      boolean not null default false
created_at   timestamptz not null default now()

-- indexes
scores (game_id, score desc, created_at asc, id asc)
scores (game_id, player_name, score desc)

-- public.game_stats (view, security_invoker = true)
game_id, best (max score, 0 if none), plays (row count, 0 if none)
```

Access:

- RLS is enabled on both tables.
- `anon` and `authenticated` can only `select` from `games`, `scores` and `game_stats`.
- No insert, update or delete policy or grant exists for them.
- Only the secret key (`service_role`) inserts scores.

Seed:

- `games` rows copy the text, category, cover, color, engine and controls of the current `GAMES` array, with `sort_order` following the array order.
- Each game gets 15 rows in `scores` with `is_seed = true`, names from the current `PLAYERS` list and fixed dates before 2026-11-25.
- Seed scores are literal values (no `random()`), at or below the game's current mock `best`, so each game keeps a plausible scale.
- `asteroids` seed scores are multiples of 10.

### Application

```ts
// .env.local (real) and .env.example (placeholder)
// SUPABASE_SECRET_KEY -> secret key, server only, never NEXT_PUBLIC_*
```

```ts
// lib/games.ts — types and CATS only, safe for client components
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
  engine?: "asteroids";
  controls?: string;
}

export interface GameWithStats extends Game {
  best: number;
  plays: number;
}
```

```ts
// lib/games-data.ts — server only, cached
export function getGames(): Promise<GameWithStats[]>; // ordered by sort_order
export function getGame(id: string): Promise<GameWithStats | null>;

// lib/scores-data.ts — server only, cached
export function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]>;
```

```ts
// lib/scores.ts — shared by client and server
export interface ScoreRow {
  id: number;
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/YYYY", formatted in UTC
}

export const SCORE_LIMITS = { name: 10, maxScore: 10_000_000 } as const;

export interface ScoreInput {
  gameId: string;
  name: string;
  score: number;
}

export type SubmitScoreResult =
  | { ok: true }
  | { ok: false; error: "VALIDATION" | "RATE_LIMIT" | "SAVE_FAILED" };

export function validateScore(raw: unknown): ScoreInput | null;

// app/juego/[id]/jugar/actions.ts ("use server")
export async function submitScore(
  input: ScoreInput,
): Promise<SubmitScoreResult>;
```

Conventions:

- Ranking: one row per saved score, ordered by `score` descending, then `created_at` ascending, then `id` ascending.
- `validateScore` trims and uppercases the name, requires 1 to 10 characters with no control characters, and requires an integer score within the limits.
- `submitScore` also rejects unknown game ids and games without an `engine`, with `VALIDATION`.
- Rate limit: 10 submissions per IP per 10 minutes, with key `score:<ip>`, reusing `lib/rate-limit.ts`.
- Cache tags: `games`, `game-stats` and `scores:<gameId>`, with `cacheLife("minutes")`.
- After an insert, the action calls `updateTag("game-stats")` and `updateTag("scores:<gameId>")`.
- Cached functions use the cookie-less client and throw on a Supabase error, so errors are never cached.
- "Partidas" shows the row count formatted with `toLocaleString("es-ES")`.
- A game without scores shows "—" as its best score.
- `localStorage["av_scores"]` keeps its current shape.

Spanish UI text:

| Case              | Text                                      |
| ----------------- | ----------------------------------------- |
| Saving            | `GUARDANDO…`                              |
| Saved             | `▸ PUNTUACIÓN GUARDADA_` (existing)       |
| Retry button      | `REINTENTAR`                              |
| `VALIDATION`      | `PUNTUACIÓN NO VÁLIDA. REVISA TU NOMBRE.` |
| `RATE_LIMIT`      | `DEMASIADOS ENVÍOS. ESPERA UNOS MINUTOS.` |
| `SAVE_FAILED`     | `NO SE PUDO GUARDAR. INTÉNTALO DE NUEVO.` |
| Read error        | `NO SE PUDIERON CARGAR LOS DATOS.`        |
| Empty leaderboard | `AÚN NO HAY PUNTUACIONES`                 |

---

## Implementation plan

Precondition: the implementation branch starts from a `main` that contains SPEC 04 (`lib/supabase/`) and SPEC 05 (Asteroids).

Before step 1, read the relevant guides in `node_modules/next/dist/docs/` (per `AGENTS.md`): `use cache`, `cacheTag`, `cacheLife`, `updateTag`, `generateStaticParams`, `catchError` and Server Actions. Check the current Supabase guidance on API keys, grants, RLS and views. Use the `/frontend-design` skill for the UI work (per `CLAUDE.md`).

1. **Schema migration.** Create `supabase/migrations/<timestamp>_games_and_scores.sql` with the tables, view, indexes, grants and RLS, and apply it. Manual check: both tables exist, and the Supabase security advisors report no issue for them.
2. **Seed migration.** Create `supabase/migrations/<timestamp>_seed_games_and_scores.sql` and apply it. Manual check: `games` has 9 rows and `scores` has 135.
3. **Types and clients.** Generate `lib/supabase/database.types.ts`, type the existing clients, create `public.ts` and `admin.ts` (imports `server-only`), and add `SUPABASE_SECRET_KEY` to `.env.example` and `.env.local`. Manual check: `npx tsc --noEmit` passes.
4. **Data layer and error state.** Create `lib/games-data.ts`, `lib/scores-data.ts` and `components/data-error.tsx` (client, built with `catchError`, with message and retry button). Manual check: `npm run lint` and `npm run build` pass with no visual change.
5. **Catalog from the database.** Switch home, library, game card, detail, player and Hall of Fame tabs to the data layer, passing games as props to client components. Remove `GAMES` and `getGame` from `lib/games.ts`. Manual check: every screen shows the 9 games in the same order, with computed best score and plays.
6. **Real leaderboards.** Feed the detail leaderboard and the Hall of Fame from `getTopScores`, add the empty state, and handle a podium with fewer than 3 rows. Remove `seededScores`. Manual check: both screens match the rows in the database.
7. **Personal best.** In the Hall of Fame, query the user's best row and rank with the browser client. Manual check: the row appears only for a name that has a score in the selected game.
8. **Score validation and action.** Add `validateScore` to `lib/scores.ts` and create `app/juego/[id]/jugar/actions.ts`. Manual check: `npx tsc --noEmit` and `npm run lint` pass.
9. **Modal integration.** In `components/game-player.tsx`, write `av_scores` as today and, for games with an `engine`, call `submitScore` with the saving, saved and error states. Manual check: a finished ASTEROIDS game appears in its leaderboard.
10. **Polish pass.** Check 375 / 768 / 1280 px, run `npm run lint` and `npm run build`. Screenshots go to `.playwright-screenshots/`. Manual check: both commands pass with no errors.

---

## Acceptance criteria

Database:

- [ ] `supabase/migrations/` contains the schema and seed migrations, and Supabase lists both as applied.
- [ ] `games` has 9 rows and a fresh seed has 15 rows in `scores` per game, all with `is_seed = true`.
- [ ] With the publishable key, `select` works on `games`, `scores` and `game_stats`, while insert, update and delete on both tables fail.
- [ ] Inserting a score with an empty name, an 11-character name, a negative score or an unknown `game_id` fails, even with the secret key.

Reads:

- [ ] `GAMES`, `getGame` from `lib/games.ts` and `seededScores` no longer exist.
- [ ] The library shows 9 cards with "ASTEROIDS" first, the home preview shows the first 6, and the Hall of Fame shows 9 tabs.
- [ ] Changing a game title in the database appears in the app within 5 minutes without a rebuild.
- [ ] Each card and detail page shows the maximum saved score of that game, and "Partidas" shows its row count.
- [ ] The detail page shows the top 10 rows in ranking order, and the same name can appear more than once.
- [ ] The Hall of Fame shows the top 3 on the podium and the top 12 in the table for the selected game.
- [ ] A game with no scores shows "AÚN NO HAY PUNTUACIONES" and "—" as best score, without crashing the podium.
- [ ] "TU MEJOR MARCA" shows the best score, real rank and date for the `av_user` name, and is hidden with no user or no score for that game.
- [ ] `/juego/id-inexistente` and `/juego/id-inexistente/jugar` show the 404 page.
- [ ] When a Supabase read fails at runtime, the affected area shows "NO SE PUDIERON CARGAR LOS DATOS." with a "REINTENTAR" button that recovers once the connection returns.

Writes:

- [ ] Saving an ASTEROIDS score inserts exactly one row with `is_seed = false` and adds one `av_scores` entry.
- [ ] The saved score appears on the next visit to the detail page and the Hall of Fame, without waiting for cache expiry.
- [ ] While saving, the button is disabled and reads "GUARDANDO…", and double clicking inserts only one row.
- [ ] With the insert failing, the modal shows "NO SE PUDO GUARDAR. INTÉNTALO DE NUEVO." and "REINTENTAR", and retrying adds no second `av_scores` entry.
- [ ] The button "GUARDAR PUNTUACIÓN" is disabled while the name is empty.
- [ ] Calling the action with a simulated game, a decimal score, a score above 10000000 or a blank name returns `VALIDATION` and inserts nothing.
- [ ] The 11th submission from the same IP within 10 minutes shows "DEMASIADOS ENVÍOS. ESPERA UNOS MINUTOS." and inserts nothing.
- [ ] Saving a score of a simulated game writes only to `av_scores` and shows "PUNTUACIÓN GUARDADA".
- [ ] Choosing "JUGAR DE NUEVO" while a save is in progress starts a clean game, and the late result does not change its modal.

General:

- [ ] `npm run lint` and `npm run build` finish without errors.
- [ ] `SUPABASE_SECRET_KEY` appears in no tracked file with a real value and nowhere in the client bundle.
- [ ] The home activity widgets are unchanged.
- [ ] No console errors or hydration warnings on any route, with and without `av_user`.

---

## Decisions

- **Yes:** One spec for tables, reads and writes. They share the foreign key and the migrations.
- **No:** Splitting catalog and leaderboard, or shipping the schema alone.
- **Yes:** The database is the only source of the catalog.
- **No:** Keeping `lib/games.ts` as the source or as a fallback. It would create two sources of truth.
- **Yes:** `best` and `plays` are computed from `scores`. The mock values disappear.
- **No:** Stored `best` and `plays` columns.
- **Yes:** Writes go through a Server Action with the secret key and no public insert policy. Validation and rate limit cannot be skipped. This changes the SPEC 04 decision of having no secret key, because a feature now needs it.
- **No:** Direct browser inserts, or a public insert policy.
- **No:** Waiting for authentication before saving scores.
- **Yes:** Any typed name can save, including "INVITADO". The product spec says guest scores are not shared, but no verified account exists yet.
- **Yes:** Only games with a real engine write to Supabase.
- **No:** Storing simulated scores.
- **Yes:** Fake seed scores for all 9 games, marked with `is_seed` so they can be deleted later in one statement.
- **No:** Empty leaderboards at launch.
- **Yes:** Every saved score is a row, as in a classic arcade table.
- **No:** Best score per name. Names are not verified, so different players would be merged.
- **Yes:** Detail keeps the top 10 and the Hall of Fame keeps 12 rows, although the product spec says top 10 for the latter.
- **Yes:** `localStorage` is still written for every saved score, so a failed upload keeps a local copy.
- **Yes:** Cached reads with tags and `updateTag`. Pages stay fast and a new score shows immediately.
- **No:** Uncached reads on every request.
- **Yes:** Spanish error state with retry, with no mock fallback, so problems stay visible.
- **Yes:** 10 submissions per IP per 10 minutes. Games are short, so the contact form limit of 3 is too strict.
- **Yes:** SQL migrations versioned in the repository and applied through MCP.
- **No:** Manual changes in the Supabase dashboard.

---

## Risks

| Risk                                                                 | Mitigation                                                                                    |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| A player forges a score by calling the action directly               | Accepted: validation and rate limit only deter. Anti-cheat needs its own spec.                |
| Anyone can save under another player's name                          | Accepted until authentication exists; "TU MEJOR MARCA" is tied to the typed name.             |
| The in-memory rate limit resets on restart and is per instance       | Accepted, as in SPEC 03.                                                                      |
| `npm run build` needs a reachable Supabase to prerender pages        | Accepted: the build fails visibly. The environment variables must exist where the build runs. |
| A free-tier Supabase project pauses after inactivity                 | The error state with retry covers it; restore the project from the dashboard.                 |
| The secret key leaks to the client                                   | No `NEXT_PUBLIC_` prefix, used only in `admin.ts`, which imports `server-only`.               |
| The view bypasses RLS                                                | Create it with `security_invoker = true` and check the security advisors.                     |
| Dates differ between server and browser and cause hydration warnings | Format every date in UTC.                                                                     |
| Next.js 16 caching APIs differ from common knowledge                 | Read `node_modules/next/dist/docs/` before step 1.                                            |
| The local `main` lacks SPEC 04 and SPEC 05                           | Update `main` before creating the branch (see the precondition).                              |

---

## What is **not** in this spec

- Authentication or user accounts.
- Anti-cheat.
- Live home page widgets.
- Scores from simulated games, or migration of old local scores.
- Admin screens, realtime, pagination or time-based boards.
- Automated tests.

Each one of those, if it lands, goes in its own spec.
