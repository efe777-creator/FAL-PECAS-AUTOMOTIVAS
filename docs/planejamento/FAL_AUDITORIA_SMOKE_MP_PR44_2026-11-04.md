# Auditoria + Smoke MP — PR #44 / Brick / próxima MARCHA

**Data:** 2026-11-04 (~10:50 BRT)  
**Auth:** eFe — SMOKE MP COMPLETO AUDITORIA E RELATORIO  
**Loja:** https://fal-pecas-automotivas.netlify.app  
**Runtime canônico:** `wtbpwuiayednvlhvuhbh` (MCP Supabase desta sessão só lista HF `owllm…` — **não** usado)  
**PR:** [#44](https://github.com/efe777-creator/FAL-PECAS-AUTOMOTIVAS/pull/44) · **MERGED** `e6d9af5`  

---

## 1. Auditoria PR #44 — “somente o fix do Brick?”

### Veredicto

| Critério | Resultado |
|----------|-----------|
| Título / intent | `fix(mp): stabilize Card Brick callbacks (anti-skeleton)` |
| Código runtime no PR | **SIM — 1 arquivo** `fal-pecas/src/components/payments/MercadoPagoCardBrickPanel.tsx` (+98/−31) |
| PR “só Brick”, zero docs? | **NÃO** — também altera 2 MDs de smoke/VAL |
| Commits no PR | **3** (2 docs anteriores no branch `dev` + 1 fix Brick) |

### Arquivos (GitHub `pulls/44/files`)

1. `MercadoPagoCardBrickPanel.tsx` — **fix Brick** (callbacks estáveis, `key` remount, botão Recarregar, `amount` numérico)  
2. `docs/planejamento/FAL_MARCHA_FIX_CHECKOUT_MP_POST_ORDER_UI_VAL_2026-11-04.md` — docs  
3. `docs/planejamento/FAL_MP_SMOKE_STATUS_2026-10-10.md` — docs  

**FATO:** não há mudança de Edge, webhook, CheckoutPage ou empty-guard neste PR (isso foi PR #43).  
**FATO:** o PR **não** é monorepo-wide; o risco de runtime é concentrado no painel Card Brick.

### Commits incluídos

| SHA | Mensagem |
|-----|----------|
| `7097c09` | docs(mp): reteste Pix UI PASS… |
| `b7b4afd` | docs(mp): Brick UI PASS + webhook sandbox URL… |
| `eeb9fa6` | fix(mp): stabilize Card Brick callbacks… |

Merge: `e6d9af5` — *Merge pull request #44…*

---

## 2. Build e testes (local `fal-pecas`)

| Check | Resultado |
|-------|-----------|
| `npm run build` | **PASS** (`tsc -b` + vite) |
| `npm test` (vitest) | **271 PASS / 1 FAIL** |

**FAIL (pré-existente / env, não introduzido pelo PR #44):**  
`gatewaySandboxPaymentProvider.test.ts` → `resolvePaymentProviderKey(undefined)` espera `simulated`, recebe `mercadopago` porque `import.meta.env.VITE_PAYMENT_PROVIDER` no ambiente local está `mercadopago`.  
**Não** é regressão do Card Brick; o PR #44 não toca `paymentService.ts`.

`checkoutEmptyGuard.test.ts` (3) — **PASS**.

---

## 3. Base git (sem perder locais)

| Item | Estado |
|------|--------|
| Branch local | `main` @ `e6d9af5` = `origin/main` |
| `origin/dev` | `eeb9fa6` (fix Brick; tip do branch do PR) |
| Working tree | **sem** modify tracked; só **untracked** (agent-tools, ARQUIVOS, etc.) |
| Ação | Nada a stash/merge — base já no merge do #44 |

---

## 4. Merge

**Já feito** em 2026-11-04T13:40:54Z. Nenhum re-merge necessário.

---

## 5. Deploy Netlify

| Item | Evidência |
|------|-----------|
| Published production | **main @ e6d9af5** — deploy `6aeb35e71ec7ec2b37b3dbea` · Today 10:40 AM |
| Deploy Preview #44 | `eeb9fa6` — ready (antes do publish) |
| Bundle index | `index-U4O7uEVS.js` (lazy; **não** contém strings do Brick) |
| Chunk checkout | `CheckoutPage-DVEeDL9Z.js` contém **`Montando campos seguros`** + **`Formulário não carregou`** → **fix Brick em PROD** |

**Nota:** “Last deployed from Netlify Drop” aparece no header do site; mesmo assim o deploy publicado do Git para `e6d9af5` está marcado **Published**.

---

## 6. Smoke MP — reteste Brick / approve / webhook

### Já documentado (sessão anterior + status)

| Check | Estado |
|-------|--------|
| FIND-SMOKE-UI-001 (empty cart) | **Corrigido** (PR #43) — Pix/Brick UI PASS em reteste |
| Brick skeleton eterno | **Fix em prod** (PR #44 — chunk acima) |
| Cartão teste MLB atual | `5480 8328 0103 3311` / `11/30` / `123` / titular `APRO` / CPF `12345678909` |
| BIN antigo `5031…` | **`bin_not_found`** (esperado) |
| Fill automático PAN/CVV | **BLOQUEADO** — iframe `secure-fields` + política anti-automação de cartão |
| Approve cartão / Pix | **NÃO OBSERVADO** nesta auditoria (sem pagamento aprovado humano) |
| `notifications_history` app `8320396999442614` | **No Notifications Found** |
| SQL payments no MCP | **Não executado** — projeto `wtbp…` **não** listado no MCP Supabase desta sessão (só `owllm…`) |

### Bloqueio deste turno para “smoke completo”

1. Sessão loja **deslogada** (`Entrar` no catálogo) — sem credencial smoke no chat.  
2. Approve exige **humano** no Brick (APRO + cartão MLB novo) ou Pix no app MP.  
3. Webhook só vira PASS com notificação real pós-approve.

---

## 7. Veredicto Smoke S2 comercial

| Dimensão | Veredicto |
|----------|-----------|
| Create Pix / place_order cartão | **PASS** (evidências anteriores) |
| UI pós-pedido Pix/Brick | **PASS** (pós #43/#44) |
| Approve + webhook | **NÃO PASS** — pendência humana |
| S2 comercial completo | **NÃO PASS** |

---

## 8. Próxima MARCHA (nomeada)

Ordem alinhada ao [planejamento α](./FAL_PLANEJAMENTO_PROXIMOS_PASSOS_ALPHA_2026-11-04.md):

1. **`MARCHA_SMOKE_MP_S2_APPROVE_WEBHOOK`** (auth eFe)  
   - Humano: checkout cartão com MLB `5480…` + APRO **ou** Pix approve no app teste  
   - Evidência: `payments.status=approved` + `notifications_history` ≠ vazio  
   - Confirmar `MP_WEBHOOK_SECRET` = painel MP (**sem** colar valor)

2. Em paralelo: **S1 — assinar D-FRETE B** (só eFe)

3. Depois: **S4 E2E pedido pago** → **S5 Gate α** → **S6 STOP α**

**Não reabrir:** S0; FIND-SMOKE-UI-001; skeleton Brick (salvo regressão nova).

---

## STOP

Auditoria PR #44 + build/test + deploy `e6d9af5` registrados.  
Approve/webhook **não** inventados. Smoke S2 comercial **ainda aberto** no approve.

**Assinatura agente:** AUDITORIA SMOKE MP PR44 2026-11-04.
