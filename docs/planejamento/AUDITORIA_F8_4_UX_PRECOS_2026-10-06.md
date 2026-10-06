# Auditoria F8.4 — Usabilidade Listas de preços

**Data:** 2026-10-06  
**Plano:** F8.4 UX Preços (aprovado com busca)  
**Gate:** `npm test` (64) + `npm run build` OK  
**Sem** commit / push / `db push`

---

## Objetivo

`/admin/precos` = consultar e ajustar preços rapidamente  
`/admin/precos/:id` = administrar lista completa

Fluxo: **lista → busca vazia ou código → ver preço → alterar**

---

## Critérios de aceite

| # | Critério | Status |
|---|----------|--------|
| 1 | Select + busca no viewport útil (KPI strip, sem 4 cards) | PASS |
| 2 | Configurar/Nova: scroll + foco + highlight | PASS |
| 3 | Resultados antes do add (add colapsável) | PASS |
| 4 | Gerenciar listas enxuto + highlight painel | PASS |
| 5 | F8.3 motors + anti-vazamento | PASS |
| 6 | test + build + relatório | PASS |
| 7 | Busca vazia lista itens automaticamente | PASS |
| 8 | Código filtra na hora, preço da lista | PASS |
| 9 | Descrição / manufacturer_code | PASS (filterPriceListItems) |
| 10 | Troca lista limpa antes do load | PASS |

Smoke browser autenticado: 🟡 **parcial** (2026-10-06, `localhost:5173`, sessão `efe.comercioltda@gmail.com`).

| # | Passo | Resultado |
|---|-------|-----------|
| 1 | Abrir `/admin/precos` | **PASS** — layout F8.4 (KPI strip, painel, Gerenciar listas) |
| 2 | Selecionar lista | **PASS** — Preço Base ↔ Lista Promocional |
| 3 | Busca vazia | **PASS*** — empty state “Nenhum item nesta lista” + CTAs (listas com **0 itens** no ambiente) |
| 4 | Pesquisar `1307B` | **N/A dados** — não há `price_list_items`; SKU não no seed local |
| 5 | Alterar preço | **N/A dados** — sem linhas; escrita não executada |
| 6 | Trocar lista | **PASS** — troca imediata; sem preço fantasma (ambas vazias) |
| 7 | Busca descrição | **N/A dados** |
| 8 | `manufacturer_code` | **N/A dados** |
| 9 | Abrir lista completa | **PASS** → `/admin/precos/:id?tab=produtos` (Lista Promocional) |
| 10 | Adicionar à lista | **UI OK** — form visível; apply não executado (sem gravação nesta smoke) |

\*Aceite 7 “produtos aparecem” exige lista com itens. Neste ambiente KPI mostra **Itens 0**. Validação completa de 4–5–7–8–10 fica com operador após popular a lista (import ou Adicionar).

**Veredito smoke:** UI F8.4 e navegação **PASS**; fluxos com produto/preço **pendentes de dados**, não de código.

---

## Arquivos

| Arquivo | Mudança |
|---------|---------|
| `PriceListQuickAdjustPanel.tsx` | Layout hero; busca vazia = todos; footer 50/N; match único; add colapsável |
| `AdminPriceListsPage.tsx` | KPI strip; form acima do painel; Gerenciar listas + menu ⋯ |

---

## Limitações

- 500 itens carregados / 50 exibidos (copy explícita + Abrir lista completa).
- Sem paginação server-side / `supplier_sku` / redesign do detalhe.

**Parar** — sem commit/push/db push.
