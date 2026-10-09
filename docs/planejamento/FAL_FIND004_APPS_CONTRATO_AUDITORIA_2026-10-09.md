# FIND-004 — Auditoria do contrato de aplicações + prep importação

**Data:** 2026-10-09  
**Modo:** MARCHA 1 código **feita** (blank→VVs) — **STOP apply em massa** até MARCHA 3–4  
**VAL MARCHA 1:** [FAL_FIND004_BLANK_VV_VAL_2026-10-09.md](./FAL_FIND004_BLANK_VV_VAL_2026-10-09.md)  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Planilha:** `ARQUIVOS IMPORTAÇÕES/LISTA SUSP. aplicação FAL.csv`  
**Base histórica:** [FAL_FIND003_004_RECONTAGEM_WTBP_2026-10-09.md](./FAL_FIND003_004_RECONTAGEM_WTBP_2026-10-09.md)  
**Pré-val dry-run:** `fal-pecas/scripts/find004-preval.run.ts` → `find004-preval-result.json` (sem apply)

**Legenda:** **FATO** · **RELATO** · **HIPÓTESE** · **PROPOSTA**

---

## 1. Resumo executivo

A planilha completa (**691** linhas, **100** SKUs) chegou e cobre o catálogo publicado. O motor `catalog_applications` + UI admin existem e a prévia dry-run contra wtbp rodou sem escrita.

**Bloqueio comercial:** `versao` em branco (**311** linhas) **não** significa “todas as versões do modelo” no código atual — o sistema liga/cria **uma** `vehicle_versions` com `version_name` vazio. Ex.: Palio tem **5** VVs ativas; blank casa com VV de nome nulo, não com Fire/1.0/1.4/1.6.

**Veredicto:** **REVISAR** / **BLOQUEADO PARA APPLY** até MARCHA da correção mínima (expandir blank → todas VVs ativas do modelo) + import admin autorizado.

Paralelos intactos: smoke MP humano · B3 HOLD.

---

## 2. Estado atual confirmado (evidência 2026-10-09)

### 2.1 Runtime wtbp (**FATO** — SQL read-only)

| Métrica | n |
|---------|---|
| products / published | 100 / 100 |
| with_pvc | **17** |
| pvc_rows | **45** |
| vehicle_versions active | **11** |
| manufacturers / models active | 22 / 25 |

### 2.2 Planilha (**FATO** — parse local)

| Métrica | n |
|---------|---|
| Linhas | 691 |
| codigo_fal distintos | 100 |
| versao vazia | 311 |
| ano_fim vazio | 178 |
| ano_inicio vazio | 1 (linha lixo `TDI0150;;;;;`) |
| Notação `22/...` | 0 |

### 2.3 Identidade (**FATO** — dry-run)

| Check | Resultado |
|-------|-----------|
| SKUs da planilha ausentes em `products.sku` | **0** |
| `commercial_ref` ≠ `sku` no catálogo | **0** |
| Lookup import = `sku` only | OK neste dataset |

---

## 3. Mapa do fluxo existente (**FATO**)

```text
CSV/XLSX
  → contracts.catalog_applications (aliases codigo_fal→sku)
  → parseCsv / validateImportGrid
  → loadApplicationCatalogs (products by sku, makers, models, VV, PVC)
  → analyzeApplicationMappedRows (puro)
  → [UI] adminCreateApplicationsImport (staging preview)
  → [UI confirm] apply_catalog_applications_import(import_id)
  → PVC (year_start/year_end) + opcional create VV/maker/model
  → Card/PDP: compatibilityGroups / summary (IMP-11)
```

| Peça | Arquivo |
|------|---------|
| Contrato | `fal-pecas/src/services/import/contracts.ts` |
| Motor | `fal-pecas/src/services/import/applicationImportCore.ts` |
| Admin service | `fal-pecas/src/services/admin/adminApplicationsImportService.ts` |
| UI | `fal-pecas/src/pages/admin/products/AdminApplicationsImportPage.tsx` |
| Apply RPC | `20261007160000_apps_import_no_create_product.sql` (+ hardening) |
| Auth | `staff_can_import_catalog()` — admin/gerente; CLI sem sessão = fail |

Produto inexistente: **erro** (não cria) — Frente B.

Idempotência: Nível A — mesmo `import_id` não reaplica.

---

## 4. Contrato real e comportamento observado

| Campo arquivo | Contrato | Comportamento motor |
|---------------|----------|---------------------|
| codigo_fal | required → `sku` | Match `products.sku` |
| montadora / modelo | required | Match exact / probable→review / unidentified→create* |
| versao | opcional | Split só `1.0/1.6`; blank → match `version_name` vazio ou create 1 VV null |
| ano_inicio | opcional | int 1950–2100 ou null |
| ano_fim | opcional | vazio → `null` (vigente / aberto) |

---

## 5. Regra de negócio × sistema (matriz)

| Regra comercial | Sistema atual | Tipo |
|-----------------|---------------|------|
| Versão em branco = **todas** as versões do modelo no período | Liga/cria **1** VV com nome vazio; **não** expande | **FATO** gap |
| Ano fim em branco = aberto / vigente | `year_end` null; comparePeriods trata ∞ | **FATO** OK |
| Ano início preenchido | Usado como `year_start` | **FATO** OK |
| Ano início vazio | Aceito (`start` null); 1 linha inválida na planilha | **FATO** + pendência limpeza |
| Notação `22/...` | Não aceita (ano deve ser inteiro); **0** ocorrências neste arquivo | **FATO** |
| Espaços / NBSP | `normalizeImportText` | **FATO** |
| Não inventar compatibilidade | Review em match probable; blank ainda inventa envelope VV | **FATO** / risco |

### Evidência Palio (**FATO** SQL)

5 VVs ativas (Fire nomeadas + várias `version_name` null). Prévia blank em 1307B/PALIO → `vehicleVersionId=087f1752-…` (VV null) → `already_covered` — **não** vincula as VVs Fire.

---

## 6. Pré-validação dry-run (sem apply)

**Método:** dump catálogo wtbp (`scripts/find004-preval-dump.sql`) + `analyzeApplicationMappedRows` (`scripts/find004-preval.run.ts`).

### 6.1 Contagens preview (motor atual)

| action | n | applyable? |
|--------|---|------------|
| new | 636 | sim |
| update | 9 | sim |
| found | 0 | sim |
| already_covered | **24** | **não** (já no PVC; skip no apply) |
| review | 21 | não |
| error | 1 | não |
| **Soma** | **691** | — |
| applyable (técnico) | **645** = 636+9+0 | — |

**Reconciliação quantitativa (FATO):**  
`645 (applyable) + 21 (review) + 1 (error) + 24 (already_covered) = 691`.  
A diferença de 24 apontada ao ler só APTA+REVISAR+BLOQUEADA vinha de omitir `already_covered` — categoria legítima do motor, não “linha perdida”.

### 6.2 Classificação comercial (ajustada)

| Classe | Critério | n |
|--------|----------|---|
| **BLOQUEADA** | error | **1** (`TDI0150;;;;;`) |
| **REVISAR** | action=review | **21** |
| **JÁ COBERTA** | already_covered | **24** |
| **REVISAR (gap blank)** | versao vazia sob motor atual (createVersion / match VV vazia) — **não apta comercialmente** até correção | **311** (sobreposta a new/update/covered/review) |
| **APTA comercial** | applyable **e** versao preenchida — só após fix blank; **não** liberar apply em massa agora | — |

**Importante:** “APTA técnica” (645) **≠** apta comercial. Apply agora **distorce** a abrangência blank.

### 6.3 Amostras

- **BLOQUEADA:** linha 488 `TDI0150;;;;;`
- **REVISAR:** GRAND SIENA, ONIX PLUS, GOLF/VARIANT, CIELO HATCH/SEDAN, PALIO WEEKEND, etc. (maker ok / model unmatched → review)
- **Blank createVersion:** 265 linhas criariam VV `version_name` null se apply

---

## 7. Inventário de ambiguidades e riscos

| Risco | Severidade | Nota |
|-------|------------|------|
| Blank ≠ todas VVs | **P0 apply** | 311 linhas |
| Multi VV com `version_name` null no mesmo modelo | Alta | Match ambiguous/linked imprevisível |
| Modelos compostos (`NEW FIESTA` como modelo vs versão) | Média | Exige cadastro alinhado ou normalização fonte |
| VV ativas escassas (11) vs planilha larga | Alta | Import cria muitas VVs/models — esperado, mas blank multiplica errado |
| Apply sem correção | Alto | Cards/PDP mostrariam apps incompletas / envelope falso |
| CLI apply sem auth | — | Correto; só UI admin |

---

## 8. Checklist de qualidade da planilha (atualizado)

- [x] Total linhas / SKUs  
- [x] Produtos não encontrados (0)  
- [x] commercial_ref vs sku (ok)  
- [x] Versão vazia contada  
- [x] Ano fim / início vazios  
- [x] Notação abreviada (0)  
- [x] Preview actions  
- [ ] Limpar linha `TDI0150;;;;;` na fonte **PROPOSTA** operacional  
- [ ] Resolver 21 reviews (cadastro modelo ou ajuste nome) **PROPOSTA**  
- [ ] Não apply até fix blank→todas VVs  

---

## 9. Menor proposta de ajuste (**PROPOSTA** — só com MARCHA futura)

Quando `versao` em branco e modelo resolvido:

1. Se ≥1 VV **ativa** do modelo → **expandir** em N linhas lógicas (1 PVC por VV), mesmo período.  
2. Se 0 VV → criar **1** VV envelope (`version_name` null) + 1 PVC (caminho atual).  
3. Nunca escolher 1 VV nomeada arbitrária entre várias.

Arquivos futuros: `applicationImportCore.ts` (+ testes), espelho apply SQL se necessário, VAL FIND-004, smoke card/PDP.

`ano_fim` null: **sem mudança**.

---

## 10. Testes para a MARCHA de implementação

| # | Teste |
|---|--------|
| T1 | Vitest: blank versao + 3 VVs modelo → 3 preview rows applyable |
| T2 | Vitest: blank + 0 VV → createVersion único |
| T3 | Vitest: versao preenchida inalterada |
| T4 | Vitest: ano_fim vazio permanece null |
| T5 | Dry-run pré-val pós-fix: blank createVersion ≈ 0 quando VVs existem |
| T6 | Após import: SQL `with_pvc` / amostra Palio com ≥ VVs nomeadas ligadas |
| T7 | Card + PDP: apps agrupadas sem inventar |

---

## 11. Critérios de aceite e evidências

| Aceite auditoria (esta fase) | Status |
|------------------------------|--------|
| Contrato/fluxo mapeados | OK |
| Gap blank documentado | OK |
| ano_fim vazio OK | OK |
| Pré-val números | OK (`find004-preval-result.json`) |
| Zero apply / zero patch produto | OK |
| Veredicto STOP apply | OK |

---

## 12. Dependências e gates

| Gate | Condição |
|------|----------|
| Fim auditoria | Este doc |
| MARCHA código | Autorizar expansão blank→todas VVs |
| MARCHA import | Fix + pré-val aceitável + confirm UI admin |
| Smoke card/PDP | Pós-import |
| Humano paralelo | Smoke MP · planilha limpa linha 488 · B3 HOLD |

---

## 13. Recomendação final

| Campo | Valor |
|-------|-------|
| Status FIND-004 apply | **BLOQUEADO PARA APPLY** |
| Status preparação | **REVISAR** (gap blank + 21 reviews + 1 inválida + 24 already_covered reconciliados) |
| Prompt / VAL MARCHA 1 | [prompt](./FAL_FIND004_MARCHA1_PROMPT_BLANK_VV_2026-10-09.md) · [VAL](./FAL_FIND004_BLANK_VV_VAL_2026-10-09.md) — **OK** |
| VAL MARCHA 2 | [FAL_FIND004_MARCHA2_VAL_2026-10-09.md](./FAL_FIND004_MARCHA2_VAL_2026-10-09.md) — **OK** (25 testes; Palio 5/5) |
| VAL MARCHA 3 | [FAL_FIND004_MARCHA3_REVAL_VAL_2026-10-09.md](./FAL_FIND004_MARCHA3_REVAL_VAL_2026-10-09.md) — **OK** (691=652+21+1+17; preview 743) |
| VAL MARCHA 4 | [FAL_FIND004_MARCHA4_IMPORT_VAL_2026-10-09.md](./FAL_FIND004_MARCHA4_IMPORT_VAL_2026-10-09.md) — **OK** (import `done`; 100/100 c/ PVC; skip 21+1) |
| VAL MARCHA 5 | [FAL_FIND004_MARCHA5_SMOKE_VAL_2026-10-09.md](./FAL_FIND004_MARCHA5_SMOKE_VAL_2026-10-09.md) — **OK** (card/PDP/filtro Fiat) |
| Trilho FIND-004 dados | **ENCERRADO** M1–M5; residuais: 21 reviews + TDI0150; UI anos/Mais apps = outro trilho |
| Molde consolidado | [FAL_STATUS_CONSOLIDADO_MOLDE_2026-10-09.md](./FAL_STATUS_CONSOLIDADO_MOLDE_2026-10-09.md) |

**Não** aplicar a planilha com o motor atual.
