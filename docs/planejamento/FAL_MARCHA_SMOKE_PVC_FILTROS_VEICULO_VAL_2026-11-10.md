# VAL / Smoke — PVC × filtros de veículo × catálogo

**Data:** 2026-11-10  
**Auth:** eFe — `MARCHA` · smoke pedido  
**Ambiente:** Supabase `wtbp` + local Vite `http://[::1]:5173`  
**Método:** RPC `search_products` (REST anon) + UI catálogo local  

---

## Veredito (30s)

| Camada | Estado |
|--------|--------|
| **Vínculo PVC → busca** | **PASS** — maker/model/ano/motor filtram de verdade |
| **Ano fora do intervalo** | **PASS** — Gol 1990 = 0 |
| **Ano dentro (fechado)** | **PASS** — Gol 2008–2023 ≈ 8–9 peças |
| **Motor falso** | **PASS** — `9.9 Fake` = 0 |
| **UI catálogo** | **PASS** — VW Gol 2020 → “8 produtos” + placa no painel |
| **Atenção** | Ano futuro (`2030`) ainda casa PVC com `year_end` **null** (SQL aberto) |

**Leitura:** pesquisar o carro certo no filtro **traz** as peças com aplicação compatível. O cadastro PVC (período + VV) é a alavanca.

---

## Resultados RPC (`search_products`)

| Cenário | total_count | Esperado |
|---------|-------------|----------|
| VW + Gol (sem ano) | 10 | ≥1 |
| VW + Gol + 2008 | 9 | ≥1 |
| VW + Gol + 2016 | 8 | ≥1 (PVC 08/23 cobre) |
| VW + Gol + 2020 | 8 | ≥1 |
| VW + Gol + 2024 | 1 | ≤2020 (maioria fecha em 2023) |
| VW + Gol + 2026 | 1 | aberto residual |
| VW + Gol + 1990 | **0** | vazio |
| VW + Gol + 2020 + motor `1.6` | 2 | refina |
| VW + Gol + 2020 + motor fake | **0** | vazio |
| VW + Gol + 2020 + versão `G5` | 7 | refina |
| Chevrolet + Onix + 2020 | 8 | cluster B |
| Chevrolet + Onix + 2010 | **0** | fora |
| Só montadora VW | 18 | amplo |

### Amostra PVC Gol (REST)

Exemplos reais: `4893S` 2008–2023 · `4895R` 2011–2023 · `PVI1010` 1997–2008 — coerentes com os totais por ano.

---

## UI local (Vite)

URL: `/catalogo?maker=Volkswagen&model=Gol&year=2020`

| Check | Resultado |
|-------|-----------|
| Chips Montadora/Modelo/Ano | PASS |
| Contagem “8 produtos” | PASS (= RPC) |
| Select Ano com faixa (2026… legado) | PASS (V3 expand) |
| Placa dentro de “Filtros por veículo” | PASS |
| Cards com aplicação (ex. Gol G5 08/23, 11/23) | PASS |

---

## Unit

`vitest src/lib/vehicleAppYear.test.ts` — **13/13 PASS** (`20/26`, `17/...`).

---

## Gaps observados (não bloqueiam smoke)

1. **`year_end` null** na busca SQL aceita anos futuros (ex. 2030 → 1). Seletor UI limita ao ano atual; deep-link futuro ainda casa.  
2. Card compacto pode destacar outro maker (ex. Audi) mesmo com PVC Gol — cosmético do resumo, não do filtro.  
3. Motor/versão continuam match **exato** (case-sensitive no SQL).

---

## Critério de pronto deste smoke

- [x] Filtro maker+model+year devolve peças com PVC compatível  
- [x] Ano impossível → 0  
- [x] Motor inválido → 0  
- [x] UI local alinhada ao RPC  
- [x] Regra de anos V3 coberta por testes  

**Assinatura:** Smoke PVC filtros · 2026-11-10 · wtbp + local.
