# FAL Marcha — UI Layout v1.1.1 Pontes guia↔guia VAL

**Data:** 2026-11-21 · Branch: **`dev`**  
**Padrão:** FAL-UI-LAYOUT **v1.1.1** (PATCH)

## Entrega

| Ponte | Contrato |
|-------|----------|
| Aplicação → Produto | `Abrir guia` → `fal.products.openGuideId` → `/admin/produtos` |
| Aplicação → Ficha | `Cadastro completo` → `/admin/produtos/:id` |
| Produto → Aplicação | por vínculo `Abrir guia` → `fal.applications.openGuideId` + `?q=SKU` |
| Produto → Hub apps | `Hub Aplicações` → lista filtrada (sem abrir guia) |
| Produto → Kit | já existente `fal.kits.openGuideId` |

Higiene: chip **Produto (ficha)** para `?productId=`; Limpar zera; guia órfã fecha.

## Smoke

- [ ] Guia app → Abrir guia → hub Produtos com item na guia
- [ ] Guia app → Cadastro completo → ficha
- [ ] Guia produto → Abrir guia num vínculo → hub Aplicações com app na guia
- [ ] Ficha → gestão `?productId=` mostra chip; Limpar remove
- [ ] Kits ponte regressão OK

## Garantia

```bash
pnpm test:ui-layout-antiregress
```

Lock **FL18**.

**Assinatura:** marcha pontes guia v1.1.1 · 2026-11-21
