import { Suspense } from "react";
import { DataErrorBoundary } from "@/components/data-error";
import { HallOfFame } from "@/components/hall-of-fame";
import { getGames } from "@/lib/games-data";
import { getTopScores } from "@/lib/scores-data";

export default function SalonDeLaFamaPage() {
  return (
    <DataErrorBoundary>
      <Suspense fallback={<div className="spinner" aria-label="Cargando" />}>
        <Hall />
      </Suspense>
    </DataErrorBoundary>
  );
}

async function Hall() {
  const games = await getGames();
  // All boards are loaded up front, so switching tabs is instant.
  const boards = await Promise.all(
    games.map(async (g) => [g.id, await getTopScores(g.id, 12)] as const),
  );

  return <HallOfFame games={games} scores={Object.fromEntries(boards)} />;
}
