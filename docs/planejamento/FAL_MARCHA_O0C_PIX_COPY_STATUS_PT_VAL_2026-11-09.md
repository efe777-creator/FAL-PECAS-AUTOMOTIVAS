# VAL — Pix: copiar + status PT-BR

**Data:** 2026-11-09  
**Auth:** MARCHA  
**Item:** O0-C / funil — `MercadoPagoPixPanel` + mapa `paymentStatusLabel`

## Entrega

- Toast sucesso/erro ao copiar código Pix (falha não silenciosa)
- Status de pagamento em PT-BR via `lib/paymentLabels.ts` (mapa único)
- Cartão (`MercadoPagoCardBrickPanel`) passa a usar o mesmo mapa
- Removido jargão `MP: providerStatus` do rodapé Pix

## Critérios

- [x] Vitest `paymentLabels.test.ts` PASS
- [x] `tsc --noEmit` OK
- [x] D-FRETE B intacto · sem cutover · sem secrets

## Gate humano

Nenhum (código/copy). Publish Netlify / MP prod seguem fora desta frente.
