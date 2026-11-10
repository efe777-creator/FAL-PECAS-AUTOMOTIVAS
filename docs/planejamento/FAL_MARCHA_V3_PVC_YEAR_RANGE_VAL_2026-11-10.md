# VAL / Relatório — MARCHA V3 intervalo PVC (anos da aplicação)

**Data:** 2026-11-10  
**Auth:** eFe — `MARCHA`  
**Escopo:** **A** — intervalo **somente** em `product_vehicle_compatibility.year_start` / `year_end`  
**HEAD local:** tip `main` (`331a1bb`) + working tree (V3 **sem** PR/publish)  
**Deploy:** **não** obrigatório nesta fatia (só front/lib/admin; sem migration nova)

---

## Veredito (30s)

| Camada | Estado |
|--------|--------|
| **Bug filtro de anos** | **CORRIGIDO** — `17/...` e `20/26` expandem anos corretos |
| **Regra única** | Centralizada em `vehicleAppYear` |
| **Match / SQL** | Já alinhados — **sem** mudança de semântica |
| **Admin aplicações** | Ano inicial obrigatório; fim vazio = vigente até ano atual |
| **Admin veículos** | Lista **sem** exigir montadora |
| **Produção / publish** | **NÃO** nesta fatia — working tree |

**Leitura:** card e busca já entendiam período aberto; o seletor do cliente **não**. Agora filtro = card = match.

---

## Regra oficial

```
AnoFinalEfetivo = yearEnd ?? anoCivilAtual
compatível ⇔ yearStart ≤ anoPesquisado ≤ AnoFinalEfetivo  (quando há PVC)
```

| Cadastro | Label | Anos no filtro (ex. hoje = 2026) |
|----------|-------|----------------------------------|
| 2020–2026 | `20/26` | 2020…2026 |
| 2017–null | `17/...` | 2017…2026 (em 2027 inclui 2027 sem reeditar) |
| 2010–2015 | `10/15` | 2010…2015 (2016 **fora**) |

---

## Entregas

| Item | Resultado |
|------|-----------|
| `effectiveYearEnd` | PASS |
| `expandYearsForSelector` aberto → faixa até `nowYear` | PASS |
| `validatePvcYearInputs` (início obrigatório) | PASS |
| Testes `vehicleAppYear.test.ts` (13) | PASS |
| `tsc --noEmit` | PASS |
| Admin aplicações — copy + validação | PASS |
| Admin veículos — listagem global + busca/filtros/paginação | PASS |
| SQL `search_products` / `yearMatchesVehicleApp` | INALTERADOS (já OK) |
| Ano inicial/final no **mestre** (`vehicle_versions`) | **FORA** (escopo A) |

---

## Arquivos principais

- `fal-pecas/src/lib/vehicleAppYear.ts` (+ `.test.ts`)
- `fal-pecas/src/services/vehicles/vehicleService.ts` (já consumia `expandYearsForSelector`)
- `fal-pecas/src/components/admin/AdminProductApplicationsSection.tsx`
- `fal-pecas/src/pages/admin/products/AdminApplicationsPage.tsx`
- `fal-pecas/src/pages/admin/vehicles/AdminVehiclesPage.tsx`

---

## Gate humano (bola eFe)

1. Smoke catálogo: modelo com PVC `17/...` → select de ano com intermediários; resultado coerente com o card.  
2. Smoke admin aplicações: criar/editar com só ano inicial; rejeitar sem início.  
3. Smoke admin veículos: abrir tela **sem** montadora → lista completa.  
4. PR/publish quando autorizar (pode ir junto com outras fatias da working tree).

---

## Fora desta MARCHA

- Drawer catálogo aplicar/fechar (plano separado).  
- Intervalo no cadastro mestre / gerações de fabricação.  
- Cutover produção / Netlify fernando.

---

## STOP / assinatura

**MARCHA V3 PVC year range (escopo A): CÓDIGO ENTREGUE em working tree · 2026-11-10.**  
Próximo: gate smoke eFe → PR quando autorizar.

**Assinatura:** MARCHA V3 PVC · 2026-11-10 · tip `331a1bb` + WT.
