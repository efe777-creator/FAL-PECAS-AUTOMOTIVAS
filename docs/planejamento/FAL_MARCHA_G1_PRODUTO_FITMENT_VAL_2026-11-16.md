# MARCHA G1 — Produto / fitment / VAL

**Data:** 2026-11-16  
**Auth:** eFe — `marcha`  
**Plano:** [FAL_MVP_PLANO_CONSOLIDACAO.md](./FAL_MVP_PLANO_CONSOLIDACAO.md) §4  
**Classe:** MVP-bloqueador  
**Front smoke:** draft `https://6afb46f555cdaeb282fbeef6--fal-pecas-automotivas-efe.netlify.app`  
**Runtime:** Supabase `wtbpwuiayednvlhvuhbh`

---

## Resultado geral: **PASS**

| Passo | Status | Evidência |
|-------|--------|-----------|
| 1.1 Amostra SKUs+PVC | **PASS** | 100/100 published com ≥1 PVC; top-25 listados abaixo |
| 1.2 `search_products` year range | **PASS** | Corpo live: `pvc.year_start/end` com `<= v_year`; RPC YMM HB20/2015 → 3 SKUs |
| 1.3 Placa → confirmar → catálogo | **PASS** | FRW0E37 → Hyundai HB20 2019 1.0 Unique → URL canônica → **3 produtos** |
| 1.4 NL `q=modelo ano` | **PASS** | `?q=HB20%202015` → rewrite `maker=Hyundai&model=HB20&year=2015` · mesmos 3 |
| 1.5 Indisponível não compra | **PASS*** | SK971 card **Indisponível** sem Comprar/Carrinho; PDP/código bloqueia `available===false` |
| 1.6 `vehicle=1` | **PASS** | Escrito em `buildVehicleQuery`/`SearchBar`; **CatalogPage não lê** → ignorado |

\*Loja em `inventory_mode=sem_estoque` — reserva física `com_estoque` **não** exercitada; gate de `is_available` UI **ok**.

**Gate G1:** **PASS** (amostra comercial = cobertura PVC total + top-25; smokes 1.3–1.5 no draft).

---

## 1.1 Amostra (top 25 por #apps PVC)

| SKU | Nome | apps | year_min–max |
|-----|------|------|--------------|
| PVI1056 | PIVO | 42 | 2008–2024 |
| PVI1057 | PIVO | 42 | 2008–2024 |
| SK1214 | BIELETA | 34 | 1999–2026 |
| TDI1088 | TERMINAL DE DIREÇÃO | 32 | 2002–2023 |
| TDI1089 | TERMINAL DE DIREÇÃO | 32 | 2002–2023 |
| SK4898 | BIELETA | 30 | 2002–2024 |
| TDI0800 | TERMINAL DE DIREÇÃO | 19 | 2005–2025 |
| TDI0801 | TERMINAL DE DIREÇÃO | 19 | 2005–2025 |
| PVI1035 | PIVO | 18 | 1997–2012 |
| SK145S | KIT AMORTECEDOR | 17 | 1997–2026 |
| TDI1084 | TERMINAL DE DIREÇÃO | 16 | 2002–2014 |
| PVI1032 | PIVO | 14 | 1997–2020 |
| SK308S | KIT AMORTECEDOR | 13 | 1994–2016 |
| PVI1042 | PIVO | 12 | 2002–2017 |
| PVI1043 | PIVO | 12 | 2002–2017 |
| 1307B | COXIM AMORTECEDOR | 9 | 1997–2017 |
| 1308B | COXIM AMORTECEDOR | 9 | 1997–2017 |
| BRD9329 | AXIAL DE DIREÇÃO | 9 | 1997–(null) |
| SK1223 | BIELETA | 9 | 1997–2026 |
| SK402S | KIT AMORTECEDOR | 9 | 1998–2014 |
| 3260 | SUPORTE BARRA TENSORA | 8 | 1998–2016 |
| 3261 | SUPORTE BARRA TENSORA | 8 | 1998–2016 |
| 4893S | BUCHA BANDEJA | 8 | 1999–2023 |
| BRD4558 | AXIAL DE DIREÇÃO | 8 | 1996–2002 |
| PVI3395 | PIVO | 8 | 2002–2014 |

Cobertura: **published_with_pvc = 100** / **published_total = 100**.

---

## 1.2–1.4 Smoke busca

| Caso | Resultado |
|------|-----------|
| RPC `search_products` maker=HYUNDAI model=HB20 year=2015 | BRD2109, TDI2116, TDI2117 |
| Draft `/catalogo?maker=HYUNDAI&model=HB20&year=2015` | 3 produtos (mesmos SKUs) |
| Draft `/catalogo?q=HB20%202015` | rewrite canônica + 3 produtos |
| Edge `plate-lookup` FRW0E37 | apiplacas · Hyundai HB20 2019 1.0 Unique |
| Draft placa → Confirmar e ver peças | URL `…&year=2019&engine=1.0&version=Unique` · **3 produtos** |

---

## 1.5 / 1.6

- **SK971** published + `is_available=false` → UI “Indisponível”, sem CTAs compra.  
- `store_settings.inventory_mode` = `sem_estoque` (2026-11-08).  
- `vehicle=1`: sem remoção nesta marcha (sem efeito colateral); cleanup opcional em marcha UX.

---

## Próximo

**MARCHA G2** (preço 5 pontos + condições vitrine).  
Dívida ops: Netlify `--prod` quando crédito.
