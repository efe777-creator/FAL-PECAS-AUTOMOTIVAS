# FAL — VAL Marcha 13 (alinhamento SPEC / ordem / dark)

**Data:** 2026-11-20  
**Branch:** `dev`  
**Rota:** `/produto/tdi1002`  
**Antiregress:** 36/36 PASS (inclui contrato M13)

---

## Escopo

1. Ordem buy-box: **disponível+qty → frete → CTAs**
2. SPEC canônica: grid **55/45** (galeria / buy)
3. Thumbs verticais desktop (`lg:flex-col`) — contrato fonte
4. QA dark + dobra residual 768px

---

## Resultados

| Item | Status |
|------|--------|
| Ordem UI (Disponível → CEP → Add → Comprar) | OK (snapshot) |
| SPEC + marchas atualizadas | OK |
| Thumbs `lg:flex-col` / shell `lg:flex-row` | OK (contrato M13) |
| Dark: wrap `#0e1116`, h1 claro, Add amarelo, Comprar navy | OK medido |
| 1366×768: Add na dobra; Comprar ~4px abaixo | Residual aceitável |
| Header mock referência | Fora de escopo |
| Visual “compatível” (selo verde) | Pendente (teste com HB20 = incompat) |

---

## Residual pós-M13

1. Validar faixa verde com veículo PVC cruzado.
2. Push `dev` (só com OK).
3. Microajuste opcional Comprar em 768h (≤4px).
