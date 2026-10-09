# FAL-IMP-05 / VAL-05 — Veículos / aplicações

**Data:** 2026-10-09  
**Gate:** Onda 1  
**Escopo:** período PVC como fonte de verdade (FIND-004 / CR-03 — camada código)  
**Runtime:** 100 produtos · 17 com app · 45 PVC · `year_start` preenchido nas apps

---

## 1. Auditado

| Item | Achado |
|------|--------|
| `search_products` (SQL) | Já filtra ano por `year_start`/`year_end` (open-end ok) |
| Card / PDP summary | Usava só `vehicle_versions.year` (muitas × NULL) → anos sumiam |
| Seletor de veículo | Anos só de `vv.year` → dropdown vazio para modelos só com PVC |
| `filterProductIdsByVehicle` (TS) | Filtrava `vv.year` (legado; desalinhado do RPC) |
| Admin apps no produto | Exibia `vv.year`; insert sem período PVC |
| Cobertura dados | 17/100 — **dados** (import em escala) continua backlog |

---

## 2. Causas

Import grava período em PVC; UI/filtro TS ainda liam o ano legado da configuração. Filtro por veículo parecia “ineficaz” também por falta de anos no seletor.

---

## 3. Alterado

| Arquivo | Mudança |
|---------|---------|
| [`vehicleAppYear.ts`](../../fal-pecas/src/lib/vehicleAppYear.ts) | format / match / expand (espelho SQL) |
| `compatibilitySummary.ts` | Card/PDP usam `year_start`/`year_end` |
| `vehicleService.ts` | Seletor popula anos a partir do PVC |
| `productService.ts` | `filterProductIdsByVehicle` alinhado ao período |
| Admin produto / veículos | Exibe período; vínculo grava year; links import/histórico |

**Política:**

```text
Configuração (vehicle_versions)  → montadora/modelo/motor/versão (+ year opcional)
Aplicação (PVC)                  → year_start / year_end = período oficial
Filtro catálogo                  → search_products (já correto) + seletor com anos PVC
```

---

## 4. Não alterado

| Item | Motivo |
|------|--------|
| Import em massa de aplicações | Motor existe; cobertura = operação de dados (FIND-004 residual) |
| Qualidade/fuzzy apps | F11 |
| Schema PVC | Já adequado |

---

## 5. VAL-05

| Teste | Resultado |
|-------|-----------|
| Vitest `vehicleAppYear` | **3 passed** |
| Evidência SQL: 45/45 PVC com `year_start` | **OK** |

---

## 6. Status

| | |
|--|--|
| FAL-IMP-05 | **Concluído** (camada código) |
| FAL-VAL-05 | **PASS** |
| FIND-004 | **Parcial** — filtro/UI ano corrigidos; cobertura 17/100 → import dados |

**Próximo bloco (plano Onda 1):** `FAL-IMP-10` (Loja / Liberar / D-LIBERAR).
