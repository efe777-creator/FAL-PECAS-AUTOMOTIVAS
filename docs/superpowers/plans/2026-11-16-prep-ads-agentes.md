# Plano tático — Prep Ads + Agentes (implementado)

**Spec:** [2026-11-16-prep-ads-agentes-design.md](../specs/2026-11-16-prep-ads-agentes-design.md)  
**Doc agentes / adiados:** [FAL_AGENT_CONTRACTS_PREP.md](../../futuro/FAL_AGENT_CONTRACTS_PREP.md)

## Entregas

1. Consent v2 + banner + privacidade  
2. `attribution.ts` + migration `orders.attribution` + wrapper `place_order`  
3. `analytics.ts` facade + hooks funil + `StorefrontAnalytics`  
4. OG helper Home/PDP  
5. Env placeholders Ads  
6. Doc contratos agente + matriz NÃO FAZER  

## VAL

```bash
cd fal-pecas
npx vitest run src/lib/cookieNotice.test.ts src/lib/attribution.test.ts src/lib/analytics.test.ts
```

Pixels **não** carregam sem ID + consent. GTM live / bot / N3 / BI = fora deste plano.
