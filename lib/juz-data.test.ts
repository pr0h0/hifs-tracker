// Run: node --experimental-strip-types lib/juz-data.test.ts
import assert from "node:assert/strict";
import { QURAN_AYAHS, ayahCoverage, juzOfRange, juzSqlFilter } from "./juz-data.ts";

assert.equal(QURAN_AYAHS, 6236);
assert.deepEqual(juzOfRange({ surah_number: 2, ayah_from: 1, ayah_to: 10 }), [1]);
assert.deepEqual(juzOfRange({ surah_number: 2, ayah_from: 140, ayah_to: 145 }), [1, 2]);
// Overlapping items count once, learned beats learning.
const c = ayahCoverage(
  [
    { surah_number: 2, ayah_from: 1, ayah_to: 10, status: "learning" },
    { surah_number: 2, ayah_from: 5, ayah_to: 20, status: "learned" },
  ],
  1,
);
assert.deepEqual(c, { total: 148, learned: 16, learning: 4, planned: 0 });
assert.equal(ayahCoverage([{ surah_number: 2, ayah_from: 1, ayah_to: 10, status: "learned" }], 2).learned, 0);
assert.deepEqual(juzSqlFilter(30).params.slice(0, 3), [78, 1, 40]);
console.log("juz-data ok");
