# FAL — Auditoria HOME-01 — Módulo de preços (read-only)

**Projeto:** FAL — Peças Automotivas  
**Data:** 12/11/2026  
**Auth:** eFe — `MARCHA` (HOME-01)  
**Pacote:** HOME-01  
**Plano mestre:** [FAL_PLANO_MESTRE_HOME_COMERCIAL_2026-11.md](./FAL_PLANO_MESTRE_HOME_COMERCIAL_2026-11.md)  
**Backlog:** [FAL_HOME_BACKLOG_01_08.md](./FAL_HOME_BACKLOG_01_08.md)  
**Prévia:** [FAL_AUDITORIA_022_PRECO_CONTRATOS_E0_2026-11-09.md](./FAL_AUDITORIA_022_PRECO_CONTRATOS_E0_2026-11-09.md)  
**Status:** Auditado (código/migrations no repo) — **sem alteração de produção**  
**Escopo:** read-only · não altera `resolve_product_price` / `place_order`

---

## 1. Método

Inspeção de migrations SQL, serviços TS e admin de preços no workspace.  
Classificação de evidência: **comprovado** · **parcial** · **só UI** · **só doc** · **não implementado** · **não comprovado** (ambiente remoto / dados live).

---

## 2. Arquitetura atual (comprovada)

### 2.1 Tabelas

| Objeto | Evidência | Migration / arquivo |
|--------|-----------|---------------------|
| `price_lists` | comprovado | `20261004020000_fase6b_price_lists.sql` — status, scope, priority, valid_from/until, is_default |
| `price_list_items` | comprovado | UNIQUE `(price_list_id, product_id)`, `price >= 0` |
| `price_change_history` | comprovado | source manual/import/system |
| `product_price_overrides` | comprovado | `20261004050000_fase6b1_price_overrides.sql` |
| `order_items.price_list_id` | comprovado | FK para auditoria do snapshot |
| Seed Base + Promocional | comprovado | Base `priority=0` `is_default`; Promocional `priority=100` `scope=public` `status=active` |

### 2.2 Resolvedor canônico

**Arquivo SQL vigente (última definição no repo):** `20261004050000_fase6b1_price_overrides.sql`  
**TS:** `fal-pecas/src/services/pricing/priceResolutionService.ts`

Algoritmo **comprovado** em `resolve_product_price(p_product_id, p_customer_id, p_at)`:

1. Override `active` com vigência válida em `p_at` → retorna amount; `price_list_id=null`; slug `override`.  
2. Entre listas `scope=public` + `status=active` + vigência válida **e** com item do produto: **maior `priority`**, empate `updated_at` desc → 1 linha.  
3. Fallback: item na lista `is_default=true` → `used_default_fallback=true`.  
4. Senão: exception `price_unresolved`.

`p_customer_id` é aceito na assinatura e **não** altera a seleção na F6B (comprovado no corpo da função).

`resolve_product_prices` itera IDs e engole falhas por produto (produto sem preço some do mapa).

### 2.3 Anexo à vitrine (`attachResolvedPrices`)

| Campo | Origem | Evidência |
|-------|--------|-----------|
| `resolvedPrice` | RPC resolve (fallback `promoPrice` / `price`) | comprovado |
| `listPrice` | item da lista Base fixa `a1111111-…101` ou `products.price` | comprovado |
| `promoPrice` (DTO) | derivado se resolved &lt; list (ou legado) | comprovado |
| `displayPrice()` | `resolvedPrice ?? promoPrice ?? price` | comprovado |

**Implicação comercial:** “estar na Lista Promocional com item” + lista ativa/pública/vigente com priority alta → preço promocional **efetivo na loja automaticamente**. Não há flag de ativação individual.

---

## 3. Hipótese do gate — veredito

| # | Pergunta | Resposta | Evidência |
|---|----------|----------|-----------|
| 1 | Como seleciona a lista? | Maior `priority` entre public+active+vigentes com item | comprovado (SQL) |
| 2 | Considera vigência? | Sim (`valid_from`/`valid_until` null = sem limite) | comprovado |
| 3 | Múltiplas listas? | Escolhe silenciosamente a de maior priority | comprovado |
| 4 | Ausência de item? | Lista sem item não entra; cai no default ou erro | comprovado |
| 5 | Normal × promocional? | “Normal” de vitrine = Base (`listPrice`); “pago” = resolved (pode ser promo/override) | comprovado no TS |
| 6 | Consumidores? | Ver §4 | comprovado |
| 7 | Outros mecanismos? | Override; legado `products.price`/`promo_price`; formação/recalc de lista (admin) | comprovado / parcial |
| 8 | Checkout mesma lógica? | `place_order` chama `resolve_product_price` e grava `unit_price` + `price_list_id` | comprovado (`20261112190000_place_order_…`) |
| 9 | Precisa gate individual? | **Sim, se** o negócio exige “lista cadastrada ≠ promoção ativa” | hipótese de negócio **confirmada como gap** — ver §5 |
| 10 | Impacto de alterar resolve? | Alto: Home, catálogo, busca, PDP, cart, place_order | comprovado pelos callers |

### Conclusão da hipótese

- **Confirmado:** selection automática por priority **não** é ativação comercial individual.  
- **Gap comprovado no código:** não existe tabela/flag de “promoção ativa por produto”.  
- **Recomendação (sem implementar agora):** HOME-03 precisará de um **gate** (ou regra operacional equivalente documentada). Qualquer mudança em `resolve_product_price` só após desenho explícito e autorização — **não** alterar nesta MARCHA.

Opções a detalhar na especificação pós-auditoria (ainda **não** decididas):

| Opção | Ideia | Risco |
|-------|-------|-------|
| A — Gate no resolve | Só listas/itens “elegíveis” se ativação individual válida | Altera SQL crítico; exige migration + regressão place_order |
| B — Operacional | Produto só entra na lista promo quando a campanha está ativa; remoção = desativar | Sem schema novo; frágil; conflita com “preservar cadastro na lista” |
| C — Lista inativa + cópia | Desliga lista inteira | Não atende ativação individual |

**Diretriz do plano mestre:** preferir mínimo de alteração; gate só com necessidade comprovada — **necessidade de comportamento “lista ≠ ativa” está comprovada**; **forma do gate ainda aberta**.

---

## 4. Consumidores do resolvedor

| Consumidor | Arquivo | Evidência |
|------------|---------|-----------|
| Catálogo / featured / PDP hydrate | `productService.ts` → `attachResolvedPrices` | comprovado |
| Busca | `searchService.ts` → `attachResolvedPrices` + `displayPrice` sort | comprovado |
| SearchBar | `SearchBar.tsx` → `displayPrice` | comprovado |
| ProductCard / ProductPage | `displayPrice` | comprovado |
| Carrinho | `cartPricing.ts` → `resolveProductPrices` | comprovado |
| place_order | SQL resolve por item + snapshot | comprovado |
| Admin produto | `adminProductService` / form → `resolveProductPrice` | comprovado |
| Ofertas Home | `listPromoHighlightProducts` (resolved &lt; list) | comprovado |

**Risco parcial (busca):** RPC `search_products` ainda expõe `promo_price` / `resolved_amount` no SELECT; o TS remapeia e depois chama `attachResolvedPrices`. Classificação: **parcial** — UI/sort usam displayPrice pós-attach; coluna legado ainda no pipeline SQL. Smoke 022-E1 permanece pendente.

---

## 5. Conflitos e duplicidades

| Tema | Achado | Classe |
|------|--------|--------|
| Priority automática vs ativação individual | Qualquer item na lista promo ativa vira preço de vitrine | comprovado — **bloqueador conceitual HOME-03** |
| Duas listas public com item | Vence a maior priority sem aviso ao admin | comprovado |
| Override vs lista | Override ganha de qualquer lista | comprovado |
| `products.promo_price` legado | Ainda no schema/map; DTO pode misturar | parcial |
| Histórico de preço vs histórico de “ativação promo” | Só existe `price_change_history` de preço de lista | comprovado — ativação individual **não implementado** |
| Vigência só na **lista** | Sem vigência por produto na lista | comprovado |

---

## 6. F8.5 — adicional % (status factual)

| Camada | Estado | Evidência |
|--------|--------|-----------|
| Migration `20261006160000_list_extra_cost_percent_prepared.sql` | Marcada **PREPARED — NÃO APLICAR automaticamente** | comprovado (comentário no arquivo) |
| Única migration no repo com a coluna | Só o prepared | comprovado (grep) |
| UI/admin | Lê/grava `list_extra_cost_percent` com **fallback** se coluna ausente | comprovado (`adminPriceListService.ts`) |
| Apply em produção/remoto | | **não comprovado** neste audit (sem query live) |
| `resolve_product_price` usa %? | Não — resolve usa preço do item, não recalcula formação | comprovado |

**Classificação:** UI preparada (**só UI / parcial**); persistência SQL **não comprovada** no ambiente; motor de formação % **não validado ponta a ponta**.  
Não confundir entrega de interface F8.4/F8.5 UI com validação integral da formação.

---

## 7. Checkout / snapshots

| Tema | Achado | Evidência |
|------|--------|-----------|
| Preço no pedido | `place_order` resolve no servidor; grava `unit_price` | comprovado |
| `price_list_id` no item | Gravado no insert de `order_items` | comprovado |
| Alteração posterior de lista | Não reescreve `unit_price` histórico (sem trigger de rewrite encontrado nesta fatia) | parcial — proteção por design snapshot; smoke recomendado |
| Carrinho | Reaplica via resolve; não é verdade do pedido | comprovado (022-E0) |

---

## 8. Segurança / permissões (resumo)

| Tema | Achado | Evidência |
|------|--------|-----------|
| RLS price_lists | SELECT público se public+active; write staff | comprovado (migration 6B) |
| Resolve SECURITY DEFINER | Exposto a anon/authenticated (preço público) | comprovado |
| Staff admin preços | `/admin/precos` + services | comprovado |

---

## 9. Respostas para HOME-03 / HOME-04

| Decisão | Status pós-HOME-01 |
|---------|-------------------|
| Precisa distinguir lista × ativação? | **Sim** (gap comprovado) |
| Alterar resolve agora? | **Não** |
| Alterar place_order agora? | **Não** |
| Forma do gate (A/B/C)? | **Aberta** — especificar antes de HOME-03 implementação |
| HOME-04 | Só após desenho do gate / ou se regra operacional dispensar mudança de resolve |
| 022-E1 smoke | Ainda pendente (card→PDP→cart→pedido) |

---

## 10. Achados priorizados

| ID | Severidade | Achado | Destino sugerido |
|----|------------|--------|------------------|
| P1-01 | P0 conceitual | Sem ativação individual; priority efetiva = “promo on” | Spec HOME-03 (gate) |
| P1-02 | P1 | Seleção silenciosa entre listas | HOME-03 validações / UI conflito |
| P1-03 | P1 | F8.5 apply/validação não comprovados | Validação dedicada / não misturar com Promo |
| P1-04 | P2 | Legado `promo_price` no pipeline busca | C3 / Frente 3 |
| P1-05 | P2 | 022-E1 smoke não fechado | Frente 3 / C2 |

---

## 11. Aceite HOME-01

| Critério | Resultado |
|----------|-----------|
| Arquitetura documentada | PASS |
| Hipótese gate confirmada/descartada | PASS — **confirmada como gap**; forma do gate aberta |
| Conflitos identificados | PASS |
| Fonte da verdade definida | PASS — `resolve_product_price` + listas; listPrice=Base |
| Necessidades justificadas | PASS — gate para HOME-03 |
| Nenhuma alteração de produção | PASS |

**Assinatura:** MARCHA HOME-01 auditoria PASS · 2026-11-12 · read-only.
