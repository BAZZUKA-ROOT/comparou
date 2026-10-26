// Alert logic tests — pure, no network. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectDrop } from "../lib/alerts.ts";

function item(history, targetPrice) {
  return { id: "x", query: "q", region: "BR", createdAt: "", targetPrice, history };
}
const pt = (price) => ({ at: "2026-10-26", price, store: "s", currency: "BRL" });

test("new low triggers a drop", () => {
  const it = item([pt(100), pt(95), pt(98)]);
  const d = detectDrop(it, pt(90));
  assert.equal(d.drop, true);
  assert.equal(d.reason, "new-low");
});

test("target price triggers a drop", () => {
  const it = item([pt(100)], 80);
  const d = detectDrop(it, pt(79));
  assert.equal(d.drop, true);
  assert.equal(d.reason, "target");
});

test("small wiggle does not trigger", () => {
  const it = item([pt(100), pt(99)]);
  const d = detectDrop(it, pt(99.5)); // +0.5% vs prev, above prev low
  assert.equal(d.drop, false);
});

test("2%+ decrease vs yesterday triggers (but not a new all-time low)", () => {
  const it = item([pt(180), pt(200)]); // all-time low is 180
  const d = detectDrop(it, pt(195));   // -2.5% vs yesterday(200), still above 180
  assert.equal(d.drop, true);
  assert.equal(d.reason, "decrease");
});

test("first ever reading never drops without target", () => {
  const it = item([]);
  const d = detectDrop(it, pt(123));
  assert.equal(d.drop, false);
});
