// Daily job: for every watched product, re-run the multi-store search, record
// the best price, detect a drop, and send an alert. Run it from cron / Task
// Scheduler once a day:  node scripts/check-prices.mjs
//
// It imports the compiled TS via tsx in dev, or you can precompile. To keep it
// dependency-light here, the logic lives in lib/*.ts and is loaded through the
// Next build in production; for a standalone run use:  npx tsx scripts/check-prices.mjs

import { searchAll } from "../lib/sources/index.ts";
import { listWatch, recordPoint } from "../lib/store.ts";
import { detectDrop, alertMessage, sendAlert } from "../lib/alerts.ts";

const ALERT_TO = process.env.ALERT_EMAIL || "";

async function main() {
  const items = await listWatch();
  if (!items.length) {
    console.log("Radar vazio — nada a checar.");
    return;
  }
  console.log(`Checando ${items.length} produto(s)…`);

  for (const item of items) {
    try {
      const res = await searchAll(item.query, item.region);
      if (!res.offers.length) {
        console.log(`• ${item.query}: sem ofertas (${res.notes.join("; ") || "vazio"})`);
        continue;
      }
      const best = res.offers[0];
      const point = { at: new Date().toISOString(), price: best.price, store: best.store, currency: best.currency };
      const d = detectDrop(item, point);
      await recordPoint(item.id, point);

      const tag = d.drop ? "📉 QUEDA" : "—";
      console.log(`• ${item.query}: ${best.price} ${best.currency} em ${best.store} ${tag}`);

      if (d.drop && ALERT_TO) {
        const msg = alertMessage(item, d, best.currency);
        const how = await sendAlert(ALERT_TO, msg.subject, msg.text);
        console.log(`   alerta ${how}: ${msg.subject}`);
      }
    } catch (e) {
      console.error(`• ${item.query}: erro`, e?.message || e);
    }
  }
  console.log("Pronto.");
}

main();
