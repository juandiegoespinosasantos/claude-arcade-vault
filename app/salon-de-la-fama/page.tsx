import { Suspense } from "react";
import { DataErrorBoundary } from "@/components/data-error";
import { HallOfFame } from "@/components/hall-of-fame";
import { getGames } from "@/lib/games-data";

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
  return <HallOfFame games={await getGames()} />;
}
