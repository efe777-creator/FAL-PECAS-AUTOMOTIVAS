# INV — Baseline e auditoria (2026-11-13)

**Projeto:** wtbp

## Mestre

| Item | Valor |
|------|-------|
| Fiat Argo | 8 VV (2017) |
| Chevrolet Prisma | 4 VV |
| Modelos compostos (`10MT`/`Joye`/…) | **0** |
| Maker `CHEV` | ainda existe (órfão após limpezas) |

### Argo VV (antes higiene)

| version_name | engine | year |
|--------------|--------|------|
| null | null | 2017 |
| DRIVE / HGT / PRECISION / TREKKING | null | 2017 |
| MOTOR 1.0 / 1.3 / 1.8 | null | 2017 |

`MOTOR *` como versão = sujeira (deveria ser engine). PVC ligado a esses VV: **3**.

## Operação 7d

| Métrica | Valor |
|---------|-------|
| `search_zero_results` com YMM | **33** |
| `cached_plates` status found | **20** |

## Decisão higiene

- Title-case versões Argo comerciais.
- `MOTOR 1.x` → `engine=1.x`, `version_name=null` (merge se chave natural colidir; remapeia PVC).
- Não apagar maker CHEV nesta onda (sem modelos ativos).
