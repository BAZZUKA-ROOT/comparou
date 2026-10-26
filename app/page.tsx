"use client";

import { useEffect, useState } from "react";

interface Offer {
  store: string; title: string; price: number; currency: string; url: string; source: string;
}
interface SearchResult {
  query: string; region: "BR" | "EX"; offers: Offer[]; partial: boolean; notes: string[];
}
interface WatchItem {
  id: string; query: string; region: "BR" | "EX"; targetPrice?: number;
  history: { at: string; price: number; store: string; currency: string }[];
}

const money = (v: number, c: string) =>
  new Intl.NumberFormat(c === "USD" ? "en-US" : "pt-BR", { style: "currency", currency: c }).format(v);

export default function Home() {
  const [tab, setTab] = useState<"buscar" | "radar">("buscar");
  const [q, setQ] = useState("");
  const [region, setRegion] = useState<"BR" | "EX">("BR");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [watch, setWatch] = useState<WatchItem[]>([]);

  async function loadWatch() {
    try { const r = await fetch("/api/watch"); setWatch(await r.json()); } catch {}
  }
  useEffect(() => { loadWatch(); }, []);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q.trim()) return;
    setLoading(true); setResult(null);
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&region=${region}`);
      setResult(await r.json());
    } catch {
      setResult({ query: q, region, offers: [], partial: true, notes: ["Falha de rede."] });
    } finally { setLoading(false); }
  }

  async function addWatch() {
    await fetch("/api/watch", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, region }),
    });
    loadWatch();
  }
  async function del(id: string) {
    await fetch(`/api/watch?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    loadWatch();
  }

  return (
    <main className="wrap">
      <header>
        <div className="logo"><span>◆</span> Comparou</div>
        <nav>
          <button className={tab === "buscar" ? "on" : ""} onClick={() => setTab("buscar")}>Buscar</button>
          <button className={tab === "radar" ? "on" : ""} onClick={() => { setTab("radar"); loadWatch(); }}>Radar</button>
        </nav>
      </header>

      {tab === "buscar" && (
        <section>
          <div className="region">
            <button className={region === "BR" ? "on" : ""} onClick={() => setRegion("BR")}>🇧🇷 Brasil</button>
            <button className={region === "EX" ? "on" : ""} onClick={() => setRegion("EX")}>🌎 Exterior</button>
          </div>
          <form className="searchbox" onSubmit={search}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="iPhone 15, PS5, Air Fryer…" />
            <button type="submit" disabled={loading}>{loading ? "Buscando…" : "Buscar"}</button>
          </form>

          {result && (
            <>
              {result.notes.length > 0 && (
                <div className="notes">{result.notes.map((n, i) => <p key={i}>⚠ {n}</p>)}</div>
              )}
              {result.offers.length > 0 && (
                <>
                  <div className="best">Menor preço: <b>{money(result.offers[0].price, result.offers[0].currency)}</b> em {result.offers[0].store}
                    <button className="add" onClick={addWatch}>+ Radar</button>
                  </div>
                  <ul className="offers">
                    {result.offers.map((o, i) => (
                      <li key={i} className={i === 0 ? "best-row" : ""}>
                        <span className="store">{o.store}</span>
                        <span className="title">{o.title}</span>
                        <span className="price">{money(o.price, o.currency)}</span>
                        <a href={o.url} target="_blank" rel="noopener">Ver ↗</a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {result.offers.length === 0 && !loading && <p className="empty">Nenhuma oferta agora.</p>}
            </>
          )}
        </section>
      )}

      {tab === "radar" && (
        <section>
          <h2>Radar diário</h2>
          <p className="muted">O script <code>check-prices</code> roda uma vez por dia, registra o menor preço e avisa quando cai.</p>
          {watch.length === 0 && <p className="empty">Nada no radar. Busque um produto e toque em “+ Radar”.</p>}
          <ul className="radar">
            {watch.map((w) => {
              const h = w.history;
              const now = h.length ? h[h.length - 1] : null;
              const prev = h.length > 1 ? h[h.length - 2] : null;
              const diff = now && prev ? now.price - prev.price : 0;
              return (
                <li key={w.id}>
                  <div>
                    <div className="rname">{w.query} <small>({w.region})</small></div>
                    <div className="rprice">{now ? money(now.price, now.currency) : "sem leitura ainda"}</div>
                    {prev && <div className={diff < 0 ? "down" : diff > 0 ? "up" : "flat"}>
                      {diff < 0 ? "▼" : diff > 0 ? "▲" : "▬"} {money(Math.abs(diff), now!.currency)} vs ontem
                    </div>}
                  </div>
                  <button onClick={() => del(w.id)}>✕</button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <style>{css}</style>
    </main>
  );
}

const css = `
  :root{--bg:#f6f5f2;--surface:#fff;--fg:#1c1b19;--muted:#6b6760;--line:#e4e0d8;--accent:#e07a1f;--down:#2f8f4e;--up:#c43d2e}
  @media(prefers-color-scheme:dark){:root{--bg:#14130f;--surface:#1e1c17;--fg:#f2efe8;--muted:#a49e90;--line:#332f25;--accent:#f0923a;--down:#5fbd7f;--up:#e8715f}}
  body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}
  .wrap{max-width:720px;margin:0 auto;padding:16px}
  header{display:flex;align-items:center;gap:16px;margin-bottom:18px}
  .logo{font-weight:800;font-size:22px} .logo span{color:var(--accent)}
  header nav{margin-left:auto;display:flex;gap:6px}
  header nav button,.region button{border:1px solid var(--line);background:var(--surface);color:var(--fg);padding:7px 14px;border-radius:999px;font-weight:600;cursor:pointer}
  header nav button.on,.region button.on{background:var(--accent);color:#fff;border-color:transparent}
  .region{display:flex;gap:6px;margin-bottom:12px}
  .searchbox{display:flex;gap:8px;margin-bottom:14px}
  .searchbox input{flex:1;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--fg);font-size:16px}
  .searchbox button{padding:0 18px;border:none;border-radius:10px;background:var(--accent);color:#fff;font-weight:700;cursor:pointer}
  .notes{background:#fff3e6;border:1px solid var(--accent);color:#8a4406;border-radius:10px;padding:8px 12px;font-size:13px;margin-bottom:12px}
  @media(prefers-color-scheme:dark){.notes{background:#2c2316;color:#f6b877}}
  .best{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:10px;display:flex;align-items:center;gap:10px}
  .best .add{margin-left:auto;border:1px solid var(--accent);background:transparent;color:var(--accent);border-radius:8px;padding:6px 10px;font-weight:600;cursor:pointer}
  ul{list-style:none;margin:0;padding:0}
  .offers li{display:grid;grid-template-columns:auto 1fr auto auto;gap:10px;align-items:center;padding:11px;border:1px solid var(--line);border-top:none;background:var(--surface)}
  .offers li:first-child{border-top:1px solid var(--line);border-radius:10px 10px 0 0}
  .offers li:last-child{border-radius:0 0 10px 10px}
  .offers li.best-row{background:linear-gradient(90deg,#fbead9,transparent)}
  @media(prefers-color-scheme:dark){.offers li.best-row{background:linear-gradient(90deg,#2c2316,transparent)}}
  .offers .store{font-weight:700;font-size:13px} .offers .title{color:var(--muted);font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
  .offers .price{font-weight:700;font-variant-numeric:tabular-nums} .offers a{color:var(--accent);text-decoration:none;font-weight:600;font-size:13px}
  .radar li{display:flex;align-items:center;gap:10px;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);margin-bottom:8px}
  .radar li button{margin-left:auto;border:none;background:none;color:var(--muted);font-size:16px;cursor:pointer}
  .rname{font-weight:600} .rprice{font-weight:700;font-size:17px;font-variant-numeric:tabular-nums}
  .down{color:var(--down);font-weight:700;font-size:13px} .up{color:var(--up);font-weight:700;font-size:13px} .flat{color:var(--muted);font-size:13px}
  .muted{color:var(--muted);font-size:13px} .empty{color:var(--muted);text-align:center;padding:30px}
  code{background:var(--surface);border:1px solid var(--line);padding:1px 5px;border-radius:5px}
`;
