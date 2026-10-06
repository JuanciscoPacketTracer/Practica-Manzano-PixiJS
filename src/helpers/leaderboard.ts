import { supabase } from "../lib/supabase";
import type { CollectedApples, GameMode } from "../types/game";

export const STORAGE_KEY = "apple-tree-username";
export const LEADERBOARD_LIMIT = 100;

export interface LeaderboardEntry {
  username: string;
  total_score: number;
  red_score: number;
  golden_score: number;
  green_score: number;
  created_at: string;
  mode: GameMode;
}

export const getSavedUsername = () => localStorage.getItem(STORAGE_KEY);

export const saveUsername = (username: string) => localStorage.setItem(STORAGE_KEY, username);

export const fetchBestScore = async (username: string, mode: GameMode) => {
  const { data, error } = await supabase
    .from("scores")
    .select("total_score")
    .eq("username", username)
    .eq("mode", mode)
    .order("total_score", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.total_score ?? null;
};

export const submitScore = async (username: string, collectedApples: CollectedApples, mode: GameMode) => {
  const score = Object.values(collectedApples).reduce((total, count) => total + count, 0);
  const { error } = await supabase.from("scores").insert({
    username,
    total_score: score,
    red_score: collectedApples.red,
    golden_score: collectedApples.golden,
    green_score: collectedApples.green,
    mode,
  });

  if (error) {
    if (error.code === "23505") {
      return { inserted: false, bestScore: Math.max(score, (await fetchBestScore(username, mode)) ?? 0) };
    }
    throw error;
  }

  return { inserted: true, bestScore: Math.max(score, (await fetchBestScore(username, mode)) ?? 0) };
};

export const fetchTopScores = async (mode: GameMode, limit = LEADERBOARD_LIMIT): Promise<LeaderboardEntry[]> => {
  const { data, error } = await supabase
    .from("scores")
    .select("username, total_score, red_score, golden_score, green_score, created_at, mode")
    .eq("mode", mode)
    .order("total_score", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as LeaderboardEntry[];
};
