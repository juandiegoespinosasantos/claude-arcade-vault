"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AsteroidsCanvas } from "@/components/asteroids/asteroids-canvas";
import { useAuth } from "@/components/auth-provider";
import type { Game } from "@/lib/games";

const LIVES = 3;
const POINTS_PER_LEVEL = 2500;

export function GamePlayer({ game }: { game: Game }) {
  const { user, saveScore } = useAuth();
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  // "quit" = ended with FIN; "died" = the engine reported game over.
  const [over, setOver] = useState<"quit" | "died" | null>(null);
  // Lives and level reported by a real engine.
  const [vitals, setVitals] = useState({ lives: LIVES, level: 1 });
  // Each run is a new engine instance.
  const [run, setRun] = useState(0);
  // null = not edited yet; falls back to the logged-in user (read after mount) or guest.
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const name = nameInput ?? user?.name ?? "INVITADO";
  const isReal = game.engine === "asteroids";
  const lives = isReal ? vitals.lives : LIVES;
  const level = isReal
    ? vitals.level
    : 1 + Math.floor(score / POINTS_PER_LEVEL);

  // Simulated score ticker for games without a real engine. Starts in an effect to avoid hydration mismatch.
  useEffect(() => {
    if (isReal || over || paused) return;
    const t = setInterval(
      () => setScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [isReal, over, paused]);

  const resetRun = () => {
    setPaused(false);
    setOver(null);
    setSaved(false);
  };

  const restart = () => {
    setScore(0);
    setRun((r) => r + 1);
    resetRun();
  };

  // The guards stop a focused button from acting behind the game-over modal.
  const togglePause = () => {
    if (!over) setPaused((p) => !p);
  };
  const quit = () => {
    if (!over) setOver("quit");
  };

  const handleSave = () => {
    saveScore({ game: game.id, score, name });
    setSaved(true);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">
              {lives > 0 ? "♥ ".repeat(lives).trim() : "—"}
            </div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={quit}>
            FIN
          </button>
          <Link href={`/juego/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {isReal ? (
            <AsteroidsCanvas
              key={run}
              // After "died" the engine keeps running so the explosion finishes.
              paused={paused || over === "quit"}
              onStart={resetRun}
              onStats={(stats) => {
                setScore(stats.score);
                setVitals({ lives: stats.lives, level: stats.level });
              }}
              onGameOver={(finalScore) => {
                setScore(finalScore);
                setOver("died");
              }}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setNameInput(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button className="btn yellow" onClick={handleSave}>
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/biblioteca" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
