# VAL — Marcha: aviso E.2 no buy-box + selo Incompatível no card

**Data:** 2026-11-20 · **Branch:** `dev`  
**Canônico:** E.2 mobile — bloco acima do CTA; D16 selo→PDP→gate→log  
**Motivo:** usuário reportou “não vejo o aviso em lugar algum” — bloco só em `#pdp-detalhes` (fora da dobra) e card omitia selo `hide`.

## Entrega

| Superfície | Mudança | Status |
|------------|---------|--------|
| PDP buy-box | Faixa `role=status` com veículo + estado + motivo **acima** de Qtd/CTAs | PASS (browser `pvi1038` + HB20: `top≈748` / viewport `906`) |
| PDP detalhes | Bloco completo + form + apps mantido | PASS |
| Card | Selo vermelho **Incompatível** quando `no_intersection` + fit ativo; apps continuam | PASS (código) |
| `resolveCardSeal` | `hide` com `label: 'Incompatível'` (antes label vazio) | PASS (vitest) |
| Badge card | `CARD_STYLES.hide` danger; não renderiza hide sem label | PASS |

## Aceite

1. Fit ativo + peça incompatível na PDP → aviso visível sem scroll.  
2. Fit ativo + card incompatível → selo “Incompatível” na foto.  
3. Sem fit → copy “Confirme um veículo no chip…” no buy-box; sem selo vermelho.  
4. Catálogo filtrado por fit → só compatíveis (inalterado).

## Fora

- E.7 sheet mobile no gate/M32  
- Figma / E.8  
- RMA ops Fase 7 full

## Comandos

```bash
npx vitest run src/services/compatibility/
```

**Assinatura:** MARCHA E.2 aviso buy-box + card Incompatível · 2026-11-20
