# MARCHA 0 — Baseline checkout claro + cartão preservado — 2026-11-14

**Auth:** eFe / agente · **Escopo:** UI canais + navegação · **STOP:** não alterar Secure Fields / Edge / tokenização

## Invariantes PCI (gate absoluto)

| # | Invariante | Evidência baseline |
| --- | --- | --- |
| I1 | `MpCardSecureFields.tsx` sem diff nesta MARCHA | Gate diff na MARCHA 4 |
| I2 | Sem `key={channel}` / `key={mpAwaiting.channel}` em `MercadoPagoCardBrickPanel` | Code review |
| I3 | `mountKey` só sobe em remount manual / rejeição explícita | Code review |
| I4 | Troca crédito↔débito = só `preferredPaymentType` + estado | Smoke MARCHA 5 |
| I5 | 3 hosts `#fal-mp-*` com 1 iframe cada; IDs estáveis na troca crédito↔débito | Smoke MARCHA 5 |

## Estado atual (pré-código desta MARCHA)

| Camada | Status |
| --- | --- |
| Step 3: Pix / crédito / débito | PASS — rádios em `CheckoutPage` |
| Step 4 `mpAwaiting` seletor | FAIL — canal fixo, sem troca UI |
| Meus pedidos resume | FAIL — botão “Cartão” genérico |
| Retry Pix→cartão | FAIL — `mpChannel` stale no closure |
| Secure Fields digitação | PASS herdado (VAL imperative 13/11) |
| Navegação 3 momentos | PARCIAL — máquina OK, copy/CTAs duplicados |

## Ordem de marchas

0 Baseline (este doc) → 1 canal/sessão → 2 seletor → 3 navegação → 4 testes → 5 humano → 6 release

**Assinatura:** MARCHA 0 baseline · 2026-11-14.
