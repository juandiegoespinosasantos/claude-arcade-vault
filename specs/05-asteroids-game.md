# SPEC 05 — Asteroids: first playable game

> **Status:** Implemented
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-11-25
> **Objective:** Port the game in `references/started-games/02-asteroids` to a native TypeScript canvas engine and make it playable in the app as a new catalog entry, ASTEROIDS, wired to the existing player HUD and end-of-game modal.

---

## Why this spec exists

SPEC 01 built the player screen with a simulated score ticker and an empty decorative arena, and left real games out of scope. This is the first real game. The way the engine talks to the player screen sets the pattern for the games that come after it. The reference game is plain JavaScript with global state, window listeners that are never removed, its own HUD and its own game-over text, so it cannot be dropped in as is.

---

## Scope

**In:**

- A TypeScript port of `references/started-games/02-asteroids/game.js` in `lib/asteroids/engine.ts`, with no module-level game state and full cleanup on destroy.
- Same gameplay and constants as the reference: ship physics, shooting cooldown, toroidal wrapping, asteroid sizes, splitting and points (20 / 50 / 100), 3 lives, respawn invincibility, levels, explosion particles and the 3x triple-shot power-up.
- Neon recolor of the canvas: cyan ship, magenta asteroids and explosion particles, yellow bullets, thrust flame, power-up and power-up timer, glow on strokes, black background.
- A client component `components/asteroids/asteroids-canvas.tsx` that mounts the engine on a canvas inside the existing CRT screen.
- The player screen shows the engine's real score, lives and level in the existing HUD, and opens the existing "FIN DEL JUEGO" modal on game over.
- The canvas HUD (score, level, life icons) and the canvas "GAME OVER" overlay are removed. Only the 3x power-up timer stays on the canvas.
- "PAUSA" / "REANUDAR", "FIN", "SALIR", "JUGAR DE NUEVO" and "VOLVER AL VAULT" work with the real game.
- Saving the real score to `localStorage["av_scores"]` through the existing `saveScore`.
- A new catalog entry `asteroids`, first in `GAMES`, category `SHOOTER`, with a new `.cover-asteroids` CSS cover.
- The detail page of ASTEROIDS shows the input tag "TECLADO" instead of "TECLADO / TÁCTIL".

**Out of scope (for future specs):**

- Touch controls, gamepad support, key remapping.
- New keyboard shortcuts (P / Esc to pause) and auto-pause on tab or window blur.
- Restarting with Space after game over.
- Supabase, tables, real leaderboards, and showing `av_scores` entries in leaderboards or the Hall of Fame.
- Sound, new gameplay features, UFOs, difficulty changes, balance changes.
- High-DPI canvas rendering and fullscreen.
- A sandboxed iframe or a generic game loader.
- Making any other catalog game playable, including ROCAS.
- Changes to `references/started-games/02-asteroids`.

---

## Data model

No new persistent data and no new `localStorage` keys. Saved scores use the existing `av_scores` entry with `game: "asteroids"`.

```ts
// lib/games.ts — two new optional fields on Game
export interface Game {
  // ...existing fields
  engine?: "asteroids";  // present only for games with a real implementation
  controls?: string;     // detail page input tag; defaults to "TECLADO / TÁCTIL"
}

// First element of GAMES
{
  id: "asteroids",
  title: "ASTEROIDS",
  short: "Sobrevive al campo de asteroides y dispara en 3x.",
  long: "Pilota una nave vectorial en un campo de asteroides sin bordes. Rota con ← y →, propulsa con ↑ y dispara con ESPACIO; cada roca se parte en fragmentos más pequeños. Atrapa el potenciador 3x para disparar en triple ráfaga.",
  cat: "SHOOTER",
  cover: "cover-asteroids",
  color: "cyan",
  best: 32600,      // mock, like the rest of the catalog
  plays: "0.9K",    // mock
  engine: "asteroids",
  controls: "TECLADO",
}
```

```ts
// lib/asteroids/engine.ts — public contract
export interface AsteroidsStats {
  score: number;
  lives: number;
  level: number;
}

export interface AsteroidsCallbacks {
  onStats: (stats: AsteroidsStats) => void; // on start, then only when a value changes
  onGameOver: (finalScore: number) => void; // exactly once per game
}

export interface AsteroidsEngine {
  pause: () => void;
  resume: () => void;
  destroy: () => void; // cancels the animation frame and removes every listener
}

export function createAsteroids(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsEngine; // starts a new game immediately
```

Conventions:

- The canvas keeps an internal size of 800×600 and scales with CSS to fill the 4:3 `.crt-screen`.
- Engine internal states stay as in the reference: `playing`, `dead`, `gameover`.
- Handled keys: `ArrowLeft`, `ArrowRight`, `ArrowUp`, `Space`.
- While the game is running, `preventDefault` is called for those keys on keydown and keyup, so the page does not scroll and a focused button is not triggered.
- While paused or after game over, the engine ignores the keyboard and does not call `preventDefault`.
- Pausing clears held and queued keys. Resuming resets the frame timestamp, so no time jumps.
- A new game is a new engine instance. The canvas component is remounted through a React `key`.
- After game over the explosion particles keep animating, as in the reference.
- When lives reach 0, the "Vidas" HUD value shows "—".

---

## Implementation plan

Before step 1, read the relevant guides in `node_modules/next/dist/docs/` (per `AGENTS.md`), especially client components and how `cacheComponents` preserves component state across navigations. Use the `/frontend-design` skill for the UI work (per `CLAUDE.md`).

1. **Engine: entities.** Create `lib/asteroids/entities.ts` with typed `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`, the constants and the math helpers. The drawing methods receive the 2D context as a parameter and use the neon colors. Manual check: `npx tsc --noEmit` passes.
2. **Engine: game loop.** Create `lib/asteroids/engine.ts` with `createAsteroids` (state, input, update, draw, callbacks, pause, resume, destroy). Manual check: `npx tsc --noEmit` and `npm run lint` pass.
3. **Canvas component.** Create `components/asteroids/asteroids-canvas.tsx` (client: creates the engine in an effect, destroys it in the cleanup, forwards `paused` to `pause` / `resume`, forwards the callbacks). Add the canvas sizing rule to `app/globals.css`. Manual check: the app builds and behaves as before.
4. **Catalog entry and cover.** Add the `engine` and `controls` fields and the `asteroids` entry to `lib/games.ts`, add `.cover-asteroids` to `app/globals.css`, and use `controls` in `app/juego/[id]/page.tsx`. Manual check: the card is first in the library and its detail page shows "TECLADO"; the player still runs the simulation.
5. **Player integration.** In `components/game-player.tsx`, when `game.engine === "asteroids"` render the canvas instead of the arena, disable the score ticker, and drive score, lives, level and the modal from the callbacks. "FIN" pauses the engine and opens the modal. "JUGAR DE NUEVO" remounts the canvas. A fresh engine resets pause, modal and saved state. Manual check: a full game can be played, paused, ended, saved and restarted; another game still shows the simulation.
6. **Polish pass.** Check 375 / 768 / 1280 px, run `npm run lint` and `npm run build`. Screenshots go to `.playwright-screenshots/`. Manual check: both commands pass with no errors.

---

## Acceptance criteria

- [x] `npm run lint` and `npm run build` finish without errors.
- [x] The library shows 9 cards with "ASTEROIDS" first; the chip "SHOOTER" leaves "ASTEROIDS", "INVASORES" and "ROCAS".
- [x] The home page preview shows 6 cards with "ASTEROIDS" first.
- [x] The Hall of Fame shows 9 tabs and opens on "ASTEROIDS".
- [x] `/juego/asteroids` shows the new cover, the description and the tag "TECLADO"; the other detail pages still show "TECLADO / TÁCTIL".
- [x] `/juego/asteroids/jugar` starts a game inside the CRT screen with score 0, 3 lives and level 01.
- [x] ← and → rotate the ship, ↑ thrusts and Space shoots, and none of them scrolls the page.
- [x] Destroying a large, medium and small asteroid adds exactly 20, 50 and 100 points to the HUD.
- [x] Large and medium asteroids split in two; small ones disappear.
- [x] Picking up the 3x power-up fires three bullets per shot for 5 seconds and shows the countdown on the canvas.
- [x] A collision removes one life from the HUD and the ship respawns blinking after 2 seconds.
- [x] Clearing all asteroids raises the level by 1 and spawns 3 + level asteroids.
- [x] Losing the third life opens "FIN DEL JUEGO" with the same score as the HUD.
- [x] The canvas shows no score, level, life icons or "GAME OVER" text.
- [x] "PAUSA" freezes the game and shows "EN PAUSA"; "REANUDAR" continues from the same positions with no jump.
- [x] Pressing Space right after clicking "PAUSA" or "REANUDAR" does not toggle the button while the game is running.
- [x] "FIN" opens the modal with the current score and the ship no longer responds to the keyboard.
- [x] The name input accepts spaces and arrow keys while the modal is open, and Space does not restart the game.
- [x] "GUARDAR PUNTUACIÓN" shows "PUNTUACIÓN GUARDADA" and adds one `av_scores` entry with `game: "asteroids"` and the final score.
- [x] "JUGAR DE NUEVO" starts a new game with score 0, 3 lives, level 01 and no modal.
- [x] After "SALIR" and returning to the player, a new game starts with no modal, and the ship moves at normal speed (no duplicated loops or listeners).
- [x] After leaving the player, the arrow keys and Space behave normally on other pages.
- [x] `/juego/rocas/jugar` still shows the simulated ticker and decorative arena.
- [x] At 375 px the canvas fits the CRT screen with no horizontal scroll.
- [x] No console errors or hydration warnings on any of the routes above.

---

## Decisions

- **Yes:** Native TypeScript canvas engine plus a React wrapper. Typed callbacks, cleanup on unmount and direct integration with the HUD.
- **No:** Sandboxed iframe with `postMessage`. The product spec allows a canvas container, and the code is our own, so isolation adds a protocol without a current benefit.
- **Yes:** A 9th catalog entry named "ASTEROIDS". It is the classic name and ROCAS stays untouched.
- **No:** Reusing or renaming the ROCAS entry.
- **Yes:** ASTEROIDS goes first. The only real game is featured. ROCAS leaves the 6-card home preview, and SPEC 01's counts of 8 cards and 8 tabs become 9.
- **Yes:** React owns the HUD and the game-over screen. One source of truth, already in Spanish.
- **No:** Keeping the canvas HUD. It would duplicate information and show English text.
- **Yes:** Neon recolor with the same shapes and gameplay. It matches the app theme.
- **Yes:** Same controls as the reference: arrows and Space. Pause stays on the existing button.
- **No:** Space to restart. Typing or shooting must never discard an unsaved score.
- **Yes:** Optional `engine` field on `Game` to select the real game. The next game adds one value without checking ids in components.
- **No:** A generic engine registry or shared engine interface. Design it when a second game exists.
- **Yes:** Other games keep the simulated ticker from SPEC 01.
- **Yes:** Scores stay in `localStorage` only. Real leaderboards need their own spec.

---

## Risks

| Risk                                                                                                                                         | Mitigation                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Effects run twice in development, or re-run when `cacheComponents` hides and shows the route, creating duplicated loops or stale modal state | `destroy` cancels the frame and removes listeners; a fresh engine resets the player state; covered by an acceptance criterion. |
| Frequent React re-renders from the game loop                                                                                                 | `onStats` fires only when a value changes; the canvas is drawn outside React.                                                  |
| Parent re-renders recreate the engine because callback identities change                                                                     | The wrapper creates the engine once per mount and keeps the latest callbacks in a ref.                                         |
| Canvas glow (`shadowBlur`) lowers the frame rate on weak devices                                                                             | Keep the blur radius small and do not apply it to particles.                                                                   |
| The game cannot be controlled on touch devices                                                                                               | Accepted for this spec; the detail page says "TECLADO".                                                                        |
| Mock leaderboard seeds depend on id length, so ASTEROIDS repeats the rows of INVASORES                                                       | Accepted, as other mock games already share seeds; real leaderboards replace them.                                             |

---

## What is **not** in this spec

- Touch controls, new shortcuts or auto-pause.
- Real leaderboards or Supabase.
- Sound or gameplay changes.
- An iframe sandbox or generic game loader.
- Any other playable game.

Each one of those, if it lands, goes in its own spec.
