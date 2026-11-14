# MARCHA / VAL — OT Frete e cartões FAL — 2026-11-13

## Entregas de código

| Fase | Status | Evidência |
| --- | --- | --- |
| 0 Diagnóstico mobile Secure Fields | **PASS** | `FAL_MARCHA_CARD_MOBILE_DIAG_2026-11-13.md` — causa: `overflow-hidden` + iframe h-12 + remount pós-reject |
| 1 Fix digitação mobile | **PASS (código)** | `MercadoPagoCardBrickPanel` shell sem clip; sem remount auto em reject |
| 2 Crédito / débito | **PASS (código + DB)** | `credit_enabled` / `debit_enabled` migration aplicada; checkout radios; débito 1x; Edge gate |
| 3 Frete FAL CEP na PDP | **PASS (código)** | Edge `estimateCepOnly`; ownQuoteOptions; UI PDP com preço; delta no checkout |
| 4 Homologação dispositivo | **PENDENTE humano** | Matriz abaixo |

## Verificação automática

- `tsc -b` — PASS
- vitest: `paymentDisplay` + `quoteStorefrontShipping` + `createMpPaymentFlow` — 39 PASS
- Migration `store_payment_display_credit_debit` — aplicada em `wtbpwuiayednvlhvuhbh`

## Matriz homologação (obrigatória — preencher no smoke)

| Teste | Desktop | Android | iPhone |
| --- | --- | --- | --- |
| Cotação frete no produto (CEP → preço FAL) | ☐ | ☐ | ☐ |
| Entregas próprias FAL distintas de ME | ☐ | ☐ | ☐ |
| Cartão de crédito | ☐ | ☐ | ☐ |
| Cartão de débito | ☐ | ☐ | ☐ |
| Digitação do número | ☐ | ☐ | ☐ |
| Autopreenchimento (quando suportado) | ☐ | ☐ | ☐ |
| Validação dos campos | ☐ | ☐ | ☐ |
| Finalização do pagamento (TEST) | ☐ | ☐ | ☐ |

## Ops pós-deploy

1. **Redeploy Edges obrigatório** (CLI sem token nesta sessão):
   ```bash
   cd fal-pecas
   npx supabase login
   npx supabase functions deploy quote-own-delivery --project-ref wtbpwuiayednvlhvuhbh --use-api --yes
   npx supabase functions deploy create-mp-payment --project-ref wtbpwuiayednvlhvuhbh --use-api --yes
   ```
2. Home da loja → Pagamentos: conferir toggles Crédito / Débito / Pix.
3. Smoke PDP com CEP coberto + checkout com número (delta transparente).
4. Smoke Secure Fields no celular real (`/checkout` ou `/dev/mp-brick`).

## Regra de encerramento

Código + migration + unitários + tsc = **PASS agente**.  
Matriz dispositivo = smoke humano (checklist acima). Sem smoke mobile, OT comercial permanece aberta.
