# Auditoria — Checkout + Meus pedidos · 2026-11-12

## Achados e correções

| # | Problema | Causa | Correção |
|---|----------|-------|----------|
| 1 | **Continuar para entrega** demora / fica disabled | `quoting` true na etapa Endereço — effect recotava frete com `step >= 1` e o botão usava `disabled={quoting}` | Cotar **só** em `step === 2`; quoting só desabilita Continuar na etapa Entrega |
| 2 | **Três botões** “Pagar com cartão” mid-pay | Pix panel + footer + aside | Fica **um** no painel Pix; removidos footer e aside duplicados |
| 3 | Andamento com **duas** linhas “Aguardando confirmação da loja” | HAPPY_PATH tinha `recebido_pela_fal` + `em_confirmacao` com o mesmo label | Um único passo `em_confirmacao` na timeline cliente |
| 4 | `confirmado` ainda mostrava confirmação como “atual” | `activeIndex` em `em_confirmacao` | `confirmado` → separação current, confirmação done |

## Smoke sugerido

1. Checkout endereço: Continuar para entrega **já habilitado** (com endereço selecionado), sem esperar cotação.
2. Após Pix gerado: um único CTA “Pagar com cartão” no painel.
3. Meus pedidos `em_analise`: andamento sem label duplicado.
