# Plano de inicialização — Fase 9

**Data:** 2026-10-06  
**Status:** F9.0 **DONE** · F9-MP docs (auditoria/spec) **DONE** · F9-MP impl **STOP** até MARCHA  
**Deps:** F8.4 + F8.5 + vitrine + F9.0 em `main` (`1abea37`).

## Objetivo

1. Adapters de contrato (frete/pagamento) — **entregue (F9.0)**.  
2. **Mercado Pago real** (sandbox→prod) — trilha F9-A…I.  
3. Frete HTTP real — **F10**.

## Fatias

### F9.0 — DONE

| Fatia | Conteúdo | Status |
|-------|----------|--------|
| Correios sandbox | PAC/SEDEX determinístico | DONE |
| Frenet sandbox | Multi-carrier determinístico | DONE |
| Gateway sandbox | Metadata gateway; ciclo via `confirm_simulated_payment` | DONE |

### F9 — Mercado Pago

| Gate | Conteúdo | Status |
|------|----------|--------|
| F9-A docs | [AUDITORIA…](./AUDITORIA_F9_ARQUITETURA_CHECKOUT_PAGAMENTO_2026-10-06.md) + [SPEC…](./ESPECIFICACAO_FASE9_PAGAMENTOS_MERCADO_PAGO.md) + [CHECKLIST…](./CHECKLIST_FASE9_PAGAMENTOS.md) | **DONE** |
| F9-A impl … F9-I | Migrations → Pix → cartões → webhook → checkout → admin → homolog → prod | **Aguardando MARCHA** |

## Env (sem valores)

- `VITE_SHIPPING_PROVIDER=correios|mock|frenet|carrier`
- `VITE_PAYMENT_PROVIDER=simulated|gateway|sandbox|mercadopago`
- `VITE_MP_PUBLIC_KEY` (só public)
- Secrets BE: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` (nunca `VITE_*` privado)

## Fora

HTTP frete real (F10); F8.6–F8.8 (paralelo); repair em massa; implementação MP sem MARCHA.

## Próximo

**STOP** → revisão humana → MARCHA F9-A impl (migrations + RLS + layout secrets).
