# FAL-IMP-02 / VAL-02 — Normalização de entidades

**Data:** 2026-10-09  
**Gate:** Onda 1 liberada (MARCHA eFe)  
**Escopo:** política única de nome/matching — **sem** merge destrutivo de dados, **sem** pricing/loja

---

## 1. Auditado

| Item | Achado |
|------|--------|
| Categorias | Já uppercase em cadastro + migration `20261007181000`; 8 pares nome duplicado (quase todos archived×archived ou published×archived) |
| Montadoras | Casing comercial OK (Chevrolet, BMW…); matching import só lowercased (falhava em acento) |
| Fabricantes / modelos | Só `trim` no upsert |
| Import apps | `classifyMatch` / `normKey` sem strip de diacríticos |

---

## 2. Causas

Duplicidade operacional vinha de **regras espalhadas** (upper só em categoria; import com lower sem unaccent) — não de falta de dados.

---

## 3. Alterado

| Arquivo | Mudança |
|---------|---------|
| [`fal-pecas/src/lib/entityNormalize.ts`](../../fal-pecas/src/lib/entityNormalize.ts) | Fonte única: match key, format categoria, format display |
| `entityNormalize.test.ts` | Cobertura CHEVROLET/Citroën/PIVÔ |
| `adminCategoryService.ts` | `formatCategoryName` + bloqueio de duplicata ativa no mesmo nível |
| `adminManufacturerService.ts` | display + anti-dup active |
| `adminBrandService.ts` | idem |
| `adminVehicleService.ts` | modelos: idem por montadora |
| `applicationImportCore.ts` | `classifyMatch` / `normKey` / logic key usam match key (acentos) |

**Política oficial:**

```text
MATCH KEY  = strip acentos + UPPER + espaços colapsados
CATEGORIA  = UPPER pt-BR (exibição)
MONTADORA / FABRICANTE / MODELO = trim + espaços (preserva casing)
```

---

## 4. Não alterado (e por quê)

| Item | Motivo |
|------|--------|
| Merge/delete das 8 categorias duplicadas archived | Sem consumidor claro; risco; fica backlog limpeza |
| D-REF campo comercial distinto | IMP-03 |
| Pricing / Liberar | IMP-08 / IMP-10 |
| Jobs SQL em massa no runtime | Sem evidência de CHEVROLET×Chevrolet ativo |

---

## 5. Testes (VAL-02)

```text
npx vitest run src/lib/entityNormalize.test.ts
  src/services/import/applicationImportCore.test.ts
  src/services/admin/adminCategoryService.test.ts
→ 25 passed
```

---

## 6. Status

| | |
|--|--|
| FAL-IMP-02 | **Concluído** |
| FAL-VAL-02 | **PASS** (unitário) |
| Próximo bloco | `FAL-IMP-03` (códigos/slugs + D-REF) ou `FAL-IMP-08` (preço único) — ordem do plano: **03** |

**Dependências:** nenhuma bloqueante para IMP-03/08.
