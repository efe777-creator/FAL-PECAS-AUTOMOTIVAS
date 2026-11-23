# VAL — Redesign layout Central de Suporte (hub + seções)

**Data:** 2026-11-23 · **Branch:** `dev` · Sem MAIN sem OK  
**Auth:** eFe — menu tipo Conta, mesma `/suporte`

## Escopo

Hub `/suporte` com **3 telas (tabs)** — só uma visível por vez (Políticas / Compromisso / Atendimento). Hash sincroniza. Form e WhatsApp intactos.

## Entrega

| Item | Status |
|------|--------|
| `SupportCenterShell` — chips `lg:hidden` + aside desktop sticky | PASS |
| Tabs trocam painel (não scroll das 3) + hash | PASS |
| Hash `#suporte-politicas` / `#suporte-compromisso` / `#suporte-atendimento` | PASS |
| 8 cards `LEGAL_POLICY_CARDS` | PASS |
| Guest: CTA login; form inalterado | PASS |

## Smoke (vite `:5173`)

| Check | Status |
|-------|--------|
| H1 + 3 H2 | PASS |
| Mobile chips / desktop aside | PASS |
| Hash → atendimento | PASS |

## Aceite

- [x] Menu claro por seção  
- [x] Mesma URL + hashes  
- [x] Atendimento funcional preservado  
