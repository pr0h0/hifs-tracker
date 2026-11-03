export interface MemorizationItem {
  id: number;
  user_id: number;
  surah_number: number;
  ayah_from: number;
  ayah_to: number;
  status: "learned" | "learning" | "planned";
  rating: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}
