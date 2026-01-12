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

```bash
npm run dev
```

Acesse: http://localhost:3000

## Funcionalidades
- Resumo com sinal (comprar/vender/ficar fora)
- Consulta geral com tabela paginada e filtro por ticker
- Tendencia (alta/baixa/lateral) e score por confluencia
- Analises modulares (tendencia, padrao, volume, momento, risco e score)
- Cache local (TTL 24h) para reduzir chamadas

## Arquitetura (C4)
- `docs/arq/C1.md`
- `docs/arq/C2.md`
- `docs/arq/C3.md`
- `docs/arq/C4.md`

## Notas
- Alguns ativos exigem plano com permissao especifica (ex.: BDR).
- Ajuste `BRAPI_TICKER_TYPES` no `.env` se quiser listar outros tipos.
