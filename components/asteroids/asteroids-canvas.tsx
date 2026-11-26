"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import {
  createAsteroids,
  type AsteroidsCallbacks,
  type AsteroidsEngine,
} from "@/lib/asteroids/engine";

type Props = AsteroidsCallbacks & { paused: boolean };

/** One mount is one game: change the React `key` to start a new one. */
export function AsteroidsCanvas({ paused, onStats, onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidsEngine | null>(null);
  const callbacksRef = useRef<AsteroidsCallbacks>({ onStats, onGameOver });

  // Keeps the latest callbacks without recreating the engine.
  useLayoutEffect(() => {
    callbacksRef.current = { onStats, onGameOver };
  });

  // Must stay above the pause effect, which needs the engine to exist.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createAsteroids(canvas, {
      onStats: (stats) => callbacksRef.current.onStats(stats),
      onGameOver: (score) => callbacksRef.current.onGameOver(score),
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (paused) engineRef.current?.pause();
    else engineRef.current?.resume();
  }, [paused]);

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      width={800}
      height={600}
      role="img"
      aria-label="Campo de juego de Asteroids"
    />
  );
}
