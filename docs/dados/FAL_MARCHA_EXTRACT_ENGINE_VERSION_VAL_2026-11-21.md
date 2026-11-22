# VAL — Extração de motor preso em `version_name`

**Data:** 2026-11-21  
**Branch:** `dev`  
**Projeto Supabase (loja FAL):** `wtbpwuiayednvlhvuhbh`  
**Migration:** `extract_engine_from_version_name` (aplicada no **wtbp**)

## Correção de alvo

A aplicação anterior no ref `owllmfcpbodqmoerdfxx` foi no projeto errado (não é a loja). Esta marcha reaplicou e validou no **wtbp**.

## Objetivo

Mover cilindrada evidenciada em `vehicle_versions.version_name` para `engine`, sem inventar motor e sem thin-seed. Fundir Cross Fox 2007 vazio com sibling `1.6`.

## Antes (wtbp)

| Métrica | Valor |
|--------|------:|
| VV active com engine | 70 |
| VV active sem engine | 260 |
| Engine em `version_name` e engine vazio | **17** |
| Colisões naturais previstas | 0 |
| Cross Fox 2007 | 1× null + 1× `1.6` (ambas active) |

## Depois (wtbp)

| Métrica | Valor |
|--------|------:|
| VV active com engine | **87** |
| VV active sem engine | **242** |
| Residual engine-em-version | **0** |
| Cross Fox 2007 | active só `1.6`; null → **inactive** |

Spot-check: A1 `1.4`/`TFSI`; Cronos `1.3`; Pulse `1.0`/`TURBO`; Fusion `3.0`/`V6`; Celta `1.0`.

## Não feito (proposital)

- **Corolla Cross:** casca verified 0 VV — sem thin-seed.
- **242 VV sem engine:** sem `\d.\d` em `version_name`; exige evidência externa.
- Sem MAIN / sem deploy.

## Gates

- [x] Só extrai `\d+\.\d+` ∈ [0.8, 7.0] com engine vazio  
- [x] Residual engine-em-version = 0 no wtbp  
- [x] Cross Fox 2007 fundido por evidência sibling  
- [x] Sem thin-seed Cross / Corolla Cross  
