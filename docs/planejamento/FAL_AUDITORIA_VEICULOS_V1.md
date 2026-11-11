# FAL_AUDITORIA_VEICULOS_V1

**Data:** 2026-11-11 · **Somente leitura**  
**SQL:** projeto `owllmfcpbodqmoerdfxx`

---

## 1. Existe cadastro mestre independente?

**FATO: sim.** Tabelas `manufacturers` → `models` → `vehicle_versions` existem sem depender de produtos.  
Admin: `AdminVehiclesPage`, `AdminVehicleMasterImportPage` + RPC `upsert_vehicle_canonical` (source `import|plate|admin`).  
Import mestre **não cria PVC**.

Contagens prod (2026-11-11):

| Métrica | Valor |
|---------|------:|
| manufacturers active | 9 |
| models active | 76 |
| vehicle_versions active | 186 |

---

## 2. Schema efetivo

### manufacturers / models
`id`, `name`, `slug`, `status` (+ `manufacturer_id` em models). Unique slug por maker.

### vehicle_versions
`year`, `engine`, `version_name`, `status`, `source`, keys geradas (`year_key`, `engine_key`, `version_key`), unique natural.

### Gaps vs mestre “ideal” (FATO — ausentes)

| Atributo | Status |
|----------|--------|
| Geração | Inexistente |
| Combustível | Só payload placa; não persiste em VV |
| Transmissão | Idem |
| Carroceria | Inexistente |
| Ano fabricação vs ano-modelo | Um único `year` / período PVC |

---

## 3. Caso HB20 (produção)

| Campo | Valor |
|-------|-------|
| Maker | HYUNDAI |
| Model | HB20 |
| VV | 2 linhas: year=**2012**, engine=**null**, version_name=**`1.0`** e **`1.6`** |

**FATO — qualidade de dados:** motorização está em `version_name`, não em `engine`.  
Filtro UI `engine=1.0` **não** casa com esses registros na RPC antiga (`vv.engine = p_engine`).  
Na RPC nova (repo), `engine` vazio é coringa — `p_engine=1.0` passaria, mas `p_version` ainda precisaria se quisesse restringir trim.

**Grafia:** modelo cadastrado `HB20` (ok). Display em `groupCompatibilityApps` pode titularizar para `Hb20` (**FATO** código: `toCommercialTitleCase` sem flag model).

---

## 4. Anos e seletor

`vehicleService` expande anos a partir de PVC `year_start/end` (`expandYearsForSelector`).  
Com `year_start=2012` e `year_end=null`, o seletor oferece 2012…ano civil atual — **incluindo 2015**.

**FATO:** UI oferece 2015; RPC produção exige `vv.year=2015` → falha. Inconsistência seletor↔motor.

---

## 5. Veículos sem produtos

**FATO código:** seletor usa VV active; não exige PVC.  
**NÃO VERIFICADO:** contagem exata de modelos sem nenhuma PVC (query recomendada no plano de execução).

---

## 6. Problemas classificados

| ID | Problema | Prioridade |
|----|----------|------------|
| VEI-01 | Motor HB20 em `version_name` em vez de `engine` | P0 dados |
| VEI-02 | `vv.year=2012` pontual vs PVC aberto 2012–∞ | P0 dados/RPC |
| VEI-03 | Sem geração/combustível/transmissão/carroceria | P2 |
| VEI-04 | Display Hb20 vs HB20 em apps agrupadas | P1 UX |
| VEI-05 | Drift `upsert_vehicle_canonical` / unique keys vs dados legacy | P1 |

## 7. Preservar

Mestre separado, `upsert_vehicle_canonical`, import CSV sem PVC, keys canônicas, uso do mestre por placa/admin/seletor.
