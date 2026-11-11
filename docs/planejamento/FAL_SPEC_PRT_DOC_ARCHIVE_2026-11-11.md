# Spec — CP-PRT-DOC (archive docs / etiqueta)

**Data:** 2026-11-11 · **Status:** Spec mínima (sem storage nesta MARCHA)  
**Auth:** eFe · MARCHA P1

## Objetivo

Preservar comprovantes de etiqueta/romaneio/separação sem inventar blob store agora.

## Decisão V2 (travada)

| Artefato | Hoje | Archive alvo |
|----------|------|--------------|
| Lista separação A4 | `adminOrderPrint` (browser) | Snapshot PDF opcional futuro |
| Romaneio | print window | Idem |
| Etiqueta ME | URL / print via Edge `melhorenvio-label` | Guardar `label_url` / `label_id` já em `metadata.me` |
| Packing | `metadata.packing` | Já é registro operacional |

## Fase atual (aceite)

1. **Não** criar bucket Storage nesta rodada.  
2. Timeline/`order_events` + `metadata.me` + `metadata.packing` = fonte de verdade auditável.  
3. Print continua client-side (015).  
4. Próxima evolução: job que captura PDF → `order_documents` (tabela nova) + storage privado staff-only.

## Critério Gate

Spec publicada · prints existentes OK · sem regressão ME print. Implementação storage = P2.
