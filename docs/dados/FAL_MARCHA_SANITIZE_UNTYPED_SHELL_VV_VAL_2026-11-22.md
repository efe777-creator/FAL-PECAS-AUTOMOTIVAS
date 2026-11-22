# VAL — Sanitize rejeita VV casca sem tipagem

**Branch:** `dev` · **Projeto:** wtbp · **Sem MAIN**

## Achado

Client/edge já evitam anexar VV sem ano/motor/versão. O RPC `sanitize_garage_vehicle_fks` ainda aceitava esses `version_id` (pai verified+active) — buraco se alguém gravasse direto.

## Correção

Migration `20261122240000`: sanitize exige ano **ou** motor **ou** `version_name` na VV. Casca Idea/Palio/Siena → `o_version_id` null (modelo permanece). PVC intacto.

## Pós

- Palio casca: `version_cleared` = true · tipada: `version_kept` = true
- Vitest antiregress + g1: **21/21**
