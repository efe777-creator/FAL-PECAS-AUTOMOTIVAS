# Especificação — Fase 6: E-commerce

**Status:** Implementada — ver [EXECUCAO_FASE6.md](./EXECUCAO_FASE6.md) e [AUDITORIA_FASE6_2026-10-03.md](./AUDITORIA_FASE6_2026-10-03.md)  
**Data:** 2026-10-03  
**Branch:** `plan`  
**Base:** [ROADMAP_FASES_3.0.md](./ROADMAP_FASES_3.0.md), [DATABASE.md](../entrada/DATABASE.md), [API.md](../entrada/API.md), [UX.md](../entrada/UX.md), [FAL_PRD_3.0.md](../entrada/FAL_PRD_3.0.md)  
**Fase anterior:** [ESPECIFICACAO_FASE5_CLIENTE.md](./ESPECIFICACAO_FASE5_CLIENTE.md) (aprovada)  
**Execução:** [EXECUCAO_FASE6.md](./EXECUCAO_FASE6.md)

---

## 1. Objetivo

Permitir compra ponta a ponta em **ambiente de teste**:

Carrinho → Identificação → CPF/CNPJ → Endereço → Entrega → Pagamento → Revisão → Pedido

Responde: *como o cliente efetivamente compra?*

**Princípio arquitetural:** a UI e o checkout falam **somente** com contratos internos FAL (`quoteShipping`, `PaymentProvider`, `placeOrder`). Na Fase 9 trocam-se adapters de frete/pagamento **sem redesenhar o checkout**.

---

## 2. Escopo

### Implementar

- Checkout autenticado (`ProtectedRoute` em `/checkout`)
- Carrinho persistente (`carts` / `cart_items`) + merge localStorage → auth no login
- CPF (PF) / CNPJ (PJ) **obrigatório na finalização**
- Endereço via `customer_addresses` + `address_snapshot` no pedido
- Motor de cotação com `ShippingProvider` + implementação **mock** (múltiplas opções)
- Pagamento **simulado** (`provider: 'simulated'`)
- RPC `place_order` (SECURITY DEFINER): atomicidade, recálculo server-side, reserva transacional, idempotência, snapshots
- Detalhe do pedido na conta
- Tratamento de erros: item indisponível, cotação vazia, falha de pagamento simulado, double-submit

### Fora

- Guest checkout (adiado; visitante só mantém carrinho local até login)
- Gateway real de pagamento (F9)
- APIs reais de frete / transportadoras (F9)
- ViaCEP obrigatório
- Admin de operação (separação, envio, estoque UI) — F7/F8
- Redesign amplo da loja
- Alterar motor F4 / conta F5 além do necessário para o checkout

---

## 3. Decisões oficiais (fechadas)

| Tema | Decisão F6 | Depois |
|------|------------|--------|
| Checkout | Somente cliente **logado** | Guest fora da F6 |
| Pagamento | **Simulado** — adapter `PaymentProviderSimulated` | Gateway real na **F9** |
| Frete | Motor de cotação + **MockShippingProvider** (multi-opção; preparado para entrega própria, transportadora, APIs) | Provedores reais na **F9** |
| CPF/CNPJ | Obrigatório na finalização (PF→CPF, PJ→CNPJ); perfil F5 continua opcional até o checkout | Regras fiscais avançadas fora |
| Estoque | Revalidar disponibilidade; **reservar** em `place_order`; liberar em cancelamento/falha | UI admin estoque = F7/F8 |
| Carrinho | Persistência auth + merge visitante→auth | — |
| Pedido | Criação atômica via RPC; consulta/detalhe na conta | Operação pós-pagamento = F7 |
| Totais | **Sempre** recalculados no servidor | Cliente não envia totais confiáveis |

---

## 4. Estado atual (base)

| Capacidade | Estado |
|------------|--------|
| Schema `orders`, `order_items`, `payments`, `shipments`, `carts`, `inventory*` | Pronto (F2) |
| RLS `order_items` INSERT pelo cliente | **Gap** — preferir RPC security definer |
| Conta: endereços, CPF opcional, lista pedidos | Pronto (F5) |
| Carrinho local + UI | Pronto; sync Supabase = stub |
| `CheckoutPage` | Stub visual de steps |
| Spec F6 | Este documento |

---

## 5. Contratos internos (TypeScript)

Nomes canônicos a criar em `fal-pecas/src/types` + services:

```ts
// Frete
interface ShippingQuoteRequest {
  postalCode: string
  state: string
  city: string
  subtotal: number
  itemCount: number
  // peso/volume: opcional na F6 (mock pode ignorar)
}

interface ShippingQuoteOption {
  id: string              // estável p/ seleção (ex: mock:economic)
  provider: string        // 'mock' | futuros
  serviceCode: string     // economic | express | pickup | ...
  label: string
  amount: number
  etaDaysMin?: number
  etaDaysMax?: number
  metadata?: Record<string, unknown>
}

interface ShippingProvider {
  quote(req: ShippingQuoteRequest): Promise<ShippingQuoteOption[]>
}

// Pagamento
type SimulatedPaymentMethod = 'pix_simulated' | 'card_simulated'

interface PaymentIntentInput {
  orderId: string
  amount: number
  method: SimulatedPaymentMethod
}

interface PaymentIntentResult {
  paymentId: string
  provider: 'simulated'
  status: 'pending' | 'approved' | 'failed' | 'cancelled'
  externalRef?: string
  metadata?: Record<string, unknown>
}

interface PaymentProvider {
  createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>
  confirmSimulated(paymentId: string, outcome: 'approve' | 'fail'): Promise<PaymentIntentResult>
}

// Pedido
interface PlaceOrderItemInput {
  productId: string
  quantity: number
}

interface PlaceOrderInput {
  idempotencyKey: string   // UUID gerado no cliente por tentativa de finalização
  addressId: string
  shippingOptionId: string // id da opção retornada por quote (validada no server)
  paymentMethod: SimulatedPaymentMethod
  documentKind: 'cpf' | 'cnpj'
  documentValue: string    // digits; validar + persistir em customers se necessário
  items?: PlaceOrderItemInput[] // se omitido, usa carrinho do server
}

interface PlaceOrderResult {
  orderId: string
  status: string
  total: number
  alreadyExisted: boolean  // true se idempotency hit
}
```

Adapters F6:

| Contrato | Implementação F6 | F9 |
|----------|------------------|-----|
| `ShippingProvider` | `MockShippingProvider` (≥2 opções) | Correios / Melhor Envio / transportadora |
| `PaymentProvider` | `PaymentProviderSimulated` | Mercado Pago / outro gateway |

---

## 6. Motor de frete (F6)

- Interface única `ShippingProvider.quote`.
- `MockShippingProvider` (config JSON/tabela seed) retorna **no mínimo 2 opções** (ex.: econômica, expressa; opcional retirada).
- Checkout **não** hardcoda CEP→preço na UI.
- Opção escolhida persiste em `shipments` (+ `orders.shipping_amount`) com metadata da cotação.
- Preparado para: entrega própria com tabela configurável; transportadora; APIs externas; múltiplas opções.

---

## 7. Pagamento (F6)

- Step com métodos simulados (`pix_simulated`, `card_simulated`).
- Fluxo típico: `place_order` cria pedido em `aguardando_pagamento` + linha `payments` → UI chama `confirmSimulated(approve|fail)`.
  - approve → `payments.status = approved`, pedido → `pagamento_aprovado`
  - fail → `payments.status = failed`; liberar reserva; pedido → `cancelado` (ou manter aguardando conforme regra única na execução — **default: cancelado + release**)
- Sem SDK externo.

---

## 8. RPC `place_order` (M6 — núcleo)

SECURITY DEFINER, `auth.uid()` obrigatório, customer do usuário.

### 8.1 Atomicidade

Uma transação: order + order_items + order_status_history + payment stub + shipment stub + reserva inventory + limpeza carrinho. Qualquer falha → rollback total.

### 8.2 Recálculo server-side

- Ler preços atuais dos produtos publicados / disponíveis.
- Validar opção de frete (re-quote ou lookup da opção mock autorizada).
- Calcular `unit_price`, `subtotal`, `shipping_amount`, `total`.
- Payload do cliente = intenções; **totais do cliente são ignorados**.

### 8.3 Reserva transacional

- Para cada item: `(quantity_on_hand - quantity_reserved) >= qty`.
- Incrementar `quantity_reserved`; inserir `inventory_movements` tipo `reserve` com `order_id`.
- Se insuficiente → erro; pedido não nasce.

### 8.4 Idempotência

- Coluna/tabela de chave: `idempotency_key` (UUID) por `customer_id` (unique).
- Segunda chamada mesma chave + mesmo usuário → retorna pedido existente (`alreadyExisted: true`), sem nova reserva/itens/pagamento.

### 8.5 Snapshots

- `orders.address_snapshot` (jsonb do endereço no momento).
- Itens: `sku`, `name_snapshot`, `unit_price`, `quantity`.
- Frete/pagamento: registros em `shipments` / `payments` + metadata.
- Preço histórico imutável após place.

### 8.6 Pré-condições

- Documento válido (CPF ou CNPJ) persistido/atualizado em `customers`.
- Endereço pertence ao customer.
- Carrinho não vazio (ou items explícitos válidos).

---

## 9. Segurança / migration F6

Migration sugerida: `fal-pecas/supabase/migrations/YYYYMMDDHHMMSS_fase6_ecommerce.sql`

- RPC `place_order` (+ helpers de release se necessário)
- Unique `(customer_id, idempotency_key)` em `orders` (ou tabela auxiliar)
- CHECKs / enums para `payments.status` e `shipments.status` se ainda abertos
- Grants: cliente chama RPC; **não** INSERT direto em `order_items` / `payments` / `shipments` / history
- Sem `service_role` no browser

---

## 10. UI / rotas

| Rota | Comportamento |
|------|----------------|
| `/carrinho` | CTA checkout; frete “a calcular” até step Entrega |
| `/checkout` | `ProtectedRoute`; steps: Identificação → Endereço → Entrega → Pagamento → Revisão |
| `/conta/pedidos` | Lista (já F5) |
| `/conta/pedidos/:id` | Detalhe + timeline de status |

Visitante em “Finalizar”: redirect `/login` com `state.from = /checkout`.

---

## 11. Módulos de execução

Ver [EXECUCAO_FASE6.md](./EXECUCAO_FASE6.md):

M1 tipos/contratos · M2 persistência RLS/RPC · M3 cart sync · M4 shipping mock · M5 payment simulated · **M6 placeOrder** · M7 checkout UI · M8 detalhe pedido · M9 docs/testes/build

---

## 12. Critérios de aceite (CA)

| ID | Critério |
|----|----------|
| CA-01 | `/checkout` exige login; visitante redirecionado com `from` |
| CA-02 | Carrinho auth persiste; merge local→auth no login |
| CA-03 | CPF (PF) ou CNPJ (PJ) obrigatório para finalizar; inválido bloqueia |
| CA-04 | Endereço selecionável dos salvos; snapshot gravado no pedido |
| CA-05 | Cotação mock retorna ≥2 opções; UI sem hardcode de preço de frete |
| CA-06 | Pagamento simulado: approve avança status; fail libera reserva e cancela |
| CA-07 | `place_order` atômico: order+items+history+payment+shipment+reserva+limpa carrinho |
| CA-08 | Totais recalculados no servidor (payload adulterado não altera preço) |
| CA-09 | Reserva transacional impede oversell |
| CA-10 | Mesma `idempotency_key` não duplica pedido |
| CA-11 | Snapshots de preço/nome/endereço imutáveis após place |
| CA-12 | Detalhe do pedido na conta com totais e status |
| CA-13 | Adapters isolados (`ShippingProvider` / `PaymentProvider`) — F9 só troca implementação |
| CA-14 | Build TypeScript + Vite OK |
| CA-15 | Sem gateway/API frete reais; sem guest checkout |

---

## 13. Gate

1. Aprovar esta especificação + [EXECUCAO_FASE6.md](./EXECUCAO_FASE6.md)  
2. Só então implementar código na branch `plan`  
3. Sem push sem autorização  
4. Auditoria `AUDITORIA_FASE6_YYYY-MM-DD.md` ao final da implementação
