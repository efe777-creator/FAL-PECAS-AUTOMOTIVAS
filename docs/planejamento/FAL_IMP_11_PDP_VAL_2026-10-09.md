# FAL-IMP-11 / VAL — PDP domínio (pós-aceite contrato v0.1)

**Data:** 2026-10-09  
**Gate:** marcha eFe = aceite [Contrato PDP v0.1](./FAL_CONTRATO_PDP_v0.1_2026-10-09.md)  
**Escopo:** alinhar PDP ao domínio do card (rótulos, preço, apps, imagem) — **sem** redesign mockup/F11  

---

## 1. Alterado

| Item | Mudança |
|------|---------|
| Rótulo | `Referência:` (`formatReferenciaFromProduct`) |
| Nome / fabricante | `toCommercialTitleCase` na exibição |
| Preço | `formatStorePriceLabel` + strike se variação |
| Apps | `CompatibilityAppsBlock` (grupos PVC; fallback summary) |
| Imagem | `imageUrl` se existir; senão placeholder |
| CTA compra | Mantido (Adicionar / qty / WhatsApp) |

## 2. Não alterado

| Item | Motivo |
|------|--------|
| Galeria thumbs / accordions / descrições | Fora do v0.1 (§5 contrato) |
| Schema / import / MP | Paralelos |

## 3. VAL

| Teste | Resultado |
|-------|-----------|
| Vitest labels / groups / title case | **10 passed** (regressão card) |
| Lint ProductPage / CompatibilityAppsBlock | sem erros novos |
| Smoke wtbp PDP | pendente eFe |

## 4. Status

| | |
|--|--|
| Contrato PDP v0.1 | **Aceito** (marcha) |
| UI PDP domínio | **Implementado** |
| Redesign visual mockup | **Não** nesta marcha |
