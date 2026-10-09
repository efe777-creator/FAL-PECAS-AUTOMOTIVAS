# FIND-004 MARCHA 3 — VAL revalidação planilha 691

**Data:** 2026-10-09  
**Autorização:** MARCHA (eFe)  
**Modo:** dry-run / leitura — **sem apply**  
**Runtime catálogo dump:** wtbp (`find004-catalog-raw.json`)  
**Artefato:** `fal-pecas/scripts/find004-preval-result.json` (`generatedAt` 2026-10-09T19:18+ / M3)

**Pré-condições:** [M1 VAL](./FAL_FIND004_BLANK_VV_VAL_2026-10-09.md) · [M2 VAL](./FAL_FIND004_MARCHA2_VAL_2026-10-09.md)

---

## Veredicto

| Campo | Valor |
|-------|-------|
| Reval quantitativa | **OK** — 691 linhas CSV reconciliadas |
| Blank → VVs | Confirmado (Palio 5/5; +52 preview por expansão) |
| Apply em massa | **BLOQUEADO** |
| Próxima | MARCHA 4 só com auth explícita + tratamento de 21 reviews + 1 erro |

---

## 1. Reconciliação CSV × preview

| Métrica | n |
|---------|---|
| Linhas CSV | **691** |
| Linhas lógicas preview | **743** |
| Delta expansão blank | **+52** |
| Equação preview | `688 new + 9 update + 0 found + 24 already_covered + 21 review + 1 error = 743` |

### Por `lineNumber` (fonte)

| Classe | n | Soma |
|--------|---|------|
| applyable ou mista (tem ≥1 applyable) | **652** | |
| review only | **21** | |
| error | **1** | |
| already_covered only | **17** | |
| **Total** | **691** | **652+21+1+17=691** |

Preview applyable técnico: **697** (= 688+9).  
`697 + 24 + 21 + 1 = 743` (preview completo).

---

## 2. Pendências de fonte (não inventar)

| Item | Detalhe |
|------|---------|
| **Erro** L488 `TDI0150;;;;;` | Montadora/modelo vazios — manter BLOQUEADA |
| **Reviews** 21 linhas | Match veículo (ex.: GOLF, GRAND SIENA, CIELO HATCH/SEDAN, ONIX PLUS, PALIO WEEKEND, G4…) — lista em `marcha3Reconciliation.reviewLineNumbers` |
| `ano_inicio` vazio | 1 ocorrência (= TDI0150); regra geral ainda **decisão** se aparecer em outras fontes |
| `ano_fim` vazio | 178 no CSV; motor mantém `year_end` null — **OK** |
| Blank createVersion | 253 preview (modelos sem VV ativa no dump) — esperado até cadastro de VV / apply |

---

## 3. Cobertura blank (regressão M2)

| Check | Resultado |
|-------|-----------|
| CSV blank | 311 |
| Preview blank | 363 (ratio ≈ 1,17) |
| Palio L2 `1307B` | 5/5 VVs, `coversAllModelVvs=true` |
| Identity SKUs | 0 ausentes; commercial_ref ok |

---

## 4. Aptidão comercial para apply

| | |
|--|--|
| APTA técnica (preview applyable) | 697 |
| Linhas CSV “limpas” p/ apply (sem review/erro) | 652 applyable/mista + 17 covered = **669** sem bloqueio de review/erro |
| Bloqueio comercial residual | **21 review + 1 erro** + decisão operacional sobre createVersion em massa (253) |

**Não** autorizar M4 nesta marcha. Opções futuras (humano): (a) apply só applyable ignorando review; (b) corrigir planilha/cadastro VV antes; (c) lote filtrado.

---

## 5. STOP

- **Não** apply / import admin (MARCHA 4).  
- **Não** inventar dados para TDI0150 ou reviews.  
- UI “Mais aplicações” / anos `YY/YY` = trilho separado (MARCHA UI).
