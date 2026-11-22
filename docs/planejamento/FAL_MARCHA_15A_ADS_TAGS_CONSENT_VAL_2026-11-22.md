# VAL — #15-A Ads tags + Consent Mode (sem domínio)

**Data:** 2026-11-22 · **Branch:** `dev` · **Bump docs:** cookies inventário  
**Spec base:** prep Ads 2026-11-16 · **Go-live domínio:** [checklist Hostinger #15-B](./FAL_CHECKLIST_HOSTINGER_DOMINIO_ADS_15B_2026-11-22.md)

## Escopo

| Item | Status |
|------|--------|
| `marketingTags.ts` — Consent Mode default denied | ✓ |
| Loader GTM (preferencial) / GA4 / Meta só com consent+IDs | ✓ |
| Sync no boot loja + mudança de consent | ✓ |
| Banner chama `syncMarketingTags` | ✓ |
| Inventário cookies em `/cookies` (legalCopy) | ✓ |
| `.env.example` atualizado (#15-A/#15-B) | ✓ |
| Checklist Hostinger #15-B (doc) | ✓ |
| Vitest marketingTags | ✓ |
| Sem MAIN / deploy prod / IDs reais obrigatórios | ✓ |

## Critérios

1. Sem `VITE_GTM_*` / GA / Meta → Network sem `gtm.js` / `fbevents` mesmo com “Aceitar analytics”.  
2. Com ID de teste + “Só essenciais” → Consent update denied; sem script marketing.  
3. Com ID + “Aceitar analytics” → script correspondente injetado (`data-fal-marketing`).  
4. Preferências no rodapé → limpa consent → sync denied.

## Explicitamente NÃO feito (#15-B)

Domínio Hostinger · verificação Merchant · IDs produção · campanhas · MAIN

## Código

- `fal-pecas/src/lib/marketingTags.ts`  
- `fal-pecas/src/components/analytics/StorefrontAnalytics.tsx`  
- `fal-pecas/src/components/legal/CookieConsentBanner.tsx`  
- `fal-pecas/src/lib/cookieNotice.ts` (`COOKIE_CONSENT_CHANGED_EVENT`)
