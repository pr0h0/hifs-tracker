import assert from "node:assert/strict";
import { calculateSM2 } from "./sm2.ts";

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

// Good reviews: 1 day, 3 days, then interval * efactor.
let r = calculateSM2(4, 0, 0, 2.5);
assert.deepEqual([r.interval, r.repetition], [1, 1]);
close(r.efactor, 2.5);
r = calculateSM2(4, r.interval, r.repetition, r.efactor);
assert.deepEqual([r.interval, r.repetition], [3, 2]);
r = calculateSM2(4, r.interval, r.repetition, r.efactor);
assert.deepEqual([r.interval, r.repetition], [8, 3]); // round(3 * 2.5)

// 5 stars raises efactor, 3 stars lowers it.
close(calculateSM2(5, 0, 0, 2.5).efactor, 2.6);
close(calculateSM2(3, 0, 0, 2.5).efactor, 2.36);

// Ratings 1-2 reset the item to tomorrow.
for (const q of [1, 2]) {
  r = calculateSM2(q, 8, 3, 2.5);
  assert.deepEqual([r.interval, r.repetition], [1, 0]);
}
close(calculateSM2(1, 8, 3, 2.5).efactor, 1.7);

// efactor never drops below 1.3, interval never exceeds 14 days.
close(calculateSM2(1, 1, 0, 1.3).efactor, 1.3);
assert.equal(calculateSM2(5, 14, 6, 2.5).interval, 14);
