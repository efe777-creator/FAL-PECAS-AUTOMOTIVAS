# FIND-004 MARCHA 5 — VAL smoke comercial (card / PDP / filtros)

**Data:** 2026-10-09  
**Autorização:** MARCHA (eFe)  
**Runtime:** `wtbpwuiayednvlhvuhbh` · UI `http://localhost:5173`  
**Pré-condição:** [M4 IMPORT VAL](./FAL_FIND004_MARCHA4_IMPORT_VAL_2026-10-09.md)

---

## Veredicto

| Campo | Valor |
|-------|-------|
| MARCHA 5 | **OK** |
| FIND-004 trilho dados | **ENCERRADO** (M1–M5) |
| Residuais | 21 reviews + TDI0150 (não aplicados); UI “Mais aplicações” / anos `YY/YY` = trilho UI separado |

---

## 1. Dados (SQL — FATO)

| Check | Resultado |
|-------|-----------|
| Published / com PVC | **100 / 100** (antes 17/100) |
| PVC rows | **734** |
| `1307B` × Palio | **5 PVC / 5 VV** |
| Produtos matching modelo Palio | **15** |
| PVC `year_end` null (aberto) | **216** (sem inventar fim) |

---

## 2. Catálogo UI (browser — FATO)

| Check | Resultado |
|-------|-----------|
| `/catalogo` | **100 produtos · mostrando 24**; cards com bloco **Aplicação** |
| Apps no card | Agrupadas por montadora; anos `YYYY+` / `YYYY–YYYY` (formato atual IMP-05) |
| Ex.: BRD2109 | Hyundai · Hb20 1.0 / 1.6 · `2012+` |
| Ex.: BRD9329 | Fiat · Palio / Siena / Palio 1.6 / 1.4 |
| Identidade FAL | Card claro, Referência, Ver produto — preservada |

---

## 3. PDP UI (browser — FATO)

| Check | Resultado |
|-------|-----------|
| `/produto/813d6dae-…` (`1307B`) | Coxim Amortecedor · Referência 1307B · Disponível |
| Aplicações | Fiat: Palio `1997+`, Idea, Doblo, Strada, **Palio 1.6 / 1.0·Fire / 1.4**, Siena |
| Coerência card↔PDP | Mesma fonte `compatibilityGroups`; PDP com mais linhas (limite maior) |

Blank→VVs **visível**: múltiplas versões Palio (incl. Fire) na PDP.

---

## 4. Filtro veículo (browser + SQL)

| Check | Resultado |
|-------|-----------|
| URL `?maker=Fiat` | Montadora=Fiat; “Filtros por veículo **ativos**”; **26 produtos** |
| `1307B` na lista filtrada | Presente com apps Fiat |
| SQL Palio | 15 produtos (modelo) — alinhado a filtro fino documentado IMP-11 |

---

## 5. Fora do escopo M5 (não bloqueia)

| Item | Estado |
|------|--------|
| Botão “Mais aplicações” | **NÃO INICIADO** (truncate silencioso ainda no card) |
| Anos `YY/YY` / `YY/...` | **NÃO INICIADO** (ainda `1997+`) |
| 21 reviews / TDI0150 | Pendentes de fonte |

---

## 6. Encerramento FIND-004

```text
M1 blank→VVs → M2 VAL → M3 reval 691 → M4 apply controlado → M5 smoke OK
```

Próximas frentes paralelas do molde: **MARCHA UI** apps/anos · smoke MP · B3 HOLD · reviews fonte.
