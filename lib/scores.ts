export interface ScoreRow {
  id: number;
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/YYYY", formatted in UTC
}

// UTC on both sides, so server and browser never disagree.
export function formatScoreDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}
