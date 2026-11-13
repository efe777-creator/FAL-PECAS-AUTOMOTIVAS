# MARCHA — PAY migrations + deploys VAL

**Data:** 2026-11-13  
**Projeto Supabase:** `wtbpwuiayednvlhvuhbh`  
**Site Netlify:** `fal-pecas-automotivas-efe` → https://fal-pecas-automotivas-efe.netlify.app

## Commits (main)

| Hash | Mensagem |
|------|----------|
| `af7f867` | feat(pay): consolidação comercial e parcelas MP |
| `6ebd612` | feat(frete): cotação + meios comerciais no checkout |
| `a6361a9` | fix(admin): categorias/produtos/logística |
| `64d1ca7` | fix(build): desbloqueia tsc para deploy |

Push: `origin/main` alinhado.

## Migrations (produção)

| Version | SQL | Status |
|---------|-----|--------|
| `20261113170000` | checkout_quote no shipment | Aplicado + repair history |
| `20261113180000` | `store_payment_display` comercial | Aplicado + repair history |

Colunas confirmadas: `card_enabled`, `pix_enabled`, `installments_enabled`, `interest_free_max`, `allow_interest_installments`.

Linha atual (amostra): cartão/pix ON · parcelamento ON · max 3 · free_max 3 · allow_interest false.

## Edge

| Function | Status |
|----------|--------|
| `create-mp-payment` | Deployed (assets: index + mpCreatePaymentCore + mpWebhookCore) |

## Netlify

| Item | Resultado |
|------|-----------|
| Git auto-deploy (`fal-pecas-automotivas`) | **Skipped** — account credit usage exceeded |
| CLI deploy (`fal-pecas-automotivas-efe`) | **PASS** — live `6af7643dde1a3563225a0afa` |

## Aceite

| Critério | Resultado |
|----------|-----------|
| Commits + push | PASS |
| Migrations PAY + frete quote | PASS |
| Edge create-mp-payment | PASS |
| Front produção (efe) | PASS |
| Site legado créditos | BLOQUEIO conta — usar efe ou liberar créditos |

**Assinatura:** MARCHA migrate/deploy 2026-11-13.
