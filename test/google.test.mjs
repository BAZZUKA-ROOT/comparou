// Parser test against the offline fixture. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseShoppingHtml } from "../lib/sources/google.ts";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "../fixtures/google-sample.html"), "utf8");

test("parses offers from a shopping page and sorts cheapest first", () => {
  const offers = parseShoppingHtml(html, "BR");
  assert.ok(offers.length >= 3, `expected >=3 offers, got ${offers.length}`);
  // cheapest first
  for (let i = 1; i < offers.length; i++) {
    assert.ok(offers[i].price >= offers[i - 1].price, "offers must be sorted ascending");
  }
  // the Amazon 3999.90 should be the cheapest
  assert.equal(offers[0].price, 3999.9);
  // currency + source tagged
  assert.equal(offers[0].currency, "BRL");
  assert.equal(offers[0].source, "google");
  // real store link extracted from /url?q=
  assert.ok(offers.some((o) => o.url.includes("amazon.com.br")));
});

test("blocked/empty html yields no offers (no crash)", () => {
  assert.deepEqual(parseShoppingHtml("<html><body>nope</body></html>", "BR"), []);
});
