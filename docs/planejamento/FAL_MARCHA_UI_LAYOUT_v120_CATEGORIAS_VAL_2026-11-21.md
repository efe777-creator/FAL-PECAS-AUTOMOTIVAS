# FAL Marcha — UI Layout v1.2.0 Classificação VAL

**Data:** 2026-11-21 · Branch: **`dev`**  
**Padrão:** FAL-UI-LAYOUT **v1.2.0** (MINOR)  
**Resultado:** **PASS** (antiregress + tsc; smoke UI conforme checklist)

## Entrega

Hub `/admin/categorias` no zin Adaptive:

| Peça | Contrato |
|------|----------|
| Shell | `AdaptiveWorkspace` `moduleKey="categories"` |
| Primary | Resumo + integridade + arquivados + browse lista/árvore |
| Contextual | `CategoryWorkSurface` (criar/editar classificação) |
| Deep link | `#medidas-padrao` abre guia e rola medidas |

## Garantia automatizada

```bash
pnpm test:ui-layout-antiregress   # FL* incl. FL20 PASS
pnpm exec tsc --noEmit            # TSC_OK
```

Lock **FL20** (FL1/FL2/FL6 estendidos).

## Smoke (uso real · 127.0.0.1:5173)

- [x] Primary sem form mid-page; CTAs + Categoria/Grupo/Subgrupo
- [x] Abrir guia → `Editar · DIREÇÃO` + form na guia + **Na guia** na lista
- [x] Fechar guia → volta full
- [x] Primary compact (cards mobile): Abrir guia clicável
- [ ] `#medidas-padrao` (logística) — coberto por efeito de código; smoke fino opcional
- [ ] Central / Painel regressão (já Adaptive; sem mudança nesta marcha)

## Fora deste VAL

- Multi-guia empilhada (só 1 classificação por vez)
- Adaptive Promoções

**Assinatura:** marcha Classificação Adaptive v1.2.0 · VAL PASS · 2026-11-21 · eFe / Cursor
