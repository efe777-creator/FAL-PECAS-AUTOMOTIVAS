# VAL — Smoke completo + testes cliente (compat)

**Data:** 2026-11-20 · **Branch:** `dev`  
**Ambiente:** localhost:5173 · fit ativo Hyundai HB20 2019

## Testes automatizados

| Suite | Resultado |
|-------|-----------|
| `npx vitest run` (repo) | **225 files · 1042 tests PASS** |
| `tsc --noEmit` | **PASS** |
| Foco cliente compat (engine, copy, gate, M32, apps, garage, snapshot, analytics, E.6) | **9 files · 38 tests PASS** |

## Smoke browser (loja / cliente)

| Passo | Esperado | Status |
|-------|----------|--------|
| Home com fit HB20 | Cards com selo **ou** apps (sem vazio) | PASS — 16 cards; 1 selo; 15 apps; TDI1002 apps |
| PDP `/produto/tdi1002` | Bloco Compatibilidade + Incompatível + Motivo + Aplicação Fiat | PASS |
| PDP Adicionar | Item no carrinho | PASS — badge 2 |
| Carrinho | TDI1002 + Incompatível + Motivo + **Trocar peça** + Finalizar | PASS |
| Catálogo com fit | Incompatíveis some; só Compatível/similar | PASS — 1 card com selo |

## Observações

- Form ano/motor/versão na PDP só para similar/A verificar (não em Incompatível) — alinhado à marcha.
- Gate E.4 / checkout / pedido: cobertos por testes unitários + código; smoke de pagamento completo não executado neste ciclo.

**Assinatura:** SMOKE + testes cliente compat · 2026-11-20
