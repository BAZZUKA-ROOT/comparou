// Shared types for the price comparison engine.

export interface Offer {
  store: string;        // "Mercado Livre", "Magalu", "Amazon"…
  title: string;        // product title as the store shows it
  price: number;        // numeric price in the region currency
  currency: string;     // "BRL" | "USD"
  url: string;          // link to the product/listing
  image?: string;
  source: string;       // which adapter produced it: "google" | "mercadolivre"
}

export interface SearchResult {
  query: string;
  region: "BR" | "EX";
  offers: Offer[];      // sorted cheapest first
  partial: boolean;     // true if some source was blocked/failed
  notes: string[];      // human-readable notes (e.g. "Google bloqueou a consulta")
}

export interface WatchItem {
  id: string;           // slug of the query
  query: string;
  region: "BR" | "EX";
  createdAt: string;
  targetPrice?: number; // alert when price <= this
  history: PricePoint[];
}

export interface PricePoint {
  at: string;           // ISO date
  price: number;        // best price found that day
  store: string;
  currency: string;
}
