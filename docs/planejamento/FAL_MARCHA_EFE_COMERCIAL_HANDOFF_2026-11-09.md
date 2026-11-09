# Handoff — Espelho eFe como loja de teste comercial

**Data:** 2026-11-09 · ~15h05  
**URL:** https://fal-pecas-automotivas-efe.netlify.app  
**Deploy:** `6af20af88329cdbba9ef62fd` ready · Edges MP/ME redeployed (wtbp)  
**Commit:** `07dbb76` (motor pagamentos + admin + ME env-driven)

---

## O que já está no eFe

| Item | Status |
|------|--------|
| Build publicado | PASS |
| `VITE_SUPABASE_*` | Configurado (você) |
| `VITE_PAYMENT_PROVIDER=mercadopago` | Configurado |
| `VITE_MP_PUBLIC_KEY` | **TEST-…** (homolog) — colocado para o Brick/Pix funcionar |
| `VITE_SHIPPING_PROVIDER=melhorenvio` | Configurado |
| `VITE_SHIPPING_ME_ENV` | `sandbox` (até token ME produção) |
| Admin Pagamentos | `/admin/pagamentos` · Métodos → Mercado Pago |
| Edges | `create-mp-payment`, `quote-shipping`, `melhorenvio-label` |

---

## Para “comprar de verdade” + frete contratável

Hoje ainda é **homolog MP (TEST)** + **ME sandbox** (default Edge). Dinheiro/etiqueta reais exigem:

### Netlify eFe (build)

1. Trocar `VITE_MP_PUBLIC_KEY` → `APP-…` (produção)  
2. `VITE_SHIPPING_ME_ENV=production`  
3. Redeploy eFe

### Supabase secrets (wtbp Edge)

1. `MP_ACCESS_TOKEN` = `APP_USR…` produção (casar com Public Key)  
2. `MP_ENV=production`  
3. `MP_WEBHOOK_SECRET` do app prod + URL webhook no painel MP  
4. `MELHOR_ENVIO_TOKEN` produção  
5. `MELHOR_ENVIO_API_BASE=https://melhorenvio.com.br`  
6. Redeploy Edges

Webhook:

```
https://wtbpwuiayednvlhvuhbh.supabase.co/functions/v1/mercado-pago-webhook
```

---

## Fluxo de teste comercial (quando vars prod estiverem)

1. Catálogo → carrinho → cotar frete CEP real → checkout  
2. Pix ou cartão → webhook approve  
3. Admin Expedição → preparar/comprar etiqueta ME (produção cobra saldo ME)

Até lá: smoke com TEST/sandbox no mesmo URL eFe.

**Assinatura:** eFe espelho comercial prep · 2026-11-09.
