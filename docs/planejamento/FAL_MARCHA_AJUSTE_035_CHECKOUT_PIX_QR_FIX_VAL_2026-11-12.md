# VAL — AJUSTE-035 | QR Pix não gerava

**Data:** 2026-11-12 · **Auth:** eFe

## Causa raiz (2 camadas)

1. `assert_shipping_quote_fingerprint` **não existia** no remoto (migration 183000 não aplicada; `place_order` 190000 já chamava).
2. Após aplicar: fingerprint SQL usava `0.350:12.00…` vs Edge `0.35:12…` → `Cotação Melhor Envio incompatível`.

## Fix remoto

- Helpers fingerprint (183000 trecho) aplicados.
- Hotfix `20261112193500_fix_me_fingerprint_js_number_format.sql` (`js_number_text` + `build_me_request_fingerprint`).

## Prova

| Check | Resultado |
|-------|-----------|
| place_order + create-mp-payment | **PASS** |
| UI Pix | código `0002012658…` · valor **R$ 78,30** · TTL ~29 min · pedido `77e31dc4…` |

**Assinatura:** MARCHA fix QR Pix · 2026-11-12.
