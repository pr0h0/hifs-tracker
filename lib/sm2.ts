const MAX_INTERVAL = 14;

export interface SM2Result {
  interval: number;
  repetition: number;
  efactor: number;
}

export function calculateSM2(
  quality: number, // 1-5 rating
  previousInterval: number,
  previousRepetition: number,
  previousEfactor: number,
): SM2Result {
  // Map 1-5 scale to SM-2's 0-5 scale (1->0, 2->1, 3->3, 4->4, 5->5)
  const q = quality <= 1 ? 0 : quality <= 2 ? 1 : quality + 0;

  let interval: number;
  let repetition: number;
  let efactor: number;

  // Calculate new efactor
  efactor = previousEfactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (efactor < 1.3) efactor = 1.3;

  if (q < 3) {
    // If quality is below 3 (our rating 1-2), reset repetition
    repetition = 0;
    interval = 1;
  } else {
    repetition = previousRepetition + 1;
    if (repetition === 1) {
      interval = 1;
    } else if (repetition === 2) {
      interval = 3;
    } else {
      interval = Math.round(previousInterval * efactor);
    }
  }

  // Cap at max interval
  if (interval > MAX_INTERVAL) interval = MAX_INTERVAL;

  return { interval, repetition, efactor };
}

export interface ReviewQueueItem {
  id: number;
  item_id: number;
  surah_number: number;
  ayah_from: number;
  ayah_to: number;
  status: string;
  rating: number | null;
  notes: string;
  surah_name?: string;
  surah_name_arabic?: string;
  total_ayahs?: number;
  // SM-2 fields (null for learning items)
  interval?: number;
  repetition?: number;
  efactor?: number;
  due_date?: string;
  source: "learning" | "due" | "random";
}

export function getTargetQueueSize(
  items: { ayah_from: number; ayah_to: number }[],
): number {
  if (items.length === 0) return 5;

  const avgLength =
    items.reduce((sum, item) => sum + (item.ayah_to - item.ayah_from + 1), 0) /
    items.length;

  if (avgLength > 80) return 2;
  if (avgLength > 20) return 3;
  return 5;
}
