// Mercado Livre source adapter (fallback that works without scraping).
//
// ML's public search endpoint historically served anonymous queries; some
// deployments now require an OAuth token. We try anonymous first; if a token is
// present in ML_ACCESS_TOKEN we send it. On 401/403 we return blocked so the UI
// can tell the user a token is needed, instead of silently returning nothing.

import type { Offer } from "../types";

export interface MLResult {
  offers: Offer[];
  blocked: boolean;
  error?: string;
}

export async function searchMercadoLivre(
  query: string,
  fetchImpl: typeof fetch = fetch
): Promise<MLResult> {
  const token = process.env.ML_ACCESS_TOKEN;
  const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(query)}&limit=12`;
  try {
    const res = await fetchImpl(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.status === 401 || res.status === 403) {
      return { offers: [], blocked: true, error: `ML exige token (HTTP ${res.status})` };
    }
    if (!res.ok) return { offers: [], blocked: false, error: `HTTP ${res.status}` };
    const data: any = await res.json();
    const offers: Offer[] = (data.results || []).map((r: any) => ({
      store: "Mercado Livre",
      title: String(r.title || "").slice(0, 140),
      price: Number(r.price) || 0,
      currency: r.currency_id === "BRL" ? "BRL" : r.currency_id || "BRL",
      url: r.permalink || "",
      image: r.thumbnail,
      source: "mercadolivre",
    })).filter((o: Offer) => o.price > 0);
    return { offers, blocked: false };
  } catch (e: any) {
    return { offers: [], blocked: false, error: e?.message || "network error" };
  }
}
