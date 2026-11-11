# FAL_AUDITORIA_EXPERIENCIA_CLIENTE_V1

**Data:** 2026-11-11 · Somente leitura

---

## 1. Campo de pesquisa

| Item | Estado |
|------|--------|
| Placeholder | “Peça, código, aplicação ou veículo” — **promessa > capacidade atual** (FATO) |
| Autocomplete | Só produtos (`search_product_suggestions`), máx 6 |
| Separação veículos/peças/categorias | **Ausente** |
| Navegação Enter | Só `?q=` — perde intenção veicular |
| A11y | combobox aria + teclado (FATO) |

TinyFish: digitar HB20 sugere produtos BRD/TDI — **não** “Hyundai HB20”. Alinhado ao código.

---

## 2. Resultados (catálogo)

Apresenta: foto, nome, marca, código (após enrich), preço (`displayPrice`), apps resumidas, categoria, CTAs.  
Filtros: cat, brand, YMM, sort, carregar mais (24).

**Apps “truncadas”:** `maxEntries: 4` no summary + UI card 4 linhas — **comportamento intencional**, não bug de dado. PDP: até 40 / 8 visíveis expansível.

**Label `(12/...)`:** período aberto formatado — pode confundir usuário; não é string cortada no meio.

---

## 3. Estados

| Estado | Hoje |
|--------|------|
| Loading | SearchBar “Buscando…”; Catalog Loading |
| Resultado normal | Grid + total |
| Veículo sem produtos | Empty específico (FATO CatalogPage) |
| Query vazia | Empty genérico |
| Produto sem app | Card sem badge de compatibilidade inventada (não afirma fit) |
| IA indisponível | N/A (IA não está no runtime de busca) |
| Necessita especificação | Parcial (seletor YMM); texto não pergunta motor |

---

## 4. Mobile

SearchBar no header sticky; filtros em drawer; VehicleSelector compact; grid 2 cols.  
**NÃO VERIFICADO** nesta sessão com device real — baseado em classes/responsivo do código. TinyFish cobriu fluxos desktop/mobile parcialmente (48 steps).

---

## 5. Problemas UX

| ID | Descrição | P |
|----|-----------|---|
| UX-01 | Placeholder mente sobre veículo no texto | P0 |
| UX-02 | Autocomplete sem seção veículos | P1 |
| UX-03 | Copy `YY/...` pouco clara | P1 |
| UX-04 | Hb20 na listagem de apps | P1 |
| UX-05 | Sem estado “veículo reconhecido na query, refine motor” | P1 |

## 6. Experiência futura (recomendação — não implementar agora)

Autocomplete: VEÍCULOS | PEÇAS | (opcional) CATEGORIAS.  
URL unificada pós-parse.  
Empty: “Veículo reconhecido — sem peças cadastradas” vs “Nenhum resultado”.  
PDP: apps legíveis com anos completos opcionais (`2012–atual`).
