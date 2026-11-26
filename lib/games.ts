export type GameColor = "cyan" | "magenta" | "yellow" | "green";
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
  engine?: "asteroids"; // present only for games with a real implementation
  controls?: string; // detail page input tag; defaults to "TECLADO / TÁCTIL"
}

// A catalog entry read from the database. `best` and `plays` come from the saved scores.
export interface GameWithStats extends Game {
  best: number;
  plays: number;
}

export const CATS: ("TODOS" | GameCategory)[] = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
];
