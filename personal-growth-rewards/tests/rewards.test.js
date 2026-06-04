import test from "node:test";
import assert from "node:assert/strict";
import { addDays, calculate } from "../shared/rewards.js";

const full = (start, days, values = { english: true, exercise: true, sleep: true }) =>
  Array.from({ length: days }, (_, i) => ({ date: addDays(start, i), ...values }));

test("weekly full attendance stacks rewards and doubles all rewards", () => {
  const summary = calculate(full("2026-01-01", 7), "2026-01-07");
  assert.equal(summary.coins, 21);
  assert.equal(summary.rewards.length, 4);
  assert.equal(summary.totalReward, (100 + 50 * 3) * 2);
  assert.equal(summary.periods[0].perfect, true);
});

test("coin target reward is awarded without perfect attendance", () => {
  const entries = full("2026-01-01", 7).map((e, i) => ({ ...e, sleep: i < 6 }));
  const summary = calculate(entries, "2026-01-07");
  assert.equal(summary.periods[0].coins, 20);
  assert.equal(summary.periods[0].perfect, false);
  assert.equal(summary.rewards.find((r) => r.label === "周金币达标")?.finalAmount, 100);
});

test("changing a record naturally recalculates and rolls back rewards", () => {
  const entries = full("2026-01-01", 7);
  const before = calculate(entries, "2026-01-07").totalReward;
  entries[0].english = false;
  const after = calculate(entries, "2026-01-07").totalReward;
  assert.ok(after < before);
});

test("month periods follow the first check-in anniversary", () => {
  const entries = full("2026-01-31", 29);
  const summary = calculate(entries, "2026-02-28");
  const month = summary.periods.find((period) => period.type === "月");
  assert.equal(month.start, "2026-02-28");
  assert.equal(month.end, "2026-03-30");
});
