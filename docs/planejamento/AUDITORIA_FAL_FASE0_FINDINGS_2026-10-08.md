# Auditoria FAL Fase 0 — Findings

**Data:** 2026-10-08  
**Modo:** somente leitura  
**Template:** Protocolo §6  
**Refs:** [MAPA](./AUDITORIA_FAL_FASE0_MAPA_2026-10-08.md) · [INVENTÁRIO](./AUDITORIA_FAL_FASE0_INVENTARIO_2026-10-08.md)

---

## Resumo por severidade

| Sev | Qtd | IDs |
|-----|-----|-----|
| P0 | 1 | FIND-001 |
| P1 | 6 | FIND-002 … FIND-007 |
| P2 | 8 | FIND-008 … FIND-015 |
| P3 | 5 | FIND-016 … FIND-020 |
| P4 | 2 | FIND-021 … FIND-022 |

**Divergências:** DIV-001 e DIV-002 **decididas** pelo eFe (2026-10-08) — ver seção final e [PLANO_CORRECAO](./AUDITORIA_FAL_FASE0_PLANO_CORRECAO_2026-10-08.md).

---

### FIND-001

| Campo | Valor |
|-------|-------|
| ID | FIND-001 |
| Área | Arquitetura / Dados |
| Tela | — (transversal) |
| Rota | — |
| Elemento | Schema Supabase remoto vs migrations git |
| Problema | Linhagem de schema divergente: remoto com migrations `hf_f1_*`; repo com ~52 SQL `fase*` (pedidos, estoque, overrides, frete SQL, MP foundation). Remoto **não tem** `orders`, `product_price_overrides`, estoque; tem `catalogs`/`customer_groups` HF. |
| Comportamento atual | App aponta para projeto com subset HF + patches; código ainda assume capacidades F6–F9. |
| Comportamento esperado | Uma única linhagem oficial aplicada e documentada. |
| Causa provável | Rebuild/projeto novo (criado 2026-10-07) sem reaplicar cadeia fase completa. |
| Causa confirmada | `list_migrations` remoto ≠ arquivos em `fal-pecas/supabase/migrations`; `information_schema.tables` sem orders/estoque/overrides. |
| Impacto | Pedidos, estoque, overrides, parte de preços/checkout **não podem** ser “concluídos” no remoto atual. |
| Dependências | Todo F10 operacional, F9, relatórios de pedido |
| MCP utilizado | Supabase |
| Evidência | MCP `list_migrations` + `select table_name …`; pasta migrations local |
| Severidade | **P0** |
| Proposta | Hipótese preferencial opção 1 (migrations `fase*` no projeto canônico), condicionada ao diff de `FAL-IMP-01`; congelar features que dependem de tabelas ausentes até alinhar. |
| Status | **Esclarecido** — MCP=HF (`owll…`); runtime app=`wtbp…` já `fase*` (VAL-01 PASS). FIND-001 não bloqueia Onda 1 no runtime |
| Teste necessário | Diff no project-ref correto |
| Resultado do teste | [Adendo](./FAL_IMP_01_ADDENDUM_RUNTIME_CANONICO_2026-10-08.md) + [VAL-01](./FAL_VAL_01_RUNTIME_SCHEMA_2026-10-08.md) |

---

### FIND-002

| Campo | Valor |
|-------|-------|
| ID | FIND-002 |
| Área | Loja / Disponibilidade |
| Tela | Catálogo / PDP / Admin produtos |
| Rota | `/catalogo`, `/produto/:id`, `/admin/produtos` |
| Elemento | `is_available` |
| Problema | (legado HF) 51/52 published com `is_available=false`. |
| Comportamento atual | Vitrine lista `published`; compra exige available. |
| Comportamento esperado | Processo claro de Liberar; massa só com checklist (D-LIBERAR). |
| Causa provável | Gate Liberar + imports não publicam disponibilidade. |
| Causa confirmada | Snapshot HF 2026-10-08; **runtime `wtbp` 2026-10-09: ~100 published / ~99 available**. |
| Impacto | Quantidade na loja já ok no runtime; risco = liberação em massa sem critérios. |
| Dependências | Liberar / D-LIBERAR |
| MCP utilizado | Supabase |
| Evidência | Runtime wtbp query products 2026-10-09 |
| Severidade | **P1** (processo) / quantitativo legado |
| Proposta | Checklist D-LIBERAR no bulk/unitário (`FAL-IMP-10`). |
| Status | **fechado** (processo) — D-LIBERAR em [IMP-10](./FAL_IMP_10_LIBERAR_VAL_2026-10-09.md); runtime ~99 available |
| Teste necessário | Liberar 1 SKU → aparece comprável → place_order |
| Resultado do teste | Checklist unitário + vitest PASS; E2E place_order manual residual |

---

### FIND-003

| Campo | Valor |
|-------|-------|
| ID | FIND-003 |
| Área | Preços / Custos |
| Tela | Listas / import custo |
| Rota | `/admin/precos`, import custos |
| Elemento | `supplier_products.cost`, `price_list_items` |
| Problema | Quase sem custo e sem itens de preço: 0 rows custo; 1 item com preço; 51 produtos sem supplier. |
| Comportamento atual | Formação/recalc sem base; Liberar falha por preço. |
| Comportamento esperado | Custo principal + itens em lista ativa. |
| Causa confirmada | SQL snapshot **HF** (legado); **não** reproduz wtbp |
| Impacto | Cadeia preço→loja quebrada na origem de dados. |
| Dependências | FIND-001 (RPCs recalc), import custo |
| MCP | Supabase |
| Evidência | [Recontagem wtbp](./FAL_FIND003_004_RECONTAGEM_WTBP_2026-10-09.md): 99 custos >0; 198 PLI; 1 published sem resolve |
| Severidade | **P1→fechado quantitativo** |
| Proposta | Operação: import custo + apply preço; validar supplier principal. |
| Status | **fechado (wtbp)** 2026-10-09 — residual **SK971** (published, `is_available=false`, price 0, resolve null) |
| Teste | Import custo → item calculated → resolve > 0 |
| Resultado | Recontagem PASS; residual rastreado (não comprável) |

---

### FIND-004

| Campo | Valor |
|-------|-------|
| ID | FIND-004 |
| Área | Aplicações |
| Tela | Catálogo filtros / PDP |
| Rota | `/catalogo`, `/produto/:id` |
| Elemento | `product_vehicle_compatibility` |
| Problema | Cobertura PVC: 1 produto com aplicação; 51 sem. Filtro por veículo ineficaz. |
| Causa confirmada | SQL compat counts |
| Impacto | Busca por veículo / card “sob consulta”. |
| Severidade | **P1** |
| Proposta | Import aplicações em escala (dados); F11 para qualidade. |
| Status | **parcial / BLOQUEADO APPLY** — planilha 691×100 OK; gap comercial `versao` vazia ≠ todas VVs; [auditoria](./FAL_FIND004_APPS_CONTRATO_AUDITORIA_2026-10-09.md) |
| MCP | Supabase + código `applicationImportCore` |
| Evidência | wtbp 17/45 (2026-10-09); pré-val dry-run 645 applyable técnico / 311 blank; Palio 5 VV |

---

### FIND-005

| Campo | Valor |
|-------|-------|
| ID | FIND-005 |
| Área | Pagamentos |
| Tela | Checkout |
| Rota | `/checkout` |
| Elemento | Mercado Pago live |
| Problema | Smoke live/sandbox humano bloqueado (secret + redeploy). Código F9-E local ok. |
| Causa confirmada | STOP Bloco G docs |
| Impacto | Pagamento real não validado. |
| Severidade | **P1** |
| Proposta | Ação humana checklist STOP; depois F9-F. |
| Status | aberto |
| MCP | Docs + (condicional) MP |
| Evidência | DIAGNOSTICO G1; commits F9-E |

---

### FIND-006

| Campo | Valor |
|-------|-------|
| ID | FIND-006 |
| Área | Preço — resolução paralela |
| Tela | Card / Carrinho / Liberar |
| Rota | `/catalogo`, `/carrinho`, admin produtos |
| Elemento | `resolve_product_price` vs espelho vs Liberar |
| Problema | Três caminhos: RPC resolve (repo), espelho `price`/`promo_price`, heurística Liberar (qualquer lista active / espelho). Carrinho UX usa espelho. |
| Causa confirmada | Exploração `priceResolutionService`, `supabaseCartService`, `adminReleaseProductToStore` |
| Impacto | Preço liberado/exibido/cobrado pode divergir. |
| Severidade | **P1** |
| Proposta | Uma resolução oficial em toda leitura comercial; Liberar chama a mesma regra. |
| Status | **fechado** — [diag](./FAL_FIND006_CARRINHO_PRECO_DIAGNOSTICO_2026-10-09.md) + [VAL](./FAL_FIND006_CARRINHO_PRECO_VAL_2026-10-09.md): carrinho aplica `resolve_product_prices`; `place_order` canônico |
| Dependências | Runtime wtbp resolve OK |
| Nota remoto | Evidência CLI wtbp 2026-10-09 |

---

### FIND-007

| Campo | Valor |
|-------|-------|
| ID | FIND-007 |
| Área | Catálogo UI |
| Tela | Catálogo |
| Rota | `/catalogo` |
| Elemento | Grade de resultados |
| Problema | (legado) Browser: filtros/busca renderizam; cards ausentes no 1º viewport ou suspeita de lista vazia. Snapshot antigo citava 52 published (HF). |
| Causa provável | `search_products` / empty / mismatch HF |
| Causa confirmada | **wtbp 2026-10-09:** RPC `total_count=100`; UI “100 produtos”; lista **não** vazia. Residual: filtros altos empurravam grade abaixo da dobra. |
| Impacto | Quantitativo P1 invalidado no runtime; UX 1º viewport era o residual. |
| Severidade | **P1 → reclassificado P2 UX** (fechado quantitativo) |
| Proposta | Compactar filtros veículo + sticky de resultados (`FAL-IMP-11`). |
| Status | **fechado** (quantitativo) / residual UX tratado em [IMP-11](./FAL_IMP_11_CATALOGO_CLIENTE_VAL_2026-10-09.md) |
| MCP | Browser + CLI wtbp |
| Evidência | [Diagnóstico](./FAL_IMP_11_CATALOGO_DIAGNOSTICO_2026-10-09.md) |

---

### FIND-008

| Campo | Valor |
|-------|-------|
| ID | FIND-008 |
| Área | Frete |
| Problema | Provider default mock; Correios/Frenet stubs; sem UI troca provider. |
| Severidade | **P2** |
| Proposta | Decisão provedor (DECISÃO PENDENTE) + plano substituição. |
| Status | aberto |

---

### FIND-009

| Campo | Valor |
|-------|-------|
| ID | FIND-009 |
| Área | Importações |
| Problema | Histórico/auditoria UI só em preço; demais pipelines sem tela de runs. |
| Severidade | **P2** |
| Proposta | UI unificada sobre `imports`/`import_items` (todos kinds). |
| Status | **fechado** — FAL-IMP-06 / VAL-06 (2026-10-09): `/admin/importacoes` |

---

### FIND-010

| Campo | Valor |
|-------|-------|
| ID | FIND-010 |
| Área | Custo base |
| Problema | Preview admin com fallback FAL-SUP-01; SQL base cost só `products.supplier_id`. |
| Severidade | **P2** |
| Proposta | Unificar regra (preferência: SQL oficial + mesmo fallback documentado). |
| Status | **fechado** — FAL-IMP-08 / VAL-08 (2026-10-09): SQL `product_base_cost` + lote; admin consome RPC |
| Divergência | DIV-002 decidido e entregue |

---

### FIND-011

| Campo | Valor |
|-------|-------|
| ID | FIND-011 |
| Área | Nomenclatura |
| Problema | Mistura SKU / Código referência; badges EN CALCULATED/IMPORTED/MANUAL vs filtros PT. |
| Severidade | **P2** |
| Proposta | Vocabulário oficial em `productLabels` (+ origem preço). |
| Status | **parcial** — Código referência (IMP-03) + origem PT em listas (`priceLabels`, IMP-09); resto vocab → IMP-23 |

---

### FIND-012

| Campo | Valor |
|-------|-------|
| ID | FIND-012 |
| Área | Busca |
| Problema | Sort por preço no RPC usa preço legado; client reordena só página atual. |
| Severidade | **P2** |
| Proposta | Ordenar por preço resolvido no SQL ou documentar limitação. |
| Status | **fechado** 2026-10-09 — [VAL](./FAL_FIND012_SORT_PRECO_VAL_2026-10-09.md) (`try_resolve_product_amount` + sort RPC) |

---

### FIND-013

| Campo | Valor |
|-------|-------|
| ID | FIND-013 |
| Área | Permissões |
| Problema | Bloco F granular STOP; admin pode travar em “Verificando permissões…”. |
| Severidade | **P2** |
| Proposta | Manter STOP F; melhorar feedback timeout/erro sessão. |
| Status | **parcial** — timeout StaffRoute (VAL-19 U2); Bloco F granular permanece STOP |
| Evidência | Browser `/admin/produtos`; [VAL-19](./FAL_IMP_19_UX_VAL_2026-10-09.md) |

---

### FIND-014

| Campo | Valor |
|-------|-------|
| ID | FIND-014 |
| Área | Dashboard / Relatórios |
| Problema | Pedidos reais no dashboard mas tabela orders ausente no remoto → zeros permanentes; relatórios só totais pedido. |
| Severidade | **P2** |
| Proposta | Após FIND-001: KPIs reais; indicadores catálogo (sem preço/app/indisponível). |
| Status | aberto |

---

### FIND-015

| Campo | Valor |
|-------|-------|
| ID | FIND-015 |
| Área | Checkout / MP |
| Problema | Método placeholder `pix_simulated` em fluxo com MP ligado (exploração código). |
| Severidade | **P2** |
| Proposta | F9-F: método real alinhado ao provider. |
| Status | aberto |

---

### FIND-016

| Campo | Valor |
|-------|-------|
| ID | FIND-016 |
| Área | Produtos relacionados |
| Problema | Feature inexistente. |
| Severidade | **P3** |
| Proposta | Só após regra comercial (veículo/categoria); não preencher com incompatíveis. |
| Status | aberto |
| Nota | Fora do “remendo”; escopo F10 só se plano aprovar |

---

### FIND-017

| Campo | Valor |
|-------|-------|
| ID | FIND-017 |
| Área | `list_extra_cost` R$ |
| Problema | Campo existe; fora do cálculo (placeholder). |
| Severidade | **P3** |
| Proposta | Remover da UI operacional **ou** incorporar na fórmula (decisão). |
| Status | aberto |

---

### FIND-018

| Campo | Valor |
|-------|-------|
| ID | FIND-018 |
| Área | Priority lista |
| Problema | `Lista Promocional.priority = 100` — regra real de desempate na resolução. |
| Severidade | **P3** (conceitual) |
| Proposta | Manter; documentar no vocabulário (“Prioridade da lista”); UI explicar. **Não remover.** |
| Status | proposto |
| Evidência | SQL price_lists |

---

### FIND-019

| Campo | Valor |
|-------|-------|
| ID | FIND-019 |
| Área | Mocks fallback |
| Problema | Sem Supabase, loja cai em mocks — risco de dados fictícios em misconfig. |
| Severidade | **P3** |
| Proposta | Empty state explícito “catálogo indisponível” em vez de mock silencioso (avaliar). |
| Status | **fechado** 2026-10-09 — [VAL-19](./FAL_IMP_19_UX_VAL_2026-10-09.md) U1 (`assertStoreBackendConfigured`) |

---

### FIND-020

| Campo | Valor |
|-------|-------|
| ID | FIND-020 |
| Área | Código morto |
| Problema | OrdersPage órfã; pastas vazias; deprecated services. |
| Severidade | **P3** |
| Proposta | Limpeza controlada pós-gate. |
| Status | aberto |

---

### FIND-021

| Campo | Valor |
|-------|-------|
| ID | FIND-021 |
| Área | Footer |
| Problema | Privacidade/Termos “(em breve)”. |
| Severidade | **P4** |
| Proposta | Páginas legais mínimas ou ocultar links. |
| Status | **fechado** 2026-10-09 — links ocultos (VAL-19 U5); conteúdo oficial futuro |

---

### FIND-022

| Campo | Valor |
|-------|-------|
| ID | FIND-022 |
| Área | UX copy |
| Problema | Empty/loading/erros inconsistentes entre admin e loja. |
| Severidade | **P4**→P2 se bloquear operação |
| Proposta | Passe F10 UX global. |
| Status | **fechado** 2026-10-09 — EmptyState listas admin (VAL-19 U4 + addendum FIND-022) |

---

## Divergências (regra obrigatória)

### DIV-001 — Item de lista “ativo/inativo”

| Campo | Valor |
|-------|-------|
| Fonte | Prompt Mestre §22 (“70 ativos / 30 inativos” na lista) |
| Realidade código/DB | `price_list_items` **sem** status active/inactive; elegibilidade ≈ price>0 + lista active + produto |
| Alternativa A | Implementar `status` no item (mais próximo do prompt) |
| Alternativa B | Formalizar no PRD: “com preço / sem preço” + produto `is_available` (mais próximo do código) |
| Impacto | Schema, UI listas, Liberar, loja |
| Decisão | **Decidido (eFe 2026-10-08): B** — item = com preço / sem preço; não criar active/inactive no item agora. Lista mantém active/inactive. Entrega UI/PRD na Onda 1 (`FAL-IMP-09`). |
| Entrega | **Feito 2026-10-09** — [FAL_IMP_09_LISTAS_DIV001_VAL_2026-10-09.md](./FAL_IMP_09_LISTAS_DIV001_VAL_2026-10-09.md) |

### DIV-002 — Autoridade do custo base (fallback FAL)

| Campo | Valor |
|-------|-------|
| Fonte | TS `resolveBaseCost` com FAL-SUP-01 vs SQL só supplier_id |
| Alternativa | Unificar no SQL **ou** remover fallback TS |
| Impacto | Recalc, preview, import |
| Decisão | **Decidido (eFe 2026-10-08):** unificar na camada central/SQL (incl. fallback se for regra oficial); remover duplicidade do TS. Entrega Onda 1 (`FAL-IMP-08`). |
| Entrega | **Feito 2026-10-09** — [FAL_IMP_08_PRECOS_DIV002_VAL_2026-10-09.md](./FAL_IMP_08_PRECOS_DIV002_VAL_2026-10-09.md) |

---

## Próximo artefato

→ [AUDITORIA_FAL_FASE0_CAUSAS_RAIZ_2026-10-08.md](./AUDITORIA_FAL_FASE0_CAUSAS_RAIZ_2026-10-08.md)
