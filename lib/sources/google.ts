// Google Shopping source adapter.
//
// Fetches the Google Shopping results page server-side (so the browser's CORS
// doesn't apply) and parses product offers across multiple stores from one query.
//
// REALITY CHECK, on purpose and documented so nobody is surprised:
//   * Google rate-limits and blocks automated requests. After a handful of
//     queries from the same IP it returns a consent/CAPTCHA page. This adapter
//     DETECTS that and returns `blocked: true` instead of pretending — it never
//     tries to solve a CAPTCHA.
//   * Google's HTML is obfuscated and changes often, so the parser is
//     best-effort and will need maintenance. We parse defensively and return
//     whatever we can.
//   * For production reliability you run this behind rotating proxies or swap in
//     a paid SERP API — the adapter interface stays the same.

import * as cheerio from "cheerio";
import type { Offer } from "../types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export interface GoogleResult {
  offers: Offer[];
  blocked: boolean;
  error?: string;
}

function parseBRL(text: string): number | null {
  // "R$ 1.299,90" -> 1299.90 ; "US$ 1,299.90" -> 1299.90
  const m = text.match(/(?:R\$|US\$|\$)\s*([\d.,]+)/);
  if (!m) return null;
  let n = m[1];
  if (n.includes(",") && n.includes(".")) {
    // last separator is the decimal one
    if (n.lastIndexOf(",") > n.lastIndexOf(".")) n = n.replace(/\./g, "").replace(",", ".");
    else n = n.replace(/,/g, "");
  } else if (n.includes(",")) {
    n = n.replace(",", ".");
  }
  const v = parseFloat(n);
  return isFinite(v) ? v : null;
}

function looksBlocked(html: string): boolean {
  const h = html.toLowerCase();
  return (
    h.includes("our systems have detected unusual traffic") ||
    h.includes("/sorry/") ||
    h.includes("recaptcha") ||
    h.includes("consent.google.com") ||
    h.includes("enablejs") // consent interstitial
  );
}

export async function searchGoogle(
  query: string,
  region: "BR" | "EX",
  fetchImpl: typeof fetch = fetch
): Promise<GoogleResult> {
  const tld = region === "BR" ? "com.br" : "com";
  const gl = region === "BR" ? "br" : "us";
  const hl = region === "BR" ? "pt-BR" : "en";
  const url =
    `https://www.google.${tld}/search?tbm=shop&q=${encodeURIComponent(query)}` +
    `&gl=${gl}&hl=${hl}`;

  let html: string;
  try {
    const res = await fetchImpl(url, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": `${hl},${hl.split("-")[0]};q=0.9`,
        Accept: "text/html,application/xhtml+xml",
      },
    });
    html = await res.text();
    if (res.status === 429 || res.status === 503) {
      return { offers: [], blocked: true, error: `HTTP ${res.status}` };
    }
  } catch (e: any) {
    return { offers: [], blocked: false, error: e?.message || "network error" };
  }

  if (looksBlocked(html)) return { offers: [], blocked: true };

  return { offers: parseShoppingHtml(html, region), blocked: false };
}

// Exported so tests can run it against a saved fixture without any network.
export function parseShoppingHtml(html: string, region: "BR" | "EX"): Offer[] {
  const $ = cheerio.load(html);
  const currency = region === "BR" ? "BRL" : "USD";
  const offers: Offer[] = [];
  const seen = new Set<string>();

  // Google Shopping cards have varied class names over time; we target the
  // stable shape instead: a block that contains a price-looking string plus a
  // merchant label. We scan candidate containers and extract defensively.
  $("div").each((_, el) => {
    const $el = $(el);
    // only leaf-ish cards: skip huge containers
    if ($el.find("div").length > 12) return;
    const text = $el.text();
    if (!/(?:R\$|US\$|\$)\s*[\d.,]+/.test(text)) return;

    const price = parseBRL(text);
    if (price == null || price <= 0) return;

    // title: prefer a heading/link with the longest alphabetic text
    let title = "";
    $el.find("a, h3, h4, span").each((__, n) => {
      const t = $(n).text().trim();
      if (t.length > title.length && /[a-zA-Z]{4,}/.test(t) && !/(?:R\$|US\$|\$)/.test(t)) {
        title = t;
      }
    });
    if (!title || title.length < 4) return;

    // store/merchant: look for a line like "Magazine Luiza", "Amazon.com.br"
    let store = "";
    $el.find("span, div, cite").each((__, n) => {
      const t = $(n).text().trim();
      if (
        !store &&
        t.length >= 3 &&
        t.length <= 40 &&
        !/(?:R\$|US\$|\$)/.test(t) &&
        /[a-zA-Z]/.test(t) &&
        t !== title &&
        !t.includes("\n")
      ) {
        if (/loja|store|\.com|magaz|amazon|americ|shopee|casas|aliexpress|ebay|mercado/i.test(t))
          store = t;
      }
    });
    if (!store) store = "Loja (via Google)";

    // link
    let href = "";
    const a = $el.find("a[href]").first();
    if (a.length) {
      href = a.attr("href") || "";
      if (href.startsWith("/url?")) {
        const u = new URLSearchParams(href.slice(5)).get("q");
        if (u) href = u;
      }
      if (href.startsWith("/")) href = "https://www.google.com" + href;
    }

    const key = title.slice(0, 50) + "|" + price + "|" + store;
    if (seen.has(key)) return;
    seen.add(key);

    offers.push({
      store: store.replace(/\s+/g, " ").trim(),
      title: title.replace(/\s+/g, " ").trim().slice(0, 140),
      price,
      currency,
      url: href || `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(title)}`,
      source: "google",
    });
  });

  return offers.sort((a, b) => a.price - b.price);
}
