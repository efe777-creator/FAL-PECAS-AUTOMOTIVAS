# MARCHA VAL — Prep estrutural Ads + Agentes

**Data:** 2026-11-16/17  
**Auth:** eFe — `marcha`  
**Spec:** [2026-11-16-prep-ads-agentes-design.md](../superpowers/specs/2026-11-16-prep-ads-agentes-design.md)  
**Plano:** [2026-11-16-prep-ads-agentes.md](../superpowers/plans/2026-11-16-prep-ads-agentes.md)  
**Contratos futuro:** [FAL_AGENT_CONTRACTS_PREP.md](../futuro/FAL_AGENT_CONTRACTS_PREP.md)  
**Cruzamento:** PRD 4.0 §1.4 / §3 / §6.6 · Roadmap Fases 6 e 10 · Intelligence §6

## Resultado geral: **PASS** (código + SQL) · **STOP** deploy Netlify

Prep estrutural entregue e SQL aplicado no projeto Supabase `wtbpwuiayednvlhvuhbh`. Sem pixels live, sem bot (escopo travado).

| Gate | Status | Evidência |
|------|--------|-----------|
| Consent v2 + banner | **PASS** | `cookieNotice.ts` + `CookieConsentBanner` (Só essenciais / Aceitar analytics); v1→v2 marketing=false |
| Privacidade | **PASS** | `LEGAL_VERSIONS.privacy=2026-11-16`; copy admite ads com consent |
| Facade analytics + hooks | **PASS** | `analytics.ts` no-op sem consent+IDs; hooks PDP/card/checkout/confirmação + `StorefrontAnalytics` |
| Atribuição no pedido | **PASS** | `attribution.ts` + `placeOrderService` + coluna `orders.attribution` |
| Migration remota | **PASS** | `orders_attribution_prep_ads` aplicada; wrapper `place_order` → `place_order_core_hybrid` |
| Grants core | **PASS** | `place_order_core_hybrid` **sem** EXECUTE para anon/authenticated/service_role; wrapper: authenticated+service_role |
| Sanitize | **PASS** | SQL: `evil` dropado; `utm_source`/`gclid` mantidos |
| Env placeholders | **PASS** | `.env.example` GTM/GA/Meta — sem carregar scripts |
| OG helper | **PASS** | `openGraph.ts` / `useOpenGraph` Home+PDP |
| Doc agentes + adiados | **PASS** | `FAL_AGENT_CONTRACTS_PREP.md` |
| Unit / audit | **PASS** | vitest 12/12 (cookie/attribution/analytics/migration audit) |
| oxlint prep | **PASS** | exit 0 nos arquivos da prep |
| Deploy Netlify (front) | **STOP** | deployId `6afbb825…` → `Skipped due to account credit usage exceeded` |

## Correções na MARCHA (antes do VAL)

1. Rename quebrava: identity args era `p_payload jsonb` ≠ `jsonb` → `to_regprocedure`.  
2. Revoke explícito no core após RENAME (grants seguem OID).  
3. Guards `localStorage` / `sessionStorage` / `document` (vitest node).

## Explicitamente NÃO feito (OK)

GTM/Pixel/CAPI live · campanhas · N3 WA · bot/Agent SDK · BI/série · Painel híbrido.

## Smoke manual sugerido (eFe)

1. Loja: banner com 2 botões; “Só essenciais” → some; F5 não reaparece.  
2. `/privacidade` — versão 2026-11-16 e menção a analytics/ads com consent.  
3. Abrir `/?utm_source=teste&gclid=GTEST` → sessionStorage `fal_attribution_v1`.  
4. Checkout+pedido (homolog): `orders.attribution` preenchido no novo pedido.  
5. Sem `VITE_GTM_*` / Meta: Network sem scripts de marketing mesmo com “Aceitar analytics”.

## Próximo

- eFe: liberar créditos Netlify (ou outro caminho de publish) e republicar o front.  
- Smoke local (`npm run dev`) cobre banner/privacidade/atribuição até o deploy voltar.  
- Fase 6: IDs reais + carregar GTM/Pixel atrás do consent.  
- Fase 10 / N3: seguir docs futuro — não abrir bot agora.
