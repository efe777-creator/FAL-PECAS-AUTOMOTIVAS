# MARCHA P0 — Alinhamento pay / VAL

**Data:** 2026-11-16  
**Auth:** eFe — `marcha`  
**Plano:** [FAL_MVP_PLANO_CONSOLIDACAO.md](./FAL_MVP_PLANO_CONSOLIDACAO.md) §3  
**Classe:** MVP-bloqueador  
**Tip base:** `4e7fab19`

---

## 0.1 Inventário WT — PASS

### Pacote A — Pay Asaas cartão / Edges / orquestração

- `fal-pecas/src/components/payments/AsaasCardPanel.tsx`
- `fal-pecas/src/components/payments/AsaasEmbeddedCreditPanel.tsx` (untracked)
- `fal-pecas/src/services/payments/*` (createFal, createAsaas, falPayCapabilities, payAsaas*, asaas*, falEdgeErrorMessage*)
- `fal-pecas/supabase/functions/create-fal-payment/`, `create-asaas-payment/`, `asaas-webhook/`, `pay-asaas-credit-card/`
- `fal-pecas/supabase/functions/_shared/asaas*`
- `fal-pecas/supabase/config.toml`
- `fal-pecas/scripts/smoke-asaas-*.mjs`
- Admin payments pages + VALs marcha cartão
- `CheckoutPage.tsx` (parcial A)

### Pacote B — Condição % vitrine

- `20261116140000_store_payment_condition_adjust.sql`
- `PaymentAdjustPercentControl*`, `AdminHomePaymentSection.tsx`
- `paymentDisplay*`, `PaymentConditionHint`, `StorePaymentMethodsBlock`, `ProductCard`, `CartPage`
- `applyPaymentConditionToOrderService.ts`, `paymentConditionPricing*`
- `AdminHomeContentPage` / `AdminHomeSectionTabs`
- VAL condições + design spec
- `CheckoutPage.tsx` (parcial B — overlap com A)

### Pacote C — Notificações mobile UI

- `NotificationBell.tsx`, `NotificationInbox.tsx`, `NotificationInboxItem.tsx`
- `Header.tsx`, `AdminLayout.tsx`
- VAL notificações mobile

### Pacote D — Docs PRD 4.0 (canônico)

- `docs/entrada/FAL_PRD_4.0.md`, Visão, Índice
- `docs/arquitetura/*`, `docs/futuro/*`
- MVP Completo / Mapa / Consolidação / Roadmap / Auditoria consolidada
- Cabeçalhos históricos PRD 3 / Roadmap 3 / Plano MVP 09/11

### Excluído do commit

- `.deploy-compact.json`, `.deploy-mcp-full-args.json` (possível segredo/ops)
- `scripts/` raiz (revisar antes — não no tip sem inventário)

### Nota overlap

A+B compartilham `CheckoutPage.tsx` → **um commit de código pay** (A+B juntos).

---

## 0.2 Autorização — PASS

`marcha` = OK eFe para commit A+B+C+D e seguir migrate/deploy quando possível.

---

## 0.3 Testes locais — PASS

```text
vitest payments + paymentDisplay + paymentCondition + PaymentAdjust + checkoutReturnTo
→ 19 files / 127 tests PASS

vitest notificationDisplay + appNotificationCopy
→ 2 files / 10 tests PASS
```

---

## 0.4 Commits — (em andamento neste VAL)

Ver `git log` após MARCHA.

---

## 0.5–0.8 Migration / Edges / flags / Netlify

Preenchido ao concluir nesta MARCHA ou STOP com motivo.
