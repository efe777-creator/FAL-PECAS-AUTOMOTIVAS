# VAL — M6 medidas SKUs (provisório global)

**Data:** 2026-11-04  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Plano:** Melhor Envio híbrido D12 · M6  

## Entrega

| Item | Estado | Evidência |
|------|--------|-----------|
| SQL `20261104194500_m6_provisional_measures_direcao.sql` | **PASS** apply wtbp | `db query --remote --yes -f` |
| Published quote-ready | **100 / 100** | peso+altura+largura+comprimento |
| Origem | `global` só onde era null | não sobrescreve manuais (ex. peso 7,7 kg TDI1101/BRD6408) |
| Defaults por nome | DIREÇÃO (8 nomes) | terminal, kit, axial, pivô, bieletas, coxim, bucha, suporte |

## Nota comercial

Valores = **estimativa de embalagem** para cotação sandbox ME. Calibração real = bulk admin (eFe).

## Aceite

- [x] ≥1 SKU quote-ready (na prática 100)  
- [x] Migration no repo + apply remoto  
- [ ] eFe revisa/ajusta pesos reais quando possível  

**Assinatura agente:** VAL M6 medidas 2026-11-04.
