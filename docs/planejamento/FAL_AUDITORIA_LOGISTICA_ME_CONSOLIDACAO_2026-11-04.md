# Auditoria completa — Logística × Melhor Envio × D-FRETE (consolidação)

**Data:** 2026-11-04  
**Tipo:** auditoria + consolidação documental (**sem** implementação de código)  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Política comercial vigente:** D-FRETE **B** assinada ([ficha](./FAL_D_FRETE_DECISAO_2026-10-10.md))  
**α:** ENCERRADA ([STOP formal](./FAL_STOP_ALPHA_FORMAL_2026-11-04.md))  
**Documento canônico atualizado:** [FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md](./FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md)

**Escopo desta marcha:** só documentação. Não altera código, migrations aplicadas, secrets, env, deploy, Netlify, commits de código nem PRs.

---

## Legenda de classificação

| Rótulo | Significado |
|--------|-------------|
| **APROVADO** | Decisão funcional confirmada (eFe / docs assinados) |
| **IMPLEMENTADO** | Comprovado no código atual |
| **PARCIAL** | Existe, não atende o requisito integral |
| **GAP** | Precisa ser desenvolvido |
| **PROPOSTA** | Solução sugerida, sem aprovação comercial/técnica final |
| **PENDÊNCIA** | Decisão necessária (não inventar) |
| **NÃO VERIFICADO** | Evidência insuficiente nesta auditoria |

---

## A. Diagnóstico executivo

A FAL está **pós-α** com D-FRETE **B**. Hub Logística, origem/remetente, frete próprio configurável (`enabled=false` em produção) e gestão de medidas Manual/Global **já existem** e foram VALidados (PR #45 / deploy logística). A Central de Pedidos já tem path Melhor Envio **sandbox na Expedição** (`melhorenvio-label` + painel; PR #56), **sem** comprar etiqueta no webhook Mercado Pago.

O plano canônico de logística ([FAL_PLANO_FUNCIONAL…](./FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md) versão pré-auditoria) estava **desatualizado**: marcava Melhor Envio como “Ausente” e hub/origem como “próximo a implementar”.

A especificação Cursor “ciclo completo após pagamento” (`melhorenvio-fulfill` no webhook MP) **conflita** com a arquitetura já VAL da Central de Pedidos e com a regra explícita “não comprar etiqueta no webhook MP”. Esta auditoria **rejeita essa proposta como arquitetura padrão** e a classifica como **PROPOSTA SUBSTITUÍDA**.

**Riscos principais:**

1. Documentação desatualizada induz reimplementação do que já existe.  
2. Cotação ME no checkout (`meq:`) misturada com etiqueta na expedição sem gate D-FRETE.  
3. Migration proposed `shipping_quotes` com RLS usando `customers.user_id` — coluna **inexistente** (FATO: `profile_id`).  
4. Edge `melhorenvio-label` ainda **dry-run / payload incompleto** (CEP origem hardcoded; cart live sem POST real completo).  
5. ~98/100 published sem peso (probe histórico 04/11) — bloqueia cotação ME real.  
6. Secrets `MELHOR_ENVIO_*` — **NÃO VERIFICADO** se já estão no wtbp (esta marcha não leu secrets).

---

## B. Matriz de conformidade (resumo)

| Requisito | Decisão | Código | Classificação | Evidência | Próxima ação |
|-----------|---------|--------|---------------|-----------|--------------|
| 3 áreas: Produtos / Logística / Pedidos | APROVADO | Hub + rotas | IMPLEMENTADO | `AdminLogisticsHubPage`, router | Manter |
| Hub 4 atalhos | APROVADO | 4 cards; ME/config `ready:false` | PARCIAL | Hub VAL | UI ME config sob Logística |
| Medidas Manual/Global + bulk | APROVADO | Form + service + DDL | IMPLEMENTADO | VAL medidas | Dados operacionais (M6) |
| Padrão categoria não aplica auto | APROVADO | — | GAP | Plano | MARCHA padrões |
| Histórico medidas | APROVADO alvo | — | GAP | Backlog P1-LOG-HIST | Após M6 |
| Origem + remetente | APROVADO | `store_shipping_origin` | IMPLEMENTADO | VAL origem | ME deve **ler** esta origem (hoje hardcoded) |
| Frete próprio SP | APROVADO | settings + `own:*` | IMPLEMENTADO config | VAL frete próprio; `enabled=false` | Critérios preço = PENDÊNCIA |
| Mock default checkout | APROVADO (B) | `VITE_SHIPPING_PROVIDER` default mock | IMPLEMENTADO | registry + smoke loja | Manter até C |
| Cotação ME loja (`meq:`) | PROPOSTA | Sem carrier ME; quote-shipping sem ME | GAP | registry; edge quote | Só pós decisão + B sandbox explícito |
| Etiqueta ME pós-pagamento auto | PROPOSTA Cursor | **Conflita** com VAL Central | **REJEITADA** | VAL ME sandbox | Usar Expedição |
| Etiqueta ME na Expedição | APROVADO arquitetura Pedidos | Edge + UI | PARCIAL | `melhorenvio-label` dry-run | Secrets + cart HTTP real |
| Webhook ME → ship/deliver | Fora 1ª marcha | stub | PARCIAL stub | `melhorenvio-webhook` | Não auto-transicionar |
| `shipping_quotes` | PROPOSTA path checkout | Só `migrations/proposed/` | GAP + bug RLS | proposed SQL `user_id` | Corrigir `profile_id` antes de apply |
| D-FRETE C / ME live loja | PENDÊNCIA | — | PENDÊNCIA | ficha B | Nova assinatura |
| Pedidos ops detalhado | Fora escopo Logística | Central #56 | IMPLEMENTADO parcial | VAL Central | Plano Pedidos separado |

---

## C. Auditoria Melhor Envio

### C.1 Documentação oficial (API)

Consultado via Context7 `/websites/melhorenvio_br` (docs.melhorenvio.com.br):

| Endpoint | Uso | Compatível sandbox? |
|----------|-----|---------------------|
| `POST /api/v2/me/shipment/calculate` | Cotação | Sim (`sandbox.melhorenvio.com.br`) |
| `POST /api/v2/me/cart` | Inserir frete | Sim; exige `service`, `from`, `to`, `products`, `volumes`; `User-Agent` obrigatório |
| `POST /api/v2/me/shipment/checkout` | Comprar etiqueta | Sim; saldo carteira |
| `POST /api/v2/me/shipment/generate` | Gerar | Sim |
| `POST /api/v2/me/shipment/print` | URL impressão | Sim |
| `POST /api/v2/me/shipment/tracking` | Rastreio | Sim |

**FATO:** Bearer + User-Agent (app + e-mail) são obrigatórios. Base sandbox correta no código: `ME_SANDBOX_BASE`.

### C.2 Código atual (FATO)

| Artefato | Estado |
|----------|--------|
| `melhorenvio-label` | IMPLEMENTADO esqueleto; dry-run sem token; quote HTTP parcial; **cart live não posta payload completo**; purchase/generate dry-run-friendly |
| `melhorenvio-webhook` | STUB HMAC + insert ledger (tabela só se migration applied) |
| `_shared/melhorEnvioCore.ts` | Helpers label_state, divergence, headers |
| `melhorEnvioLabelState.ts` + testes | IMPLEMENTADO |
| `MeExpeditionPanel` + admin service | IMPLEMENTADO UI Expedição |
| `carrierRegistry` entrada `melhorenvio` | **Ausente** → GAP |
| `quote-shipping` path ME | **Ausente** → GAP |
| `place_order` / `meq:` | **Ausente**; aceita `mock:*` + `own:*` → PARCIAL vs proposta checkout ME |
| `shipping_quotes` em wtbp | **NÃO VERIFICADO** apply remoto; no repo só `proposed/` → tratar como **não aplicada** |
| Secrets no Edge | **NÃO VERIFICADO** (não ler secrets nesta marcha) |
| Nome secret código | `MELHOR_ENVIO_TOKEN`, `MELHOR_ENVIO_USER_AGENT`, `MELHOR_ENVIO_WEBHOOK_SECRET` — **≠** `MELHORENVIO_*` do plano Cursor |

### C.3 Avaliação dos 18 pontos críticos

| # | Ponto | Veredito |
|---|-------|----------|
| 1 | Endpoints × docs oficiais | OK conceitualmente |
| 2 | Cart/checkout/generate/tracking/print sandbox | OK; código FAL ainda incompleto no cart live |
| 3 | Retomada após falha parcial | PARCIAL — `label_state` ajuda; falta consulta ME pós-timeout compra |
| 4 | Webhook MP assíncrono → fulfill | **REJEITADO** como padrão (VAL Central: MP só approve) |
| 5 | Duplicar etiqueta em retry | Mitigado por `alreadyPurchased` / `cart_item_id`; risco se cart live gerar ID sem persistir |
| 6 | `shipments.metadata` | Adequado p/ sandbox; comment proposed documenta contrato |
| 7 | Schema `meq:` | Sem conflito de prefixo com `mock:`/`own:`; exige tabela + RPC |
| 8 | Consumo atômico cotação | PROPOSTA — não implementado |
| 9 | Fingerprint | Envelope já tem fingerprint client; persistência server GAP |
| 10 | Remetente × `store_shipping_origin` | Origem IMPLEMENTADA; label **não usa** (CEP `01310100` hardcoded) → GAP |
| 11 | Caixa única | PROPOSTA aceitável v1; PENDÊNCIA composição volumes |
| 12 | Max eixos + peso somado | PROPOSTA; validar limites ME em homologação |
| 13 | Seguro rateado | PROPOSTA; label atual usa `insurance_value: charged` no pacote único |
| 14 | CEP/bairro/telefone/CPF | Origem valida; checkout ME path exigiria telefone/bairro — PARCIAL loja |
| 15 | `shipments.status = ready` pós-etiqueta | VAL atual **não** força `ready`; metadata `label_state` é a verdade — preferir VAL |
| 16 | Pedido em `em_analise` + etiqueta | **Incoerente** com VAL (etiqueta só em `pronto_para_envio`) — rejeitar auto-etiqueta em análise |
| 17 | `VITE_SHIPPING_PROVIDER=melhorenvio` sem mudar default | Viável se carrier existir; **hoje não existe** |
| 18 | Exposição secrets/PII | Tokens Edge OK; RLS proposed bug; anon read origem já existe (auditoria deploy) |

### C.4 Separação sandbox × produção

| Atividade | Sob D-FRETE B? |
|-----------|----------------|
| Desenvolvimento estrutural (hub, origem, UI Expedição, dry-run) | **Pode** (já feito em parte) |
| Secrets sandbox + cart/checkout HTTP sandbox na Expedição | **Pode** com MARCHA + auth eFe (não é C) |
| Cotação ME como default loja / preço cobrado = ME | Exige decisão explícita; **C** se for frete de produção |
| Token produção / NF-e / webhook ME → transição pedido | **Fora** até C + MARCHAs |

---

## D. Inconsistências encontradas

| ID | Tipo | Descrição |
|----|------|-----------|
| INC-1 | Doc × código | Plano funcional dizia ME “Ausente”; código tem edges/UI Expedição |
| INC-2 | Doc × doc | Plano Cursor fulfill-após-MP × VAL Central “nunca etiqueta no webhook MP” |
| INC-3 | Doc D-FRETE | Tabela de providers omite `own:*` (existe no SQL) |
| INC-4 | SQL proposed | RLS `customers.user_id` — schema real usa `profile_id` |
| INC-5 | Secrets naming | Plano Cursor `MELHORENVIO_*` × código `MELHOR_ENVIO_*` |
| INC-6 | Address snapshot | Label lê `cep`/`zip`; snapshot FAL usa `postal_code` |
| INC-7 | Carrinho cotação | `CartShippingQuoteBlock` **não** chama `loadCartLogistics` (só id/qty) |
| INC-8 | carrierRegistry notes | Ainda diz “único provedor place_order = mock” — desatualizado (`own:*`) |
| INC-9 | Auditoria completa pendências 04/11 | Lista edges sem `melhorenvio-*` (pré-#56) |
| INC-10 | STOP α | Diz hub/frete próprio “não inclui α” — correto historicamente; pós-α já implementados |

---

## E. Planejamento consolidado

Ver documento canônico reescrito na mesma data:  
[FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md](./FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md)

Plano Cursor Melhor Envio atualizado para alinhar à arquitetura Expedição (não fulfill no webhook MP).

---

## F. Pendências — status pós D12 (eFe)

| # | Item | Status |
|---|------|--------|
| 1 | Etiqueta só na Expedição (manual); sem auto-purchase no MP | **FECHADA** — D12 / D10 |
| 2 | Cotação ME na loja sob B + disclaimer | **FECHADA** — D12.1 |
| 3 | Prepare snapshot no approve (sem purchase) | **FECHADA** — D12.3 |
| 4 | Remetente = `store_shipping_origin` + token Edge | **FECHADA** — D12.6 |
| 5 | Apply migration proposed (após fix RLS `profile_id`) | **ABERTA** P-ME-1 |
| 6 | Timing secrets vs M6 | **ABERTA** P-ME-2 |
| 7 | Filtro serviços ME | **ABERTA** P-ME-3 |
| 8 | Cart ME no approve vs só Expedição (rec: só Expedição) | **ABERTA** P-ME-4 |
| 9 | Precificação avançada frete próprio | **ABERTA** P-ME-5 |

Planejamento detalhado: [FAL_MARCHA_ME_HIBRIDO_PLANEJAMENTO_2026-11-04.md](./FAL_MARCHA_ME_HIBRIDO_PLANEJAMENTO_2026-11-04.md).

---

## G. Próximas marchas (ordem) — híbrido D12

| Ordem | MARCHA / PR | Depende de |
|-------|-------------|------------|
| 1 | M6 — dados de medidas | eFe valores |
| 2 | PR-1 — `loadCartLogistics` no carrinho | — |
| 3 | M-ME-SEC — secrets + migration (RLS fix) | P-ME-1/2 |
| 4 | PR-2 — cotação ME + `meq:` + own | M6 parcial + secrets |
| 5 | PR-3 — prepare-on-approve | PR-2 |
| 6 | PR-4 — label HTTP manual + origem DB | secrets |
| 7 | VAL E2E / M7 ops | PR-3+4 |
| 8 | LOG-ME-ADMIN + LOG-CFG | — |
| 9 | D-FRETE C | Assinatura nova |

**Não** misturar auto-purchase no webhook MP com esta fila.

---

## H. Relatório de alterações documentais

| Documento | Ação |
|-----------|------|
| `FAL_AUDITORIA_LOGISTICA_ME_CONSOLIDACAO_2026-11-04.md` | Criado; §F/G atualizados pós-D12 |
| `FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md` | Atualizado — D12 + §9 híbrido |
| `FAL_MARCHA_ME_HIBRIDO_PLANEJAMENTO_2026-11-04.md` | **Criado** — detalhe A–D, PRs, aceite |
| Plano Cursor `melhor_envio_sandbox_*.plan.md` | Atualizado — modelo híbrido |
| VALs logística / Central ME / D-FRETE / STOP α | Intactos (referenciados) |
| Código / migrations aplicadas / secrets | **Não alterados** nesta marcha docs |

---

## Critério de conclusão desta auditoria

- [x] Código confrontado com requisitos  
- [x] Docs reconciliados (canônico + auditoria)  
- [x] Spec ME avaliada vs API oficial e vs VAL existente  
- [x] Sandbox ≠ produção explícito  
- [x] D-FRETE B e α respeitados  
- [x] Pedidos ops fora do escopo operacional do plano Logística (referência cruzada)  
- [x] Decisões / propostas / pendências classificadas  

**Assinatura agente:** auditoria logística + ME consolidação 2026-11-04 — documentação apenas.
