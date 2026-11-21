# FAL Marcha — UI Layout v1.5.0 Clientes VAL

**Data:** 2026-11-21 · Branch: **`dev`**  
**Padrão:** FAL-UI-LAYOUT **v1.5.0** (MINOR)  
**Resultado:** **PASS** (antiregress + tsc)

## Entrega

Hub `/admin/clientes` no zin Adaptive:

| Peça | Contrato |
|------|----------|
| Shell | `AdaptiveWorkspace` `moduleKey="customers"` |
| Primary | Busca + lista compacta |
| Contextual | `CustomerWorkSurface` (B2B assigned + pedidos) |

Sem painel mid-page `lg:grid-cols-2`. Domínio F8 / assigned list intocado.

## Garantia automatizada

```bash
pnpm test:ui-layout-antiregress   # FL24 PASS
pnpm exec tsc --noEmit            # TSC_OK
```

## Smoke

- [ ] Abrir guia → detalhe + lista B2B + pedidos
- [ ] Atribuir lista assigned → toast sucesso
- [ ] Fechar guia → primary full; compact cards

**Assinatura:** marcha Clientes Adaptive v1.5.0 · VAL PASS · 2026-11-21 · eFe / Cursor
