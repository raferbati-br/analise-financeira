# Analise Financeira

App simples para consultar precos e historico de acoes usando a API da brapi.dev.

## Requisitos
- Node.js 18+

## Setup
1) Instale dependencias:

```bash
npm install
```

2) Crie o arquivo de ambiente:

```bash
copy .env.example .env
```

3) Preencha seu token no `.env`:

```
BRAPI_API_KEY=SEU_TOKEN_AQUI
```

## Rodar em desenvolvimento

1) Backend (API):

```bash
npm run dev
```

API em: http://localhost:3000 (ou http://localhost:3000/api/v1)

2) Frontend (estatico):

```bash
npx serve -l 3001 frontend
```

Frontend em: http://localhost:3001

Para apontar para outra URL da API, ajuste `API_BASE` em `frontend/config/index.js`.

## Healthcheck
- `GET /health` retorna `{ "ok": true, "status": "up" }`

## Rate limit
- `RATE_LIMIT_WINDOW_MS`: janela em ms (padrao 60000)
- `RATE_LIMIT_MAX`: max de requests por IP na janela (padrao 120)

## Variaveis de configuracao
- `PORT`: porta do backend (padrao 3000)
- `BRAPI_API_KEY` / `BRAPI_TOKEN`: token da brapi.dev
- `BRAPI_TICKER_TYPES`: tipos aceitos na lista (padrao `stock`)
- `BRAPI_TIMEOUT_MS`: timeout da integracao (padrao 15000)
- `BRAPI_MAX_RETRIES`: retries em falha temporaria (padrao 2)
- `TICKERS_CACHE_TTL_MS`: TTL do cache de tickers (padrao 3600000)
- `QUOTE_CACHE_TTL_MS`: TTL do cache de quote (padrao 60000)
- `HISTORY_CACHE_TTL_MS`: TTL do cache de historico (padrao 300000)
- `CORS_ALLOW_ORIGIN`: origem permitida (padrao `*`)

## Funcionalidades
- Resumo com sinal (comprar/vender/ficar fora) e logos
- Consulta geral com tabela paginada (logo, ticker, ultimo, variacao, volume, score)
- Clique na linha do resumo ou da tabela abre painel com detalhe do score
- Tendencia (alta/baixa/lateral) e score por confluencia
- Painel do score detalha tendencia, setups, confirmacoes, momento e risco/retorno
- Analises modulares (tendencia, padrao, volume, momento, risco e score)
- Cache local (TTL 24h) para reduzir chamadas

## Estrutura de Pastas
- `backend/`: servidor Node.js (API)
- `frontend/`: app web estatico (HTML/CSS/JS), servido separadamente

## Arquitetura (C4)
- `docs/arq/C1.md`
- `docs/arq/C2.md`
- `docs/arq/C3.md`
- `docs/arq/C4.md`

## Contrato da API (OpenAPI)
- `docs/api/openapi.yaml`

## Notas
- Alguns ativos exigem plano com permissao especifica (ex.: BDR).
- Ajuste `BRAPI_TICKER_TYPES` no `.env` se quiser listar outros tipos.
