# VAL — MARCHA UX Frete Próprio (títulos + usabilidade)

**Data:** 2026-11-05  
**Auth:** MARCHA eFe — verificar títulos/menus Veículos · Tarifas · Produtos POL  
**Base:** `/admin/logistica/frete-proprio`  
**Fórmula:** `frete = max(km_ida × R$/km, tarifa_mínima) + adicional`

---

## Entregue

| Menu | Controle |
|------|----------|
| **Gerais** | Ativação, modo flat/v2, CEP, km global, prazos |
| **Veículos** | CRUD modalidade: nome, ícone, capacidade POL, atende até (km), incluir/excluir |
| **Tarifas** | Por modalidade: taxa mínima, R$/km, adicional; criar/salvar/excluir |
| **Produtos (POL)** | Lista da tabela `products` — filtros busca/status/sem POL; editar POL/porte/veíc./own; link cadastro |
| **Cadastro produto** | Mesmos campos POL (sem duplicar); seletor de modalidades cadastradas |

## Ops wtbp

| Item | Resultado |
|------|-----------|
| Migration `20261105130000_own_delivery_ux_vehicle_tariff.sql` | **PASS** — `icon`, `max_distance_km`, `adicional` |
| Edge `quote-own-delivery` redeploy | **PASS** — adicional + km por veículo |
| `vitest` own | **11 PASS** |
| `tsc --noEmit` | **PASS** |

## Aceite usabilidade

- [x] Menus claros com hint sob o título
- [x] Veículos: editar nome/ícone/POL/km + incluir + excluir
- [x] Tarifas: mín + km + adicional por modalidade cadastrada
- [x] Produtos: filtros + edição inline da mesma coluna `pol_unit`
- [x] Form produto aponta para Logística e usa modalidades reais
- [x] Linguagem operação (sem v1/v2/ID `own:` na cara); detalhes técnicos opcionais
- [x] Preço fixo: só Nome + Valor; ID gerado automaticamente
- [ ] Smoke visual no browser (eFe)
- [ ] Tarifas comerciais reais + Google key (bloqueio anterior)

## STOP

UI + schema + Edge alinhados. **Não** ligar `distance_vehicle` em prod sem tarifas R$ + key Google.

**Assinatura:** VAL MARCHA UX frete próprio 2026-11-05.
