# FAL — VAL · Inteligência de Relacionados PDP

**Data:** 2026-11-20  
**Branch:** `dev`  
**Base:** `FAL_PDP_RELATED_INTELLIGENCE_CROSS_AUDIT_2026-11-20.md` (§17 aprovado)  
**Escopo:** seleção/ordenação inteligentes; sem redesign; sem migrations.

---

## Código

| Item | Status |
|------|--------|
| `oppositeLado` + `isOppositeSidePair` | DONE |
| `relatedProductsIntelligence.ts` (Etapa A/B) | DONE |
| ProductPage: `fitFilter` + `pvcRows` + deps veículo | DONE |
| Gate sem `categorySlug` removido (curados carregam) | DONE |
| Hydrate curados até `CURATED_MAX` | DONE |
| Dedupe E.6 + exclude `hide` | DONE |
| Sem pad forçado até 4 (`isEligibleRelatedRow`) | DONE |
| L/R: overlap PVC + max-overlap (anti falso par) | DONE (fix marcha) |

---

## Testes automatizados

| Suite | Resultado |
|-------|-----------|
| `relatedProductsIntelligence.test.ts` (19) | **PASS** |
| `relatedProducts.test.ts` | **PASS** |
| `npm run test:compat-antiregress` (38) | **PASS** |
| `tsc --noEmit` | **PASS** |

Antiregress reforçado: `listIntelligentRelatedForPdp`, `relatedPvcById`, `pvcRows` nos related.

---

## Smoke browser (`http://127.0.0.1:5173`)

| Cenário | Evidência | Resultado |
|---------|-----------|-----------|
| F — sem veículo, L/R | PDP `/produto/pvi1057` (LE) → related só **PVI1056** (LD, mesmas apps) | **PASS** |
| Falso L/R filtrado | Antes: PVI1042 (Fox) aparecia; após max-overlap: removido | **PASS** (fix) |
| Form local → selo related | Audi + A1 + Verificar → card related com **Compatível similar** | **PASS** |
| Qualidade > qty | Sem pad de peers de categoria; 1 related válido | **PASS** |
| G — universal | N/A (tier off) | N/A |

### Causa raiz corrigida na marcha

Heurística L/R por categoria+lado gerava falsos pares (ex.: LE com PVC Audi+VW → LD Fox com overlap parcial).  
**Fix:** excluir opposite sem overlap quando origem tem PVC; entre vários opposite, manter só **max pvcOverlap**.

---

## Checklist manual restante (opcional)

- [ ] B — várias peças confirmed do veículo (com Garagem completa)  
- [ ] E — incompatível não entra na lista (com fit Audi vs peça Ford)  
- [ ] Troca veículo ativo no header → lista atualiza  
- [ ] Produto em E.6 não duplica em related  

---

## Fora de escopo

Universal · relation_type · redesign · main/prod · 2º motor compat · limpeza de PVC misturado no cadastro (dado).
