# Comparou

Comparador de preços multi-loja. A busca consulta o **Google Shopping** no servidor
(uma consulta traz o mesmo produto em várias lojas) e, no Brasil, soma o **Mercado
Livre** como fonte extra. Tem radar diário com histórico de preço e **alerta por
e-mail quando o preço cai**.

## Como funciona (e os limites, sem rodeios)

- **A busca é feita no servidor** (`/api/search`), não no navegador, para evitar o
  bloqueio de CORS. As lojas vêm do resultado do Google Shopping.
- **O Google bloqueia robôs.** Depois de algumas consultas do mesmo IP ele devolve
  CAPTCHA/consent. O adaptador **detecta isso e retorna `partial: true` com um
  aviso** — ele não tenta resolver CAPTCHA. Para uso intenso: rode atrás de proxies
  rotativos ou troque o adaptador por uma SERP API paga. A interface não muda.
- O parser do HTML do Google é **best-effort** e pode precisar de manutenção quando
  o Google mudar o layout. Ele é defensivo: extrai o que der e nunca quebra a página.
- **Mercado Livre** pode exigir um token OAuth (grátis). Sem token, se vier 403, o
  app apenas pula o ML e segue com o Google.

## Rodar

```bash
npm install
cp .env.example .env.local   # preencha o que quiser (tudo é opcional p/ testar)
npm run dev                  # http://localhost:3000
```

> A busca ao vivo só funciona onde a rede alcança google.com — ou seja, na sua
> máquina/servidor. Em ambientes de rede fechada a busca volta `partial` com aviso.

## Radar diário + alertas

O radar guarda os produtos em `data/watch.json`. O job diário re-busca cada um,
grava o menor preço do dia e dispara alerta quando cai:

```bash
node scripts/check-prices.mjs      # use: npx tsx scripts/check-prices.mjs
```

Agende 1x/dia:
- **Windows (Agendador de Tarefas)**: ação `node`, argumento o caminho do script.
- **Linux (cron)**: `0 9 * * * cd /caminho/comparou && npx tsx scripts/check-prices.mjs`

Quando `ALERT_EMAIL` e as variáveis `SMTP_*` estão preenchidas, o alerta vai por
e-mail; sem elas, roda em **dry-run** e só imprime no console.

## Adicionar mais lojas

Escreva um adaptador em `lib/sources/` que exporte uma função
`(query, region) => { offers, blocked, error }` e registre em
`lib/sources/index.ts`. O resto do app (API, UI, alertas) não muda.

## Testes

```bash
npm test   # testa o parser (contra um fixture offline) e a lógica de alerta
```

## Stack

Next.js 14 (App Router) · TypeScript · cheerio (parse) · nodemailer (e-mail) ·
armazenamento em JSON (troque por Postgres/SQLite em produção).

## Aviso legal

Fazer scraping do Google e de lojas pode violar os Termos de Uso desses serviços e
é frágil por natureza. Use com responsabilidade; para um produto de verdade,
prefira feeds oficiais ou uma API agregadora licenciada.
