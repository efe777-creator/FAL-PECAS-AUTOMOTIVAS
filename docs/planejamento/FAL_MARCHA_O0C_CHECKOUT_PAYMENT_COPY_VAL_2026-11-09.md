# VAL — copy de pagamento no checkout

**Data:** 2026-11-09  
**Auth:** MARCHA (código local — sem commit/push)  
**Item:** O0-C / O1-F — `CheckoutPage` etapa Pagamento

## Entrega

- Título unificado **Pagamento** (MP e demonstração)
- Sem “configure o provedor / ambiente da loja” ao cliente
- Labels “Pix/Cartão (demonstração)” em vez de “simulado”
- Toasts de approve/fail sem jargão “simulado”
- Fluxo `confirmSimulatedPayment` **preservado** (smoke sem MP)

## Critérios

- [x] `tsc --noEmit` OK
- [x] Sem cutover / secrets / D-FRETE

## Gate humano

Nenhum. Ship git sob demanda.
