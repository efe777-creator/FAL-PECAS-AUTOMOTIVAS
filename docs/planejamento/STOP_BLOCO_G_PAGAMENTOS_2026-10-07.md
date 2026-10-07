# STOP / checklist — Bloco G (pagamentos F9)

## Já no main

- create-mp-payment, Pix UI, Card Brick, webhook harden, verify_jwt=false

## Humano / smoke

1. `MP_WEBHOOK_SECRET` completo no projeto Supabase  
2. Redeploy `mercado-pago-webhook`  
3. Smoke Pix + cartão sandbox  
4. Env Netlify: `VITE_SUPABASE_*` (+ `VITE_PAYMENT_PROVIDER=mercadopago`, `VITE_MP_PUBLIC_KEY`)  
5. Opcional: `VITE_WHATSAPP_PHONE` (só dígitos com DDI)

## Polish restante

Checkout UX pós-pago · estados reais · retirar simulação quando MP ativo
