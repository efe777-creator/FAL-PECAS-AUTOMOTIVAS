# FAL-IMP-11 — Diagnóstico (FIND-007) · Catálogo cliente

**Data:** 2026-10-09  
**Modo:** somente leitura — **sem implementação**  
**Runtime:** `wtbpwuiayednvlhvuhbh` (CLI `--linked` + app `localhost:5173`)  
**Gate:** Onda 2 / pós-Onda 1 — decisão eFe IMP-11  
**Refs:** [FIND-007](./AUDITORIA_FAL_FASE0_FINDINGS_2026-10-08.md) · [TRANSICAO](./TRANSICAO_POS_ONDA1_2026-10-09.md) · Protocolo §9 bloco 11

---

## 0. Legenda

| Tipo | Uso neste relatório |
|------|---------------------|
| **Fato** | Observado em SQL wtbp, código ou browser nesta marcha |
| **Relato** | FIND/docs anteriores (pode ser HF) |
| **Hipótese** | Inferência; não comprovada |

---

## 1. Pergunta da marcha

O FIND-007 (“catálogo sem cards / lista vazia”) se reproduz no runtime canônico **wtbp**?

---

## 2. Evidências (runtime wtbp)

### 2.1 Dados comerciais — **fato** (SQL `--linked`)

| Métrica | Valor |
|---------|------:|
| `status = published` | **100** |
| `published ∧ is_available` | **99** |
| `published ∧ ¬is_available` | **1** |
| `published ∧ price > 0` (espelho) | **99** |

### 2.2 RPC `search_products` — **fato**

| Chamada | Resultado |
|---------|-----------|
| Sem filtros, page 1, size 24 | `total_count = **100**`, `page_rows = 24` |
| `maker=Fiat, model=Palio, year=2010` | `total_count = **15**` |
| Filtro SQL | `status = 'published'` apenas — **não** exige `is_available` |
| Amostra | SKUs com preço espelho (ex. BRD4558 R$ 54,80) |

Função canônica no repo: `20261007120000_import_inteligente_pvc_year_range.sql` (substitui fase4).  
Cliente: `searchCatalog` → `supabase.rpc('search_products', …)` → enrich meta/apps → `attachResolvedPrices`.

### 2.3 UI `/catalogo` — **fato** (browser `localhost:5173` → host `wtbp…`)

| Observação | Resultado |
|------------|-----------|
| URL sem filtro | Texto **“100 produtos · mostrando 24”**; **24** `<article>` (cards) |
| Filtro Fiat/Palio/2010 | **“15 produtos”**; 15 cards; chips de veículo presentes |
| Preços nos cards | Exibidos (ex. R$ 48,14 …) — resolve/espelho ok na amostra |
| Empty state “Nenhum produto…” | **Não** apareceu nos cenários testados |
| ErrorState | **Não** apareceu |
| Categorias no select | 2 raízes: SUSPENSÃO (`suspensao`), DIREÇÃO (`direcao`) |
| App aponta wtbp | Resources `*.supabase.co` = `wtbpwuiayednvlhvuhbh` |

### 2.4 Achado UX crítico — **fato**

Com `scrollY = 0` (topo da página):

- Filtros + formulário ocupam o primeiro viewport.
- **`inViewAtTop = 0` cards** (nenhum card intersecta a viewport útil).
- Após scroll (~800px): cards visíveis (ex. 6 no viewport).

Isso **reproduz parcialmente** o relato FIND-007 (“lista vazia **ou** abaixo sem scroll útil”), mas **não** como catálogo vazio de dados.

### 2.5 O que **não** foi feito

- E2E Network panel completo do payload JSON (RPC confirmado via SQL + UI total).
- Recontagem FIND-003 (custos) — paralelo, fora do escopo desta marcha.
- Alteração de código / schema / publish / MP.

---

## 3. Veredito FIND-007

| Hipótese original | Em wtbp (2026-10-09) |
|-------------------|----------------------|
| Catálogo vazio / RPC quebrado / mismatch HF | **Não reproduzido** — RPC 100; UI 24 cards |
| Snapshot FIND-007 era HF / ambiente antigo | **Hipótese forte** (alinha TRANSICAO §3 P-CAT) |
| Cards abaixo da dobra / filtros empurram grade | **Reproduzido** — 0 cards no 1º viewport |

**Proposta de status FIND-007:**  
`reclassificado` — **fechado como “lista vazia / RPC”**; **aberto residual P2 UX** “resultados abaixo da dobra / densidade de filtros”.

Não reabrir IMP-07/08/10: card, preço e Liberar já evidenciam funcionamento na mesma cadeia.

---

## 4. Cadeia auditada (contrato)

```text
CatalogPage searchArgs
  → searchCatalog (searchService)
    → RPC search_products (published + filtros)
    → enrich commercial_ref / posicao / lado
    → attachCompatibilitySummaries
    → attachResolvedPrices
  → ProductCard (displayPrice + rótulos IMP-07)
```

| Camada | Estado |
|--------|--------|
| Elegibilidade listagem | **published** (inclui 1 indisponível com badge) — **fato** |
| Compra no card | Bloqueia se `available === false` — **fato** |
| Ordenação preço | RPC usa `price` legado; client reordena só a **página** — FIND-012 residual — **fato** código |
| `commercial_ref` no RPC | Ausente; enrich pós-página — **fato** (comment no service) |
| Imagens | Placeholder emoji — F11 / fora IMP-11 mínimo |

---

## 5. Causas

| # | Tipo | Causa |
|---|------|-------|
| C1 | **Fato** | FIND-007 quantitativo não se sustenta em wtbp (dados + RPC + UI OK). |
| C2 | **Fato** | Layout do catálogo: bloco de filtros alto → grade de produtos fora do 1º viewport. |
| C3 | **Relato/hipótese** | Achado original misturou ambiente HF / viewport sem scroll. |
| C4 | **Fato** (dívida conhecida) | Sort por preço resolvido incompleto (FIND-012); não esvazia a lista. |
| C5 | **Fato** (dados) | Cobertura PVC parcial (FIND-004) — filtros de veículo podem reduzir resultados, mas empty state já existe; não explica lista geral vazia. |

---

## 6. Plano mínimo de correção (aguardando aprovação)

Escopo alinhado ao protocolo **IMP-11 = Catálogo cliente** — sem F11, sem MP, sem repair, sem publish em massa.

### 6.1 Obrigatório (IMP-11 núcleo UX/contrato)

| # | Mudança | Aceite |
|---|---------|--------|
| A | **Resultados visíveis sem scroll longo:** reduzir altura do bloco de filtros (ex.: filtros secundários recolhíveis / “Mais filtros”) **ou** âncora/scroll automático aos resultados após load **ou** resumo “N produtos” sticky acima da grade | Com `scrollY≈0`, ≥1 card (ou empty/error) no viewport em desktop e mobile sm |
| B | Empty/erro honestos já existem — **validar** copy quando filtro veículo zera resultados (sem mock) | EmptyState com chips ativos claros |
| C | Documentar regra: **listagem = published**; **compra = is_available + preço** (já no card) | Comentário PRD/UI curto se necessário |
| D | Atualizar FIND-007 + relatório VAL-11 | Status reclassificado |

### 6.2 Opcional na mesma MARCHA (se couber sem expandir)

| # | Mudança | Nota |
|---|---------|------|
| E | Sort preço: ordenar página já usa `displayPrice`; **não** exige SQL nesta marcha — só documentar limitação FIND-012 **ou** mini-fix se eFe priorizar | Evitar schema grande |
| F | Incluir `commercial_ref` no RETURN de `search_products` | Reduz roundtrip enrich; migration pequena — **só se aprovado** |

### 6.3 Fora do plano (não implementar em IMP-11)

- Redesign F11 / imagens reais / relacionados (FIND-016)  
- Import apps em massa (FIND-004 dados)  
- Carrinho→resolve (FIND-006) / checkout / MP  
- `migration repair` / `import_profiles`  
- IMP-04 categorias profundas  

---

## 7. Critérios de aceite VAL-11 (propostos)

- [ ] Diagnóstico wtbp anexado (este doc)  
- [ ] FIND-007 atualizado (reclassificado)  
- [ ] Com filtros limpos: total UI ≈ `search_products` total_count  
- [ ] No topo da página (viewport inicial), usuário vê **resultado ou empty/error** (não só filtros)  
- [ ] Regressão: card/PDP IMP-07; vitest relevantes verdes  
- [ ] Sem alteração de schema destrutiva sem confirmação extra  

---

## 8. Riscos / decisão humana

| # | Pergunta |
|---|----------|
| D1 | Aprovar plano **A+B+C+D** (mínimo UX) nesta MARCHA? |
| D2 | Incluir **F** (`commercial_ref` no RPC) agora? |
| D3 | Adiar FIND-012 (sort SQL) para IMP-20? (**recomendado:** sim) |
| D4 | Manter listagem com `published` (incl. indisponível) ou filtrar só `is_available`? (**recomendado:** manter published + badge — alinhado ao comportamento atual e Liberar) |

---

## 9. Status

| | |
|--|--|
| FAL-IMP-11 diagnóstico | **Concluído** |
| Implementação A–D | **Feita** — [VAL-11](./FAL_IMP_11_CATALOGO_CLIENTE_VAL_2026-10-09.md) |
| Opcionais F / FIND-012 | Adiados |
