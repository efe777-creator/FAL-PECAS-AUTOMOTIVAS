# FAL Marcha — UI Layout v1.1.1 Pontes guia↔guia VAL

**Data:** 2026-11-21 · Branch: **`dev`** · Commit: `d9867a5`+  
**Padrão:** FAL-UI-LAYOUT **v1.1.1** (PATCH)  
**Resultado:** **PASS**

## Entrega

| Ponte | Contrato |
|-------|----------|
| Aplicação → Produto | `Abrir guia` → `fal.products.openGuideId` → `/admin/produtos` |
| Aplicação → Ficha | `Cadastro completo` → `/admin/produtos/:id` |
| Produto → Aplicação | por vínculo `Abrir guia` → `fal.applications.openGuideId` + `?q=SKU` |
| Produto → Hub apps | `Hub Aplicações` → lista filtrada (sem abrir guia) |
| Produto → Kit | já existente `fal.kits.openGuideId` |

Higiene: chip **Produto (ficha)** para `?productId=`; Limpar zera; guia órfã fecha.

## Garantia automatizada

```bash
pnpm test:ui-layout-antiregress   # 26/26 PASS
pnpm exec tsc --noEmit            # TSC_OK
```

Lock **FL18**. Git `dev` = `origin/dev`.

## Smoke (uso real · 127.0.0.1:5173)

- [x] Guia app (PVI1035) → **Abrir guia** → hub Produtos compact + item na guia; bridge consumida
- [x] Guia app mostra **Cadastro completo** (ficha) ao lado de Abrir guia
- [x] Guia produto → seção Aplicações → **Abrir guia** no vínculo → hub Aplicações com app na guia (`?q=PVI1035`)
- [x] `?productId=` mostra chip **Produto (ficha)** / `Filtros (1)`; **Limpar** remove da URL
- [x] Nota: kit na guia Produto não lista PVC (mensagem hub Kits) — ponte Apps usa itens

## Usabilidade

| Achado | Severidade | Nota |
|--------|------------|------|
| Kit na guia Produto sem seção Aplicações | info | Esperado — composição/PVC no hub Kits |
| Vocabulário Abrir guia em dois hubs | ok | Mesmo verbo; destino claro pelo contexto |

**Assinatura:** marcha pontes guia v1.1.1 · VAL PASS · 2026-11-21 · eFe / Cursor
