# Design — Prep estrutural Ads + Agentes

**Data:** 2026-11-16 · **Status:** autorizado (implementação)  
**Plano:** preparação estrutural — sem pixels live, sem bot  
**Cruzamento:** PRD 4.0 §1.4 / §3 / §5 / §6.6 · Roadmap Mestre Fases 6 e 10 · Intelligence §6 · Spec WA N3 (futuro)

## Objetivo

Evitar retrabalho estrutural quando a FAL ligar Google Ads / Meta Ads (Fase 6) e agentes assistidos (Fase 10).

## FAZER (este ciclo)

| Contrato | Detalhe |
|----------|---------|
| Consent v2 | Essencial sempre; marketing explícito (`fal_cookie_consent_v2`). v1 migra para marketing=false |
| Privacidade | Copy admite analytics/ads **quando** marketing ativo + IDs configurados |
| Facade `analytics` | `track(event, payload)` no-op sem consent marketing **ou** sem IDs env |
| Eventos | `page_view`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase` |
| Atribuição | Captura UTM/`gclid`/`fbclid` → storage → `orders.attribution` via `place_order` |
| Env placeholders | `VITE_GTM_ID`, `VITE_GA_MEASUREMENT_ID`, `VITE_META_PIXEL_ID` (sem carregar scripts) |
| OG helper | `og:title`, `og:description`, `og:image`, `og:url` na Home/PDP |
| Doc agentes | Tools = contratos existentes; gates; sem segundo CRM |

## NÃO FAZER (adiado)

GTM/Pixel/CAPI live · campanhas · landings Ads · N3 WA worker · bot/Agent SDK · AI Gateway produto · BI/série temporal · Painel híbrido · inbox omnichannel · fees/CMV histórico.

## VAL

- Sem ID + consent marketing → nenhum script de marketing carrega.
- `place_order` grava `attribution` tipado quando presente.
- Facade coberta por testes unitários (no-op).
- Banner não afirma mais “não usamos cookies de marketing”.
