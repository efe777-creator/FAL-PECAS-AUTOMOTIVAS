# Auditoria + deploy controlado — Logística (Etapa 2)

**Data:** 2026-11-04  
**Runtime:** `wtbpwuiayednvlhvuhbh` · D-FRETE **B**  
**Site:** fal-pecas-automotivas (Netlify `main`)

---

## 1. Revisão dos 4 VALs (código)

| VAL | Aceite | Resultado |
|-----|--------|-----------|
| HUB | Menu Logística, hub, redirect `/admin/frete`, frete-próprio real | **PASS** (router + hub `ready: true`) |
| MEDIDAS | Form Manual/Global + bulk skip/overwrite + colunas select | **PASS** |
| ORIGEM | Remetente + ViaCEP | **PASS** código; DB preenchido no smoke SQL |
| FRETE_PROPRIO | Faixas + rates + resolve `own:` | **PASS** (enabled default false) |

---

## 2. DDL wtbp

| Objeto | Estado |
|--------|--------|
| `products.*_origin` | OK (4 cols) |
| `store_shipping_origin` remetente | OK |
| `store_own_delivery_settings` | OK · `enabled=false` · faixa 01000000–05999999 · 1 rate |
| `order_transition_allowed(aguardando_pagamento→cancelado)` | true |
| Backfill | 100 produtos `global` vazios; 0 com peso manual pré-smoke |

Migrations locais `2026110412…16` — **não** usar `db push` (drift). Apply via `db query --remote`.

---

## 3. RLS

| Policy | Estado |
|--------|--------|
| `store_shipping_origin_anon_read` SELECT anon | **Aplicada** |
| `store_own_delivery_settings_anon_read` SELECT anon | **Aplicada** |
| Write staff (`is_staff`) | Intactas |
| Anon INSERT/UPDATE | Sem policy de escrita (negativo esperado) |

Arquivo: `fal-pecas/supabase/migrations/20261104160000_store_logistics_anon_read.sql`

---

## 4. Smoke medidas (SQL espelhando UI)

| Caso | Resultado |
|------|-----------|
| Seed Manual `1.5` + Global vazio | OK |
| Bulk skip_manual → só Global `9.9`; Manual intacto `1.5` | **PASS** |
| Bulk overwrite → ambos `7.7` / `global` | **PASS** |

---

## 5. Smoke origem + CEP frete próprio

| Caso | Resultado |
|------|-----------|
| `own_delivery` disabled → coverage false | PASS |
| Enable + CEP `01310100` → true; `80000000` → false | **PASS** |
| `resolve_mock_shipping_option('own:fal','01310100')` → R$ 29,90 | **PASS** |
| Disable novamente | **PASS** (`enabled=false`) |
| Remetente persistido (CNPJ 14 / fone 11) | **PASS** SQL |

---

## 6. Deploy

| Gate | Resultado |
|------|-----------|
| PR #45 → `main` | **PASS** · merge `5aff186` (2026-11-04T15:12:24Z) |
| Netlify production | **PASS** · deploy `6aeb4b5a4059acffb33bd088` · `commit_ref=5aff186` · `published_at=2026-11-04T15:14:17Z` · state `ready` · bundle `index-BHEZOob3.js` |
| Smoke staff prod | **PASS** · hub `/admin/logistica`; origem remetente persistido; frete próprio UI (`enabled` off, faixa `01000000–05999999`, rate `own:fal` R$29,90) |
| Smoke loja prod | **PASS** · lightbox zoom home; carrinho microcopy sync; cotação CEP `01310-100` = mock clássico (sem `own:*`); disclaimer B no carrinho |
| `db push` | **não** executado (drift conhecido) |

**DEPLOY: PASS**

**Follow-ups:** `MARCHA_PEDIDO_EXPIRY_RESERVA`; Melhor Envio; UI staff smoke visual em prod (mutação mínima).

**Assinatura agente:** auditoria deploy logística 2026-11-04.
