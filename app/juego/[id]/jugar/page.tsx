import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DataErrorBoundary } from "@/components/data-error";
import { getGame, getGames } from "@/lib/games-data";
import { GamePlayer } from "@/components/game-player";

export async function generateStaticParams() {
  const games = await getGames();
  return games.map((g) => ({ id: g.id }));
}

type Params = Promise<{ id: string }>;

// `params` is only read inside <Suspense> so the route has an instant static shell.
export default function PlayerPage({ params }: { params: Params }) {
  return (
    <DataErrorBoundary>
      <Suspense fallback={<div className="spinner" aria-label="Cargando" />}>
        <Player params={params} />
      </Suspense>
    </DataErrorBoundary>
  );
}

async function Player({ params }: { params: Params }) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
