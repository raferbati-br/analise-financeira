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

Para apontar para outra URL da API, ajuste `API_BASE` em `frontend/config.js`.

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

## Notas
- Alguns ativos exigem plano com permissao especifica (ex.: BDR).
- Ajuste `BRAPI_TICKER_TYPES` no `.env` se quiser listar outros tipos.
