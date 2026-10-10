# Edge `quote-shipping`

Esqueleto da cotação **server-side** (Correios live + futuros carriers).

## Secrets (nunca `VITE_`)

| Nome | Uso |
|------|-----|
| `CORREIOS_USER` | Usuário CWS / API Correios |
| `CORREIOS_TOKEN` | Token/código de acesso API |

```bash
npx supabase secrets set CORREIOS_USER=... CORREIOS_TOKEN=... --linked
npx supabase functions deploy quote-shipping --linked
```

## Estado

- Auth JWT obrigatória.
- Valida CEP e recusa live sem peso dos itens.
- Retorna `501 not_configured` até MARCHA de integração HTTP autorizada + D-FRETE C.

## MCP (agente)

Homologação/diagnóstico via Cursor: `@codespar/mcp-correios` em `.cursor/mcp.json` (credenciais só no ambiente local do operador).
