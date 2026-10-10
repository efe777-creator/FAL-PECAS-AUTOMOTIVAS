# Gate eFe — operação controlada (Fase α)

**Data:** 2026-10-10  
**Loja:** https://fal-pecas-automotivas.netlify.app  
**Runtime:** `wtbpwuiayednvlhvuhbh`

**Plano mestre:** [FAL_PLANO_FINALIZACAO_ALPHA_SOBERANO_2026-10-10.md](./FAL_PLANO_FINALIZACAO_ALPHA_SOBERANO_2026-10-10.md) (sequência S0–S6 + checklist α).

Critérios do plano α. Itens com **OK agente** já têm evidência documental; itens humanos bloqueiam o aceite final.

| Critério | Estado | Evidência / ação |
|----------|--------|------------------|
| H1–H6 + Pix + cartão (+ webhook se H3/H4) | **PENDENTE humano** — H5 **FAIL** (UI simulado) | [MP smoke](./FAL_MP_SMOKE_STATUS_2026-10-10.md) + [prep](./FAL_MP_SMOKE_PREP_2026-10-09.md) |
| D-FRETE assinado (A/B/C) | **PENDENTE eFe** | [ficha](./FAL_D_FRETE_DECISAO_2026-10-10.md) — PDP cotação real ⇒ C |
| Frete estrutura/UI sandbox/MCP (não = live) | **OK agente** | [plano](./FAL_PLANO_FRETE_FINALIZACAO_2026-10-10.md) · [VAL](./FAL_MARCHA_FRETE_ESTRUTURA_CARRIERS_VAL_2026-10-10.md) · [auditoria](./FAL_AUDITORIA_FRETE_COTACAO_ENTREGA_2026-10-10.md) |
| VAL frete integrado (PDP→pedido live) | **PENDENTE** | Separado do smoke MP; pós D-FRETE C |
| E2E pré-pagamento (catálogo→carrinho→checkout) | **OK agente** | [VAL E2E-pré](./FAL_MARCHA_E2E_PRE_PAGAMENTO_VAL_2026-10-10.md) — para em login |
| 1 pedido E2E sandbox pago | **PENDENTE** (após MP+frete+login) | [E2E status](./FAL_E2E_PRODUCAO_STATUS_2026-10-10.md) |
| Netlify / wtbp / catálogo público | **OK agente** | E2E/produção status 10/10 |
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
