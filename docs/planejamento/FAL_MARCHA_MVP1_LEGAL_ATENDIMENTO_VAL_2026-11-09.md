# VAL — MARCHA Pacote MVP-1 · Legal / atendimento (027/032)

**Data:** 2026-11-09  
**Auth:** eFe — `MARCHA` (fatia G6 código)  
**AJUSTE:** 027 · 032  
**Plano:** [FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md](./FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md)  
**Deploy:** só no **fim do dia**

---

## Contexto

Rotas `/termos` e `/privacidade` + WhatsApp no rodapé/pedido já existiam. Gaps: sem banner de cookies, sem página de trocas, aceite só no cadastro (sem versão), checkout sem aceite.

## Entregas

| Item | Resultado |
|------|-----------|
| Banner cookies essenciais (`fal_cookie_notice_v1`) | PASS |
| Página `/trocas-devolucoes` + Footer + link no pedido | PASS |
| Versão legal nas páginas + metadata no `signUp` | PASS |
| Checkbox de aceite na revisão do checkout | PASS |
| Sitemap + robots | PASS |
| Testes | PASS — 2 cookieNotice + 3 sitemap |

## Arquivos

- `fal-pecas/src/lib/cookieNotice.ts` (+ test)
- `fal-pecas/src/lib/legalVersions.ts`
- `fal-pecas/src/components/legal/CookieConsentBanner.tsx`
- `fal-pecas/src/pages/Legal/LegalDocumentPage.tsx`
- `fal-pecas/src/components/layout/MainLayout.tsx` · `Footer.tsx`
- `fal-pecas/src/app/router.tsx`
- `fal-pecas/src/pages/Checkout/CheckoutPage.tsx`
- `fal-pecas/src/pages/Account/AccountOrderDetailPage.tsx`
- `fal-pecas/src/services/supabase/authService.ts`
- `fal-pecas/src/lib/sitemapXml.ts` (+ test) · `public/robots.txt`

## Gate humano (não fechado nesta fatia)

- Redação jurídica completa (termos/privacidade/trocas) por advogado
- Número WhatsApp oficial + horário/SLA (`VITE_WHATSAPP_PHONE`)
- Aceite versionado persistido em `place_order` / coluna dedicada (evolução)

## STOP / próximo

Próxima fatia MVP-1: **030** (guest checkout / fricção) ou **033/034** (margem/dashboard) ou smoke **017** com credenciais.

**Assinatura:** VAL MVP-1 legal/atendimento código PASS · 2026-11-09.
