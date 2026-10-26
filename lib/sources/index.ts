// Source registry: runs every adapter, merges and de-duplicates offers.
// Add a new store by writing an adapter and registering it here — the rest of
// the app (API, UI, alerts) doesn't change.

import type { Offer, SearchResult } from "../types";
import { searchGoogle } from "./google";
import { searchMercadoLivre } from "./mercadolivre";

export async function searchAll(
  query: string,
  region: "BR" | "EX",
  fetchImpl: typeof fetch = fetch
): Promise<SearchResult> {
  const notes: string[] = [];
  let partial = false;
  const all: Offer[] = [];

  // Google covers many stores at once.
  const g = await searchGoogle(query, region, fetchImpl);
  if (g.blocked) {
    partial = true;
    notes.push("O Google bloqueou a consulta automática (limite de robôs). Tente de novo mais tarde ou use um proxy/SERP API.");
  } else if (g.error) {
    partial = true;
    notes.push(`Google: ${g.error}`);
  }
  all.push(...g.offers);

  // Mercado Livre as a reliable extra source for Brazil.
  if (region === "BR") {
    const ml = await searchMercadoLivre(query, fetchImpl);
    if (ml.blocked) {
      partial = true;
      notes.push("Mercado Livre exige um token de acesso (defina ML_ACCESS_TOKEN).");
    } else if (ml.error) {
      partial = true;
      notes.push(`Mercado Livre: ${ml.error}`);
    }
    all.push(...ml.offers);
  }

  // merge duplicates (same store + very close title + same price)
  const merged: Offer[] = [];
  const seen = new Set<string>();
  for (const o of all.sort((a, b) => a.price - b.price)) {
    const key = o.store.toLowerCase() + "|" + Math.round(o.price) + "|" + o.title.slice(0, 24).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(o);
  }

  if (merged.length === 0 && !partial) {
    notes.push("Nenhuma oferta encontrada para esse termo.");
  }

  return { query, region, offers: merged, partial, notes };
}
