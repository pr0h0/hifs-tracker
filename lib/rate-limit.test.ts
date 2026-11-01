import assert from "node:assert/strict";
import { clearFailures, isLimited, recordFailure } from "./rate-limit.ts";

const t = 1_000_000;
for (let i = 0; i < 4; i++) recordFailure("a", t);
assert.equal(isLimited("a", 5, t), false);
recordFailure("a", t);
assert.equal(isLimited("a", 5, t), true);
// Window expires after 15 minutes.
assert.equal(isLimited("a", 5, t + 15 * 60 * 1000), false);
recordFailure("a", t + 15 * 60 * 1000);
assert.equal(isLimited("a", 1, t + 15 * 60 * 1000), true);
assert.equal(isLimited("a", 2, t + 15 * 60 * 1000), false);
// Success clears it; keys are independent.
clearFailures("a");
assert.equal(isLimited("a", 1, t), false);
assert.equal(isLimited("b", 1, t), false);
