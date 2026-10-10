# Preparação — Smoke Mercado Pago (sandbox)

**Data:** 2026-10-09  
**Modo:** checklist / evidências — **não** altera integração  
**Refs:** [STOP_BLOCO_G](./STOP_BLOCO_G_PAGAMENTOS_2026-10-07.md) · [STOP_F9_MP](./STOP_F9_MP_POS_AUDITORIA_2026-10-06.md) · FIND-005 / FIND-015  
**Runtime alvo:** `wtbpwuiayednvlhvuhbh` + Netlify loja

---

## 1. Premissas

- Código F9-B…E **existe** (create-mp-payment, Pix UI, Card Brick, webhook harden) — **relato** docs.
- Smoke **não** substitui `MARCHA F9-F` (polish pós-pago / retirar simulação enganosa).
- **Gate humano:** `MP_WEBHOOK_SECRET` + redeploy `mercado-pago-webhook` — **não presumir pronto**.

---

## 2. Pré-checklist (humano)

| # | Item | Status |
|---|------|--------|
| H1 | `MP_ACCESS_TOKEN` (test) no Supabase secrets do **wtbp** | ? |
| H2 | `MP_ENV=test` (ou equivalente documentado) | ? |
| H3 | `MP_WEBHOOK_SECRET` **completo** setado | ? |
| H4 | Redeploy `mercado-pago-webhook` **após** H3 | ? |
| H5 | Netlify: `VITE_SUPABASE_*`, `VITE_PAYMENT_PROVIDER=mercadopago`, `VITE_MP_PUBLIC_KEY` | ? |
| H6 | Conta MP sandbox + usuário teste | ? |

Se H3/H4 falharem: registrar “webhook não validável” e ainda assim documentar create-payment + UI.

---

## 3. Cenário de teste (sandbox)

### 3.1 Ambiente

- [ ] URL loja (Netlify ou local apontando wtbp)  
- [ ] Cliente autenticado com endereço/frete mock OK  
- [ ] Carrinho com ≥1 item **available** + preço resolvido > 0 (evitar SK971)  
- [ ] Total conferido na UI = total do pedido criado  

### 3.2 Pix

| Passo | Esperado | Evidência |
|-------|----------|-----------|
| Checkout → Pix | QR / copia-cola | print / Network |
| `create-mp-payment` | 2xx; `provider_payment_id` | response JSON (sem secrets) |
| Pedido | `aguardando_pagamento` (ou status canônico) | admin / SQL |
| Webhook approve (se H3/H4 OK) | transição pago | logs edge + order |
| Sem H3/H4 | create OK; approve **N/A** documentado | — |

### 3.3 Cartão (Brick)

| Passo | Esperado | Evidência |
|-------|----------|-----------|
| Brick carrega | formulário | print |
| Pagamento aprovado sandbox | approve / pending documentado | Network + order |
| Rejeição teste | erro honesto na UI | print |

### 3.4 Anti-regressão

| Check | Critério |
|-------|----------|
| FIND-015 | Sem `pix_simulated` como “pago” quando MP ativo |
| Amount | Edge usa total do pedido — FE não manda amount |
| Idempotência | Reenvio / double-click não duplica cobrança indevida |

---

## 4. Template de registro (preencher no smoke)

```text
Data:
Executor:
Ambiente (URL / project-ref):
H1–H6: OK / FALHA (detalhe)
Pix: PASS / FAIL / BLOQUEADO — evidências:
Cartão: PASS / FAIL / BLOQUEADO — evidências:
Webhook: PASS / FAIL / NÃO TESTÁVEL (secret) —
FIND-015: OK / FAIL —
Próximo: MARCHA F9-F / corrigir gap / retestar
```

---

## 5. Fora deste prep

- Alterar Edge functions / secrets via agente sem pedido explícito  
- Produção live (só sandbox)  
- Repair migrations B3  
- Apply FIND-004  

---

## 6. Status

| | |
|--|--|
| Prep smoke | **Pronto para execução humana** |
| Smoke executado | **Pendente** — ver [status 10/10](./FAL_MP_SMOKE_STATUS_2026-10-10.md) |
| F9-F código/RPC | **IMPLEMENTADO** 10/10 — [VAL](./FAL_F9F_CHECKOUT_MP_METHODS_VAL_2026-10-10.md); smoke comercial ainda pendente |
