# VAL — O0-C: copy cliente sem VITE_/D-FRETE/sandbox

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** residual O0-C — retomada cartão e disclaimers de frete ainda falavam jargão técnico

## Entrega

| Peça | Antes → Depois |
|------|----------------|
| `ResumeOrderPaymentPanel` | `VITE_MP_PUBLIC_KEY…` → mensagem humana (igual checkout) |
| `mpCreatePaymentService` | `MP_ACCESS_TOKEN…` → “Pagamento indisponível…” (+ `console.error`) |
| `commercialShippingDisclaimer` | sem D-FRETE/mock/sandbox no texto |
| `quoteStorefrontShipping` | disclaimer sem “(sandbox)” |
| `adminOrderOps` área Expedição | sem “sandbox” |

## Critérios

- [x] Grep UI: sem `VITE_MP_PUBLIC_KEY não configurada`
- [x] `carrierRegistry.test` PASS (12)
- [x] `tsc -b` OK

## Gate humano

Nenhum. Cutover D-FRETE C / MP prod inalterados.
