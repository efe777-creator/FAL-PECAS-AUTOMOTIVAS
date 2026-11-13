# VAL — MARCHA smoke placa (modelo/versão) · preview

**Data:** 2026-11-13  
**Auth:** eFe — `MARCHA`  
**Preview:** https://placa-modelo--fal-pecas-automotivas-efe.netlify.app  
**Edge:** `plate-lookup` wtbp (deploy sessão)

## Smoke FRW0E37

| Passo | Evidência | Resultado |
|-------|-----------|-----------|
| Consulta placa | Confirmação Hyundai · **HB20** · 2019 · **1.0** · **Unique** | **PASS** |
| Fuel informativo | “Alcool / Gasolina … não entra no filtro” | **PASS** |
| Campos separados | selects Modelo/Versão/Motor/Ano (sem composto) | **PASS** |
| Catálogo PVC | URL `maker=Hyundai&model=HB20&year=2019&engine=1.0&version=Unique` · **3 produtos** BRD2109, TDI2116, TDI2117 | **PASS** |

## Estado git / deploy

| Item | Status |
|------|--------|
| Código placa (reconcile/split/UX) | **working tree** — sem commit |
| Preview Netlify | **live** `placa-modelo` |
| Prod Netlify | **não** (aguarda aval `--prod`) |
| Push origin | **não** (aguarda aval) |

## Próximo MARCHA (fora placa — precisa aval)

1. Commit + push + `--prod` desta onda placa (se eFe autorizar).
2. Remap categorias DIREÇÃO → folhas (dados P0 em `FAL_AJUSTES_PRECISAO_BUSCA_PLACAS_CATEGORIAS_V1.md`).

## Assinatura

Smoke preview placa OK · 3 SKUs PVC · 2026-11-13
