# VAL — O1-I extrair seções do form de produto

**Data:** 2026-11-06  
**Auth:** MARCHA sequencial plano  
**Item:** Quebrar form de produto por seção (Referências + Imagens)

## Entrega

| Peça | Papel |
|------|--------|
| `AdminProductReferencesSection` | CRUD de referências isolado |
| `AdminProductImagesSection` | Upload / principal / exclusão isolados |
| `AdminProductFormPage` | ~1.443 → ~1.281 linhas; orquestra seções |

## Critérios

- [x] `tsc --noEmit` OK
- [x] Mesmo padrão de `AdminProductRelatedSection` (estado + load próprios)
- [x] Inventário: cascata categoria marcada MANTER (já usava `CategoryCascadeSelects`)

## Residual O1-I

Aplicações ainda no form; detalhe de preços / frete próprio por aba — MARCHAs futuras.
