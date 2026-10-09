# FAL-IMP-19 / VAL-19 — UX global (U1–U5)

**Data:** 2026-10-09  
**Gate:** MARCHA eFe U1–U5  
**Diagnóstico:** [FAL_IMP_19_UX_DIAGNOSTICO_2026-10-09.md](./FAL_IMP_19_UX_DIAGNOSTICO_2026-10-09.md)  
**Fora de escopo (mantido):** FIND-004 STOP · B3 HOLD · smoke MP humano · F9-F

---

## 1. Entregas

| # | Entrega | Evidência |
|---|---------|-----------|
| U1 | Anti-mock silencioso loja | `storeBackend.ts` + `assertStoreBackendConfigured` em search/product/category/vehicle; mocks só `DEV` + `VITE_ALLOW_CATALOG_MOCKS=true` |
| U2 | StaffRoute timeout 12s | `StaffRoute.tsx` — mensagem + links login/início |
| U3 | PDP erro ≠ 404 | `ProductPage` — `ErrorState` + retry; backend down → Empty honesto |
| U4 | EmptyState admin | produtos, pedidos (+ ErrorState), preços; clientes já tinham |
| U5 | Footer legais | Removidos “Privacidade/Termos (em breve)” (FIND-021) |

---

## 2. VAL

| Teste | Resultado |
|-------|-----------|
| Vitest `storeBackend` + regressão labels/groups/title case | **11 passed** |
| Lint arquivos U1–U5 | sem erros novos |
| Smoke browser empty/admin | pendente eFe (runtime com Supabase OK não muda UX feliz) |

---

## 3. Findings

| ID | Status pós-VAL |
|----|----------------|
| FIND-019 | **fechado** (código) — mock silencioso removido |
| FIND-013 | **parcial→mitigado** — timeout no gate staff |
| FIND-021 | **fechado** (ocultar links) — conteúdo legal futuro |
| FIND-022 | **fechado** — residual admin EmptyState (addendum MARCHA) |

### Addendum FIND-022

EmptyState (+ ErrorState operadores) em: montadoras, fabricantes, fornecedores, categorias, operadores, importações, veículos (modelos/configs).

---

## 4. Status

| | |
|--|--|
| FAL-IMP-19 U1–U5 | **Concluído** |
| FIND-022 residual admin | **Concluído** |
| FAL-VAL-19 | **PASS** (unitário); smoke visual opcional |
| Paralelos | FIND-004 STOP · B3 HOLD · smoke MP humano (prioridade) |
| Gate seguinte | MARCHA explícita: `MP` · `FIND-004` · ou `B3` — sem isso, STOP código |
