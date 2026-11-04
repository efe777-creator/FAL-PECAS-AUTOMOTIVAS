# Smoke MP — execução checklist H1–H6

**Data:** 2026-10-14  
**Executor:** agente (H1–H6 check + MARCHA H4 redeploy; **sem** gravar secrets)  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Prep:** [FAL_MP_SMOKE_PREP_2026-10-09.md](./FAL_MP_SMOKE_PREP_2026-10-09.md)  
**Status prévio:** [FAL_MP_SMOKE_STATUS_2026-10-10.md](./FAL_MP_SMOKE_STATUS_2026-10-10.md)  
**Loja:** https://fal-pecas-automotivas.netlify.app  

**Regra:** evidências só por **presença/nome** de secrets e flags de build — **nenhum valor de secret** neste relatório.

---

## Resultado H1–H6

| # | Item | Status | Evidência (FATO) |
|---|------|--------|------------------|
| H1 | `MP_ACCESS_TOKEN` (test) no wtbp | **PASS** | Nome presente em `supabase secrets list` (atualizado 2026-10-10) |
| H2 | `MP_ENV=test` | **PASS** | Nome `MP_ENV` presente; digest SHA-256 do valor = hash canônico de `test` |
| H3 | `MP_WEBHOOK_SECRET` completo | **PASS** (humano 14:44Z) | Nome presente; `updated_at` 2026-10-14T17:44:03Z |
| H4 | Redeploy `mercado-pago-webhook` após H3 | **PASS** (MARCHA 14:45) | Deploy wtbp — **ACTIVE v4**, `verify_jwt=false` |
| H5 | Netlify / Vite `VITE_*` MP | **PASS** (local + prod) | Ver §H5 |
| H6 | Conta MP sandbox + usuário teste | **PARCIAL** | App **FALPecasSandbox** (AppID `8320396999442614`) listado via MCP MP. Usuário teste / saldo: **NÃO VERIFICADO** (não criado nesta execução) |

**Veredicto checklist:** **PASS operacional H1–H5** (H6 parcial). Pronto para **smoke Pix/cartão** (§3 do prep).

---

## Detalhe H5

### Local (`fal-pecas/.env.local`) — FATO
| Var | Estado |
|-----|--------|
| `VITE_SUPABASE_URL` | aponta wtbp |
| `VITE_SUPABASE_ANON_KEY` | set |
| `VITE_PAYMENT_PROVIDER` | `mercadopago` |
| `VITE_MP_PUBLIC_KEY` | set · prefixo `TEST-…` (sandbox) |

### Produção Netlify — FATO
| Check | Resultado |
|-------|-----------|
| Bundle principal | `assets/index-DYpbbWUS.js` |
| Chunk checkout | `assets/CheckoutPage-CyeY-LrB.js` |
| Provider build-time | `resolvePaymentProviderKey` / `isMercadoPagoCheckoutEnabled` com **default inlined `mercadopago`** |

→ UI de checkout em prod deve mostrar **«Pagamento — Mercado Pago»** (não “simulado”), desde que o visitante chegue ao step de pagamento.

Netlify MCP **não autenticado** nesta máquina — vars do painel Netlify **NÃO VERIFICADAS** via API; inferência só pelo bundle publicado.

---

## Edge functions (wtbp) — FATO

| Function | Status | Version | verify_jwt |
|----------|--------|---------|------------|
| `create-mp-payment` | ACTIVE | **7** | true |
| `mercado-pago-webhook` | ACTIVE | **4** (pós H4 2026-10-14) | **false** |

---

## Registro (template prep §4)

```text
Data: 2026-10-14
Executor: agente (check + MARCHA H4)
Ambiente: https://fal-pecas-automotivas.netlify.app / wtbpwuiayednvlhvuhbh
H1–H6: H1–H5 PASS · H6 PARCIAL
  H3 PASS (humano) · H4 PASS (redeploy v4, verify_jwt=false)
Pix: PENDENTE smoke §3
Cartão: PENDENTE
Webhook: TESTÁVEL (secret + v4)
FIND-015: N/A até smoke pago
Próximo: smoke Pix/cartão sandbox → evidências → MARCHA F9-F se gaps UX
```

---

## Ações restantes (ordem)

1. Confirmar URL no painel MP (modo teste):  
   `https://wtbpwuiayednvlhvuhbh.supabase.co/functions/v1/mercado-pago-webhook`  
   + evento **Pagamentos (legacy)**
2. **H6:** usuário teste sandbox (se ainda não tiver)
3. Smoke §3 prep — Pix + cartão + webhook approve
4. `MARCHA F9-F` só se UX/checkout ainda mentir simulação

---

## STOP

H3+H4 **OK**. Aguardar smoke comercial Pix/cartão (auth explícita `SMOKE MP` / execução humana).
