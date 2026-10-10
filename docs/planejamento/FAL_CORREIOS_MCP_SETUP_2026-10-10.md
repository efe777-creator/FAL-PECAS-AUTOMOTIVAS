# Setup MCP Correios (Cursor) — FAL 3.0

**Data:** 2026-10-10  
**Pacote:** `@codespar/mcp-correios@0.2.0-alpha.3`  
**Config:** [`.cursor/mcp.json`](../../.cursor/mcp.json) → servidor `correios`

---

## Papel

MCP = ferramenta do **agente/operador** (rastreio, CEP, cálculo, serviços).  
Loja em produção usa **Edge `quote-shipping`** + secrets Supabase — nunca o MCP como backend da vitrine.

---

## Ativar (eFe)

1. Obter `CORREIOS_USER` e `CORREIOS_TOKEN` no CWS (contrato Correios).  
2. Preencher em `.cursor/mcp.json` **localmente** (não commitar valores) **ou** exportar no SO antes de abrir o Cursor:

```text
CORREIOS_USER=...
CORREIOS_TOKEN=...
```

3. Reiniciar MCP / Cursor e validar tools (`calculate_shipping`, `find_cep`, `list_services`, …).  
4. Homologação: pedir credenciais de sandbox aos Correios se necessário.

---

## Secrets loja (separado)

```bash
npx supabase secrets set CORREIOS_USER=... CORREIOS_TOKEN=... --linked
npx supabase functions deploy quote-shipping --linked
```

Somente após **D-FRETE C** + MARCHA HTTP autorizada.
