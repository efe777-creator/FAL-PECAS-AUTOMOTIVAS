# Plano de inicialização — Fase 9

**Data:** 2026-10-06  
**Status:** F9.0 DONE · F9-A docs DONE · **F9-A impl DONE** (`main` `c03afd4`) · **STOP antes F9-B**  
**Deps:** F8.4 + F8.5 + vitrine + F9.0 + F9-A schema em `main`.

## Objetivo

1. Adapters de contrato (frete/pagamento) — **F9.0 DONE**.  
2. Fundação schema MP — **F9-A DONE**.  
3. Mercado Pago sandbox HTTP (create/webhook) — **F9-B+** (próxima MARCHA).  
4. Frete HTTP real — **F10**.

## Fatias

### F9.0 — DONE

| Fatia | Status |
|-------|--------|
| Correios / Frenet / gateway sandbox | DONE |

### F9 — Mercado Pago

| Gate | Conteúdo | Status |
|------|----------|--------|
| F9-A docs | Auditoria + spec + checklist | DONE |
| F9-A impl | Migration `20261006200000` + RLS + secrets layout | **DONE** PR #5 |
| F9-B … F9-I | Edge MP → Pix → cartões → webhook → checkout → admin → homolog → prod | **STOP** até MARCHA |

## Env (sem valores)

- `VITE_PAYMENT_PROVIDER=simulated|gateway|sandbox|mercadopago`
- `VITE_MP_PUBLIC_KEY`
- Secrets BE: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_ENV` (nunca `VITE_*` privado)

## Próximo

**STOP** → MARCHA **F9-B** (Edge create-mp-payment + idempotência + Access Token backend).
