# FAL — Backlog HOME-01 a HOME-08  
## Home da Loja — execução e acompanhamento

**Projeto:** FAL — Peças Automotivas  
**Data:** 12/11/2026  
**Status:** Frente 1 + Gate pós-F1 **DONE** · Frente 2 liberada  

**Plano mestre:** [FAL_PLANO_MESTRE_HOME_COMERCIAL_2026-11.md](./FAL_PLANO_MESTRE_HOME_COMERCIAL_2026-11.md)  
**Spec histórica:** [FAL_SPEC_ONDA3_COMERCIAL_PROMOCOES_2026-11-08.md](./FAL_SPEC_ONDA3_COMERCIAL_PROMOCOES_2026-11-08.md) — SUPERSEDIDA  

**Governança:** frente paralela HOME-\*; sem novos AJUSTEs neste ciclo; AJUSTE-035 = Checkout exclusivo.

---

## 0. Mapa frentes × pacotes

Sequência obrigatória: **Frente 1 → Gate pós-F1 → Frente 2 → Frente 3**.

| Pacote | Frente | Natureza | Estado |
|--------|--------|----------|--------|
| A0 Docs (mestre + este backlog + Onda 3) | F1 | Documentação | **DONE** 12/11/2026 |
| HOME-01 | F1 | Auditoria preços (bloqueador) | **DONE** — [FAL_AUDITORIA_HOME_01_PRECOS_2026-11-12.md](./FAL_AUDITORIA_HOME_01_PRECOS_2026-11-12.md) |
| HOME-06a | F1 (∥ HOME-01) | Auditoria pagamentos | **DONE** — [FAL_AUDITORIA_HOME_06_PAGAMENTOS_2026-11-12.md](./FAL_AUDITORIA_HOME_06_PAGAMENTOS_2026-11-12.md) |
| Consolidação | F1 | Spec gate Opção A + P0 pag | **DONE** — [FAL_SPEC_HOME_CONSOLIDACAO_GATE_PAG_2026-11-12.md](./FAL_SPEC_HOME_CONSOLIDACAO_GATE_PAG_2026-11-12.md) |
| HOME-03 | F1 | Novo — menu Promoções | **DONE remoto** · [apply VAL](./FAL_MARCHA_HOME_F1_APPLY_SMOKE_VAL_2026-11-12.md) · smoke UI com massa pendente |
| HOME-04 | F1* | Integração global | **Gate resolve PASS** · [VAL](./FAL_MARCHA_HOME_04_GATE_SMOKE_VAL_2026-11-12.md) · UI jornada pendente massa |
| HOME-06b | F1 | Implantação Pagamentos | **PAY consolidação 2026-11-13** — [auditoria](./FAL_AUDITORIA_PAY_CONSOLIDACAO_2026-11-13.md) · P0 Brick + controle comercial + parcelas reais · PIX%/faixas ainda fora |
| Gate pós-F1 | Entre F1 e F2 | Análise melhorias/correções/ajustes | **DONE** — [FAL_ANALISE_POS_F1_HOME_COMERCIAL_2026-11-12.md](./FAL_ANALISE_POS_F1_HOME_COMERCIAL_2026-11-12.md) · P0=0 · F2 liberada |
| HOME-02 | F2 | Refino Destaques | **Próximo** (B-01/B-02 + B-06) |
| HOME-05 | F2 | Cards promocionais | Após HOME-02 parcial |
| HOME-07 | F2 | Configurações gerais | Após HOME-05 |
| HOME-08 | F3 | Homologação | Após F2 |

\*HOME-04 só se a auditoria comprovar necessidade de integração/gate no resolve.

### Critérios de evidência (auditorias)

Usar sempre: **comprovado** · **parcial** · **só UI** · **só doc** · **não implementado** · **não comprovado**.

---

## HOME-01 — Auditoria do módulo de preços

**Frente:** 1  
**Objetivo:** compreender o módulo de listas de preços e validar a hipótese do gate individual.  
**Bloqueador** para decisões de implementação que dependam do comportamento de preços.

### Escopo

- Tabelas e migrations (`price_lists`, `price_list_items`, histórico, overrides)  
- `resolve_product_price` / `resolve_product_prices`  
- Prioridades, vigência, margens/adicionais (incl. status factual F8.5)  
- Consumidores do resolvedor (Home, catálogo, busca, PDP, carrinho, checkout)  
- Integração com `place_order` / snapshots  
- Conflitos, duplicidades, permissões/segurança  
- As 10 perguntas do plano mestre §7.1  

### Entregável

[FAL_AUDITORIA_HOME_01_PRECOS_2026-11-12.md](./FAL_AUDITORIA_HOME_01_PRECOS_2026-11-12.md) — **entregue**

### Aceite

- Arquitetura atual documentada — **PASS**  
- Hipótese do gate **confirmada** (gap; forma do gate aberta) — **PASS**  
- Conflitos identificados; fonte da verdade definida — **PASS**  
- Necessidades técnicas justificadas — **PASS**  
- **Nenhuma** alteração de produção — **PASS**  

### Dependências

Nenhuma (inicia a Frente 1 técnica).

### Fora de escopo

Alterar resolve/place_order · migrations · UI de Promoções · numerar AJUSTE.

### Âncoras conhecidas

- `fal-pecas/src/services/pricing/priceResolutionService.ts`  
- `fal-pecas/src/services/cart/cartPricing.ts`  
- `fal-pecas/src/pages/admin/prices/*`  
- Migrations Fase 6B / F6B.1 / `20261006160000_list_extra_cost_percent_prepared.sql`  
- [FAL_AUDITORIA_022_PRECO_CONTRATOS_E0_2026-11-09.md](./FAL_AUDITORIA_022_PRECO_CONTRATOS_E0_2026-11-09.md)  
- [ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md](./ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md)  

### Prompt Cursor (placeholder)

```text
[PLACEHOLDER — preencher após autorização do ciclo de auditoria]
Pacote HOME-01. Read-only. Seguir FAL_PLANO_MESTRE_HOME_COMERCIAL_2026-11.md §7 e §9.
Produzir FAL_AUDITORIA_HOME_01_PRECOS_<data>.md.
Não alterar código, migrations, resolve_product_price nem place_order.
Não inventar achados; classificar evidências (comprovado/parcial/só UI/só doc/não implementado/não comprovado).
```

---

## HOME-06 — Pagamentos (fases a + b)

### HOME-06a — Auditoria de Pagamentos

**Frente:** 1 (paralelo a HOME-01)  
**Objetivo:** mapear condições anunciadas × capacidade real do checkout.

#### Escopo

- `store_payment_display` / `paymentDisplay` / serviços  
- Fluxos PIX e cartão; gateway; parcelamento; juros; descontos  
- Acumulação de condições (perguntas do plano mestre §6.4)  
- Cards e textos da Home  

#### Entregável

[FAL_AUDITORIA_HOME_06_PAGAMENTOS_2026-11-12.md](./FAL_AUDITORIA_HOME_06_PAGAMENTOS_2026-11-12.md) — **entregue**

#### Aceite

- Matriz anúncio × checkout — **PASS**  
- Capacidades e limitações comprovadas — **PASS**  
- Contradições documentadas — **PASS**  
- Regras anunciáveis vs regras que exigem evolução — **PASS**  

#### Dependências

Nenhuma para iniciar (read-only). Alinhar narrativa com marcha AJUSTE-035 sem misturar escopo de implementação.

#### Fora de escopo

Implantar PIX%/faixas · alterar checkout · textos manuais contraditórios “definitivos”.

#### Âncoras conhecidas

- `fal-pecas/src/lib/paymentDisplay.ts`  
- `fal-pecas/src/services/store/paymentDisplayService.ts`  
- `fal-pecas/src/pages/admin/home/AdminHomeContentPage.tsx` (aba payment)  
- Checkout / MP (referência; escopo 035)  
- Migration `20261105210000_store_payment_display.sql`  

#### Prompt Cursor (placeholder)

```text
[PLACEHOLDER — preencher após autorização do ciclo de auditoria]
Pacote HOME-06a. Read-only. Matriz anúncio × checkout.
Produzir FAL_AUDITORIA_HOME_06_PAGAMENTOS_<data>.md.
Não alterar código. Não misturar implementação do AJUSTE-035.
```

---

### HOME-06b — Implantação de Pagamentos

**Frente:** 1 (após HOME-06a)  
**Objetivo:** administrar e apresentar condições de pagamento alinhadas ao checkout.

#### Escopo

PIX · descontos · parcelamento · juros · faixas · cards · acumulação · integração com checkout (somente o comprovado na 06a).

#### Aceite

- Home anuncia somente condições suportadas  
- Checkout aplica as mesmas regras  
- Valores/condições consistentes; incompatíveis bloqueadas; gateway respeitado  

#### Dependências

HOME-06a + alinhamento técnico com checkout.

#### Fora de escopo

Anunciar meios não homologados · texto manual que contradiz regra · alterar place_order sem finding.

#### Prompt Cursor (placeholder)

```text
AUTORIZADO — FAL_AUDITORIA_PAY_CONSOLIDACAO_2026-11-13.md
HOME-06b / PAY: Brick = falMaxInstallmentsForCheckout; store_payment_display expandido
(card/pix/parcelas); checkout consome getEffectivePaymentAvailability.
Sem PIX%/faixas. AJUSTE-035 só aplica availability (não redefine tetos comerciais).
```

---

## HOME-03 — Menu Promoções

**Frente:** 1  
**Objetivo:** administração da ativação promocional individual sobre listas existentes.

### Escopo

- Consulta de listas promocionais  
- Seleção da condição / lista de origem  
- Ativação e desativação individual  
- Vigência / expiração (conforme arquitetura pós-HOME-01)  
- Histórico · validações · conflitos  
- Operações em lote, se compatíveis  

### Aceite

- Lista cadastrada **não** ativa promoção automaticamente  
- Ativação individual explícita  
- Preço da fonte oficial; sem duplicar preço  
- Expiração respeitada; conflitos tratados; histórico preservado  
- Não altera posição/curadoria dos destaques  

### Dependências

HOME-01 (obrigatória).

### Fora de escopo

Segundo motor de preços · digitar preço fora da lista · alterar destaques por efeito colateral.

### Âncoras conhecidas

- `/admin/precos` (fonte de preço)  
- Plano mestre §5.2  
- (Schema de ativação: **TBD pós-HOME-01**)  

### Prompt Cursor (placeholder)

```text
[AGUARDA AUTORIZAÇÃO — ver FAL_SPEC_HOME_CONSOLIDACAO_GATE_PAG_2026-11-12.md]
Pacote HOME-03 Opção A: product_promotions + filtro resolve + seed + admin.
Preço só em price_list_items. UNIQUE uma ativação ativa por produto.
Não abrir Frente 2. Smoke com place_order após migration.
```

---

## HOME-04 — Integração global de preços promocionais

**Frente:** 1 (condicional)  
**Objetivo:** mesma condição promocional em toda a jornada.

### Escopo

Home · catálogo · busca · PDP · carrinho · checkout · snapshots · validação final.

### Aceite

- Mesma condição aplicável em todos os pontos  
- Checkout valida o valor final  
- Sem desconto duplicado; promo expirada não aparece como ativa  
- Pedidos anteriores preservados  

### Dependências

HOME-03; decisão técnica do HOME-01 (gate sim/não).

### Fora de escopo

Redesenho visual completo (HOME-05) · novas regras de pagamento (HOME-06b).

### Prompt Cursor (placeholder)

```text
[PLACEHOLDER — só se HOME-01 comprovar necessidade e após HOME-03]
Pacote HOME-04. Consistência ponta a ponta. Não reescrever pedidos históricos.
```

---

## Gate pós-F1 — Análise (bloqueador)

**Frente:** entre 1 e 2  
**Objetivo:** após fechar a estruturação, analisar melhorias, correções e ajustes antes do refinamento.

### Entregável

`docs/planejamento/FAL_ANALISE_POS_F1_HOME_COMERCIAL_<YYYY-MM-DD>.md`

### Classificação de achados

| Classe | Destino |
|--------|---------|
| Correção P0 | Hotfix antes de abrir F2 |
| Ajuste Frente 2 | HOME-02 / 05 / 07 / B+ |
| Verificação Frente 3 | HOME-08 / C+ |
| Adiar | Motivo explícito |

### Aceite

Doc publicado · priorização aprovada (eFe) · **zero P0 aberto**.

### Prompt Cursor (placeholder)

```text
[PLACEHOLDER — só após fechamento da Frente 1]
Gate pós-F1. Read-only + classificação. Não iniciar HOME-02/05/07 até P0 zerado.
```

---

## HOME-02 — Evolução administrativa de Destaques

**Frente:** 2  
**Objetivo:** melhorar gestão e visualização dos produtos destacados **sem** subordinar à promoção.

### Escopo

Curadoria · ordenação · limite · busca · filtros · preview · indicadores promocionais informativos · preços na lista admin.

### Aceite

- Seleção independente; ordem preservada; limite respeitado  
- Promoção **não** modifica a curadoria  
- Destaque sem promoção continua funcionando  
- Produto promocional pode aparecer nos destaques  
- Preview usa dados reais de preço/status  

### Dependências

- Gate pós-F1 assinado  
- HOME-01 para dados de preço na UI; evolução visual de curadoria não depende de schema de gate  

### Fora de escopo

Criar menu Promoções · alterar resolve · mudar regras de pagamento.

### Âncoras conhecidas

- `AdminHomeContentPage.tsx` · `adminHomeContentService.ts`  
- `productService.ts` (`listFeaturedProducts`) · `HomePage.tsx`  
- `store_home_featured_products` · `store_home_settings`  

### Prompt Cursor (placeholder)

```text
[PLACEHOLDER — só após Gate pós-F1]
Pacote HOME-02. Promo não altera destaques. Preview com dados reais.
```

---

## HOME-05 — Cards promocionais

**Frente:** 2  
**Objetivo:** padronizar apresentação visual de produtos em promoção.

### Escopo

Preço anterior · preço atual · selo · % desconto · infos comerciais · responsividade · identidade unificada.

### Aceite

Preços e % coerentes · sem info desatualizada · consistente entre Home, catálogo, busca e PDP.

### Dependências

Gate pós-F1; HOME-04 (ou baseline se HOME-04 N/A) para condição comercial correta.

### Fora de escopo

Redesenhar marca da loja · inventar condições de pagamento.

### Âncoras conhecidas

- `ProductCard.tsx` · `PaymentConditionHint` · `productLabels.ts`  

### Prompt Cursor (placeholder)

```text
[PLACEHOLDER — só após Gate pós-F1 e condição comercial estável]
Pacote HOME-05. Sem condição falsa ou duplicada nos cards.
```

---

## HOME-07 — Configurações gerais Home

**Frente:** 2  
**Objetivo:** centralizar apresentação comercial/visual.

### Escopo

Visibilidade · selos · preços · infos de pagamento · elementos promocionais · responsivo.

### Aceite

Apresentação consistente · configs **não** alteram cálculos · nada não suportado é anunciado · persistência após update.

### Dependências

Gate pós-F1; HOME-02, HOME-05 e HOME-06b (conforme entrega real da F1).

### Fora de escopo

Habilitar meio de pagamento no gateway · mudar formação de preço.

### Prompt Cursor (placeholder)

```text
[PLACEHOLDER — só após Gate pós-F1]
Pacote HOME-07. Config visual ≠ regra comercial.
```

---

## HOME-08 — Homologação integrada

**Frente:** 3  
**Objetivo:** validar a jornada comercial completa.

### Escopo

Cenários do plano mestre §10 (destaques, promoções, pagamentos, integridade) · responsividade · regressões · permissões · build/smoke.

### Aceite

Cenários críticos aprovados · integridade de preços · consistência comercial · sem regressão crítica · evidências documentadas · aprovação final.

### Dependências

Conclusão dos pacotes anteriores + itens C+ do gate.

### Entregável

`docs/planejamento/FAL_MARCHA_HOME_COMERCIAL_HOMOLOG_VAL_<YYYY-MM-DD>.md` (ou equivalente MARCHA VAL).

### Prompt Cursor (placeholder)

```text
[PLACEHOLDER — só após Frente 2]
Pacote HOME-08. Homologação. Evidências VAL. Sem feature nova.
```

---

## Ordem operacional resumida

1. A0 docs (este ciclo)  
2. HOME-01 ∥ HOME-06a  
3. HOME-03 → HOME-04* → HOME-06b  
4. **Gate pós-F1**  
5. HOME-02 → HOME-05 → HOME-07 (+ B+ do gate)  
6. HOME-08 (+ C+)  

---

## Fora do backlog HOME (explícito)

- Numeração de novos AJUSTEs na matriz antes da pós-auditoria  
- Trabalho de implementação do AJUSTE-035 Checkout (frente separada)  
- Segundo motor de preços / lista especial fora de `price_lists`  
