# SPEC 01 — Visual MVP: all screens from the reference templates

> **Status:** Implemented
> **Depends on:** None
> **Date:** 2026-11-04
> **Objective:** Port the five screens, navbar and footer from `references/templates/` into the Next.js App Router as real routes with mock data, with no real game implementation.

---

## Why this spec exists

`references/templates/` is a React-via-CDN prototype that navigates with a URL hash and keeps everything in one file set. The scaffold already has the theme ported (`app/globals.css`, with all template classes, and the three fonts in `app/layout.tsx`). This spec turns the prototype into idiomatic Next.js pages and components without redesigning anything: the template is the visual source of truth, `prompt-arcade-vault.md` is the feature source of truth.

---

## Scope

**In:**

- Shared shell: sticky navbar (logo, links "Biblioteca" / "Salón de la Fama", credits counter, auth button or user button, mobile hamburger with slide-in panel, active-link underline) and footer, in `app/layout.tsx`.
- Screen 1 — Biblioteca (`/`): hero with flicker title, search input, category chips, game card grid with 3D tilt hover, empty state "NO HAY RESULTADOS".
- Screen 2 — Detalle de juego (`/juego/[id]`): cover, tags, long description, stat strip, "JUGAR AHORA" (pulsing), "VOLVER AL VAULT", "MEJORES PUNTUACIONES" top 10 panel.
- Screen 3 — Reproductor (`/juego/[id]/jugar`): HUD (jugador, puntuación, vidas, nivel), "PAUSA"/"REANUDAR", "FIN", "SALIR", CRT bezel with an empty animated arena, pause overlay, end-of-game modal ("FIN DEL JUEGO", "GUARDAR PUNTUACIÓN", typewriter "PUNTUACIÓN GUARDADA", "JUGAR DE NUEVO", "VOLVER AL VAULT").
- Screen 4 — Acceso (`/acceso`): tabs "INICIAR SESIÓN" / "CREAR CUENTA", fields Usuario / Correo electrónico (register only) / Contraseña, "JUGAR COMO INVITADO", Google and GitHub buttons (non-functional).
- Screen 5 — Salón de la Fama (`/salon-de-la-fama`): per-game tabs, podium for top 3, table RANGO / JUGADOR / PUNTUACIÓN / FECHA with staggered row entrance, "TU MEJOR MARCA" row when logged in.
- Typed mock data module (games, categories, seeded leaderboards) ported from `data.jsx`.
- Fake auth: the user object is stored in `localStorage` under `av_user`. Saved scores are appended to `localStorage` under `av_scores`.
- All UI text in Spanish, identical to the template wording.
- Responsive behavior at mobile, tablet and desktop, as defined by the existing `globals.css` media queries.

**Out of scope (for future specs):**

- Any real game, iframe sandbox or game loading. The player arena is an empty decorative placeholder with a simulated score ticker.
- Real authentication, OAuth for Google/GitHub, sessions, password handling.
- Backend (REST or Supabase), database, real leaderboards. Mock data is generated client-side or at build time and never changes.
- Rendering the scores saved in `av_scores` inside the leaderboards (they are only written).
- Tests (unit, e2e), analytics, SEO beyond the existing root metadata, i18n.
- Redesign of any screen or change to the theme tokens.

---

## Data model

The only new data is the mock catalog and the localStorage entries. Ported from `references/templates/data.jsx`, in TypeScript.

```ts
// lib/games.ts
export type GameColor = "cyan" | "magenta" | "yellow" | "green";
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string;            // slug used in the URL, e.g. "bloque-buster"
  title: string;         // e.g. "BLOQUE BUSTER"
  short: string;         // one-line description (card)
  long: string;          // 2–3 sentence description (detail)
  cat: GameCategory;
  cover: string;         // CSS class from globals.css, e.g. "cover-bricks"
  color: GameColor;      // accent for the card "JUGAR" button
  best: number;          // best global score
  plays: string;         // preformatted, e.g. "12.4K"
}

export const GAMES: Game[];                       // the 8 template games
export const CATS: ("TODOS" | GameCategory)[];    // chips in the library

// lib/scores.ts
export interface ScoreRow { rank: number; name: string; score: number; date: string } // date "DD/MM/2026"
export function seededScores(seed: number, count?: number): ScoreRow[];
```

```ts
// lib/storage.ts — localStorage contract
// "av_user"   -> { name: string } | absent        (name uppercased, max 10 chars)
// "av_scores" -> Array<{ game: string; score: number; name: string; at: number }>
```

Conventions:

- Numbers are formatted with `toLocaleString("es-ES")`.
- Leaderboard seeds are deterministic (same seed formulas as the template) so server and client render the same output.
- Game ids are the 8 template ids: `bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`.
- Reading `localStorage` happens only in client components, after mount, to avoid hydration mismatches.
- Real backend integration points are marked with a short comment at the two write/read sites (login and save score), as required by `prompt-arcade-vault.md`.

---

## Implementation plan

Before step 1, read the relevant guides in `node_modules/next/dist/docs/` (per `AGENTS.md`): especially dynamic route `params` handling, `Link`, and client/server component boundaries. Use the `/frontend-design` skill for the UI work (per `CLAUDE.md`).

1. **Data layer.** Create `lib/games.ts` and `lib/scores.ts` with the types and mock data above. Manual check: `npx tsc --noEmit` passes.
2. **Storage and auth context.** Create `lib/storage.ts` (safe `get/set/remove` wrappers around `localStorage`) and `components/auth-provider.tsx` (client) exposing `user`, `login`, `logout`, `saveScore`. Wrap `children` in `app/layout.tsx`. Manual check: app still renders the current home.
3. **Navbar and footer.** Create `components/nav.tsx` (client; `usePathname` for the active underline, hamburger state for the mobile panel) and `components/footer.tsx`. Render both from `app/layout.tsx` around `children`. Manual check: links navigate (targets may still 404), mobile panel opens and closes.
4. **Biblioteca.** Replace `app/page.tsx` with the hero, filters and grid. Create `components/library.tsx` (client: search and category state) and `components/game-card.tsx` (tilt hover, `Link` to `/juego/[id]`). Manual check: filtering by text and category works, empty state appears.
5. **Detalle.** Create `app/juego/[id]/page.tsx` (server, `notFound()` for unknown ids) and `components/leaderboard.tsx`. Manual check: every game id renders; "JUGAR AHORA" links to `/juego/[id]/jugar`; "VOLVER AL VAULT" links to `/`.
6. **Reproductor.** Create `app/juego/[id]/jugar/page.tsx` and `components/game-player.tsx` (client: ticker, pause, level, lives, end modal, save score through `saveScore`, typewriter confirmation). Manual check: score increases, "PAUSA" freezes it, "FIN" opens the modal, saving shows "PUNTUACIÓN GUARDADA", `av_scores` gets a new entry.
7. **Acceso.** Create `app/acceso/page.tsx` and `components/auth-form.tsx` (client: tabs, fields, submit calls `login` then redirects to `/`; guest button calls `logout` and redirects to `/`). Manual check: login shows the user name in the navbar and persists on reload.
8. **Salón de la Fama.** Create `app/salon-de-la-fama/page.tsx` and `components/hall-of-fame.tsx` (client: game tabs, podium, table with staggered rows, "TU MEJOR MARCA" only when `user` exists). Manual check: switching tabs changes the data, logged-out view has no personal row.
9. **Polish pass.** Update `app/layout.tsx` metadata title/description if needed, remove any unused template classes or leftovers, run `npm run lint` and `npm run build`. Manual check: both pass with no errors.

---

## Acceptance criteria

- [x] `npm run lint` and `npm run build` finish without errors.
- [x] The routes `/`, `/juego/bloque-buster`, `/juego/bloque-buster/jugar`, `/acceso` and `/salon-de-la-fama` all respond with their screen and no console errors.
- [x] `/juego/id-inexistente` and `/juego/id-inexistente/jugar` show the 404 page.
- [x] The library shows 8 cards; typing "caí" leaves only "CAÍDA"; selecting the chip "SHOOTER" leaves only "ROCAS" and "INVASORES"; a query with no match shows "NO HAY RESULTADOS".
- [x] Clicking a card or its "JUGAR" button opens `/juego/[id]` of that game.
- [x] The detail page shows exactly 10 rows under "MEJORES PUNTUACIONES", with rows 1–3 styled gold, silver and bronze.
- [x] In the player, the score increases while running and stops while paused; the button label toggles between "PAUSA" and "REANUDAR".
- [x] Clicking "FIN" opens the modal "FIN DEL JUEGO" with the final score; "GUARDAR PUNTUACIÓN" replaces the input with "PUNTUACIÓN GUARDADA" and adds one entry to `localStorage["av_scores"]`.
- [x] "JUGAR DE NUEVO" resets score to 0, lives to 3, level to 1 and closes the modal; "VOLVER AL VAULT" goes to `/`; "SALIR" goes to `/juego/[id]`.
- [x] In `/acceso`, switching to "CREAR CUENTA" shows the "Correo electrónico" field, and switching back hides it.
- [x] Submitting the login form stores `av_user`, redirects to `/`, and the navbar shows the user name instead of "Iniciar Sesión"; reloading keeps the user.
- [x] "JUGAR COMO INVITADO" removes `av_user` and redirects to `/`.
- [x] The Hall of Fame shows one tab per game (8), a podium with 3 places, and a table with 12 rows with columns RANGO, JUGADOR, PUNTUACIÓN, FECHA.
- [x] The "TU MEJOR MARCA" row appears only when `av_user` exists.
- [x] The navbar link of the current section has the neon underline (Biblioteca is also active in `/juego/...`).
- [x] At a 375 px viewport, the desktop links are hidden, the hamburger opens a slide-in panel, and the card grid is 1 column.
- [x] All visible text is in Spanish and matches the template wording.
- [x] No hydration warnings appear in the console on any route, with and without `av_user` in `localStorage`.

---

## Decisions

- **Yes:** Real App Router routes (`/`, `/juego/[id]`, `/juego/[id]/jugar`, `/acceso`, `/salon-de-la-fama`). Shareable URLs, working back button, idiomatic Next.js.
- **No:** Single route with hash-based state like the template. Faster to port but not linkable and not how Next.js is used.
- **Yes:** Typed mock module in `lib/` plus localStorage (`av_user`, `av_scores`), same keys as the template. Makes the guest/login flow demonstrable with zero backend.
- **No:** Static mocks with nothing persisted. The login and save-score flows could not be reviewed.
- **Yes:** Keep the simulated score ticker in the player. It lets the whole flow (HUD, pause, end modal, save) be reviewed without a game.
- **No:** Static "no disponible" placeholder. Hides most of the player UI.
- **Yes:** Reuse the existing classes in `app/globals.css` instead of rewriting styles in Tailwind utilities. The CSS is already a faithful port of the template; rewriting adds risk without visual gain.
- **Yes:** One spec for all screens. The work is mechanical porting into an already-themed scaffold, split into commitable steps.
- **No:** Splitting into two specs. The shell, data and auth context are shared by all screens, so a split would duplicate setup.
- **Yes:** Server components for pages and `notFound()` handling; client components only where state, `localStorage` or DOM events are needed.
- **No:** Rendering `av_scores` inside the leaderboards. That belongs to the backend/leaderboard spec.

---

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| Next.js 16 has breaking changes (e.g. async `params`) vs. what the code is usually written against | Read `node_modules/next/dist/docs/` before step 1, as `AGENTS.md` requires. |
| Hydration mismatch from `localStorage` (`av_user`) and the random score ticker | Read storage only after mount; start ticker in an effect; seeded scores are deterministic. |
| `localStorage` unavailable or full (private mode) | Storage wrappers catch errors and fall back to in-memory state; UI keeps working without persistence. |
| `globals.css` has no Tailwind preflight, so mixing Tailwind utilities with template classes can behave differently from the template | Prefer the existing classes; use utilities only for small layout additions. |
| Template uses inline styles and `window.*` globals that do not map directly to modules | Replace with imports and move repeated inline styles to existing or new classes in `globals.css`. |

---

## What is **not** in this spec

- Any real game or iframe/sandbox loader.
- Real authentication, OAuth, or a backend (REST or Supabase).
- Displaying locally saved scores in leaderboards.
- Automated tests.
- Visual redesign or new theme tokens.

Each one of those, if it lands, goes in its own spec.
