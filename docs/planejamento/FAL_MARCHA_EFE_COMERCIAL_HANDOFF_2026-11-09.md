# Handoff — Espelho eFe como loja de teste comercial

**Data:** 2026-11-09 · atualizado ~15h55  
**URL:** https://fal-pecas-automotivas-efe.netlify.app  
**Projeto Supabase:** `wtbpwuiayednvlhvuhbh`  
**Commit código motor:** `07dbb76` (+ docs/testes posteriores)

---

## O que já está no eFe (verificado)

| Item | Status |
|------|--------|
| Build publicado | PASS (deploys upload; último ready ~18:42Z) |
| `VITE_SUPABASE_*` | Configurado |
| `VITE_PAYMENT_PROVIDER=mercadopago` | Configurado |
| `VITE_MP_PUBLIC_KEY` | `APP_USR-…` produção (UUID ~44 chars — Public Key prod) |
| `VITE_MP_ENV` | `production` |
| `VITE_SHIPPING_PROVIDER=melhorenvio` | Configurado |
| `VITE_SHIPPING_ME_ENV` | `production` |
| Edge `MP_ACCESS_TOKEN` / `MP_ENV=production` | Presentes |
| Edge `MELHOR_ENVIO_TOKEN` + `MELHOR_ENVIO_API_BASE` prod | Presentes |
| Cotação frete | **live** (SEDEX/Jadlog + FAL) |
| Pix create produção | **PASS** — pedido `4a1e1249-34c8-45e8-b1b4-6b56b8912206` · R$ 63,35 |
| Admin Pagamentos | `/admin/pagamentos` · Métodos → Mercado Pago |

VAL: `FAL_MARCHA_VERIFICACAO_COMERCIAL_EFE_VAL_2026-11-09.md`

---

## Ainda pendente (humano / ops)

1. **Pagar** o Pix de verificação e confirmar webhook → `approved`  
2. Smoke **cartão** Brick (aprovado/recusado)  
3. Admin staff: hub pagamentos / status MP  
4. Expedição: etiqueta ME produção (cobra saldo ME)  
5. Webhook URL no painel MP (se ainda não):  
   `https://wtbpwuiayednvlhvuhbh.supabase.co/functions/v1/mercado-pago-webhook`  
6. Fernando prod: bloqueado por crédito Netlify

---

## Fluxo de teste comercial

1. Catálogo → carrinho → cotar frete CEP real → checkout  
2. Pix ou cartão → webhook approve  
3. Admin Expedição → preparar/comprar etiqueta ME

**Assinatura:** eFe comercial operacional (create Pix + frete live) · webhook approve ainda humano · 2026-11-09.
