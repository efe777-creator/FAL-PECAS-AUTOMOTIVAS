# FAL — G3 CarImages (stock visual 2D)

**Data:** 2026-11-20  
**Branch destino:** `dev`  
**Status:** código na `dev` · **SEM deploy** até auth + key rotacionada + plano adequado  
**2B Camada 2 / XR:** fora de escopo (permanece STOP C0–C5)

---

## Veredito

CarImages preenche o buraco de `vehicle_stock_images` (0 linhas) no resolver R4:

`personal → stock local → CarImages (family) → placeholder FAL`

É **hero/cards 2D ilustrativos**. Não substitui GLB/`vehicle_visual_assets`.

---

## Segurança

| Regra | Estado |
|-------|--------|
| Key `ci_…` antiga do chat | **Comprometida — rotacionar no dashboard CarImages** |
| Key no Vite / HTML / `data-api-key` | **Proibido** |
| Server-only | `CARIMAGES_API_KEY` (+ opcional `CARIMAGES_API_SECRET`) via `Netlify.env.get` |
| Flag cliente | `VITE_FAL_CARIMAGES=1` (só liga o pedido à Function) |
| Domain lock | Dashboard CarImages quando Pro/prod |

Ops (eFe): gerar key nova → Netlify Site env (context Dev) → **não** commitar.

---

## Integração

| Peça | Path |
|------|------|
| Netlify Function | `fal-pecas/netlify/functions/carimages-signed-url.ts` → `/api/carimages-signed-url` |
| Query builder | `carImagesSignedUrl.ts` |
| Adapter | `carImagesAdapter.ts` (Netlify primeiro; Edge Supabase fallback) |
| Resolver R4 | `vehicleImageResolver.ts` · `source: 'carimages'` · level **`family`** |
| UI | `VehicleImageFrame` — disclaimer “Não é foto do seu carro” |
| Smoke BR | `pnpm exec node scripts/smoke-carimages-g3.mjs` |

Label canônica: **Imagem ilustrativa da família/estúdio**.

---

## Smoke / cobertura

Casos: Fiat Palio 2015 · VW Gol · Chevrolet Onix · HB20.

```bash
cd fal-pecas
set CARIMAGES_API_KEY=ci_NOVA_ROTACIONADA
node scripts/smoke-carimages-g3.mjs
# → tmp/smoke-carimages-g3.json
```

Sem key: `PENDING_KEY`. Miss crítico BR → manter placeholder; opcional curar `vehicle_stock_images`.

Free = watermark OK só em smoke/`dev`. Produção FAL: plano pago + auth de deploy.

---

## Checklist consolidação

- [x] Function signed-url + builder unitário  
- [x] Resolver ordem personal → stock → carimages → placeholder  
- [x] Flag + env docs (`.env.example`)  
- [x] Label family / ilustrativa  
- [ ] Key rotacionada no dashboard (humano)  
- [ ] `CARIMAGES_API_KEY` no Netlify Dev (humano)  
- [ ] Smoke JSON com key nova  
- [ ] Deploy / `main` — **bloqueado** sem auth explícita  

---

## VAL relacionado

Ver [FAL_MARCHA_G3_CARIMAGES_VAL_2026-11-20.md](./FAL_MARCHA_G3_CARIMAGES_VAL_2026-11-20.md).
