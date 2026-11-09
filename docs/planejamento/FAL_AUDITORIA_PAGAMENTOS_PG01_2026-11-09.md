# PG01 — Auditoria de pagamentos existentes (FAL Payment Management)

**Data:** 2026-11-09  
**Auth:** eFe — execução plano mestre Pagamentos (onda atual)  
**Escopo:** mapear o que já existe vs alvo do motor FAL · **sem** criar tabelas novas

---

## Veredito

A FAL **já tem** fundação de pagamentos reutilizável (`payments` + `payment_events` + Edges MP + services).  
Não começar do zero. Próxima onda **estende** contrato/adaptador/admin; não duplica ledger.

---

## Inventário — fonte de verdade

| Ativo | Local | Responsabilidade |
|-------|--------|------------------|
| `public.payments` | `20261006200000_fase9a_…` + status check M5 | Transação FAL: `provider`, `status` interno, `provider_status`, método, valor, IDs externos, Pix fields, timestamps |
| `public.payment_events` | F9-A | Ledger webhook/auditoria; idempotência por `(provider, provider_event_id)` |
| `public.store_payment_display` | `20261105210000_…` | Display vitrine/PDP (parcelas) — **não** é motor nem credencial |
| `place_order` | várias migrations | Cria `payments` com `provider=mercadopago` ou simulated |
| Edge `create-mp-payment` | `supabase/functions/create-mp-payment` | Criar/reusar Pix; cartão Brick; cancela pending na troca |
| Edge `mercado-pago-webhook` | idem | Valida secret, atualiza pagamento, grava eventos |
| `paymentService.ts` | front | Resolve `VITE_PAYMENT_PROVIDER` → simulated \| gateway \| mercadopago |
| `createMpPaymentFlow` / `mpWebhookCore` | front/shared logic | Fluxos testáveis |
| `PaymentProvider` (types) | `types/index.ts` | Contrato **estreito** (intent simulated) — **não** é ainda o motor multi-gateway |

### Estados internos atuais (`payments.status`)

`created` · `pending` · `approved` · `rejected` · `failed` (legado) · `cancelled` · `expired` · `refunded`

### Lacunas vs alvo do plano mestre

| Alvo plano | Situação |
|------------|----------|
| `authorized` / `in_process` / `partially_refunded` | **Ausentes** no CHECK — avaliar na PG07 |
| Interface motor (criar/consultar/cancelar/reembolsar/evento/métodos) | Parcial: Edges MP cobrem criar+webhook; refund = `admin_mark_payment_refunded` manual |
| Adaptador MP explícito sobre contrato FAL | Implícito nas Edges; falta camada nomeada (PG06) |
| Cadastro provedores / métodos admin | Só `store_payment_display` + env; menu Pagamentos = próxima onda |
| Submenu Metodos → Mercado Pago (API/opções) | **PG11b** — não existe UI |
| Permissões financeiras finas | Staff genérico (`is_staff`) — PG18 |
| Multi-gateway | Só seleção por `VITE_PAYMENT_PROVIDER` — PG19+ |

---

## Mapa checkout → provedor (hoje)

```text
Checkout
  → se mercadopago: invoke create-mp-payment (Edge)
  → se simulated/gateway: PaymentProvider local
Webhook MP
  → mercado-pago-webhook → payments + payment_events
Pedido
  → place_order grava payments (provider + method)
```

**Regra já respeitada:** status aprovado não vem só do browser; webhook/RPC backend.

---

## O que estender vs criar (próxima onda)

| Responsabilidade lógica | Ação |
|-------------------------|------|
| Transações | **Estender** `payments` (colunas/estados se PG07 exigir) |
| Eventos | **Estender** `payment_events` (campos de reprocessamento se preciso) |
| Display parcelas | **Reusar** `store_payment_display` (fonte única para UI cartão) |
| Provedores / roteamento / config não-secreta | **Avaliar** tabelas novas só após desenho PG05/PG08 — preferir config + secrets env |
| Motor TS | **Criar** contrato + wrapper; MP vira adaptador (refator Edges) |
| Admin Pagamentos + tela MP | **Criar** UI (PG09–PG11b) sobre dados existentes |

---

## Riscos / atenção

1. `PaymentIntentResult.provider` tipado só como `'simulated'` — desalinhado do runtime MP.  
2. Credenciais hoje 100% Edge secrets / `VITE_MP_PUBLIC_KEY` — correto; admin futuro só flags.  
3. Não criar segundo ledger financeiro paralelo aos pedidos.

**Assinatura:** PG01 PASS · 2026-11-09.
