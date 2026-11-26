import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataErrorBoundary } from "@/components/data-error";
import { getGame, getGames } from "@/lib/games-data";
import { getTopScores } from "@/lib/scores-data";
import { Leaderboard } from "@/components/leaderboard";

export async function generateStaticParams() {
  const games = await getGames();
  return games.map((g) => ({ id: g.id }));
}

type Params = Promise<{ id: string }>;

// `params` is only read inside <Suspense> so the route has an instant static shell.
export default function GameDetailPage({ params }: { params: Params }) {
  return (
    <DataErrorBoundary>
      <Suspense fallback={<div className="spinner" aria-label="Cargando" />}>
        <GameDetail params={params} />
      </Suspense>
    </DataErrorBoundary>
  );
}

async function GameDetail({ params }: { params: Params }) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover}></div>
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>{game.controls ?? "TECLADO / TÁCTIL"}</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{game.plays.toLocaleString("es-ES")}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div
                className="v"
                style={{ color: "var(--magenta)", textShadow: "0 0 6px rgba(255,0,110,0.5)" }}
              >
                {game.plays > 0 ? game.best.toLocaleString("es-ES") : "—"}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{ color: "var(--yellow)", textShadow: "0 0 6px rgba(245,255,0,0.5)" }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/juego/${game.id}/jugar`} className="btn xl pulse">
              ▶&nbsp; JUGAR AHORA
            </Link>
            <Link href="/biblioteca" className="btn ghost lg">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        <DataErrorBoundary>
          <Suspense fallback={<div className="spinner" aria-label="Cargando" />}>
            <TopScores gameId={game.id} />
          </Suspense>
        </DataErrorBoundary>
      </aside>
    </div>
  );
}

async function TopScores({ gameId }: { gameId: string }) {
  return <Leaderboard rows={await getTopScores(gameId, 10)} />;
}
