# FAL — Auditoria cruzada e consolidação: Inteligência de Relacionados PDP

**Data:** 2026-11-20  
**Branch:** `dev`  
**Natureza:** Auditoria documental + consolidação técnica. Código da inteligência: etapas 1–5 após decisões §17.  
**Documento em análise:** Brief “Inteligência de Produtos Relacionados” + plano Cursor.  
**Regra 15:** recomendações Cursor só viram lei após OK eFe — **OK registrado abaixo (§17)**.

---

## 1. Resumo executivo

A direção do brief (uma seção; qualidade > quantidade; related ≠ applicable ≠ equivalent; reusar PVC/Garagem; sem redesign) está **alinhada** aos canônicos FAL.

Correções obrigatórias vs plano técnico inicial:

1. Terminologia brief (“alternativa / pendente / sem dados”) **não mapeia 1:1** aos selos E.1 (`compatible` / `similar` / `check` / `hide`). `probable` ≠ “alternativa”.
2. Universal / aplicação geral: **F.4 pendente** — tier vazio no v1.
3. Incompatível em related: default técnico **excluir** da lista positiva (alinhado D4/catálogo).
4. L/R: há `lado`/`posicao`; **sem** grafo de pares — heurística estrita + preferência curada + PVC.
5. Bugs comprovados: gate `categorySlug`, slice prematuro de curados, sem `fitFilter`/`pvcRows`, overlap E.6.

**Veredito:** consolidação aprovada; implementação v1 na `dev` conforme §15–§19 e decisões §17.

---

## 2. Inventário documental (autoridade)

### Vigentes / canônicos

| Documento | Escopo | Autoridade |
|-----------|--------|------------|
| `FAL_PLANO_BUSCA_EQUIVALENCIA_COMPATIBILIDADE_2026.md` | E.1–E.6, D1–D24, gate, risco de fit (D4/D6–D8) | Canônico B |
| `docs/entrada/FAL_PRD_4.0.md` | RF compat/garagem/fitment | CANÔNICO 4.0.2 |
| `FAL_PDP_REDESIGN_SPEC_CONSOLIDADA_2026-11-20.md` | PDP 12/12; sem 2º motor | Decisão aprovada |
| `FAL_PLANO1_MINHA_GARAGEM_FUNDACAO_EXPERIENCIA_2026-11-18.md` | Garagem G0–G8 | Aprovado · implementado |
| `FAL_PADRAO_UX_MINHA_GARAGEM_2026-11-18.md` | UX Garagem | CANÔNICO |
| `FAL_MARCHA_ONDA4_RELACIONADOS_CURADOS_VAL_2026-11-06.md` | Curadoria related + fallback | Vigente |
| `FAL_MARCHA_COMPAT_E6_EQUIVALENTES_VAL_2026-11-19.md` | E.6 ≠ related | Vigente |
| VALs compat 2026-11-19..20 | Conformidade | Evidência |
| `FAL_PDP_REDESIGN_AUDIT_REPORT_2026-11-20.md` | Diagnóstico PDP; B.7 | Diagnóstico + abertas |
| `FAL_PDP_IMPLANTACOES_BASELINE_ANTIREGRESS_2026-11-20.md` | Baseline | Operacional |
| `FAL_CONTRATO_PDP_v0.1_2026-10-09.md` | Domínio posicao/lado | Domínio vigente |

### Histórico / supersedido

| Documento | Nota |
|-----------|------|
| `FAL_AUDITORIA_APLICACOES_COMPATIBILIDADE_V1.md` | Vocabulário graus pré-E.1 |
| `FAL_AUDITORIA_GARAGEM_PLACA_V1.md` | Supersedida por Plano 0+1 |
| `FAL_MARCHA_PDP_D_VAL_2026-10-09.md` | Related só por categoria (precursor) |
| PRD 3.0 | Histórico |
| Pasta `docs/audits/` | Não existe |

### Não localizado

- Doc isolado “Política de Compatibilidade” / “política de risco” — vive no canônico B.
- Spec dedicada lado/posição / universal / par / eixo.
- `fal-pecas/docs/VAL-busca-equivalencia-compatibilidade.md` — citado, inexistente.

---

## 3. Hierarquia de fontes

1. Decisão eFe (D1–D24, Spec PDP, Plano 1, **§17 deste doc**).  
2. Código + antiregress `dev`.  
3. VALs.  
4. Auditorias.  
5. Docs históricos.  
6. Planos Cursor (recomendação até OK).

---

## 4. Diagnóstico do código (comprovado)

| Fato | Evidência |
|------|-----------|
| Seleção sem veículo | `listRelatedProductsForPdp` só id/categorySlug |
| Limit 4 / curados max 8 | `RELATED_PRODUCTS_*` |
| Fallback categoria ≠ similaridade | `searchCatalog` relevance c/ q vazio |
| Gate zera related sem categorySlug | `ProductPage` effect |
| Slice curados prematuro | `curatedIds.slice(0, limit)` antes de hydrate |
| Related sem fitFilter explícito | Card cai em `garage.activeFilter`; ignora `localVehicleFilter` |
| Sem pvcRows → N+1 | ProductCard self-load |
| E.6 separado | `product_equivalences` |
| Related unidirecional | `product_related_links` |
| Selos | compatible/similar/check/hide — **sem** state `alternativa` |
| Confirm compra | `needsCompatPurchaseConfirm` (similar/check) |
| Sem universal/eixo/par | Product: posicao/lado/attrs |
| Padrão a reusar | CatalogPage: hide + cardSealRank + pvcRows |

**Causa raiz:** pool = curadoria + mesma categoria; sem elegibilidade PVC; selo inconsistente com form local PDP.

---

## 5. Dados de catálogo

| Dado | Onde | Para related v1 |
|------|------|-----------------|
| categorySlug | products + categories | Pool capped |
| lado / posicao | products + productPosicaoLado | Heurística L/R |
| eixo / universal / par | Ausente | Não usar |
| product_related_links | Curadoria sem relation_type | Complementar = curado |
| product_equivalences | E.6 | Dedupe fora do pool |
| PVC | product_vehicle_compatibility | Elegibilidade/rank |
| published / available | status / available | Filtro + desempate |

---

## 6–9. Cruzamentos (Garagem / Compat / Equiv / PDP)

- Contexto: **`effectiveVehicleFilter`** (garagem **ou** form local); não gravar garagem.
- D1/D4/D5/D13: rank não promove incompat; pendentes como `check`; ausência ≠ compatível.
- Brief “alternativa” → **`check`** até F.4 (não `similar`).
- E.6 seção separada; Spec #12 cinza = só equiv; related **exclui** hide.
- Uma seção; cards atuais; `fitFilter` + `pvcRows`.

---

## 10. Quatro tipos de relacionamento

| Tipo | v1 |
|------|-----|
| Outro lado | Heurística: mesma categorySlug + lado oposto + posicao igual (se ambos); preferir curado; sem nome como prova |
| Mesmo veículo | PVC + classifyCardCompatibility |
| Aplicação geral | **Off** (F.4) |
| Complementares | Só curados |

---

## 11–14. Consistência, contradições, lacunas, riscos

Ver plano consolidado. Principais: linguagem “alternativa”; universal off; L/R sem grafo; N+1/fitFilter; pad categoria.

---

## 15. Arquitetura consolidada (aprovada)

**Etapa A — Elegibilidade:** published; excluir self; excluir IDs E.6; com veículo → batch PVC; **excluir `hide`**.  
**Etapa B — Relevância:** opposite+compatible → compatible → similar → curated/opposite+check → demais check. Desempate: available, sort_order curado.  
**Fontes:** curados (hydrate até CURATED_MAX) → pool categoria capped → (c/ veículo) search capped.  
**Não** completar até 4 com irrelevantes.  
**UI:** mesma seção; `fitFilter` + `pvcRows`; invalidar em troca de veículo.

---

## 16. Cenários de aceite (resumo)

1–2 L/R confirmed/check; 3 L/R incompat **fora**; 5 sem lado; 6–7 veículo/motor; 8 universal off; 9–11 check atrás; 12 incompat fora; 13–14 curado; 15 sem veículo; 16–17 troca veículo; 18 dedupe; 19–21 published/available; 22 poucos válidos OK; 23–25 D14/D23 / reload.

---

## 17. Decisões eFe — APROVADAS 2026-11-20

| # | Decisão | Resolução |
|---|---------|-----------|
| 1 | Incompatível na seção related | **Excluir** da lista (não cinza; cinza permanece só em E.6) |
| 2 | Brief “alternativa” | Tratar como **`check`** até F.4; **não** mapear para `similar`/`probable` |
| 3 | Heurística L/R v1 | **Autorizada:** categorySlug + lado oposto + posicao igual quando ambos têm; preferir curado; sem similaridade de nome |
| 4 | Fallback categoria | **Não** preencher forçado até 4 com irrelevantes |
| 5 | Arquitetura v1 | Duas etapas + batch PVC + fitFilter/pvcRows **aprovada** |

---

## 18. Consolidado vs plano Cursor

**Manter:** 1 seção; engine único; batch; hierarquia selos; universal off; complementar=curado; dedupe E.6; quality>qty.  
**Corrigir:** vocabulário→selos; effectiveVehicleFilter; pvcRows; gate categorySlug; slice curados; Etapa A/B; excluir hide; sem pad.  
**Não fazer:** migrations; relation_type; redesign; 2º classificador; universal.

---

## 19. Etapas de implementação

| Etapa | Status |
|-------|--------|
| 0 Doc cross-audit | Este arquivo |
| 1 Helpers + score + testes | `dev` |
| 2 Serviço inteligente + fix slice | `dev` |
| 3 Wire ProductPage | `dev` |
| 4 Dedupe E.6 + exclude hide | `dev` |
| 5 Homologação / VAL | checklist na `dev` |

---

## O QUE NÃO PODE SER IMPLEMENTADO AINDA

- Tier universal (F.4).  
- Pareamento L/R cadastral / relation_type.  
- Complementaridade por “sistema” sem taxonomia.  
- Incompatível como recomendação positiva.  
- `probable`/`similar` como “alternativa” de negócio.  
- Migrations / novos campos.  
- Redesign / selos de “motivo da recomendação”.  
- main/prod sem OK explícito.
