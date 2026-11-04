# E2E compra + produção — status

**Data:** 2026-10-10 (E2E-pré) · **sync S4:** 2026-11-04  
**VAL pré-pagamento:** [FAL_MARCHA_E2E_PRE_PAGAMENTO_VAL_2026-10-10.md](./FAL_MARCHA_E2E_PRE_PAGAMENTO_VAL_2026-10-10.md)  
**VAL pedido pago:** [FAL_MARCHA_E2E_PEDIDO_PAGO_VAL_2026-11-04.md](./FAL_MARCHA_E2E_PEDIDO_PAGO_VAL_2026-11-04.md)  
**Planejamento α:** [FAL_PLANEJAMENTO_PROXIMOS_PASSOS_ALPHA_2026-11-04.md](./FAL_PLANEJAMENTO_PROXIMOS_PASSOS_ALPHA_2026-11-04.md)

---

## E2E (catálogo → pedido → pagamento)

| Etapa | Estado |
|-------|--------|
| Catálogo / PDP / carrinho | **OK** |
| Checkout + place_order F9-F | **OK** |
| Checkout anônimo → login | **OK** |
| Bundle MP + aviso D-FRETE | **OK** |
| Pagamento sandbox Pix/cartão | **OK** — S2 PASS loja · cartão approved |
| Frete política produção | **PENDENTE** assinatura D-FRETE (S1); pedido usou mock B |
| Pedido teste ponta a ponta | **PASS doc** — `08da5ada-3fc7-4cbd-a8a0-0663974b6ff3` · Em confirmação · R$ 128,12 |
| Separação / envio | **NÃO** — sem auth operador |

Pré-requisito Gate α: S1 D-FRETE assinado + aceite S5.

---

## Produção (Netlify)

| Check | Estado | Evidência |
|-------|--------|-----------|
| Site público | **OK** | https://fal-pecas-automotivas.netlify.app |
| Catálogo | **OK** | 04/11 |
| Runtime wtbp | **OK** | `wtbpwuiayednvlhvuhbh` |
| Deploy | **OK** | Published `main @ e6d9af5` |
| Smoke MP approve | **OK** | [MP smoke status](./FAL_MP_SMOKE_STATUS_2026-10-10.md) |

---

## Encerramento

**S4 documental:** PASS.  
**Gate α / D-FRETE:** ainda eFe.  
**Ops:** sem avançar pedido `08da5ada…` para separação neste status.
