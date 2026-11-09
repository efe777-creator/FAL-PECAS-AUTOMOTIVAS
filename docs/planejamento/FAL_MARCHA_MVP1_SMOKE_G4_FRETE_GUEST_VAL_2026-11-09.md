# VAL — Smoke G4 frete guest + fix Edges

**Data:** 2026-11-09  
**Auth:** eFe — `MARCHA` (próximo após smoke UI)  
**Preview:** https://deploy-preview-249--fal-pecas-automotivas.netlify.app/

---

## Achado

Carrinho guest → **Consultar frete** falhava com `Edge Function returned a non-2xx` porque `quote-shipping` / `quote-own-delivery` exigiam `auth.getUser()` (login).

## Fix

- Cotação aceita JWT anon **sem** sessão de usuário
- `customer_id` na `shipping_quotes` só se houver user
- Ações staff (`me_admin_status`, `me_sync_catalog`) ainda exigem user + `is_staff`
- Redeploy: `quote-shipping` + `quote-own-delivery`

## Smoke pós-fix (preview)

| Item | Resultado |
|------|-----------|
| CEP 01310-100 + nº 100 | PASS |
| Opções ME (SEDEX, Jadlog) + Entrega FAL | PASS |
| Frete selecionável no total | PASS |

## Ainda pendente (G3 humano)

- Login → checkout → Pix/cartão + webhook
- place_order com `meq:` persistido
- Admin etiqueta

**Assinatura:** VAL G4 frete guest PASS · 2026-11-09.
