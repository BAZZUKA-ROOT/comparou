// Tiny JSON-file store for the watchlist + price history.
// No native modules, runs anywhere. Swap for Postgres/SQLite in production.

import { promises as fs } from "fs";
import path from "path";
import type { WatchItem, PricePoint } from "./types";

const DATA_DIR = process.env.COMPAROU_DATA || path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "watch.json");

export function slug(query: string, region: string): string {
  return region + ":" + query.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

async function readAll(): Promise<WatchItem[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function writeAll(items: WatchItem[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(items, null, 2), "utf8");
}

export async function listWatch(): Promise<WatchItem[]> {
  return readAll();
}

export async function addWatch(query: string, region: "BR" | "EX", targetPrice?: number): Promise<WatchItem> {
  const items = await readAll();
  const id = slug(query, region);
  let item = items.find((i) => i.id === id);
  if (!item) {
    item = { id, query, region, createdAt: new Date().toISOString(), targetPrice, history: [] };
    items.push(item);
  } else if (targetPrice != null) {
    item.targetPrice = targetPrice;
  }
  await writeAll(items);
  return item;
}

export async function removeWatch(id: string): Promise<void> {
  const items = (await readAll()).filter((i) => i.id !== id);
  await writeAll(items);
}

export async function recordPoint(id: string, point: PricePoint): Promise<void> {
  const items = await readAll();
  const item = items.find((i) => i.id === id);
  if (!item) return;
  item.history.push(point);
  // keep last 120 points
  if (item.history.length > 120) item.history = item.history.slice(-120);
  await writeAll(items);
}
