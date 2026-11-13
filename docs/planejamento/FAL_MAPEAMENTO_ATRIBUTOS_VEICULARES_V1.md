# Mapeamento — Atributos veiculares canônicos (V1)

**Data:** 2026-11-12  
**Auth:** eFe — auditoria precisão busca  
**Fonte código:** `splitApiModelo`, `apiPlacasPlateProvider`, `vehicle_versions`, `VehicleFilter`

## 1. Contrato canônico FAL

| Atributo | Campo canônico | Persistência hoje | Filtro busca / PVC | Origem típica |
|----------|----------------|-------------------|--------------------|---------------|
| Montadora | `maker` | `manufacturers.name` | sim (`p_maker`) | API `marca` |
| Modelo | `model` | `models.name` | sim (`p_model`) | API `modelo` **após split** |
| Geração | `generation` | **não** | não | Futuro / texto livre mestre |
| Versão / trim | `version` | `vehicle_versions.version_name` | sim (`p_version`) | Split / API `versao` / alias |
| Motor | `engine` | `vehicle_versions.engine` | sim (`p_engine`) | Split / API motor; sanitize ≥0.8 L |
| Combustível | `fuel` | só payload placa | **não** | API `combustivel` |
| Transmissão | `transmission` | quase sempre null | **não** | API (raro no `/basico`) |
| Ano fabricação | `yearFabrication` | **não (gap)** | — | API `anoFabricacao` se existir |
| Ano modelo | `yearModel` | hoje colapsa em `year` / `vv.year` | sim (`p_year`) | API `ano` / `anoModelo` / 1º de `AAAA/AAAA` |

**Regra de ouro:** o **nome do modelo** não pode carregar motor, versão, câmbio (`10MT`) ou código DENATRAN.

## 2. Fluxo de normalização

```
dados.modelo (bruto) ──► splitApiModelo ──► model + engine? + version?
dados.motor / cilindrada ──► sanitizeEngine (só se plausível)
TRIM_ALIASES (INTENS→Intense, EXP→Expression, COMFOR→Comfort, …)
  ──► vehicleCanonicalUpsert
  ──► reconcileVehicleFilter (match frouxo com árvore FAL)
```

Preservar bruto: `cached_plates.payload` mantém resposta canônica pós-upsert; provider origin em `source`. Para rastreio fino do JSON cru da API, preferir não sobrescrever campos de auditoria (melhoria futura: `payload.providerRaw` opcional).

## 3. Regras “não inferir”

1. Sem token de motor reconhecido → `engine = null` / “Não informado” no select (`""`).
2. Sem trim em allowlist / DENATRAN → `version = null` / “Não informado”.
3. Não inventar geração.
4. Não criar PVC; empty de catálogo ≠ falha de placa.
5. Alias só **expande** abreviação conhecida (INTENS→Intense); nunca cria versão fora do mestre na busca textual (T05 / merge NL).

## 4. Allowlist de trims (resumo)

Espelho em `TRIM_ALIASES` (`splitApiModelo.ts`): Expression, Authentique, Dynamique, Unique, Comfort, Intense (**inclui INTENS**), Zen, Life, Outsider, LT/LTZ, Sense, Style, Premier, Connect, Evolution, Limited, Crosser, siglas ELX/HLX/GL/GLS/…

Novos trims: adicionar alias + teste Vitest **antes** de depender na UI.

## 5. Ano fab vs ano-modelo

| Situação | Comportamento |
|----------|---------------|
| Só um AAAA | `year` único no filtro / VV |
| `2019/2020` | Provider preferencialmente usa **ano-modelo** (`extractYearPreferModel` = último AAAA); filtro PVC = esse ano |
| Campos distintos fab/modelo | Ainda colapsam em um `year` no `VehicleFilter` (gap INV pós-Onda 1) |

**INV:** ver [FAL_INV_CHARTER_V1.md](./FAL_INV_CHARTER_V1.md) — Onda 1 não muda semântica PVC.

## 6. Fuel / transmission

- Exibir na confirmação de placa quando presentes.
- **Não** entram em `search_products` nesta fase (sem coluna PVC).
- Não misturar no `model`.

## 7. Critérios de aceite do mapeamento

- Matriz de atributos coberta em testes unitários de split.
- Documentação alinhada ao código Edge e client (arquivos espelhados).
- Geração / fab-modelo: se não implementados, UI não finge que existem.
