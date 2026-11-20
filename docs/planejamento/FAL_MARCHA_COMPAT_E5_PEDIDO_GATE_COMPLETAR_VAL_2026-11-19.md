# VAL — Marcha 4: E.5 display no pedido + Completar dados no gate

**Data:** 2026-11-19 · **Branch:** `dev`  
**Canônico:** E.4 Completar dados · E.5 pedido mostra fit/log imutável

## Aceite

| Critério | Status |
|----------|--------|
| Detalhe do pedido (conta) mostra `compatDecision` do snapshot | PASS (código) |
| Gate não confirmado → cancel = Completar dados → `/garagem` | PASS (código) |
| Gate incompatível → cancel = Trocar (M32) | PASS (prévia) |
| Log continua no `vehicle_snapshot` jsonb | PASS (prévia) |

## Smoke

1. Comprar item A verificar → no pedido: “Compatibilidade no pedido: A verificar · seguiu sem confirmar”.
2. Finalizar com A verificar → cancelar “Completar dados” → abre Minha Garagem.

**Assinatura:** MARCHA 4 E.5 pedido + Completar dados · 2026-11-19
