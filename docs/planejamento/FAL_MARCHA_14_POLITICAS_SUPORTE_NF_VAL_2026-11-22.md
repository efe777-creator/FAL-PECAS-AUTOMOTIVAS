# VAL — #14 Políticas · Suporte · NF · Pedidos (2026-11-22)

**Branch:** `dev` · **Push/MAIN/deploy:** somente com OK eFe  
**Plano:** `termos_detalhados_fal_d0521c02.plan.md`

## Diagnóstico (M0)

| Gap | Antes | Depois |
|-----|-------|--------|
| 3 rotas legais rasas | `/termos` `/privacidade` `/trocas-devolucoes` | **8** políticas + `/suporte` |
| Sem Central | — | `/suporte` 3 seções |
| Aceite 3 docs | Checkout/Register | **4** (Uso + Comerciais + Privacidade + Trocas) |
| `place_order` sem versões | — | `orders.legal_acceptance` + wrapper |
| Label “Ajuda…” | Conta | **Problema com meu pedido** |
| NF pedido | Ausente | `FiscalDocumentService` + anexo manual + UI |
| Melhor Envio | OK (não MEI) | Preservado + `/frete-entrega` |

## Alterações principais

### Público / legal
- `src/lib/legalVersions.ts`, `legalCopy.ts`, `returnPolicyCopy.ts`
- `src/pages/Legal/LegalDocumentPage.tsx` (8 páginas)
- `src/pages/Support/SupportPage.tsx` + `src/services/support/supportChannel.ts`
- `router.tsx`, `Footer.tsx`, `sitemapXml.ts`, `robots.txt`, `CookieConsentBanner` → `/cookies`

### Compra
- Checkout + Register: 4 links de aceite
- `placeOrderService` + migration `20261122210000_orders_legal_acceptance.sql`
- `authService` metadata: commercial + returns

### NF
- Migration `20261122220000_order_fiscal_documents.sql` (tabela + bucket + RPC)
- `src/services/fiscal/*`
- Admin: `AdminOrderFiscalPanel` em `OrderOpsSurface`
- Cliente: `OrderFiscalBlock` no detalhe do pedido

### Conta
- Label Problema; bloco NF; links Central; painel pós-venda após pagamento/envio

## Migrations aplicadas (Supabase `wtbp` — 2026-11-22)

1. `orders_legal_acceptance` ✓  
2. `order_fiscal_documents` ✓ (tabela + bucket + RPC)  
3. `harden_sanitize_order_legal_acceptance` ✓  

Verificado via SQL: `legal_acceptance`, tabela OFD, RPCs e bucket presentes.

## Testes

- `legalVersions.test.ts`, `sitemapXml.test.ts`, `orderLifecycle.customerCta.test.ts`, `postSaleAntiregress.test.ts` — OK

## Pendências / fora desta marcha

- CNPJ/endereço pleno + parecer advogado/contador (go-live)
- Emissor NF automático + notify ao anexar (backlog)
- Inventário real de cookies/tags antes de #15 Ads
- Reordenar 100% dos blocos do detalhe (urgente no topo mantido; Problema/NF após pagamento/envio)
- Push `origin/dev` — **aguardar OK**

## Status

Implantado na `dev` + Supabase `wtbp`.  
**Commit:** `c0e011f` · **Push:** `origin/dev` ✓ · MAIN/produção: não.
