# VAL — MARCHA cartão Core Methods (Secure Fields) — 2026-11-12

**Runtime:** `localhost:5173` · PK prod `APP_USR-ae216fe5-…` · Edge token app live `6371863177010206`

## Problema

Card Payment Brick montava o shell mas Secure Fields ficavam em `loading` (height 0 / `onReady` nunca). Reproduzido também em HTML vanilla sem React → não era só remount.

## Causa / decisão

Arquitetura Brick PCI instável neste ambiente. **Core Methods** (`CardNumber` / `ExpirationDate` / `SecurityCode` + `createCardToken`) monta Secure Fields com altura > 0 e `ready`.

Prova isolada: `/dev-mp-fields.html` → `READY — fields OK`.

## Correção

`MercadoPagoCardBrickPanel` passou a usar Core Methods (mesmo export name no checkout/resume):

- `initMercadoPago` + fields com `style.height: 48px`
- BIN → `getPaymentMethods` / `getInstallments`
- Submit → `createCardToken` → `createFalPayment` (Edge inalterado)

## Evidência

| Checagem | Status |
| --- | --- |
| `/dev-mp-fields.html` fields ready | PASS |
| `/dev/mp-brick` containers `*SecureField_container` h≈150 + iframes SF | PASS |
| Form UI (número, validade, CVV, titular, doc, parcelas, Pagar) | PASS |
| `tsc -b` sem erro no painel | PASS |
| Cobrança approved (cartão real / homolog TEST) | PENDENTE smoke |

## Residuais ops

- Netlify: PK prod já alinhada; redeploy bloqueado por crédito da conta.
- Painel MP app live: cadastrar domínios + tópicos webhook `payment`.

**Assinatura:** MARCHA card Core Methods · 2026-11-12.
