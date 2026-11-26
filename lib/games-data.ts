import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { GameCategory, GameColor, GameWithStats } from "@/lib/games";
import { createPublicClient } from "@/lib/supabase/public";

/** The whole catalog in display order. Throws on a Supabase error, so errors are never cached. */
export async function getGames(): Promise<GameWithStats[]> {
  "use cache";
  cacheTag("games", "game-stats");
  cacheLife("minutes");

  const supabase = createPublicClient();
  const [games, stats] = await Promise.all([
    supabase.from("games").select("*").order("sort_order"),
    supabase.from("game_stats").select("*"),
  ]);
  if (games.error) {
    throw new Error(`Could not read games: ${games.error.message}`);
  }
  if (stats.error) {
    throw new Error(`Could not read game stats: ${stats.error.message}`);
  }

  const statsById = new Map(stats.data.map((s) => [s.game_id, s]));

  // The casts are backed by check constraints on the table.
  return games.data.map((g) => ({
    id: g.id,
    title: g.title,
    short: g.short_description,
    long: g.long_description,
    cat: g.category as GameCategory,
    cover: g.cover,
    color: g.color as GameColor,
    engine: (g.engine as GameWithStats["engine"] | null) ?? undefined,
    controls: g.controls ?? undefined,
    best: statsById.get(g.id)?.best ?? 0,
    plays: statsById.get(g.id)?.plays ?? 0,
  }));
}

export async function getGame(id: string): Promise<GameWithStats | null> {
  const games = await getGames();
  return games.find((g) => g.id === id) ?? null;
}
