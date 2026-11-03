import { z } from "zod";
import { getSurahByNumber } from "./quran-data";

export const STATUSES = ["learned", "learning", "planned"] as const;

/** A memorization item as accepted from forms and imports. */
export const itemSchema = z
  .object({
    surah_number: z.coerce.number().int().min(1).max(114),
    ayah_from: z.coerce.number().int().min(1),
    ayah_to: z.coerce.number().int().min(1),
    status: z.enum(STATUSES).default("planned"),
    rating: z.preprocess(
      (v) => (v === "" || v === undefined ? null : v),
      z.coerce.number().int().min(1).max(5).nullable(),
    ),
    notes: z.string().max(2000).nullish().transform((v) => v ?? ""),
  })
  .refine((i) => i.ayah_from <= i.ayah_to, {
    message: "Start ayah must be less than or equal to end ayah",
  })
  .refine((i) => i.ayah_to <= (getSurahByNumber(i.surah_number)?.totalAyahs ?? 0), {
    message: "Ayah range is outside this surah",
  });

export type ItemInput = z.infer<typeof itemSchema>;

export function parseItem(input: unknown) {
  const r = itemSchema.safeParse(input);
  return r.success
    ? { data: r.data }
    : { error: r.error.issues[0]?.message ?? "Invalid item" };
}
