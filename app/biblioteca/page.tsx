import { Suspense } from "react";
import { DataErrorBoundary } from "@/components/data-error";
import { Library } from "@/components/library";
import { getGames } from "@/lib/games-data";

async function Catalog() {
  return <Library games={await getGames()} />;
}

export default function BibliotecaPage() {
  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>
      <DataErrorBoundary>
        <Suspense fallback={<div className="spinner" aria-label="Cargando" />}>
          <Catalog />
        </Suspense>
      </DataErrorBoundary>
    </div>
  );
}
