# Gate eFe — operação controlada (Fase α)

**Data:** 2026-10-10 (sync docs 2026-11-04)  
**Loja:** https://fal-pecas-automotivas.netlify.app  
**Runtime:** `wtbpwuiayednvlhvuhbh`

**Plano mestre:** [FAL_PLANO_FINALIZACAO_ALPHA_SOBERANO_2026-10-10.md](./FAL_PLANO_FINALIZACAO_ALPHA_SOBERANO_2026-10-10.md)  
**Planejamento vigente:** [FAL_PLANEJAMENTO_PROXIMOS_PASSOS_ALPHA_2026-11-04.md](./FAL_PLANEJAMENTO_PROXIMOS_PASSOS_ALPHA_2026-11-04.md) (S0–S6 + D-FRETE B como premissa de plano).

Critérios do plano α. Itens com **OK agente** já têm evidência documental; itens humanos bloqueiam o aceite final.

| Critério | Estado | Evidência / ação |
|----------|--------|------------------|
| H1–H6 (config) | H1–H6 **PASS** (H6 user existente 04/11) | [H1H6 check](./FAL_MP_SMOKE_H1H6_CHECK_2026-10-14.md) · [VAL S2](./FAL_MARCHA_SMOKE_MP_S2_VAL_2026-11-04.md) |
| Pix + cartão + webhook approve (smoke) | **PARCIAL / BLOQUEADO UI** — create pending OK; QR/Brick/webhook approve **não** fechados (FIND-SMOKE-UI-001) | [MP smoke status](./FAL_MP_SMOKE_STATUS_2026-10-10.md) |
| D-FRETE assinado (A/B/C) | **PENDENTE eFe** | [ficha](./FAL_D_FRETE_DECISAO_2026-10-10.md) — premissa de planejamento α = **B** (≠ assinatura) |
| Frete estrutura/UI sandbox/MCP (não = live) | **OK agente** | [plano](./FAL_PLANO_FRETE_FINALIZACAO_2026-10-10.md) · [VAL](./FAL_MARCHA_FRETE_ESTRUTURA_CARRIERS_VAL_2026-10-10.md) · [auditoria](./FAL_AUDITORIA_FRETE_COTACAO_ENTREGA_2026-10-10.md) |
| VAL frete integrado (PDP→pedido live) | **N/A na α se B** | Só se D-FRETE **C** (pós-α / auth) |
| E2E pré-pagamento (catálogo→carrinho→checkout) | **OK agente** | [VAL E2E-pré](./FAL_MARCHA_E2E_PRE_PAGAMENTO_VAL_2026-10-10.md) — para em login |
| 1 pedido E2E sandbox pago | **PENDENTE** (após MP+frete+login) | [E2E status](./FAL_E2E_PRODUCAO_STATUS_2026-10-10.md) |
| Netlify / wtbp / catálogo público | **OK** (04/11) | [Auditoria status](./FAL_AUDITORIA_STATUS_PRD_CROSS_2026-11-04.md) — S0 PASS · bundle `index-DYpbbWUS.js` |
| ProductCard smoke visual | **OK agente** | [VAL card](./FAL_CARD_UX_CARRINHO_VAL_2026-10-10.md) |
| B3 / Bloco F / PDP-ML | **HOLD / adiados** | Não reabrir sem finding |

---

## Aceite eFe (preencher)

```text
Operação controlada OK: SIM / NÃO / ACEITE DE RISCO
Data:
Assinatura:
Ressalvas (MP/frete/E2E):
```

Sem assinatura acima, Fase α permanece **aberta** no trilho comercial.
