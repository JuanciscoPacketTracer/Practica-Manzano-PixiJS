import { supabase } from "../lib/supabase";
import type { CollectedApples } from "../types/game";

export const STORAGE_KEY = "apple-tree-username";

export interface LeaderboardEntry {
  username: string;
  score: number;
  red_apples: number;
  golden_apples: number;
  green_apples: number;
  created_at: string;
}

export const getSavedUsername = () => localStorage.getItem(STORAGE_KEY);

export const saveUsername = (username: string) => localStorage.setItem(STORAGE_KEY, username);

export const submitScore = async (username: string, collectedApples: CollectedApples) => {
  const score = Object.values(collectedApples).reduce((total, count) => total + count, 0);
  const { error } = await supabase.from("scores").insert({
    username,
    score,
    red_apples: collectedApples.red,
    golden_apples: collectedApples.golden,
    green_apples: collectedApples.green,
  });

  if (error) {
    if (error.code === "23505") throw new Error("Ese nombre de usuario ya existe");
    throw error;
  }
};

export const fetchTopScores = async (limit = 10): Promise<LeaderboardEntry[]> => {
  const { data, error } = await supabase
    .from("scores")
    .select("username, score, red_apples, golden_apples, green_apples, created_at")
    .order("score", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as LeaderboardEntry[];
};
