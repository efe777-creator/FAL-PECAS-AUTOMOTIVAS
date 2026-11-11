# VAL — P1 EMB + EVT + PRT-DOC

**Data:** 2026-11-11  
**Projeto:** `wtbpwuiayednvlhvuhbh`  
**SQL:** `20261111193000_cp_emb_evt_packing_occurrences.sql`

## CP-EMB-01

| Caso | Resultado |
|------|-----------|
| RPC `admin_set_order_packing` | **Aplicada** |
| Persistência `shipments.metadata.packing` (neutro) | **OK** |
| UI `OrderPackingPanel` no detalhe | **OK** |
| Unit parse/payload | **PASS** |
| Não grava em `metadata.me` | **OK** (jsonb_set só `{packing}`) |

## CP-EVT-01

| Caso | Resultado |
|------|-----------|
| RPC `admin_occurrence_action` | **Aplicada** |
| Eventos opened/updated/resolved + `occurrence_id` | **OK** |
| `deriveOccurrences` estado = último | **PASS** unit |
| UI `OrderOccurrencesPanel` | **OK** |

## CP-PRT-DOC

| Caso | Resultado |
|------|-----------|
| Spec archive | [FAL_SPEC_PRT_DOC_ARCHIVE_2026-11-11.md](./FAL_SPEC_PRT_DOC_ARCHIVE_2026-11-11.md) |
| Storage | **adiado P2** (decisão explícita) |

## Veredito

**P1 estrutural Central = completo** no escopo V2 (sem estoque). Gate 1 elegível.
