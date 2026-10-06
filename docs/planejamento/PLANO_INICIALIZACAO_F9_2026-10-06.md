# Plano de inicialização — Fase 9

**Data:** 2026-10-06  
**Status:** F9.0 + F9-A + **F9-B DONE** (`main` `06be4e4`) · **STOP antes F9-C**  
**Deps:** schema payments + Edge create-mp-payment em `main`.

## Fatias MP

| Gate | Status |
|------|--------|
| F9-A docs + impl | DONE |
| F9-B create-mp-payment | **DONE** PR #6 |
| F9-C Pix + webhook mínimo | **STOP** / MARCHA |
| F9-D…I | pendente |

## Env

- FE: `VITE_MP_PUBLIC_KEY`, `VITE_PAYMENT_PROVIDER`
- BE secrets: `MP_ACCESS_TOKEN`, `MP_ENV` (deploy Edge manual)

## Próximo

**STOP** → `MARCHA F9-C`.
