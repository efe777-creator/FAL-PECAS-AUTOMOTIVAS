# VAL — Busca por placa Evolução 1 (PoC mock)

**Data:** 2026-11-10  
**Spec:** [FAL_SPEC_BUSCA_POR_PLACA_2026-11-09.md](./FAL_SPEC_BUSCA_POR_PLACA_2026-11-09.md)

## Automatizado (Vitest)

| Área | Cobertura |
|------|-----------|
| Placas antiga/Mercosul | `plateNormalize.test.ts` |
| Fixtures 2 clusters (VW Gol / GM Onix) | `mockPlateFixtures.test.ts` |
| Incomplete / ambíguo / fora catálogo / down | idem |
| Mapper scaffold apiplacas | `apiPlacasMapper.test.ts` |

## Manual (checklist)

- [ ] Home: campanha → placa → destaques
- [ ] Catálogo: bloco de placa; filtros só após confirmar
- [ ] Fixture `ABC1D23` → confirmação VW Gol → catálogo
- [ ] Fixture `ABC1234` → Chevrolet Onix
- [ ] `NOT0F00` / `DWN0T00` → seleção manual imediata + “Tentar outra placa”
- [ ] `AMB1G00` → candidatos + correção
- [ ] `INC0M00` → sem inventar motor
- [ ] Pergunta garagem; recusar continua; aceitar sem login → login com `from` preservado
- [ ] Mobile: campo placa e confirmação usáveis
- [ ] Banner mock visível na confirmação
- [ ] `PLATE_PROVIDER=mock` na Edge; apiplacas desligado

## Placas de teste mock

| Placa | Esperado |
|-------|----------|
| ABC1D23 | Cluster A found |
| XYZ1A23 | Cluster B found |
| ABC1234 | Cluster B found (antiga) |
| NOT0F00 | not_found → manual |
| INC0M00 | incomplete |
| AMB1G00 | ambiguous |
| OUT0F00 | not_in_catalog |
| DWN0T00 | unavailable |
