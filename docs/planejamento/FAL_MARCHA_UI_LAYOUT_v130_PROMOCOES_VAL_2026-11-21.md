# FAL Marcha — UI Layout v1.3.0 Promoções + polish P0 VAL

**Data:** 2026-11-21 · Branch: **`dev`**  
**Padrão:** FAL-UI-LAYOUT **v1.3.0** (MINOR)  
**Estudo:** [FAL_ESTUDO_UX_ADAPTIVE_ORGANIZADO_2026-11-21.md](./FAL_ESTUDO_UX_ADAPTIVE_ORGANIZADO_2026-11-21.md)  
**Resultado:** **PASS** (antiregress + tsc)

## Entrega

### Polish P0 (FL21)
- Produtos: lote só via barra “Alterações em lote na guia”
- CTAs Abrir guia amarelos (Produtos/Apps/Classificação)
- Apps: chip **Editar** + Abrir cadastro desktop
- Classificação: max-h browse; dirty ao trocar nó

### Promoções Adaptive (FL22)
| Peça | Contrato |
|------|----------|
| Shell | `AdaptiveWorkspace` `moduleKey="promotions"` |
| Primary | Abas Home/escopo + banner + filtros + lista |
| Contextual | `PromotionWorkSurface` (incluir/reativar) |
| Domínio | `adminActivatePromotion` / `adminDeactivatePromotion` intactos |

## Garantia automatizada

```bash
pnpm test:ui-layout-antiregress   # FL* incl. FL21–FL22 PASS
pnpm exec tsc --noEmit            # TSC_OK
```

## Smoke (uso real)

- [ ] Produtos: marcar checkbox **não** abre guia; barra → lote na guia
- [ ] Promoções: Incluir na guia → ativar → lista atualiza; Fechar guia
- [ ] Promoções: Abrir guia em inativa → prefill; Desativar one-click
- [ ] Classificação: Abrir guia dirty → confirm ao trocar

## Backlog

Adaptive **Estoque** (próximo MINOR).

**Assinatura:** marcha Promoções Adaptive v1.3.0 + polish P0 · VAL PASS · 2026-11-21 · eFe / Cursor
