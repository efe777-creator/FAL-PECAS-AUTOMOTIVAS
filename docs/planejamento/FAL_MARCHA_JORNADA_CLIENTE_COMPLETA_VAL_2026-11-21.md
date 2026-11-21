# FAL — MARCHA · Testes jornada cliente completa

**Data:** 2026-11-21 · **Branch:** `dev`  
**Plano base:** [FAL_PLANO_GARAGEM_FUNDACAO_COERENTE_2026-11-21.md](./FAL_PLANO_GARAGEM_FUNDACAO_COERENTE_2026-11-21.md)

## Cadeia coberta (vitest)

`clienteJornadaFundacao.chain.test.ts` — placa → filtro → snapshot/garagem → nav → visual 2D → checkout `cv_id` → histórico 1 linha/item.

## Gates

| Pacote | Resultado |
|--------|-----------|
| `tsc --noEmit` | **PASS** |
| Jornada chain + snapshot + collapse | **PASS** |
| Garagem + placas + layout + customers + compat | **262 PASS** (52 files) |
| `test:compat-antiregress` | **58 PASS** |
| `test:ui-layout-antiregress` | **37 PASS** |
| Playwright e2e (R5) | **SKIP** — sem `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` neste ambiente |

## Correções nesta marcha

- Helper `resolveOrderItemCustomerVehicleId` (checkout).
- `CollapsedPurchaseRow.customerVehicleId` no collapse G7.
- Chain test antiregress da jornada fundação.

## Residual

- Aplicar migration G7 COALESCE no wtbp.
- Smoke compra real + e2e R5 com credenciais.
