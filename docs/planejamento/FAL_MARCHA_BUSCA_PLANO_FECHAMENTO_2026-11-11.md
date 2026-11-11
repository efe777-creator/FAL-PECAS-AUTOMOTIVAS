# Fechamento — Plano Busca Inteligente (P0 + P2 IA)

**Data:** 2026-11-11  
**Auth:** eFe — testes no site + validação finalização  
**Prod:** https://fal-pecas-automotivas-efe.netlify.app · tip `cff94c6` · deploy `6af4a286`  
**Preview:** **não necessário** — prod passou a matriz; economiza crédito Netlify

## Critérios P0 (spec §7)

| Critério | Evidência site/RPC | Status |
|----------|-------------------|--------|
| `HB20 2015` = seletor PVC | URL → maker/model/year · **3** BRD2109,TDI2116,TDI2117 · label `12/...` | **PASS** |
| `HB20 1.0 2015` não “só 1.6” | `terminal`+engine 1.0 → **2** TDI (sem axial misturado indevido no q) | **PASS** |
| `HB20` reconhece veículo | RPC/site 3 SKUs | **PASS** |
| Código `TDI2116` | 1 produto TDI2116 | **PASS** |
| IA não obrigatória | Determinístico + flag; fallback se Groq down | **PASS** |
| Compat só PVC | RPC `search_products` | **PASS** |

## P2 IA / placa (entregue além do P0)

| Item | Status |
|------|--------|
| Groq Edge `interpret-search-nl` | PASS |
| `VITE_SEARCH_NL_LLM=1` | PASS |
| Stopwords NL (`pivo` limpo) | PASS · PVI1032 |
| Versão fora do cadastro (One) | PASS · sem `version=One` |
| API placa apiplacas | PASS · FRW0E37 HB20 |

## Vitest

**29/29** (search + vehicleAppYear)

## Fora do plano (próximos)

- Autocomplete seccionado (P1)
- Relabel UX `12/...` vs `2012–atual` (decisão copy)
- Index maker/model em `search_document`

## Deploy / créditos

- **Novo prod deploy:** não (matriz OK no tip atual)
- **Preview:** só se eFe pedir smoke isolado sem gastar prod

## Assinatura

**Plano Busca Inteligente P0 + IA P2 — FINALIZADO em prod** · 2026-11-11
