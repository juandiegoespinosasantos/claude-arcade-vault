# SPEC 02 — Home page (landing)

> **Status:** Approved
> **Depends on:** SPEC 01
> **Date:** 2026-11-05
> **Objective:** Add the landing page from `references/templates/home-about/home.jsx` at `/`, move the game library to `/biblioteca`, and add an "Inicio" link to the navbar.

---

## Why this spec exists

SPEC 01 ported the five functional screens and used the library as the root route. The newer template in `references/templates/home-about/` adds a marketing landing page (hero, benefits, game preview, stats, live activity, pricing/FAQ, final CTA) that should be the first thing a visitor sees. The template's `home.jsx` and the `/* ===== HOME PAGE ===== */` and `/* ===== ACTIVITY ===== */` blocks of its `styles.css` are the visual source of truth. The About page of that template is **not** part of this spec.

SPEC 01 must be present in the working branch before starting: this spec reuses its navbar, footer, `lib/games.ts` and routes (`specs/01-visual-mvp-screens.md`; its code lives on branch `spec-01-visual-mvp-screens` and is not on `main` yet).

---

## Scope

**In:**

- New home page at `/` with the seven template sections, wording identical to `home.jsx`:
  1. Hero: eyebrow "▸ INSERTA UNA MONEDA_", 3-line title "EL ARCADE / CLÁSICO ESTÁ / DE VUELTA", subtitle, CTAs "▶  EXPLORAR JUEGOS" and "✦  CREAR CUENTA", "DESLIZA ▼" hint, 8 floating pixel silhouettes.
  2. "// 01 ¿POR QUÉ ARCADE VAULT?": 4 feature cards (JUEGOS CLÁSICOS, 100% GRATIS, LADDER BOARDS, SIEMPRE CRECIENDO) with pixel SVG icons.
  3. "// 02 JUEGOS DISPONIBLES AHORA": rail of the first 6 games from `GAMES` as mini cards, plus "VER TODOS LOS JUEGOS →".
  4. Stats strip: "12+ JUEGOS", "MILES DE PARTIDAS", "GLOBAL RANKING".
  5. "// 03 ACTIVIDAD EN VIVO": "ÚLTIMAS PUNTUACIONES" ticker (7 rows) and "TOP JUGADORES · HOY" (5 rows with bars) with "VER SALÓN →".
  6. "// 04 PRECIOS": single "JUGADOR VAULT" plan card at $0, "EMPEZAR GRATIS →", and 3 FAQ items.
  7. Final CTA: "¿LISTO PARA JUGAR?" and "INSERTAR MONEDA →".
- Scroll-reveal animation (`.reveal` → `.in` via `IntersectionObserver`).
- Move the SPEC 01 library from `/` to `/biblioteca` (same component, same behavior).
- Navbar (desktop links and mobile panel): add "Inicio" (→ `/`) before "Biblioteca"; "Biblioteca" now points to `/biblioteca` and stays active on `/juego/...`.
- Update internal links affected by the move: "VOLVER AL VAULT" (detail page and player end modal) → `/biblioteca`.
- Port the home and activity CSS blocks (and any keyframes they use) from the template `styles.css` into `app/globals.css`.
- Static mock constants for ticker, top players, features, stats, and FAQ.

**Out of scope (for future specs):**

- About / "Acerca de" page, contact form, and any navbar link to them.
- Real data for activity/top players (backend, `av_scores`). Values are static constants.
- Any change to other screens beyond the links listed above.
- New theme tokens, redesign, SEO beyond root metadata, i18n, tests.

---

## Data model

No new persistent data and no localStorage keys. Static constants live next to the page, typed:

```ts
// lib/home.ts
export type Accent = "cyan" | "magenta" | "yellow" | "green";

export interface Feature { icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET"; title: string; desc: string; color: Accent }
export interface Stat { n: string; u: string; s: string }
export interface RecentScore { player: string; game: string; score: number; when: string; color: Accent }
export interface TopPlayer { rank: number; player: string; score: number }
export interface FaqItem { q: string; a: string }

export const FEATURES: Feature[];       // 4
export const STATS: Stat[];             // 3
export const RECENT_SCORES: RecentScore[]; // 7
export const TOP_PLAYERS: TopPlayer[];  // 5
export const FAQ: FaqItem[];            // 3
```

Conventions:

- Values are copied verbatim from `home.jsx`. Numbers formatted with `toLocaleString("es-ES")`.
- The mini-card rail uses `GAMES.slice(0, 6)` from `lib/games.ts` (SPEC 01); it is not duplicated.
- Mini cards use `Link` to `/juego/[id]`, not click handlers.

---

## Implementation plan

Before step 1, read the relevant guides in `node_modules/next/dist/docs/` (per `AGENTS.md`): especially `Link`, client/server boundaries, and metadata. Use the `/frontend-design` skill for the UI work (per `CLAUDE.md`).

1. **Library route move.** Create `app/biblioteca/page.tsx` with the library (hero + `<Library />`) currently in `app/page.tsx`. Update "Biblioteca" nav links to `/biblioteca` (active when pathname is `/biblioteca` or starts with `/juego`) and "VOLVER AL VAULT" links in `app/juego/[id]/page.tsx` and `components/game-player.tsx` to `/biblioteca`. `app/page.tsx` is left untouched in this step. Manual check: the library works at `/biblioteca`, links navigate correctly, `/` still renders as before.
2. **Home CSS.** Port the template `styles.css` `/* ===== HOME PAGE ===== */` and `/* ===== ACTIVITY ===== */` blocks (and keyframes they depend on, e.g. `float`, if missing) into `app/globals.css`, skipping the About block. Manual check: `npm run build` passes; no visual change on existing routes.
3. **Home data.** Create `lib/home.ts` with the types and constants above. Manual check: `npx tsc --noEmit` passes.
4. **Home components.** Create `components/home/floating-silhouettes.tsx`, `components/home/feature-icon.tsx` (server), and `components/home/reveal.tsx` (client: wraps sections, adds `.in` via `IntersectionObserver`, shows content immediately when `prefers-reduced-motion` is set or the observer is unavailable). Manual check: components compile.
5. **Home page.** Replace `app/page.tsx` with the seven sections (server component; `Reveal` only around animated sections), using `Link` for all CTAs: "EXPLORAR JUEGOS" and "VER TODOS LOS JUEGOS" and "INSERTAR MONEDA" → `/biblioteca`; "CREAR CUENTA" and "EMPEZAR GRATIS" → `/acceso`; "VER SALÓN" → `/salon-de-la-fama`; mini cards → `/juego/[id]`. Manual check: every section renders and every link navigates.
6. **Navbar "Inicio".** Add "Inicio" to the desktop links and the mobile panel in `components/nav.tsx`, active only when pathname is exactly `/`. Manual check: underline moves correctly on `/`, `/biblioteca`, `/juego/...`.
7. **Polish pass.** Check responsive behavior (375 / 768 / 1280 px), remove leftovers, run `npm run lint` and `npm run build`. Manual check: both pass with no errors.

---

## Acceptance criteria

- [ ] `npm run lint` and `npm run build` finish without errors.
- [ ] `/` shows the seven sections in order, with the exact Spanish wording of `home.jsx`.
- [ ] `/biblioteca` shows the SPEC 01 library with 8 cards; filtering and "NO HAY RESULTADOS" still work.
- [ ] The hero title renders as three lines "EL ARCADE", "CLÁSICO ESTÁ", "DE VUELTA", and 8 floating silhouettes are present and `aria-hidden`.
- [ ] The feature section has exactly 4 cards; the games rail has exactly 6 mini cards (first 6 of `GAMES`); the ticker has 7 rows; top players has 5 rows with the first three styled gold, silver and bronze; the FAQ has 3 items.
- [ ] "▶  EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" and "INSERTAR MONEDA →" navigate to `/biblioteca`; "✦  CREAR CUENTA" and "EMPEZAR GRATIS →" to `/acceso`; "VER SALÓN →" to `/salon-de-la-fama`; each mini card to `/juego/[id]` of its game.
- [ ] Sections below the hero start hidden and become visible when scrolled into view; with `prefers-reduced-motion: reduce` they are visible without scrolling.
- [ ] The navbar shows "Inicio", "Biblioteca", "Salón de la Fama" on desktop and in the mobile panel; "Inicio" is underlined only on `/`; "Biblioteca" is underlined on `/biblioteca` and `/juego/...` but not on `/`.
- [ ] "VOLVER AL VAULT" (detail page and player modal) goes to `/biblioteca`.
- [ ] There is no "Acerca de" link and no `/acerca-de` route.
- [ ] At 375 px the page has no horizontal scroll, feature grid is 1 column, mini rail 2 columns, stats stacked.
- [ ] No hydration warnings or console errors on `/`, with and without `av_user` in `localStorage`.

---

## Decisions

- **Yes:** Home at `/`, library at `/biblioteca`. Matches the template (separate Inicio and Biblioteca) and makes the landing page the entry point.
- **No:** Home at `/inicio` with the library staying at `/`. Fewer edits but the root URL would not be the landing page.
- **Yes:** Depend on SPEC 01 and reuse its navbar, footer and `GAMES`. Avoids duplicating the shell.
- **No:** Making this spec independent of SPEC 01. It would need its own shell and conflict at merge.
- **Yes:** Add only "Inicio" to the navbar. "Acerca de" waits for its own spec.
- **No:** Dead "Acerca de" link. It would lead to a 404.
- **Yes:** All seven template sections with identical wording, including pricing/FAQ. Faithful port, same rule as SPEC 01.
- **Yes:** Activity and top players as static constants. Real data belongs to the backend/leaderboard spec.
- **Yes:** Page is a server component; only the reveal wrapper is client-side. Keeps JS small and avoids hydration issues.
- **Yes:** Login/guest redirect from `/acceso` stays at `/` (now the home), unchanged from SPEC 01.
- **Yes:** Reuse template CSS classes in `globals.css` instead of rewriting in Tailwind (same decision as SPEC 01).

---

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| Moving the library breaks SPEC 01 links or tests that assume `/` | Step 1 updates all known links and is verified before the home replaces `/`; grep for `href="/"` and `push("/")` to review each. |
| Reveal sections invisible if JS fails or the observer never fires | `Reveal` shows content when `IntersectionObserver` is unavailable or `prefers-reduced-motion` is set. |
| Template CSS uses keyframes or variables missing from `globals.css` (e.g. `float`, `--gold`) | Step 2 checks each referenced keyframe and variable and ports what is missing. |
| Marketing copy conflicts with the catalog ("12+ JUEGOS" vs 8 games) | Kept verbatim from the template; revisit when the catalog grows. |
| Inline `style` props in the template (`transitionDelay`, bar widths) | Keep as React `style` props; they are deterministic, so no hydration risk. |

---

## What is **not** in this spec

- About / "Acerca de" page and contact form.
- Real activity, top-player or stats data.
- Changes to the player, detail, auth or Hall of Fame beyond the "VOLVER AL VAULT" links.
- Tests, SEO work, i18n, or visual redesign.

Each one of those, if it lands, goes in its own spec.
