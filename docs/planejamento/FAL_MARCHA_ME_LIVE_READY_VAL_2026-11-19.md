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
| Script | [`fal-pecas/scripts/wire-me-live-secrets.mjs`](../../fal-pecas/scripts/wire-me-live-secrets.mjs) — set API_BASE prod + token + redeploy |
| Secrets atuais | Ainda **sandbox** (`MELHOR_ENVIO_API_BASE` sandbox · smoke `sandbox:true`) |
| Token produção | **BLOCKED** — não disponível no ambiente do agente; eFe deve exportar `MELHOR_ENVIO_TOKEN` e rodar o script |
| `.env.local` VITE live | **não** alterado (evita mismatch front live × Edge sandbox) |

```powershell
$env:MELHOR_ENVIO_TOKEN='<token produção ME>'
node scripts/wire-me-live-secrets.mjs
# depois: VITE_SHIPPING_ME_ENV=live em .env.local + reiniciar Vite
```

## V — Verify live até prepare

| Item | Resultado |
|------|-----------|
| Hub `apiBase` produção | **BLOCKED** (depende B) |
| Smoke `STOP_AFTER=prepare` live | **BLOCKED** (depende B) |
| Purchase | **não executado** (conforme plano) |

## Checklist Netlify (não aplicado)

- `VITE_SHIPPING_PROVIDER=melhorenvio`
- `VITE_SHIPPING_ME_ENV=production`
- Alinhar com Edge `MELHOR_ENVIO_API_BASE=https://melhorenvio.com.br` + token prod  
- Publish só com autorização expressa

## Aceite

| ID | Critério | Status |
|----|----------|--------|
| A1 | Smoke sandbox completo | **PASS** |
| A2 | Edge+front live | **BLOCKED** (token) |
| A3 | prepare live · zero purchase | **BLOCKED** (token) / purchase N/A |
| A4 | D1–D6 corrigidos | **PASS** |
| A5 | Guias sem Faça agora duplicado + wizard compact | **PASS** |
| A6 | Sem main / Netlify prod / compra real | **PASS** |

## Próximo (humano)

1. Colar token ME **produção** e rodar `wire-me-live-secrets.mjs`.
2. `VITE_SHIPPING_ME_ENV=live` + reiniciar Vite.
3. Smoke `STOP_AFTER=prepare` + UI Cotar/Preparar (sem Comprar).
4. Commit/push `dev` se autorizado.

## Revalidação MARCHA (2026-11-19 ~19h)

| Item | Resultado |
|------|-----------|
| `tsc` + vitest focado (44) | **PASS** |
| Smoke `STOP_AFTER=prepare` | **PASS** · `e541dcd5-…` · `sandbox:true` · `label_state=cart` |
| UI guia (lista) | **PASS** · Aberto na guia / Focar / wizard |
| UI `/:id` Logística ME | **PASS** · Cotar/Preparar · “No carrinho Melhor Envio” · sem copy “slot onda” |
| Dark tokens (warning/success/wizard) | **PASS** (código + smoke visual anterior) |
| Wire live | **BLOCKED** · sem `MELHOR_ENVIO_TOKEN` no shell |

**Assinatura:** MARCHA revalidação UX/sandbox **PASS** · wire live **BLOCKED** (token) · 2026-11-19 19h.
