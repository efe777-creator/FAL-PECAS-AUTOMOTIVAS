# FAL PAY — Conexão MCP (Asaas + Mercado Pago)

**Data:** 2026-11-15

## Asaas (documentação — oficial)

No [`.cursor/mcp.json`](../../.cursor/mcp.json) foi adicionado:

```json
"asaas-docs": {
  "type": "http",
  "url": "https://docs.asaas.com/mcp"
}
```

- **Uso:** consultar documentação, schemas e endpoints na IDE (sem API key no JSON).
- **Operações autenticadas:** configurar `ASAAS_API_KEY` apenas em Supabase Secrets / variáveis locais seguras, nunca no prompt nem no repositório.
- Referência: [MCP Server (AI) — Asaas](https://docs.asaas.com/docs/mcp-server-ai)

## Mercado Pago

Já configurado: `mercadopago-mcp-server` → `https://mcp.mercadopago.com/mcp`  
Autenticar no Cursor quando solicitado (conector MCP).

## Supabase

MCP Supabase disponível no ambiente do agente para migrations e funções.

## Ops após código (humano)

1. `supabase secrets set ASAAS_API_KEY=… ASAAS_ENV=sandbox ASAAS_WEBHOOK_TOKEN=…`
2. Redeploy: `create-asaas-payment`, `asaas-webhook`, `create-mp-payment` (guard de rota)
3. Aplicar migration `20261115010000_fal_pay_hybrid_routing_asaas.sql`
4. Registrar webhook Asaas apontando para `/functions/v1/asaas-webhook`