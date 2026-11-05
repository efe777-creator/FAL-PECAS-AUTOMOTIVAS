# VAL — Frete Próprio v2 — CUTOVER

**Data:** 2026-11-05  
**Auth:** eFe — tarifas comerciais **depois** no menu Tarifas; seguir MARCHA  
**Auditoria:** [FAL_AUDITORIA_FRETE_PROPRIO_COMPLETA_2026-11-05.md](./FAL_AUDITORIA_FRETE_PROPRIO_COMPLETA_2026-11-05.md)

---

## Cutover wtbp — ON

| Setting | Valor |
|---------|--------|
| `enabled` | **true** |
| `pricing_mode` | **distance_vehicle** |
| Tarifas | Homolog (moto 15 / 2,50 · carro 25 / 3,50 + 5) — **eFe altera no admin** |

## Smoke pós-cutover

| Item | Resultado |
|------|-----------|
| Edge `priced` Paulista | **PASS** (revalidado na MARCHA cutover) |
| `place_order` ownq | **PASS** (homolog anterior) |

## Como alterar taxa (eFe)

Admin → Logística → Frete próprio → **Tarifas** → editar mínima / R$/km / adicional → Salvar.

## STOP

Cutover **ligado**. Frete próprio distance ativo na cotação (CEP cobertura). Ajuste de preço = só menu Tarifas.

**Assinatura:** VAL cutover frete próprio ON 2026-11-05.
