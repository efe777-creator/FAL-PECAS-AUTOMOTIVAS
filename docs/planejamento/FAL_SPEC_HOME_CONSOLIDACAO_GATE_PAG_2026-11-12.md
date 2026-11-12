# FAL — Spec de consolidação pós-auditoria  
## Gate promocional (HOME-03/04) + P0 Pagamentos (HOME-06b)

**Projeto:** FAL — Peças Automotivas  
**Data:** 12/11/2026  
**Auth:** eFe — `MARCHA` (consolidação)  
**Status:** Spec técnica — **implementação de código ainda não autorizada**  
**Entradas:**  
- [FAL_AUDITORIA_HOME_01_PRECOS_2026-11-12.md](./FAL_AUDITORIA_HOME_01_PRECOS_2026-11-12.md)  
- [FAL_AUDITORIA_HOME_06_PAGAMENTOS_2026-11-12.md](./FAL_AUDITORIA_HOME_06_PAGAMENTOS_2026-11-12.md)  
**Plano mestre:** [FAL_PLANO_MESTRE_HOME_COMERCIAL_2026-11.md](./FAL_PLANO_MESTRE_HOME_COMERCIAL_2026-11.md)  
**Backlog:** [FAL_HOME_BACKLOG_01_08.md](./FAL_HOME_BACKLOG_01_08.md)

---

## 0. Veredito em uma página

| Tema | Decisão travada nesta consolidação |
|------|-------------------------------------|
| Gap preços | Confirmado: item em lista public de alta priority = preço efetivo **sem** ativação individual |
| Forma do gate | **Opção A** — tabela de ativação + filtro no `resolve_product_price` |
| Opções B/C | Descartadas para o alvo comercial (B apaga cadastro; C não é individual) |
| Preço | Continua só em `price_list_items` — Promoções **não** digitam preço |
| place_order | Continua chamando resolve; **não** recalcula regra própria |
| Migração de dados | Seed de ativações para itens já na Lista Promocional (preserva vitrine atual) |
| Pagamentos P0 | Enforcement de parcelas no create payment + corrigir fallback 12x do Brick |
| PIX% / faixas | Fora deste pacote de consolidação (HOME-06b fase 2, pós-P0) |
| Código nesta MARCHA | **Não** — só especificação |

---

## 1. Gate promocional — Opção A (canônica)

### 1.1 Problema

Hoje o resolve escolhe a lista `public`+`active`+vigente com item e **maior `priority`**.  
A Lista Promocional seed tem `priority=100` → qualquer produto com item nela passa a “promo efetivo” na loja.  
Isso **contradiz** “lista cadastrada ≠ promoção ativa”.

### 1.2 Modelo de dados proposto

Tabela nova: `product_promotions`

| Coluna | Tipo | Regra |
|--------|------|--------|
| `id` | uuid PK | |
| `product_id` | uuid FK → products | |
| `price_list_id` | uuid FK → price_lists | Lista que **fornece** o preço promocional |
| `status` | text | `active` \| `inactive` |
| `starts_at` | timestamptz null | null = imediato |
| `ends_at` | timestamptz null | null = sem término |
| `activated_by` | uuid null | auth.users |
| `deactivated_by` | uuid null | |
| `created_at` / `updated_at` | timestamptz | |

**Constraints:**

1. UNIQUE parcial: no máximo **uma** linha `status=active` por `product_id` (contexto storefront único).  
2. CHECK: `ends_at` is null OR `starts_at` is null OR `ends_at >= starts_at`.  
3. A lista referenciada deve existir; na aplicação admin: `scope=public`, não `is_default`, `status=active`, e deve haver `price_list_items` para o produto (validação de serviço).

**Histórico:** append em `product_promotion_events` (opcional na 1ª migration; mínimo: não apagar linhas — desativar + `updated_at` / actors). Preferência 1ª entrega: events leves:

`product_promotion_events (id, product_promotion_id, product_id, price_list_id, action, at, by_user, meta jsonb)`  
actions: `activate` \| `deactivate` \| `expire` \| `reassign_list`.

**Não criar:** coluna de preço nesta tabela.

### 1.3 Algoritmo novo do resolve (único ponto de mudança crítica)

Manter assinatura `resolve_product_price(p_product_id, p_customer_id, p_at)`.

```
0) override ativo+vigente → return (igual hoje)

1) candidatos =
     itens em price_list_items do produto
     join price_lists pl
     onde pl.scope = 'public'
       and pl.status = 'active'
       and vigência pl ok em p_at
       and (
         pl.is_default = true
         OR exists (
           product_promotions pp
           where pp.product_id = p_product_id
             and pp.price_list_id = pl.id
             and pp.status = 'active'
             and (pp.starts_at is null or pp.starts_at <= p_at)
             and (pp.ends_at is null or pp.ends_at >= p_at)
         )
       )
   escolher max(pl.priority), empate updated_at desc
   → return

2) fallback is_default (igual hoje)
3) price_unresolved
```

**Efeitos:**

- Produto só na Lista Promocional **sem** `product_promotions` ativa → resolve cai na Base (ou default).  
- Com ativação apontando para a lista promo → promo vence se priority maior.  
- Duas ativações ativas: impedidas pelo UNIQUE.  
- Override continua soberano (exceção comercial avulsa).

### 1.4 Expiração automática

| Mecanismo | Papel |
|-----------|--------|
| Resolve em `p_at` | Fonte da verdade em tempo real: `ends_at < p_at` → promoção **não** entra nos candidatos |
| Job/cron (fase 2) | Marcar `status=inactive` + event `expire` para limpeza admin (não obrigatório para correção de preço) |

**Não** remover o item de `price_list_items` ao expirar.  
**Não** depender só de ocultar na UI.

### 1.5 Seed de transição (obrigatório no apply)

Para **não quebrar** a vitrine atual no dia do apply:

```sql
-- Pseudológica (detalhar na migration HOME-03)
INSERT product_promotions (product_id, price_list_id, status, ...)
SELECT pli.product_id, pli.price_list_id, 'active', ...
FROM price_list_items pli
JOIN price_lists pl ON pl.id = pli.price_list_id
WHERE pl.is_default = false
  AND pl.scope = 'public'
  AND pl.status = 'active'
  -- tipicamente slug = 'promocional' ou priority > 0
ON CONFLICT DO NOTHING;
```

Critério de aceite do seed: SKU que hoje resolve pela promocional continua resolvendo pela promocional **após** apply + seed, até desativação manual.

### 1.6 Admin Promoções (HOME-03) — contrato UX

- Lista produtos elegíveis = itens em listas public não-default (ou filtro por lista).  
- Colunas: produto, SKU, lista, preço Base (listPrice), preço da lista, %, status (derivado: inactive / active / scheduled / expired), datas.  
- Ações: ativar (escolhe lista se >1), desativar, definir `ends_at`.  
- Conflito: se já há ativa para outra lista → exigir troca explícita (desativa anterior + ativa nova) — **nunca** silencioso.  
- Destaques: **somente leitura** de status promo — zero write em `store_home_featured_products`.

### 1.7 HOME-04

Com o filtro no resolve, Home/catálogo/busca/PDP/carrinho/checkout passam a herdar o mesmo comportamento **desde que** usem resolve/`attachResolvedPrices` (já o fazem).  

HOME-04 vira principalmente:

- Smoke 022-E1 (card→PDP→cart→pedido)  
- Ofertas rail (`listPromoHighlightProducts`) continua coerente (resolved &lt; list só com ativação)  
- Busca: confirmar pós-attach (legado `promo_price` = residual P2)

### 1.8 Impacto e riscos

| Risco | Mitigação |
|-------|-----------|
| Quebra vitrine no apply | Seed de ativações |
| Performance resolve | EXISTS indexado `(product_id, price_list_id)` WHERE active |
| Regressão place_order | Mesma RPC; testes smoke 1 SKU promo + 1 normal |
| Override vs promo | Documentar: override > promo ativa |

### 1.9 Ordem de implementação (quando autorizada)

1. Migration `product_promotions` (+ events opcional) + índices + RLS staff write / public read se necessário  
2. Atualizar `resolve_product_price` / batch (mesma migration ou seguinte)  
3. Seed ativações  
4. Service admin + UI HOME-03  
5. Smoke HOME-04 / 022-E1  
6. **Não** abrir Frente 2 antes do Gate pós-F1  

---

## 2. Pagamentos — P0 (fase 1 do HOME-06b)

### 2.1 Problemas comprovados (06a)

1. `mpCreatePaymentCore` aceita qualquer `installments >= 1` sem cruzar `store_payment_display`.  
2. Brick: se display disabled/null → fallback **12** parcelas.  
3. `interest_free` é copy, não política MP.

### 2.2 Decisões P0

| ID | Decisão |
|----|---------|
| PAY-P0-1 | No create payment **cartão**, após saber o `amount` do pedido: ler `store_payment_display`; se `enabled`, calcular `maxAllowed = resolveInstallmentCount(amount, settings)` e **rejeitar** se `installments > maxAllowed` ou `< 1` |
| PAY-P0-2 | Se display `enabled=false` ou ausente: **não** anunciar “em até Nx” (já ok) e no Brick **não** usar fallback 12 como política FAL — usar `max(1, min(MP, 1))` comercial neutro **ou** espelhar só o que MP devolver **sem** claim “sem juros FAL”. **Escolha canônica:** Brick max = `1` quando display off (à vista / 1x); quando on, `resolveInstallmentCount` |
| PAY-P0-3 | Não implementar PIX% nem faixas nesta fase P0 |
| PAY-P0-4 | `interest_free`: manter como copy; se true, só exibir “sem juros” se a linha formatada já assume isso — **não** inventar juros MP nesta fase |

### 2.3 Arquivos-alvo (quando autorizar)

- `fal-pecas/src/services/payments/mpCreatePaymentCore.ts` (ou flow que conhece amount)  
- `fal-pecas/src/components/payments/MercadoPagoCardBrickPanel.tsx`  
- `fal-pecas/src/lib/paymentDisplay.ts` (reuso)  
- Testes unitários dos clamps  

### 2.4 Fora do P0

PIX desconto · faixas · cards Home · boleto · mudar AJUSTE-035 webhook/QR.

### 2.5 Aceite P0

- Com display enabled max=3 min=20: pedido R$ 100 → no máximo N permitido; 6x rejeitado no servidor.  
- Com display disabled: card/PDP sem linha; Brick não oferece 12x pela política FAL.  
- Pix inalterado funcionalmente.

---

## 3. Mapa para o backlog

| Próximo pacote | Conteúdo | Autorização |
|----------------|----------|-------------|
| HOME-03 | Migration gate + resolve + seed + admin Promoções | Exige “autorizar implementação” explícita |
| HOME-04 | Smoke integração + Ofertas | Após HOME-03 |
| HOME-06b fase 1 | PAY-P0-1…4 | Pode ser paralelo a HOME-03 se não misturar schema de preço |
| HOME-06b fase 2 | PIX% / faixas / cards | Após P0 + decisão comercial |
| Gate pós-F1 | Análise | Após fechar F1 |

---

## 4. O que esta MARCHA **não** fez

- Não aplicou migration  
- Não alterou `resolve_product_price` / `place_order`  
- Não criou UI Promoções  
- Não alterou Brick / mpCreatePaymentCore  

---

## 5. Aceite da consolidação

| Critério | Resultado |
|----------|-----------|
| Hipótese gate fechada em Opção A | PASS |
| B/C descartadas com motivo | PASS |
| Seed de transição definido | PASS |
| P0 pagamentos especificados | PASS |
| Implementação não iniciada | PASS |

**Assinatura:** MARCHA consolidação gate+pag PASS · 2026-11-12 · spec only.

---

## 6. Prompt Cursor (implementação) — ainda placeholder até autorização

```text
[AGUARDANDO AUTORIZAÇÃO EXPLÍCITA]
Implementar FAL_SPEC_HOME_CONSOLIDACAO_GATE_PAG_2026-11-12.md
Ordem sugerida: (1) PAY-P0 Brick+server  (2) migration product_promotions + resolve + seed  (3) admin HOME-03
Não abrir Frente 2. Não numerar AJUSTE. Smoke 022-E1 ao final do resolve.
```
