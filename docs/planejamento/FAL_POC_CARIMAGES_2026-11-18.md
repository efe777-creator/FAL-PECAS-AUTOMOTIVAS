# PoC CarImages — relatório (Fase 2)

**Data:** 2026-11-18  
**Branch:** `feature/consolida-3d-automotivo`  
**Escopo:** avaliação isolada — **não** plugado no Visualization Engine.

## Segurança

- Key compartilhada no chat anterior: **comprometida — não reutilizar**.
- PoC autenticado exige `CARIMAGES_API_KEY` (e opcional `CARIMAGES_API_SECRET`) **somente em env local**, nunca no git.
- Produção: secrets Supabase Edge `CARIMAGES_API_KEY` / `CARIMAGES_API_SECRET` + `VITE_FAL_CARIMAGES=1` no front (flag apenas).

## Como rodar

```bash
cd fal-pecas
# key NOVA do dashboard, domain lock quando Pro
set CARIMAGES_API_KEY=ci_NOVA
node scripts/poc-carimages.mjs > tmp/poc-carimages-report.json
```

## Execução local (2026-11-18)

Sem `CARIMAGES_API_KEY`: catálogo REST retorna **401** (“API key required”). PoC autenticado fica **pendente de key nova** do dashboard. Estrutura do script + adapter + Edge entregues.

## Achados da documentação (sem depender de key)

| Item | Evidência |
|------|-----------|
| Catálogo | `GET /api/v1/makes`, `.../models`, gerações no detalhe do modelo |
| GLB | `GET /api/v1/vehicles/{make}/{model}/{gen}/model` → `url` + `watermarked` + `fallback` |
| Placeholder 3D | Docs: retorna masked-placeholder se não há GLB real — **tratar `fallback=true` como indisponível** |
| Watermark | Free: malha; Pro Cars: limpo |
| Pintura | `color=` só em **2D**; **não** aplica ao GLB |
| Licença espelho | **Pendência formal** — docs cobrem exibição CDN; não autorizam redistribuição/storage FAL |
| Qualidade | GLB gerado a partir de imagem de catálogo — **não** classificar como fiel sem inspeção visual |

## Classificação FAL (confirmada)

**Recomendada com restrições — fonte complementar.**

- 2D stock: sim (via Edge FAL).
- Candidato 3D para ADM/review: sim, após PoC com key nova + inspeção.
- Viewer cliente → CarImages direto: **não**.
- Publicação automática no Engine: **não**.

## Adapter / Edge entregues nesta MARCHA

- [`fal-pecas/src/services/garage/adapters/carImagesAdapter.ts`](../../fal-pecas/src/services/garage/adapters/carImagesAdapter.ts)
- Edge [`fal-pecas/supabase/functions/carimages-image`](../../fal-pecas/supabase/functions/carimages-image) (deploy sob auth)
- Script PoC [`fal-pecas/scripts/poc-carimages.mjs`](../../fal-pecas/scripts/poc-carimages.mjs)

## Pendências de produto / fornecedor

1. Orçamento Pro Cars (sem watermark) para produção.
2. Contrato de armazenamento/modificação de GLB.
3. Relatório JSON do script com key nova preenchendo matriz Palio/Gol/Onix/HB20/SUV/facelift.
