# MARCHA VAL — ME live ready + guias sem duplicidade

Data: 2026-11-19 · branch **`dev`**  
Plano: ME Live Ready UX (opção 2 — wire live sem purchase)  
Runtime: `wtbpwuiayednvlhvuhbh` · Vite local · **sem** merge main / Netlify prod / compra ME real

## A — Smoke sandbox (gate)

| Item | Resultado |
|------|-----------|
| Branch | `dev` |
| Front `.env.local` | `VITE_SHIPPING_ME_ENV=sandbox` |
| Smoke `smoke-me-label.mjs` | **PASS** · `3b1a4e8c-044c-4f79-8c94-827b29526a86` · quote→print · `sandbox:true` |
| `tsc --noEmit` | **PASS** |
| Vitest focado (meLabel*/orderPacking*/orderOps*) | **PASS** · 41 testes |

## C0/C — Guias / dedupe botões e caminhos

| ID | Correção | Status |
|----|----------|--------|
| D1 | Lista: esconde “Faça agora” amarelo se id ∈ `openOrderIds` → “Aberto na guia · ações no painel” | **PASS** (smoke DOM) |
| D2 | `utilitiesOnly` quando qualquer guia aberta | **PASS** (código) |
| D3 | `pendenciaActionsDeferred` consumido no footer (`OrderOpsSurface`) — só `cancel-order` + nav | **PASS** (código + policy test) |
| D4 | Copy análise → “Ações do pedido (rodapé)” | **PASS** |
| D5 | `OrderOpsWizardNav` compact no surface + `onNavigate` tabs; `id=ops-conferencia` | **PASS** (wizardNav presente no compact) |
| D6 | Card aberto: label “Focar guia” | **PASS** |
| D7 | Frete Geral vs Logística | Documentado — sem CTA frete em Geral |
| D8 | ME só no slot | Mantido |
| D9 | Hub tab Logística ≠ surface | Documentado — sem rename |
| D10 | `OrderPreviewPanel` | Órfão (só definição) — não reativado |

Arquivos: `AdminOrdersListPanel.tsx`, `AdminOrdersHubPage.tsx`, `OrderOpsSurface.tsx`, `OrderOpsWizardNav.tsx`, `OrderAnalysisResolutionPanel.tsx`, `orderOpsSurfacePolicy.test.ts`.

## B — Wire ME live

| Item | Resultado |
|------|-----------|
| Script | [`fal-pecas/scripts/wire-me-live-secrets.mjs`](../../fal-pecas/scripts/wire-me-live-secrets.mjs) — `--remote` + `--yes` |
| Fonte token | Root `.env.local` (`MELHOR_ENVIO_API_BASE=https://melhorenvio.com.br`) |
| Secrets Edge | **PASS** · API_BASE prod + token prod + USER_AGENT · redeploy `quote-shipping` + `melhorenvio-label` |
| Front `fal-pecas/.env.local` | `VITE_SHIPPING_ME_ENV=production` |

## V — Verify live até prepare

| Item | Resultado |
|------|-----------|
| Smoke `STOP_AFTER=prepare` live | **PASS** · `4573c9bb-7451-47a8-b823-cef3faaec747` · `sandbox:false` · quote→cart |
| Purchase | **não executado** (`stopAfter=prepare`) |

## Checklist Netlify (não aplicado)

- `VITE_SHIPPING_PROVIDER=melhorenvio`
- `VITE_SHIPPING_ME_ENV=production`
- Alinhar com Edge `MELHOR_ENVIO_API_BASE=https://melhorenvio.com.br` + token prod  
- Publish só com autorização expressa

## Aceite

| ID | Critério | Status |
|----|----------|--------|
| A1 | Smoke sandbox completo | **PASS** |
| A2 | Edge+front live | **PASS** |
| A3 | prepare live · zero purchase | **PASS** |
| A4 | D1–D6 corrigidos | **PASS** |
| A5 | Guias sem Faça agora duplicado + wizard compact | **PASS** |
| A6 | Sem main / Netlify prod / compra real | **PASS** |

## Próximo

1. UI Cotar/Preparar em live (sem Comprar) + reiniciar Vite se ainda em sandbox.
2. Commit/push `dev` (script `--yes` + VAL) se autorizado.
3. MAIN / Netlify prod — só com autorização expressa.
4. Compra real de etiqueta — fora desta marcha.

## Revalidação MARCHA (2026-11-19 ~19h)

| Item | Resultado |
|------|-----------|
| Wire live + deploy | **PASS** |
| Smoke prepare live | **PASS** · `4573c9bb-…` · `sandbox:false` · `cart` · zero purchase |
| UX guias/dedupe (rodada anterior) | **PASS** |

## Anti-regressão (2026-11-19 ~19h20)

| Gate | Como |
|------|------|
| Live sem auto-purchase | `scripts/lib/meSmokePurchasePolicy.mjs` + smoke |
| `STOP_AFTER=prepare` antes de purchase | assert estático no vitest |
| Wire só API prod + `--yes` + `--env-file` | assert estático (token fora do argv) |
| Purchase gates Edge ↔ src | parity + `evaluateMePurchaseGates` |
| npm | `npm run test:me-antiregress` |

**Assinatura:** MARCHA ME live-ready **PASS** (prepare, sem purchase) + gates anti-regressão · 2026-11-19 ~19h20.
