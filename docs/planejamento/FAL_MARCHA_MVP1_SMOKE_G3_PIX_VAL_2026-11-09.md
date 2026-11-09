# VAL — Smoke G3 checkout Pix (agente)

**Data:** 2026-11-09 · ~14h38  
**Auth:** eFe — `MARCHA FAÇA VOCE`  
**Ambiente:** Preview #249 — https://deploy-preview-249--fal-pecas-automotivas.netlify.app/

---

## Escopo executado (agente)

Cadastro → identificação → endereço → frete → Pix → cobrança MP gerada.

| Etapa | Resultado |
|-------|-----------|
| Conta `@gmail.com` (não disposable) | PASS — `fal.marcha.smoke.1794245808266@gmail.com` |
| Item no carrinho | PASS — AXIAL DE DIREÇÃO R$ 48,14 |
| CPF + Continuar | PASS |
| CEP 01310-100 → Av. Paulista / SP autofill + nº 1000 | PASS |
| Frete (econômica R$ 29,90) | PASS |
| Método Pix | PASS |
| Aceite termos → **Gerar cobrança Pix** | PASS |
| QR + copia-e-cola + pedido | PASS |

## Evidência

- **Pedido:** `1ad15ec6-d27a-4f66-8fe1-76f6468ddfd0`
- **Valor Pix:** R$ 78,04 (produto + frete)
- **Status UI:** pendente · aguardando confirmação MP
- **Carrinho após cobrança:** 0
- Bloqueio anterior `@mailinator.com` (`Payer email forbidden`) contornado com Gmail

## Fora deste smoke (ainda humano / ops)

| Item | Status |
|------|--------|
| Pagar Pix TEST e ver webhook → aprovado | Pendente (pagamento real sandbox) |
| Fluxo cartão + troca Pix↔cartão | Pendente |
| Smoke admin (A4 / margem / KPIs) | Pendente |
| Fernando prod | Mantido bloqueado (crédito) |

**Assinatura:** VAL G3 Pix create PASS (agente) · webhook approve ainda humano · 2026-11-09.
