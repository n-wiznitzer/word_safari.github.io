export interface Theme {
  id: number;
  name: string;
}

export interface VocabularyCard {
  id: number;
  word: string;
  emoji: string | null;
  category: string | null;
  level: number;
  pic_type: string | null;
  pic_data: Record<string, unknown> | null;
}

export interface Activity {
  id: number;
  name: string;
  start_level: number;
  end_level: number;
  theme_activity: string | null;
}

export interface Sticker {
  id: number;
  name: string;
  emoji: string;
}

export interface UserCardProgress {
  card_id: number;
  sessions_complete: number;
  correct_streak: number;
  is_mastered: boolean;
}

export interface UserStickerProgress {
  sticker_id: number;
  sticker_count: number;
}

export interface GameData {
  themes: Theme[];
  cards: VocabularyCard[];
  activities: Activity[];
  stickers: Sticker[];
  cardProgress: UserCardProgress[];
  stickerProgress: UserStickerProgress[];
}