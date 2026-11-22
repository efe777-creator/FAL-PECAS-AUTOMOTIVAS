# VAL — Extração de motor preso em `version_name`

**Data:** 2026-11-21  
**Branch:** `dev`  
**Projeto Supabase:** `owllmfcpbodqmoerdfxx`  
**Migration:** `20261122160000_extract_engine_from_version_name` (aplicada no remoto)

## Objetivo

Mover cilindrada evidenciada em `vehicle_versions.version_name` para `engine`, sem inventar motor e sem thin-seed.

## Antes (remoto)

| Métrica | Valor |
|--------|------:|
| VV active com engine | 3 |
| VV active sem engine | 183 |
| Engine em `version_name` (regex `\d+\.\d+`) e engine vazio | 7 |
| Colisões naturais previstas | 0 |

Candidatos: Audi A1 `1.4 TFSI`; Celta `1.0`/`1.4`; Tigra `1.6 16V`; Strada `1.8 LOCKER`; Polo `1.6`/`2.0`.

## Depois

| Métrica | Valor |
|--------|------:|
| VV active com engine | **10** |
| VV active sem engine | 176 |
| Residual engine-em-version | **0** |

Resultado por linha:

| Maker | Model | Year | engine | version_name |
|-------|-------|-----:|--------|--------------|
| AUDI | A1 | 2010 | 1.4 | TFSI |
| CHEVROLET | CELTA | 2001 | 1.0 | null |
| CHEVROLET | CELTA | 2001 | 1.4 | null |
| CHEVROLET | TIGRA | 1997 | 1.6 | null |
| FIAT | STRADA | 2009 | 1.8 | LOCKER |
| Volkswagen | POLO | 2002 | 1.6 | null |
| Volkswagen | POLO | 2002 | 2.0 | null |

## Não feito (proposital)

- **CROSSFOX 2005:** `engine`/`version_name` null; sem sibling 1.6 no mesmo ano no remoto — não inventar.
- **176 VV sem engine:** sem dígito decimal em `version_name`; preencher exigiria evidência externa (OEM/placa), fora desta marcha.
- Migrations de qualidade/`year_key`/`upsert_vehicle_canonical` do histórico local **não** estão no `schema_migrations` remoto (último veicular aplicado antes desta: `models_production_years`). Esta marcha não reaplicou o backlog — só a extração evidenciada.

## Gates

- [x] Só extrai quando `\d+\.\d+` ∈ [0.8, 7.0] e engine vazio  
- [x] Residual engine-em-version = 0  
- [x] Sem thin-seed Cross Fox  
- [x] Sem deploy / sem MAIN  
