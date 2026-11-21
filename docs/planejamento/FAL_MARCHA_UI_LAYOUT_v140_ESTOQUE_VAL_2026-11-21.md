# FAL Marcha — UI Layout v1.4.0 Estoque VAL

**Data:** 2026-11-21 · Branch: **`dev`**  
**Padrão:** FAL-UI-LAYOUT **v1.4.0** (MINOR)  
**Resultado:** **PASS** (antiregress + tsc)

## Entrega

Hub `/admin/estoque` no zin Adaptive:

| Peça | Contrato |
|------|----------|
| Shell | `AdaptiveWorkspace` `moduleKey="inventory"` |
| Primary | Modo loja + busca + lista compacta |
| Contextual | `InventoryWorkSurface` (ajuste ± + movimentos) |

Sem painel mid-page `lg:grid-cols-2`. Domínio `adjustInventory` / modo intocado.

## Garantia automatizada

```bash
pnpm test:ui-layout-antiregress   # FL23 PASS
pnpm exec tsc --noEmit            # TSC_OK
```

## Smoke

- [ ] Abrir guia → movimentos + (se com_estoque + permissão) Entrada/Saída
- [ ] Fechar guia → primary full
- [ ] Compact: cards mobile; Abrir guia clicável

## Backlog

Adaptive **Clientes**.

**Assinatura:** marcha Estoque Adaptive v1.4.0 · VAL PASS · 2026-11-21 · eFe / Cursor
