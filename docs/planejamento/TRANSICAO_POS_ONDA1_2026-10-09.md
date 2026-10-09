# Auditoria de transição pós-Onda 1 — FAL 3.0

**Data:** 2026-10-09  
**Modo:** somente leitura (sem alteração de código, schema, env ou deploy)  
**Runtime canônico:** `wtbpwuiayednvlhvuhbh` (HF ≠ fonte de verdade comercial)  
**Protocolo:** [PROTOCOLO_OPERACIONAL_AUDITORIA_FAL_v1.0.md](./PROTOCOLO_OPERACIONAL_AUDITORIA_FAL_v1.0.md)  
**Fontes:** PRD · ROADMAP · BACKLOG · STATUS_ONDA1 · FINDINGS · PLANO_CORRECAO · STOPs F9/G/F · VAL-01/07/10

**Legenda de afirmações**

| Tipo | Significado |
|------|-------------|
| **Fato** | Comprovado por artefato + arquivo/código ou teste reexecutado nesta auditoria |
| **Relato** | Afirmado em docs de marcha anteriores; não revalidado E2E aqui |
| **Hipótese** | Inferência; exige confirmação |

---

## 1. Estado consolidado da Onda 1

### 1.1 Veredicto

| Campo | Valor |
|-------|-------|
| Gate Onda 1 | **Liberada** 2026-10-09 (MARCHA eFe pós VAL-01) — **relato** docs |
| Fechamento Onda 1 | **Declarado FECHADA** em STATUS / PLANO / ROADMAP / BACKLOG — **fato** documental |
| Runtime schema | VAL-01 **PASS essencial** — **relato** [VAL-01](./FAL_VAL_01_RUNTIME_SCHEMA_2026-10-08.md) |
| Congelado (inalterado nesta onda) | D16; `status ≠ is_available`; anti-auto-publish; priority; HF≠dono; F11+ |

### 1.2 Blocos Onda 1 (liberados)

| Cmd | Tema | Relatório | Evidência de código (fato) | VAL declarado |
|-----|------|-----------|----------------------------|---------------|
| 01/VAL-01 | Schema runtime | [VAL-01](./FAL_VAL_01_RUNTIME_SCHEMA_2026-10-08.md) + adendo | — (schema) | PASS essencial |
| 02 | Normalização | [IMP-02](./FAL_IMP_02_NORMALIZACAO_VAL_2026-10-09.md) | `entityNormalize` | PASS (relato) |
| 03 | D-REF | [IMP-03](./FAL_IMP_03_IDENTIDADE_VAL_2026-10-09.md) | `commercial_ref` + tests | PASS (relato) |
| 08 | Preços / DIV-002 | [IMP-08](./FAL_IMP_08_PRECOS_DIV002_VAL_2026-10-09.md) | `product_base_cost` mig | PASS (relato) |
| 09 | Listas / DIV-001 | [IMP-09](./FAL_IMP_09_LISTAS_DIV001_VAL_2026-10-09.md) | `priceLabels` | PASS (relato) |
| 06 | Import histórico | [IMP-06](./FAL_IMP_06_IMPORT_HISTORICO_VAL_2026-10-09.md) | `/admin/importacoes` | PASS (relato) |
| 05 | Veículos/apps | [IMP-05](./FAL_IMP_05_VEICULOS_APPS_VAL_2026-10-09.md) | ano PVC UI | PASS código; **dados parcial** |
| **10** | Liberar D-LIBERAR | [IMP-10](./FAL_IMP_10_LIBERAR_VAL_2026-10-09.md) | ver §1.3 | PASS unitário |
| **07** | Card / PDP | [IMP-07](./FAL_IMP_07_CARD_PDP_VAL_2026-10-09.md) | ver §1.3 | PASS unitário + lint |

**Não estava na Onda 1 liberada:** `FAL-IMP-04` (categorias) — permanece na fila oficial do protocolo, **fora** do fechamento Onda 1.

### 1.3 Confirmação IMP-10 / VAL-10 e IMP-07 / VAL-07

#### IMP-10 / VAL-10 — **evidência suficiente para não reabrir**

| Camada | Evidência |
|--------|-----------|
| Fonte única | `fal-pecas/src/lib/releaseChecklist.ts` + `releaseChecklist.test.ts` — **fato** |
| Service | `adminEvaluateReleaseChecklist` / `Batch`; release bloqueia se hard fail — **fato** (`adminProductService.ts`) |
| UI bulk | Pré-flight em `AdminProductsPage.tsx` — **fato** |
| PRD | D-LIBERAR = **Feito IMP-10** — **fato** documental |
| VAL-10 | Relatório: 6 vitest passed — **relato** no VAL |
| Reexecução nesta auditoria | `npx vitest run …releaseChecklist.test.ts` → **6 passed** — **fato** 2026-10-09 |
| Lacuna | E2E “Liberar 1 SKU → comprável → `place_order`” **não** executado nesta auditoria — residual FIND-002 |

#### IMP-07 / VAL-07 — **evidência suficiente para não reabrir**

| Camada | Evidência |
|--------|-----------|
| Labels | `FABRICANTE_LABEL`, `APPS_EMPTY_LABEL` em `productLabels.ts` — **fato** |
| Card / PDP | `ProductCard.tsx`, `ProductPage.tsx` usam `displayPrice` + rótulos — **fato** |
| Search | `searchService` enrich `commercial_ref` — **fato** (grep) |
| VAL-07 | Relata regressão releaseChecklist + lint — **relato** |
| Lacuna | Sem E2E browser de vitrine nesta auditoria; FIND-007 (catálogo UI) ainda **aberto** (origem pode ser snapshot HF) |

**Decisão de auditoria:** não reabrir IMP-07/10 sem finding novo concreto.

### 1.4 Residuais Onda 1 (não bloqueiam o fechamento declarado)

| Item | Status | Nota |
|------|--------|------|
| FIND-004 apps | parcial | 17/100 com PVC (**relato** IMP-05) — motor ok; falta carga de dados |
| FIND-006 preço | parcial | Liberar→resolve ok; carrinho UX ainda espelho |
| migration repair / `import_profiles` | P2 | VAL-01 GAP |
| MCP → wtbp | P2 | evita auditar HF como loja |

---

## 2. Escopo oficial da Onda 2 e de IMP-11 em diante

### 2.1 Definição oficial (sem inventar)

Fonte: [PLANO_CORRECAO](./AUDITORIA_FAL_FASE0_PLANO_CORRECAO_2026-10-08.md) §4 + [PROTOCOLO](./PROTOCOLO_OPERACIONAL_AUDITORIA_FAL_v1.0.md) §9.

> Onda 2 — Superfície / operação (após Onda 1): `FAL-IMP-11` … `FAL-IMP-25` conforme plano original.  
> **Não** aprofundar `FAL-IMP-14` pedidos/estoque sem schema alinhado.

| # | Bloco | Código | Tema oficial |
|---|-------|--------|--------------|
| 11 | Catálogo cliente | `FAL-IMP-11` | Grade/lista cliente alinhada a elegibilidade (publicado + disponível + preço) |
| 12 | Home / destaques / promoções | `FAL-IMP-12` | Cadeia lista→promo→destaque→home |
| 13 | Clientes | `FAL-IMP-13` | Conta / cadastro cliente |
| 14 | Pedidos | `FAL-IMP-14` | **Condicionado** a schema (congelado se gap) |
| 15 | Frete | `FAL-IMP-15` | Após / com D-FRETE |
| 16 | Checkout / pagamento | `FAL-IMP-16` | Alinha a F9-F / FIND-005/015 |
| 17 | Dashboard | `FAL-IMP-17` | KPIs reais |
| 18 | Relatórios | `FAL-IMP-18` | vs dados |
| 19 | UX global | `FAL-IMP-19` | empty/loading/erros |
| 20 | Busca / filtros / bulk | `FAL-IMP-20` | só se agregarem valor |
| 21 | Responsividade | `FAL-IMP-21` | |
| 22 | Preservação de contexto | `FAL-IMP-22` | |
| 23 | Nomenclaturas | `FAL-IMP-23` | fecha FIND-011 residual |
| 24 | Integração ponta a ponta | `FAL-IMP-24` | |
| 25 | Testes / regressão final | `FAL-IMP-25` | |

**F11+ (Catálogo mestre)** permanece **fora** de F10/Onda 2 até gate F10 — PRD / ROADMAP.

**IMP-04** (categorias) não foi Onda 1; entra como bloco oficial ainda não MARCHA — decisão humana se antes de IMP-11 ou depois.

### 2.2 Escopo mínimo oficial de IMP-11 (derivado do protocolo, não expandido)

Auditoria + correção do **catálogo cliente**: contrato de busca/listagem, cards elegíveis, empty/erro honestos, alinhamento a `is_available` + preço resolvido (já tratados em 07/08/10).  
FIND-007 é o finding P1 mais próximo deste bloco.  
**Não inclui** redesign F11, relacionados (FIND-016), nem carga massiva de apps.

---

## 3. Matriz de paralelos (prioridade e justificativa)

| ID | Item | Prioridade sugerida | Impacto comercial | Risco | Dependências | Evidências | Lacunas | Próximo passo |
|----|------|---------------------|-------------------|-------|--------------|------------|---------|---------------|
| P-MP | Smoke Mercado Pago + F9-F | **P1** | Sem pagamento validado = loja não vende de ponta a ponta | Alto (falso “pago”) | Humano: secret + redeploy; STOP G/F9 | F9-E DONE (**relato** STOP); FIND-005 aberto | Smoke sandbox **não** executado aqui | Checklist STOP_BLOCO_G → smoke → `MARCHA F9-F` / IMP-16 |
| P-CART | Carrinho espelho vs resolve (FIND-006) | **P1** | Preço exibido ≠ cobrado | Médio-alto | resolve RPC no runtime (ok VAL-01) | Liberar usa resolve (**fato** IMP-10) | UX carrinho não reauditada | Incluir em IMP-16 ou hotfix P1 antes de smoke compra |
| P-APPS | Import apps em massa (FIND-004) | **P1** dados | Filtro veículo / PDP fracos | Médio | Motor import existe (IMP-05) | 17/100 (**fato** recontagem) | CSV só amostra | Planilha completa + apply admin |
| P-CUSTO | Custo/preço dados (FIND-003) | **P1→fechado wtbp** | Sem custo → Liberar falha | Baixo agora | — | [Recontagem](./FAL_FIND003_004_RECONTAGEM_WTBP_2026-10-09.md) | 1 SKU sem resolve | Residual pontual |
| P-CAT | Catálogo UI (FIND-007) | **P1→fechado** | Quantitativo não repro em wtbp; UX 1º viewport tratado IMP-11 | Baixo residual | search RPC | [VAL-11](./FAL_IMP_11_CATALOGO_CLIENTE_VAL_2026-10-09.md) | FIND-012 sort adiado | Próximo: IMP-12 ou MP |
| P-FRETE | D-FRETE + IMP-15 | **P2** (decisão) | Checkout incompleto / mock | Médio | Decisão humana provedor | FIND-008 aberto; PRD pendente | Provider default mock | eFe decide provedor → plano → IMP-15 |
| P-MIG | `migration repair` + `import_profiles` | **P2** | Bloqueia `db push` higiene; perfis só localStorage | Médio ops | Autorização explícita | VAL-01 GAP/FAIL parcial | Repair **proibido** nesta auditoria | Gate humano separado (STOP operacional) |
| P-MCP | MCP Supabase → wtbp | **P2** | Auditorias erram HF | Médio (processo) | Credencial MCP | Adendo runtime | MCP ainda HF (**relato** histórico) | Reapontar org/projeto |
| P-PERM | Bloco F permissões | **P2** | STOP; admin granular | Médio | Matriz RLS | STOP_BLOCO_F | Sem matriz | Só com autorização |
| P-UX | Empty/loading (FIND-022) | P2–P3 | Operação | Baixo-médio | — | Finding aberto | — | IMP-19 |
| P-SORT | Sort preço RPC (FIND-012) | P2→**fechado** | Ordenação enganosa | Baixo | preço resolvido | [VAL](./FAL_FIND012_SORT_PRECO_VAL_2026-10-09.md) | — | Feito 2026-10-09 |
| P-DASH | Dashboard/relatórios (FIND-014) | P2 | KPIs zerados se schema gap | Médio | IMP-14 schema | Finding (texto legado HF parcial) | Revalidar wtbp | IMP-17/18 pós confirmação orders |
| P-F11 | Relacionados / imagens | P3 / F11 | Completude catálogo | Baixo agora | Gate F10 | FIND-016 | — | Não misturar em Onda 2 sem gate |

\*FIND-003: números originais são snapshot HF; tratar como **hipótese** até recontagem wtbp.

---

## 4. Dependências e bloqueios

```text
[Schema wtbp OK — VAL-01]
        │
        ├─► Onda 1 FECHADA (docs) ──► Onda 2 liberável por decisão eFe
        │
        ├─► IMP-14 / estoque profundo ── BLOQUEIO CONDICIONAL (plano: sem aprofundar sem schema)
        │
        ├─► Smoke MP ── BLOQUEIO HUMANO (secret + redeploy) ──► F9-F / IMP-16
        │
        ├─► D-FRETE ── BLOQUEIO DECISÃO ──► IMP-15
        │
        ├─► migration repair ── BLOQUEIO AUTORIZAÇÃO (não fazer “de passagem”)
        │
        └─► F11 Catálogo mestre ── BLOQUEIO gate F10
```

**Não bloqueia Onda 2 / IMP-11:** repair migrations; MCP HF; cobertura apps parcial; Bloco F.

**Pode invalidar valor de IMP-11 se não tratado em paralelo:** FIND-003 (sem preço/custo) e FIND-007 (catálogo vazio) — primeiro **reprovar em wtbp**.

---

## 5. Recomendação de sequência de execução

Ordem sugerida **para decisão humana** (não iniciada):

```text
0) Gate eFe: escolher trilho A (compra ponta a ponta) ou B (superfície catálogo) ou C (dados)
   │
A) Paralelo humano imediato (qualquer trilho):
   - Checklist STOP_BLOCO_G (secret + redeploy webhook)
   - Recontagem SQL wtbp: supplier_products / price_list_items / PVC (atualiza FIND-003/004)
   - (opcional) Reapontar MCP → wtbp
   │
B1) Trilho comercial (recomendado se meta = vender):
   1. Hotfix / mini-bloco FIND-006 carrinho → mesma resolução que Liberar
   2. Smoke Pix+cartão sandbox
   3. MARCHA F9-F (checkout sem simulação enganosa) ≈ IMP-16
   4. Só então IMP-11 (catálogo) com FIND-007 reprovido
   │
B2) Trilho Onda 2 “oficial” (recomendado se meta = F10 superfície):
   1. FAL-IMP-11 → VAL-11 (começar por repro FIND-007 em wtbp)
   2. FAL-IMP-12 (home/destaques) se cadeia promo depender do catálogo
   3. Em paralelo: import apps dados (FIND-004) — operação, não IMP novo
   4. IMP-13 clientes; IMP-16 quando smoke MP liberar; IMP-15 só pós D-FRETE
   5. IMP-14 apenas se schema orders/estoque confirmado no wtbp
   │
B3) Higiene (quando eFe autorizar explicitamente):
   - migration repair + apply import_profiles
```

**Recomendação preferencial desta auditoria:** **B1 → depois B2**, porque PRD §31 lista smoke MP e liberação comercial como lacunas centrais, e F9 já está em STOP esperando humano — enquanto IMP-11 sem dados/preço/disponibilidade reprovados em wtbp pode ser cosmético.

Alternativa válida: **B2 primeiro** se eFe priorizar fechar FIND-007 / vitrine antes do pagamento.

---

## 6. Critérios de aceite do próximo bloco

### Se próximo = `FAL-IMP-11` (Catálogo cliente)

- [ ] Reprodução em **wtbp** (não HF): Network de `search_products` / listagem documentada  
- [ ] Cards só para elegíveis (published + available + preço resolvido > 0, alinhado D-LIBERAR)  
- [ ] Empty/erro explícitos (sem mock silencioso — FIND-019 se no escopo)  
- [ ] Regressão: card/PDP IMP-07 não regridem  
- [ ] Relatório `FAL-IMP-11` + `FAL-VAL-11` com testes executados e resultados  
- [ ] FIND-007 atualizado (fechado / parcial / reclassificado)

### Se próximo = smoke MP / `F9-F` ≈ IMP-16

- [ ] Secret webhook setado + função redeployada (checklist STOP G)  
- [ ] Pix + cartão sandbox com approve observado  
- [ ] Sem `pix_simulated` quando MP ativo (FIND-015)  
- [ ] Totais coerentes com frete mock ou real documentado  
- [ ] Relatório STOP → marcha F9-F

### Se próximo = import apps (dados)

- [ ] Contagem PVC pré/pós em wtbp  
- [ ] Amostra de filtros veículo OK  
- [ ] FIND-004 atualizado; sem afrouxar D-LIBERAR

---

## 7. Riscos que exigem decisão humana

| # | Decisão | Por quê |
|---|---------|---------|
| D1 | **Próximo MARCHA:** IMP-11 vs smoke MP/F9-F vs import apps vs repair | Define trilho B1/B2/B3 |
| D2 | **D-FRETE** — provedor (mock continua / Correios / Frenet / outro) | Bloqueia IMP-15 e checkout “real” |
| D3 | Autorizar **`migration repair`** + apply `import_profiles`? | Ops irreversível no histórico remoto; fora do fluxo de produto |
| D4 | **IMP-04** (categorias) antes ou depois de IMP-11? | Bloco oficial pulado na Onda 1 |
| D5 | Aprofundar **IMP-14** agora? | Plano diz não sem necessidade/schema; confirmar orders no wtbp |
| D6 | Tratar FIND-003 com recontagem wtbp antes de qualquer liberação em massa adicional | Evitar operar sobre números HF |
| D7 | Gate **F11** continua fechado? | Evitar misturar catálogo mestre em Onda 2 |

---

## 8. Findings — quadro vivo (pós-Onda 1)

| ID | Sev | Status documentado | Ação sugerida |
|----|-----|--------------------|---------------|
| 001 | P0 | Esclarecido (HF≠runtime) | Manter; MCP→wtbp |
| 002 | P1 | Fechado (processo) | E2E place_order residual |
| 003 | P1 | **Fechado wtbp** | Recontagem 2026-10-09 |
| 004 | P1 | Parcial / STOP arquivo | Planilha apps escala |
| 005 | P1 | Aberto | Smoke humano |
| 006 | P1 | Parcial | Carrinho → resolve |
| 007 | P1 | Aberto | IMP-11 kickoff |
| 008 | P2 | Aberto | D-FRETE |
| 009–010 | P2 | Fechados | — |
| 011 | P2 | Parcial | IMP-23 |
| 012 | P2 | **Fechado** | VAL sort preço |
| 013–015 | P2 | Abertos | Onda 2 / F9-F |
| 016–022 | P3–P4 | Abertos/proposto | Conforme bloco |

---

## 9. O que esta auditoria **não** fez

- Não editou código, migrations, banco, env, deploy  
- Não executou pagamentos, publicação em massa, repair, reset  
- Não reabriu blocos 02–10/07  
- Não validou E2E browser catálogo/checkout  
- Não recontou SQL comercial no wtbp (recomendado no passo 0)

---

## 10. Decisão e execução (atualizado)

| Decisão eFe | Status |
|-------------|--------|
| IMP-11 diagnóstico + A–D | **Feito** — [VAL-11](./FAL_IMP_11_CATALOGO_CLIENTE_VAL_2026-10-09.md) |
| IMP-12 Home/destaques/promo | **Feito** — [VAL-12](./FAL_IMP_12_HOME_DESTAQUES_VAL_2026-10-09.md) |
| IMP-13 Clientes | **Feito** — [VAL-13](./FAL_IMP_13_CLIENTES_VAL_2026-10-09.md) |
| FIND-006 carrinho | **Feito** — [diag](./FAL_FIND006_CARRINHO_PRECO_DIAGNOSTICO_2026-10-09.md) + [VAL](./FAL_FIND006_CARRINHO_PRECO_VAL_2026-10-09.md) |
| IMP-11 visual/import (diag) | **Feito** — [diag](./FAL_IMP_11_VISUAL_IMPORT_DIAGNOSTICO_2026-10-09.md); M1–M6 card + PDP domínio |
| FIND-012 sort preço | **Feito** — [VAL](./FAL_FIND012_SORT_PRECO_VAL_2026-10-09.md) |
| FIND-003/004 recontagem | **Feito** — [doc](./FAL_FIND003_004_RECONTAGEM_WTBP_2026-10-09.md); FIND-004 **STOP**; FIND-003 residual SK971 |
| IMP-19 U1–U5 | **Feito** — [VAL-19](./FAL_IMP_19_UX_VAL_2026-10-09.md) |
| Smoke MP prep | **Feito** — [prep](./FAL_MP_SMOKE_PREP_2026-10-09.md) — execução humana |
| Repair B3 | **HOLD** — [doc](./FAL_B3_MIGRATION_REPAIR_HOLD_2026-10-09.md) |

**Decisão operacional (atualizada 2026-10-09):**  
IMP-19 + FIND-022 **fechados**. Planilha FIND-004 **recebida**; auditoria [FIND-004 contrato](./FAL_FIND004_APPS_CONTRATO_AUDITORIA_2026-10-09.md) = **BLOQUEADO APPLY** (gap versão vazia).  
Próxima MARCHA: `FIND-004` (código expand blank→VVs) · `MP` (smoke humano) · `B3` (aprovação repair).  
Sem MARCHA: **não** apply apps / migrations / ampliar escopo.
