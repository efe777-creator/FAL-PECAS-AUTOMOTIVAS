# Auditoria Fase 3 — 2026-10-03

**STATUS: APROVADA**

**Escopo:** Catálogo comercial real + backoffice de catálogo + Storage + seeds controlados.  
**Referência:** [ESPECIFICACAO_FASE3_CATALOGO_COMERCIAL.md](./ESPECIFICACAO_FASE3_CATALOGO_COMERCIAL.md) · [EXECUCAO_FASE3.md](./EXECUCAO_FASE3.md) · [RELATORIO_FASE3_COMPLETO_2026-10-03.md](./RELATORIO_FASE3_COMPLETO_2026-10-03.md)

**Revalidação:** 2026-10-03 (noite) — build, SQL, smoke UX browser.

---

## Critérios CA

| ID | Resultado | Evidência |
|----|-----------|-----------|
| CA-01…CA-05 | OK | CRUD admin categorias/montadoras/modelos/versões |
| CA-06…CA-09 | OK | Produtos TEST-001/002 + refs + PVC N:N |
| CA-10 | OK | Produtos sem imagem com `is_incomplete=true` (2 published) |
| CA-11 | OK | Arquivar via status `archived` |
| CA-12 | OK | UX: busca `TEST-001` → 1 produto |
| CA-13 | OK | UX: busca `PVI1032` → `TEST-001` |
| CA-14 | OK | Filtro categoria no catálogo (árvore publicada) |
| CA-15 | OK | Filtro montadora via PVC (Fiat) |
| CA-16 | OK | Filtros progressivos (motor sem exigir ano) |
| CA-17 | OK | UX+SQL: engine `1.0` → só TEST-001; `1.4` → só TEST-002 |
| CA-18 | OK | Inventory staff-only; loja usa `is_available` |
| CA-19 | OK | `/admin` anônimo → `/login`; `StaffRoute` + `is_staff()` |
| CA-20 | OK | Categorias/montadoras no banco (não hardcode React) |
| CA-21 | OK | Fabricante ≠ fornecedor ≠ montadora |
| CA-22 | OK | Upload Storage bucket `product-images` + admin |
| CA-23 | OK | Seletor progressivo no formulário de produto |
| CA-24/25 | OK | published na loja; archived some |
| CA-26 | OK | Fixtures F2 arquivadas; brand FAL Seed inactive |

---

## Banco (remoto) — snapshot revalidação

- Colunas F3: `short_description`, `supplier_id`, `attrs`; refs `brand_id`/`status`
- Bucket `product-images` público (leitura)
- 22 montadoras active; 7 categorias raiz; Suspensão com 6 filhos; Direção separada
- Published: `TEST-001`, `TEST-002`
- Fixtures F2: 2 archived
- Staff: `eFe` / `administrador` (e-mail confirmado)

## Build / lint

- `pnpm run build` — OK
- oxlint (paths F3) — OK

## UX smoke (browser)

| Cenário | OK |
|---------|----|
| Catálogo 2 produtos | sim |
| Busca PVI1032 / TEST-001 | sim |
| Filtro 1.0 vs 1.4 | sim |
| PDP TEST-001 (refs + apps) | sim |
| Admin exige login | sim |
| Mobile bottom nav / login | sim |

## Pendências / dívida

1. ~~Staff user~~ — **resolvido** (`eFe` administrador).
2. Imagens reais nos produtos de validação (ainda incompletos).
3. Carga comercial ampla (operação via admin).
4. FTS/ranking/paginação — **Fase 4**.
5. Vendas/estoque/relatórios admin — placeholders (Fases 6–8).
6. Hardening: impedir self-promote de `profiles.role` pelo client.
7. Polish PDP (remover copy residual “Fase 2”).

## Bugs conhecidos

- Nenhum bloqueante.
- Combos de filtro podem piscar vazios durante carga inicial da árvore de veículos.

## Itens de fases futuras

| Item | Fase |
|------|------|
| Motor de busca avançado | 4 |
| Conta cliente completa | 5 |
| Checkout / pagamento | 6 |
| Operação pedidos/estoque UI | 7–8 |
| Qualidade / produção | 9–10 |

**Nota:** catálogo administrativo da Fase 8 foi antecipado na Fase 3. O restante da Fase 8 permanece.
