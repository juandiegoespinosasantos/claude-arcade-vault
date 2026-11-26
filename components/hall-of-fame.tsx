"use client";

import { useState } from "react";
import Link from "next/link";
import type { Game } from "@/lib/games";
import type { ScoreRow } from "@/lib/scores";

// Visual order: second place, champion, third place.
const PODIUM = [
  { index: 1, tone: "silver" },
  { index: 0, tone: "gold" },
  { index: 2, tone: "bronze" },
] as const;

export function HallOfFame({
  games,
  scores,
}: {
  games: Game[];
  scores: Record<string, ScoreRow[]>;
}) {
  const [tab, setTab] = useState(games[0].id);
  const rows = scores[tab] ?? [];

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="hall-table">
          <p className="lb-empty">AÚN NO HAY PUNTUACIONES</p>
        </div>
      ) : (
        <>
          <div className="podium">
            {PODIUM.map(({ index, tone }) => (
              <PodiumSlot
                key={tone}
                tone={tone}
                rank={index + 1}
                row={rows[index]}
              />
            ))}
          </div>

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.id}
                className={
                  "tr" +
                  (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
                }
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/biblioteca" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}

// A place without a score yet shows placeholders.
function PodiumSlot({
  tone,
  rank,
  row,
}: {
  tone: "gold" | "silver" | "bronze";
  rank: number;
  row?: ScoreRow;
}) {
  const champion = tone === "gold";

  return (
    <div className={"podium-slot " + tone}>
      {champion && (
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
        >
          CAMPEÓN
        </div>
      )}
      <div
        className="rank-num"
        style={champion ? { fontSize: 36, marginTop: 4 } : undefined}
      >
        {String(rank).padStart(2, "0")}
      </div>
      <div className="name">{row?.name ?? "---"}</div>
      <div className="score" style={champion ? { fontSize: 20 } : undefined}>
        {row ? row.score.toLocaleString("es-ES") : "—"}
      </div>
      <div className="date">{row?.date ?? "—"}</div>
    </div>
  );
}
