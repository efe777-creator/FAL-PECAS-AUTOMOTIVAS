# Gate eFe — operação controlada (Fase α)

**Data gate:** 2026-10-10 · **Aceite:** 2026-11-04  
**Loja:** https://fal-pecas-automotivas.netlify.app  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Estado:** **ASSINADO — Operação controlada OK: SIM** (com ressalvas)

**Plano mestre:** [FAL_PLANO_FINALIZACAO_ALPHA_SOBERANO_2026-10-10.md](./FAL_PLANO_FINALIZACAO_ALPHA_SOBERANO_2026-10-10.md)  
**STOP formal:** [FAL_STOP_ALPHA_FORMAL_2026-11-04.md](./FAL_STOP_ALPHA_FORMAL_2026-11-04.md)

---

## Critérios

| Critério | Estado | Evidência |
|----------|--------|-----------|
| H1–H6 (config) | **PASS** | [H1H6](./FAL_MP_SMOKE_H1H6_CHECK_2026-10-14.md) |
| Pix + cartão + approve (smoke) | **PASS loja** | Pedido `08da5ada…` · approved · R$ 128,12 — [VAL](./FAL_MARCHA_SMOKE_MP_S2_APPROVE_WEBHOOK_VAL_2026-11-04.md) · [status](./FAL_MP_SMOKE_STATUS_2026-10-10.md) |
| Webhook MCP history | **RESSALVA** | `notifications_history` sem entregas — não anula approve na loja |
| D-FRETE assinado | **PASS — B** | [ficha](./FAL_D_FRETE_DECISAO_2026-10-10.md) 04/11 |
| Frete UI sandbox | **OK** | VALs frete estrutura/UI |
| VAL frete live | **N/A** (B) | Só se C |
| E2E pré-pagamento | **OK** | VAL E2E-pré |
| 1 pedido E2E sandbox pago | **OK** | [VAL E2E pago](./FAL_MARCHA_E2E_PEDIDO_PAGO_VAL_2026-11-04.md) · Em confirmação (sem separação) |
| Netlify / wtbp | **OK** | prod `e6d9af5` |
| ProductCard | **OK** | VAL card |
| B3 / Bloco F / PDP-ML | **HOLD** | Fora de α |

---

## Aceite eFe

```text
Operação controlada OK: SIM
Data: 2026-11-04
Assinatura: eFe
Ressalvas (MP/frete/E2E):
  1. Webhook: MCP notifications_history NÃO OBSERVADO; approve comprovado na loja
     (mercadopago · approved + timeline). Diagnóstico MCP opcional pós-α.
  2. Frete: política B (mock/sandbox + aviso). Live / Melhor Envio = pós-α
     (plano logística funcional).
  3. Pedido 08da5ada… permanece Em confirmação; separação/envio = processo
     operador, fora do aceite α.
  4. Escopo α ≠ projeto PRD completo (F11+, domínio, Correios C).
```

Fase α comercial: **ACEITA** com ressalvas acima.  
STOP: [FAL_STOP_ALPHA_FORMAL_2026-11-04.md](./FAL_STOP_ALPHA_FORMAL_2026-11-04.md).
