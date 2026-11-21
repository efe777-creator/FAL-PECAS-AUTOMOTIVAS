# FAL Marcha — UI Layout v1.1.2 Cascata PVC VAL

**Data:** 2026-11-21 · Branch: **`dev`** · Commit: `fa24166`+  
**Padrão:** FAL-UI-LAYOUT **v1.1.2** (PATCH)  
**Resultado:** **PASS**

## Entrega

| Peça | Contrato |
|------|----------|
| Lib | `pvcVehicleCascade` — engine/versão/matching + `PVC_CASCADE_HINT` |
| Guia Apps | create usa hint compartilhado |
| Hub filtros | `pvcEngineOptions` / `pvcVersionNameOptions` |
| Ficha | mesma lib + CTA **Hub Aplicações** `?productId=` |

## Garantia

```bash
pnpm test:ui-layout-antiregress   # 31/31 PASS
pnpm exec tsc --noEmit            # TSC_OK
```

Lock **FL19**.

## Smoke (127.0.0.1:5173)

- [x] Ficha PVI1035 → aba Aplicações → hint Cascata/coringa + **Hub Aplicações**
- [x] Hub com `?productId=` → chip **Produto (ficha)**
- [x] Nova aplicação na guia → mesmo hint Cascata/coringa
- [x] Domínio: Vincular / período / tokens fal-* intactos na ficha

**Assinatura:** marcha cascata PVC v1.1.2 · VAL PASS · 2026-11-21 · eFe / Cursor
