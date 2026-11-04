# MARCHA SOBERANA α — execução (04/11)

**Tipo:** runbook de execução (não inventa resultados)  
**Canônico:** [FAL_PLANO_FINALIZACAO_ALPHA_SOBERANO_2026-10-10.md](./FAL_PLANO_FINALIZACAO_ALPHA_SOBERANO_2026-10-10.md)  
**Detalhe:** [FAL_PLANEJAMENTO_PROXIMOS_PASSOS_ALPHA_2026-11-04.md](./FAL_PLANEJAMENTO_PROXIMOS_PASSOS_ALPHA_2026-11-04.md)

---

## Estado da sequência

| Step | Estado | Ação |
|------|--------|------|
| S0 | **PASS** | Não reabrir |
| Docs sync FATO | **FEITO** | VAL docs sync 04/11 |
| **S1** | **AGORA** | eFe assina D-FRETE **B** |
| **S2** | **EXECUTADO PARCIAL** | [VAL S2](./FAL_MARCHA_SMOKE_MP_S2_VAL_2026-11-04.md) — create/pending OK; UI pós-order + webhook **não** fecham |
| S2-fix | **PRÓXIMA MARCHA agente** | `MARCHA_FIX_CHECKOUT_MP_POST_ORDER_UI` (auth) → reteste |
| S3 | N/A se B | Só se assinar C |
| S4 | Depois | 1 pedido E2E pago (após S2 completo + S1) |
| S5 | Depois | Gate α |
| S6 | Depois | STOP α |

---

## O que eFe faz agora

### Trilho S1 (5–10 min)
1. Abrir [FAL_D_FRETE_DECISAO_2026-10-10.md](./FAL_D_FRETE_DECISAO_2026-10-10.md)
2. Preencher: `Opção = B` · mensagem · expedição · data · assinatura
3. Avisar o agente se quiser que o status/docs registrem a assinatura (texto que você escreveu)

### Trilho S2 (sandbox)
1. Loja: https://fal-pecas-automotivas.netlify.app
2. H6: usuário teste MP disponível
3. Login · item available · checkout · UI = Mercado Pago
4. Pix → cartão → webhook (URL wtbp `…/mercado-pago-webhook`)
5. Registrar em [FAL_MP_SMOKE_STATUS_2026-10-10.md](./FAL_MP_SMOKE_STATUS_2026-10-10.md)

**Auth agente no smoke:** diga `SMOKE MP`.

---

## O que o agente NÃO faz nesta marcha soberana (sem auth extra)

- Pagamentos / pedidos reais de teste  
- Assinar D-FRETE ou Gate no seu lugar  
- Secrets, deploy, Correios live, B3, F11, domínio, HF  

---

## STOP

S0 e docs FATO ok. **Bola com eFe: S1 ∥ S2.**  
Próxima auth útil: `SMOKE MP` ou “assinei D-FRETE B” + texto da ficha.

**Assinatura agente:** MARCHA SOBERANA α exec sync 2026-11-04.
