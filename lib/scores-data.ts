import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { formatScoreDate, type ScoreRow } from "@/lib/scores";
import { createPublicClient } from "@/lib/supabase/public";

/** The leaderboard of a game. Throws on a Supabase error, so errors are never cached. */
export async function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]> {
  "use cache";
  cacheTag(`scores:${gameId}`);
  cacheLife("minutes");

  const { data, error } = await createPublicClient()
    .from("scores")
    .select("id, player_name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);
  if (error) {
    throw new Error(`Could not read scores of ${gameId}: ${error.message}`);
  }

  return data.map((row, i) => ({
    id: row.id,
    rank: i + 1,
    name: row.player_name,
    score: row.score,
    date: formatScoreDate(row.created_at),
  }));
}
