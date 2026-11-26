// Game loop ported from references/started-games/02-asteroids/game.js.
// All state lives inside createAsteroids, so every engine is an independent game.
// The score, level and lives HUD and the game-over screen belong to the caller.

import {
  Asteroid,
  Bullet,
  COLORS,
  dist,
  H,
  Particle,
  POINTS,
  PowerUp,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  rand,
  Ship,
  W,
} from "@/lib/asteroids/entities";

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

type State = "playing" | "dead" | "gameover";

const HANDLED_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "Space"]);
const INITIAL_LIVES = 3;
const INITIAL_ASTEROIDS = 4;
const RESPAWN_DELAY = 2;
const SAFE_SPAWN_DIST = 130;
const KILLS_FOR_GUARANTEED_POWERUP = 5;
const MAX_FRAME_DT = 0.05;

/** Starts a new game immediately. */
export function createAsteroids(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsEngine {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is not available");
  const ctx: CanvasRenderingContext2D = context;
  canvas.width = W;
  canvas.height = H;

  // ── Game state ────────────────────────────────────────────────────────────

  const ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let score = 0;
  let lives = INITIAL_LIVES;
  let level = 1;
  let state: State = "playing";
  let deadTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;

  // ── Loop and input state ──────────────────────────────────────────────────

  let frame = 0;
  let lastTime: number | null = null;
  let paused = false;
  let destroyed = false;
  let reported: AsteroidsStats | null = null;
  let gameOverReported = false;
  let keys: Record<string, boolean> = {};
  let justPressed: Record<string, boolean> = {};

  // ── Input ─────────────────────────────────────────────────────────────────

  // While paused or after game over the keyboard belongs to the page.
  function capturesKey(e: KeyboardEvent) {
    return !paused && state !== "gameover" && HANDLED_KEYS.has(e.code);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!capturesKey(e)) return;
    e.preventDefault();
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (!capturesKey(e)) return;
    e.preventDefault();
    keys[e.code] = false;
  }

  function pressed(code: string) {
    const value = justPressed[code];
    justPressed[code] = false;
    return value;
  }

  // ── Rules ─────────────────────────────────────────────────────────────────

  function spawnAsteroids(count: number) {
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_SPAWN_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }

  function explode(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }

  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      state = "gameover";
    } else {
      state = "dead";
      deadTimer = RESPAWN_DELAY;
    }
  }

  function updateParticles(dt: number) {
    particles.forEach((p) => p.update(dt));
    particles = particles.filter((p) => !p.dead);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  function update(dt: number) {
    if (state === "gameover") {
      updateParticles(dt);
      return;
    }

    if (state === "dead") {
      deadTimer -= dt;
      updateParticles(dt);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }

    if (pressed("Space")) bullets.push(...ship.tryShoot());

    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    updateParticles(dt);
    powerUps.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    powerUps = powerUps.filter((p) => !p.dead);

    // Ship vs power-up
    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bullet vs asteroid
    const fragments: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          fragments.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= KILLS_FOR_GUARANTEED_POWERUP;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(fragments);
    bullets = bullets.filter((b) => !b.dead);

    // Ship vs asteroid
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Level cleared
    if (asteroids.length === 0) nextLevel();
  }

  // ── Draw ──────────────────────────────────────────────────────────────────

  function drawPowerUpTimer() {
    if (ship.tripleShot <= 0) return;
    ctx.fillStyle = COLORS.yellow;
    ctx.font = "15px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 26);
  }

  function draw() {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);

    particles.forEach((p) => p.draw(ctx));
    asteroids.forEach((a) => a.draw(ctx));
    powerUps.forEach((p) => p.draw(ctx));
    bullets.forEach((b) => b.draw(ctx));
    ship.draw(ctx);

    drawPowerUpTimer();
  }

  // ── Callbacks ─────────────────────────────────────────────────────────────

  function report() {
    if (
      !reported ||
      reported.score !== score ||
      reported.lives !== lives ||
      reported.level !== level
    ) {
      reported = { score, lives, level };
      callbacks.onStats(reported);
    }
    if (state === "gameover" && !gameOverReported) {
      gameOverReported = true;
      callbacks.onGameOver(score);
    }
  }

  // ── Loop ──────────────────────────────────────────────────────────────────

  function loop(timestamp: number) {
    const dt =
      lastTime === null
        ? 0
        : Math.min((timestamp - lastTime) / 1000, MAX_FRAME_DT);
    lastTime = timestamp;
    update(dt);
    draw();
    // Scheduled before reporting, so a callback can safely pause or destroy.
    frame = requestAnimationFrame(loop);
    report();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function pause() {
    if (destroyed || paused) return;
    paused = true;
    cancelAnimationFrame(frame);
    keys = {};
    justPressed = {};
  }

  function resume() {
    if (destroyed || !paused) return;
    paused = false;
    lastTime = null; // no time jump after the pause
    frame = requestAnimationFrame(loop);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
  }

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  spawnAsteroids(INITIAL_ASTEROIDS);
  draw();
  frame = requestAnimationFrame(loop);
  report();

  return { pause, resume, destroy };
}
