# VAL — FAL-UI-LAYOUT v1.5.1→v1.5.2 (widgets · guias · hierarquia)

**Data:** 2026-11-22 · **Branch:** `dev` · **Bump:** PATCH  
**Doc:** [FAL_PADRAO_TELAS_LAYOUT_DESIGN_v1](./FAL_PADRAO_TELAS_LAYOUT_DESIGN_v1_2026-11-21.md) · Lock **FL20**

## Escopo

P0+P1 da auditoria widgets/guias vs padrão FAL — **só layout** (sem domínio).

| Item | Status |
|------|--------|
| OrderOps tabs `min-h-11` + tablist `rounded-fal` | ✓ |
| OrderOps seções externas `rounded-fal` | ✓ |
| PanelChrome controles ≥44px | ✓ |
| HomeTrust / HomeVehicles empty `rounded-fal` | ✓ |
| ProductCarousel setas `min-h-11` | ✓ |
| AdminPromotions alerta `fal-warning` | ✓ |
| Antiregress FL20 | ✓ |
| Sem MAIN / deploy | ✓ |

## Follow-up 16:55 (visibilidade)

| Item | Status |
|------|--------|
| Abrir guia na aba **Logística** se há caso pós-venda | ✓ |
| QuickActions: **Mensagem do cliente** + label do motivo | ✓ |

## Follow-up 16:59 (hierarquia v1.5.2)

| Item | Status |
|------|--------|
| QuickActions **acima** de Ida×devolução | ✓ |
| Ida×devolução rebaixado (sem H2/accent) | ✓ |
| Sem jargão `cart_item_id` / `live-ready` na UI | ✓ |
| CTA `primary` por estágio | ✓ |

## Follow-up 17:01 (P2 dedupe)

| Item | Status |
|------|--------|
| Frete não repete rastreio já mostrado em Ida × devolução | ✓ |

## Ainda fora

Button `rounded-[10px]` sistêmico · HomeGarage órfão.
