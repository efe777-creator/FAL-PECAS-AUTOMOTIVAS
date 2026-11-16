# MARCHA — Condições de pagamento (vitrine + checkout + RPC)

**Data:** 2026-11-16  
**Auth:** eFe (`MARCHA`)  
**Projeto Supabase:** `wtbpwuiayednvlhvuhbh`  
**Site Netlify alvo:** `fal-pecas-automotivas-efe` (`79994809-2fb1-4faf-bce5-4feac9a7d3a3`)

## Escopo

Ship das condições comerciais (% Pix / débito / crédito sobre preço da lista), UI Admin Home, reflexão vitrine/carrinho/checkout, RPC `apply_payment_condition_to_order`, Edges Asaas (crédito embutido + shared).

## Resultados

| # | Item | Status | Evidência |
|---|------|--------|-----------|
| T1 | Vitest | **PASS** | 773/773 · 156 files |
| M1 | Migration `store_payment_condition_adjust` | **PASS** | MCP `apply_migration` · colunas `pix/debit/credit_adjust_percent` + RPC |
| E1 | `pay-asaas-credit-card` | **PASS** | deploy `--use-api` |
| E2 | `create-fal-payment` | **PASS** | deploy com `asaasCreateChargeFlow` |
| E3 | `create-asaas-payment` | **PASS** | deploy |
| E4 | `asaas-webhook` | **PASS** | deploy `--no-verify-jwt` |
| B1 | `npm run build` | **PASS** | `dist/` gerado (bundle `index-B5rIm5wl.js`) |
| N1 | Netlify efe prod | **BLOQUEADO** | API 403 `Account credit usage exceeded - new deploys are blocked until credits are added` |

## Banco (smoke)

- Colunas em `store_payment_display`: `pix_adjust_percent`, `debit_adjust_percent`, `credit_adjust_percent` (default `0`).
- Função: `apply_payment_condition_to_order(p_order_id uuid, p_method text)`.
- Nota: `supabase db push` local falha por drift de histórico remoto (versões órfãs); migration aplicada via MCP sem repair destrutivo.

## Front bloqueado

Último live efe antes desta marcha: deploy CLI `6afb24f245d9d44c7f3efb54` (sem o bundle desta marcha).

Tentativas nesta marcha:

1. `npx netlify deploy --prod --dir=dist` → Forbidden / Not Found (site link legado `e526…` + crédito).
2. Upload zip API → HTTP 403 crédito.
3. MCP `deploy-site` → deploys `6afb3ef4…` / `6afb3f62…` **skipped** crédito.

**Desbloqueio:** adicionar créditos / top-up no time `efe777-creator` na Netlify, depois:

```bash
cd fal-pecas
npx netlify deploy --prod --dir=dist --site=79994809-2fb1-4faf-bce5-4feac9a7d3a3 --message "marcha condicoes pagamento vitrine"
```

(`.netlify/state.json` já aponta para o site efe.)

## Pendências

1. Liberar créditos Netlify e republicar `dist` no efe.
2. Smoke humano: Admin Home → % Pix negativo → card/PDP/carrinho/checkout → `apply_payment_condition_to_order` antes da cobrança.
3. Homolog crédito embutido em sandbox Asaas (pendência já registrada na marcha cartão).
