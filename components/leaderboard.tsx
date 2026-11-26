import type { ScoreRow } from "@/lib/scores";

export function Leaderboard({ rows }: { rows: ScoreRow[] }) {
  return (
    <div className="leaderboard">
      <h3>MEJORES PUNTUACIONES</h3>
      {rows.length === 0 && <p className="lb-empty">AÚN NO HAY PUNTUACIONES</p>}
      {rows.map((r, i) => (
        <div
          key={r.id}
          className={
            "lb-row" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
          }
        >
          <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
          <div className="pl">
            {r.name}
            <div
              style={{ fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.1em" }}
            >
              {r.date}
            </div>
          </div>
          <div className="sc">{r.score.toLocaleString("es-ES")}</div>
        </div>
      ))}
    </div>
  );
}
