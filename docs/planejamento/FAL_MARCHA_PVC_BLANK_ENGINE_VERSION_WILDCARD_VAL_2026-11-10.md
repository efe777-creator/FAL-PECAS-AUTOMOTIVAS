# VAL — Motor/versão em branco = coringa na busca

**Data:** 2026-11-10  
**Auth:** eFe — bug HB20 Unique  
**Ambiente:** wtbp (SQL aplicado)

## Causa

PVC do HB20 estava em `vehicle_versions` com `engine`/`version_name` **vazios**.  
`search_products` exigia `vv.version_name = 'Unique'` → **0 resultados**, apesar do cadastro “serve para todas”.

## Correção

Migration `20261110160000_search_products_blank_engine_version_wildcard.sql`:

- motor/versão **vazios** na VV = coringa
- se preenchidos = match case-insensitive
- espelho em `filterProductIdsByVehicle` (TS)

## Smoke pós-fix (wtbp)

| Filtro | Antes | Depois |
|--------|-------|--------|
| Hyundai HB20 | 3 | 3 (BRD2109, TDI2116, TDI2117) |
| HB20 + Unique | **0** | **3** |
| HB20 2019 Unique | **0** | **3** |
| HB20 Unique + 1.0 | — | **3** |
| Gol + G5 + 2020 | 7 | 7 (regressão OK) |
| Gol + versão inexistente | 0 | **0** |

## Regra oficial (global — qualquer veículo)

| Cadastro na config (VV) | Comportamento na busca |
|-------------------------|------------------------|
| Motor **em branco** | Serve para **todos** os motores daquele maker/model no período |
| Versão **em branco** | Serve para **todas** as versões (Unique, G5, Trendline…) |
| Motor **preenchido** (ex. 1.0) | Só aquele motor |
| Versão **preenchida** (ex. Unique) | Só aquela versão |

HB20 foi só o exemplo; a RPC `search_products` aplica a mesma dinâmica em **todo** o catálogo (já no wtbp).
