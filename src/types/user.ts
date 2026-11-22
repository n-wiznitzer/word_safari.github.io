export interface LearnerProfile {
  id: number;
  name: string;
  username: string;
  auth_user_id: string;
  theme_id: number | null;
  card_level: number;
  activity_level: number;
  gold_stars: number;
}