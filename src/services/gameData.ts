import { supabase } from "./supabase";

import type {
  Activity,
  GameData,
  Sticker,
  Theme,
  UserCardProgress,
  UserStickerProgress,
  VocabularyCard,
} from "../types/game";

export async function loadGameData(userId: number): Promise<GameData> {
  const [
    themesResult,
    cardsResult,
    activitiesResult,
    stickersResult,
    cardProgressResult,
    stickerProgressResult,
  ] = await Promise.all([
    supabase
      .from("dim_themes")
      .select("id, name")
      .order("id"),

    supabase
      .from("dim_cards")
      .select("id, word, emoji, category, level, pic_type, pic_data")
      .order("level")
      .order("id"),

    supabase
      .from("dim_activities")
      .select("id, name, start_level, end_level, theme_activity")
      .order("id"),

    supabase
      .from("dim_stickers")
      .select("id, name, emoji")
      .order("id"),

    supabase
      .from("fact_user_cards")
      .select("card_id, sessions_complete, correct_streak, is_mastered")
      .eq("user_id", userId),

    supabase
      .from("fact_user_stickers")
      .select("sticker_id, sticker_count")
      .eq("user_id", userId),
  ]);

  // Check every query separately so errors identify the failing table.
  const results = [
    ["dim_themes", themesResult],
    ["dim_cards", cardsResult],
    ["dim_activities", activitiesResult],
    ["dim_stickers", stickersResult],
    ["fact_user_cards", cardProgressResult],
    ["fact_user_stickers", stickerProgressResult],
  ] as const;

  for (const [table, result] of results) {
    if (result.error) {
      throw new Error(`Could not load ${table}: ${result.error.message}`);
    }
  }

  return {
    themes: (themesResult.data ?? []) as Theme[],
    cards: (cardsResult.data ?? []) as VocabularyCard[],
    activities: (activitiesResult.data ?? []) as Activity[],
    stickers: (stickersResult.data ?? []) as Sticker[],
    cardProgress: (cardProgressResult.data ?? []) as UserCardProgress[],
    stickerProgress: (stickerProgressResult.data ?? []) as UserStickerProgress[],
  };
}