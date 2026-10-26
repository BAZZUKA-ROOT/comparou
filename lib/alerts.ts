// Price-drop detection + notification.
//
// detectDrop() is pure and unit-tested. sendAlert() uses nodemailer with SMTP
// credentials from the environment; if none are set it logs instead of failing,
// so the daily job still runs in a dry mode.

import nodemailer from "nodemailer";
import type { WatchItem, PricePoint } from "./types";

export interface DropResult {
  drop: boolean;
  reason: "target" | "new-low" | "decrease" | null;
  previous: number | null;
  current: number;
  pct: number; // negative = cheaper
}

// Compare the newest point against the item's history/target.
export function detectDrop(item: WatchItem, current: PricePoint): DropResult {
  const prices = item.history.map((h) => h.price);
  const previous = prices.length ? prices[prices.length - 1] : null;
  const prevLow = prices.length ? Math.min(...prices) : null;
  const pct = previous ? ((current.price - previous) / previous) * 100 : 0;

  if (item.targetPrice != null && current.price <= item.targetPrice) {
    return { drop: true, reason: "target", previous, current: current.price, pct };
  }
  if (prevLow != null && current.price < prevLow) {
    return { drop: true, reason: "new-low", previous, current: current.price, pct };
  }
  // a meaningful decrease vs yesterday (>2%)
  if (previous != null && pct <= -2) {
    return { drop: true, reason: "decrease", previous, current: current.price, pct };
  }
  return { drop: false, reason: null, previous, current: current.price, pct };
}

function fmt(v: number, currency: string): string {
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "pt-BR", {
    style: "currency",
    currency,
  }).format(v);
}

export function alertMessage(item: WatchItem, d: DropResult, currency: string): { subject: string; text: string } {
  const now = fmt(d.current, currency);
  const was = d.previous != null ? fmt(d.previous, currency) : "—";
  const reasons: Record<string, string> = {
    target: `atingiu seu preço-alvo`,
    "new-low": `é o menor preço já registrado`,
    decrease: `caiu ${Math.abs(d.pct).toFixed(1)}%`,
  };
  const why = d.reason ? reasons[d.reason] : "mudou";
  return {
    subject: `📉 ${item.query}: ${now} (${why})`,
    text: `O preço de "${item.query}" ${why}.\n\nAgora: ${now}\nAntes: ${was}\n\nRadar Comparou.`,
  };
}

export async function sendAlert(to: string, subject: string, text: string): Promise<"sent" | "logged"> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log(`[alerta — modo dry-run, sem SMTP]\nPara: ${to}\n${subject}\n${text}\n`);
    return "logged";
  }
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  await transport.sendMail({ from: SMTP_USER, to, subject, text });
  return "sent";
}
