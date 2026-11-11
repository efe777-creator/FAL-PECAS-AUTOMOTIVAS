# VAL — CP-FRE-022 (smoke persistência `shipping_quotes`)

**Data:** 2026-11-11  
**Projeto:** `wtbpwuiayednvlhvuhbh`  
**Auth:** eFe — MARCHA Gate 0 + P0-1  
**Edge:** `quote-shipping` · RPC: `resolve_me_shipping_option`

## Critério de aceite (plano V2)

Persistência remota de quotes ME (`meq:<uuid>:<service>`) e path consumível; **sem** fallback `meq:ephemeral:` no fluxo live.

## Procedimento

1. `POST /functions/v1/quote-shipping` com `provider=melhorenvio`, CEP `01310100`, item com `weightKg` + dims.  
2. Inspecionar IDs das opções.  
3. `POST /rest/v1/rpc/resolve_me_shipping_option` com o `meq:` retornado.  
4. Contraprova: `meq:ephemeral:2` deve falhar.

## Resultado

| # | Caso | Resultado |
|---|------|-----------|
| 1 | Quote ME HTTP 200 · `status=ok` · `mode=live` | **PASS** |
| 2 | Opções no formato `meq:<uuid>:<serviceId>` | **PASS** (ex.: `meq:6d031419-…:2`) |
| 3 | Contagem ephemeral / `metadata.ephemeral` | **PASS** = 0 |
| 4 | `resolve_me_shipping_option` lê linha em `shipping_quotes` | **PASS** (amount 12.18 · SEDEX · volumes template) |
| 5 | `meq:ephemeral:2` rejeitado | **PASS** (`quote_id inválido`) |
| 6 | Own path `quote-own-delivery` → `ownq:<uuid>:<vehicle>` | **PASS** (observação; não bloqueia FRE-022) |
| 7 | REST anon `shipping_quotes` | **OK esperado** `[]` / `*/0` (RLS; insert via service_role na Edge) |

## Veredito

**CP-FRE-022 = PASS** — schema remoto + Edge + resolve OK. **Sem correção de código.**

## Próximo

P0-2 **CP-SEC-030** — inventário completo de paths INSERT em `orders` antes de qualquer revoke.
