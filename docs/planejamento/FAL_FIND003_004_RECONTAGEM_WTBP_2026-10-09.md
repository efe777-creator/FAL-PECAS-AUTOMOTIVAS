# Recontagem wtbp — FIND-003 (custo/preço) + FIND-004 (apps)

**Data:** 2026-10-09  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Modo:** SQL read-only + inventário de arquivo (sem apply em massa)

---

## 1. Contagens (fato)

| Métrica | n |
|---------|---|
| products | 100 |
| published | 100 |
| is_available | 99 |
| com PVC (`with_pvc`) | **17** |
| pvc_rows | **45** |
| supplier_products | 99 |
| supplier_products cost > 0 | **99** |
| price_list_items | 198 |
| pli price > 0 | 198 |
| published sem `try_resolve_product_amount` | **1** |
| manufacturers active | 22 |
| models active | 25 |
| vehicle_versions active | **11** |

---

## 2. FIND-003 (custo/preço)

| Antes (auditoria / HF snapshot) | Agora (wtbp) |
|--------------------------------|--------------|
| Hipótese de dataset sem custo | **99/99** supplier_products com custo > 0 |
| Preço lista | 198 itens > 0 |
| Resolve | 1 published sem resolve (residual pontual) |

**Veredicto:** FIND-003 **reclassificado** — gap de custo em massa **não** se confirma no wtbp.

**Residual rastreado (fato SQL 2026-10-09):**

| Campo | Valor |
|-------|-------|
| sku / commercial_ref | `SK971` |
| id | `56858364-a28c-4577-8ffc-70d926cd9564` |
| status | published |
| is_available | **false** |
| price | 0.00 |
| resolve | null |

Alinhamento Liberar: SK indisponível sem preço — coerente com D-LIBERAR (não comprável). Ação futura: custo/lista ou unpublish; **não** bloqueia FIND-003 fechado.

---

## 3. FIND-004 (apps)

| Item | Estado |
|------|--------|
| Cobertura | **17/100** produtos com PVC (inalterado) |
| Motor import | Existe (IMP-05 + UI `/admin` apps) |
| Arquivo `LISTA SUSP. APLICACOES FAL.csv` | **212 B · 7 linhas · 2 SKUs** (1307B, 1308B) — **amostra**, não escala |
| SKUs da amostra | Já têm **5 apps cada** no wtbp |
| Palio | **5** vehicle_versions → apply sem versão = **revisão** (motor) |
| Apply via CLI | `staff_can_import_catalog` = false sem sessão admin |

**Veredicto:** FIND-004 permanece **parcial**. Import em escala **bloqueado** por falta de planilha completa (+ ambiguidade VV sem coluna versão). **Não** apply da amostra (já coberta / risco de inventar VV).

### Desbloqueio (humano / dados)

1. Entregar CSV/XLSX completo de aplicações (contrato `catalog_applications`)  
2. Preferir coluna **versão** quando houver múltiplas VV do mesmo modelo  
3. Apply na UI admin (admin/gerente) → prévia → confirmar  
4. Recontar `with_pvc` / `pvc_rows` pós-apply

---

## 4. Status

| ID | Status |
|----|--------|
| FIND-003 | **fechado (quantitativo wtbp)** — residual 1 SKU sem resolve |
| FIND-004 | **parcial** — STOP import até arquivo em escala |

**Decisão operacional 2026-10-09:** FIND-004 STOP arquivo · FIND-003 fechado + residual SK971 · paralelo [smoke MP prep](./FAL_MP_SMOKE_PREP_2026-10-09.md) + [IMP-19 diag](./FAL_IMP_19_UX_DIAGNOSTICO_2026-10-09.md) · [B3 hold](./FAL_B3_MIGRATION_REPAIR_HOLD_2026-10-09.md).

**Atualização (planilha completa recebida):** auditoria de contrato + pré-val dry-run em [FAL_FIND004_APPS_CONTRATO_AUDITORIA_2026-10-09.md](./FAL_FIND004_APPS_CONTRATO_AUDITORIA_2026-10-09.md) — **BLOQUEADO PARA APPLY** até correção blank→todas VVs.
