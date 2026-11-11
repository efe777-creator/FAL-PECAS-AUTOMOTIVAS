# VAL — Teste e validação do plano (matriz T01–T16)

**Data:** 2026-11-11  
**Auth:** eFe — revisão nomes (Intens→Intense) + revalidação  
**Projeto Edge/SQL:** `wtbpwuiayednvlhvuhbh`

## Vitest (esta rodada)

**55 PASS** — `src/services/search` + `src/services/plates` (incl. Intense alias, reconcile Intens→Intense).

## SQL / RPC

| # | Caso | Resultado |
|---|------|-----------|
| T02 | HB20 2015 | **PASS** BRD2109, TDI2116, TDI2117 |
| T03 | HB20 2015 + engine 1.0 | **PASS** 3 SKUs |
| — | HB20 2019 / 1.0 / Unique | **PASS** BRD2109, TDI2116, TDI2117 |
| — | Kwid 2017 / 1.0 / Intense | **PASS** TDI0653 (wildcard version null no PVC) |
| — | Cross Fox 2007 / 1.6 | **PASS** BRD5115 |
| — | terminal + HB20 2015 | **PASS** TDI2116, TDI2117 |
| — | código TDI2117 | **PASS** |
| — | Clio (qualquer filtro) | **PASS empty** — PVC Clio = 0 (cadastro, não parser) |
| — | Ka 1999 | **PASS empty** — PVC Ka só 2008+; reconhecimento da placa OK |
| — | Ka sem ano | **PASS** 6 SKUs (2008/2014) |

## Placa — cache frio = quente (obrigatório)

Cache apagado antes do smoke; 1ª consulta = API; 2ª = re-canonicalização do cache. Campos frio ≡ quente.

| Placa | Cold (maker/model/year/engine/version) | cold=warm |
|-------|----------------------------------------|-----------|
| BBL2429 | Renault / **Kwid** / 2017 / 1.0 / **Intense** | **PASS** |
| FRW0E37 | Hyundai / HB20 / 2019 / 1.0 / Unique | **PASS** |
| AYX5145 | Renault / Clio / 2014 / 1.0 / Expression | **PASS** |
| INT8C36 | Volkswagen / Cross Fox / 2007 / 1.6 / — | **PASS** |
| CRH6444 | Ford / Ka / 1999 / 1.0 / — | **PASS** |
| QWE1A23 | Yamaha / XTZ150 Crosser S / 2020 / — / — | **PASS** (sem motor 0.1) |

`PLATE_FAILS=0` · modelos fantasmas (`%Intens%` / `%10MT%` / `%EXP%` no nome) = 0.

### Correções já em produção (reconhecimento)

- Parser `10MT`/`16AT` + trim; `sanitizeEngine` rejeita &lt; 0.8 L.
- Alias comercial: API `INTENS` → **Intense** (não “Intens”).
- DENATRAN `CLIO EXP1016VH` → Clio / 1.0 / Expression.
- Edge `plate-lookup` sempre re-canonicaliza cache identificável.
- VV canônico: Kwid Intense, HB20 Unique, Clio Expression, Ka 1999, Cross Fox.
- Reconcile do filtro: prefixo `Intens` → option `Intense` do cadastro.

## Site / texto (baseline + T05)

| # | Caso | Resultado |
|---|------|-----------|
| T02 | `HB20 2015` | **PASS** (RPC + unit) |
| T05 | `HB20 One` | **PASS** unit (sem poluir version) |
| T16 | IA off | **PASS** |

## Pendente (não bloqueia)

- UI clarificação de versão no catálogo
- Admin `search_zero_results`
- LLM off
- Import PVC Clio / Ka anos antigos (dados mestres)

## Assinatura

Revisão nomes · INTENS→Intense · frio=quente BBL Intense · 55 vitest · Edge redeploy · 2026-11-11
