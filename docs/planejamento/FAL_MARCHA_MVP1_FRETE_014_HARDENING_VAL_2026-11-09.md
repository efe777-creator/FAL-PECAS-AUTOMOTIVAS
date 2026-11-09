# VAL — MARCHA Pacote MVP-1 · Frete 014 hardening + fechamento código

**Data:** 2026-11-09  
**Auth:** eFe — `MARCHA` (fatia residual 014)  
**AJUSTE:** 014 (+ lembrete 017)  
**Plano:** [FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md](./FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md)  
**Deploy:** só no **fim do dia** (inclui Edges `quote-shipping` + `create-mp-payment`)

---

## Veredito

**Código do Pacote MVP-1: ENCERRADO** para o que depende do agente.  
Frete já estava pronto para homologação; esta fatia só fechou arestas baratas.  
**Produção plena = gates humanos** (checklist abaixo).

## Entregas desta fatia

| Item | Resultado |
|------|-----------|
| `meq:ephemeral` não selecionável (Edge + client) | PASS |
| `.env.example` alinhado a `meq:`/`ownq:`/`melhorenvio` | PASS |
| Erros ME comuns em PT no painel Expedição | PASS |
| Testes | PASS — 3 storefront + 3 meLastError |

## Arquivos

- `fal-pecas/supabase/functions/quote-shipping/index.ts`
- `fal-pecas/src/services/shipping/quoteStorefrontShipping.ts` (+ test)
- `fal-pecas/src/lib/melhorEnvioLabelState.ts` (+ errors test)
- `fal-pecas/src/components/admin/orders/MeExpeditionPanel.tsx`
- `fal-pecas/.env.example`

## Checklist humano (G3/G4 — não código)

1. Build: `VITE_SHIPPING_PROVIDER=melhorenvio` · `VITE_PAYMENT_PROVIDER=mercadopago` + chaves
2. Secrets Edge: ME + `MP_ACCESS_TOKEN` / webhook · redeploy `quote-shipping`, `melhorenvio-label`, `create-mp-payment`
3. Admin: origem/remetente, serviços ME habilitados, produtos com peso/medidas, `VITE_WHATSAPP_PHONE`
4. Smoke loja: cotar → `place_order` → Pix/cartão → webhook
5. Smoke admin: Expedição etiqueta → postagem; lista separação; margem no pedido
6. **Deploy único fim do dia** do acumulado de hoje

## Pacote MVP-1 — score final código

| # | Item | Código |
|---|------|--------|
| 1–5, 7–10 | Preço/Home/apps/MP/estoque/legal/030/033–034 | **VAL PASS** |
| 6 | Frete 014 | **Pronto p/ homolog** (+ hardening) |
| — | Smoke 017 / cutover | **Humano** |

**Assinatura:** VAL MVP-1 014 hardening PASS · Pacote MVP-1 código ENCERRADO · 2026-11-09.
