# Diagnóstico — Identificação por placa (V1)

**Data:** 2026-11-12  
**Auth:** eFe — auditoria precisão busca  
**Projeto / Edge:** `wtbp` · `plate-lookup` · provider apiplacas `/basico`  
**Privacidade:** placas mascaradas `XX****YY` nos docs; sem log de placa completa.

## 1. Pipeline

```
UI VehiclePlateField / VehiclePlateSearch
  → lookupPlate (Edge plate-lookup)
  → cache cached_plates (TTL 7d) + re-canonicalização
  → mapApiPlacasBasicoToRaw
  → splitApiModelo + sanitizeEngine
  → vehicleCanonicalUpsert (VV 5 campos)
  → plateResultToFilter + reconcileVehicleFilter
  → selects YMM + engine + version
```

| Etapa | Arquivo |
|-------|---------|
| Edge | `fal-pecas/supabase/functions/plate-lookup/index.ts` |
| Provider | `…/_shared/apiPlacasPlateProvider.ts` |
| Split | `…/_shared/splitApiModelo.ts` (+ espelho `src/services/plates/`) |
| Upsert | `…/_shared/vehicleCanonicalUpsert.ts` |
| Filtro UI | `plateTypes.plateResultToFilter`, `reconcileVehicleFilter.ts` |

## 2. Amostras (cache quente, mascaradas)

| Máscara | Maker | Model | Year | Engine | Version | Fuel | Classificação |
|---------|-------|-------|------|--------|---------|------|---------------|
| BB****29 | Renault | Kwid | 2017 | 1.0 | **Intense** | Alcool / Gasolina | OK (alias INTENS) |
| FR****37 | Hyundai | HB20 | 2019 | 1.0 | Unique | Alcool / Gasolina | OK |
| AY****45 | Renault | Clio | 2014 | 1.0 | Expression | Alcool / Gasolina | OK split DENATRAN |
| IN****36 | Volkswagen | Cross Fox | 2007 | 1.6 | — | Alcool / Gasolina | OK (sem inventar versão) |
| CR****44 | Ford | Ka | 1999 | 1.0 | — | Gasolina | OK ID; PVC Ka só 2008+ → empty busca |
| QW****23 | Yamaha | XTZ150 Crosser S | 2020 | — | — | Alcool / Gasolina | Parcial: trim “Crosser S” ainda no **modelo** |

## 3. Onde a classificação erra (pontos exatos)

| Sintoma histórico / residual | Ponto | Estado |
|------------------------------|-------|--------|
| `Kwid Intens 10MT` no modelo | `splitApiModelo` sem gear `10MT` + alias | **Corrigido** → Kwid / 1.0 / Intense |
| `INTENS` ≠ comercial Intense | `TRIM_ALIASES.INTENS` | **Corrigido** → Intense |
| `HB20 1.0M UNIQUE` colado | split decimal | **Corrigido** |
| `CLIO EXP1016VH` | DENATRAN compact | **Corrigido** → Expression / 1.0 |
| Motor API `0.1` | `sanitizeEngine` | **Corrigido** (rejeita &lt; 0.8 L) |
| Ano `2019/2020` → só 1º ano | `extractYear` pega 1º AAAA; **não** separa fab vs modelo | **Gap aberto** |
| `anoFabricacao` / `anoModelo` distintos | Mapper lê `ano`, `anoModelo`, `ano_modelo` — **não** `anoFabricacao` dedicado; um único `year` no filtro | **Gap aberto** |
| Fuel/transmission | Fuel mapeado; transmission quase sempre null; **não** viram filtro PVC | OK (não misturam no modelo) |
| Casing `EXPRESSION` vs `Expression` | Import admin UPPER + placa Title | **Duplicata VV** (2 EXPRESSION + 1 Expression) |
| Modelo moto com trim | `XTZ150 Crosser S` não peela “Crosser S” | Residual baixo |

## 4. Causa-raiz (inconsistências)

1. **Histórico (já tratado):** parser DENATRAN/composto insuficiente → motor/versão no modelo.  
2. **Residual dados/cadastro:** casing de versão no mestre vs placa; PVC ausente (Clio; Ka antigo) gera “placa OK / catálogo vazio”.  
3. **Contrato incompleto:** um único campo `year` não modela fab vs modelo; faixa `AAAA/AAAA` perde o segundo ano.

## 5. Correções recomendadas (pós-aprovação)

| Tipo | Ação | Prioridade |
|------|------|------------|
| Código | Persistir `yearFabrication` + `yearModel` quando API trouxer; filtro PVC usa regra documentada (preferir ano-modelo) | P1 |
| Código | Expandir peel de trim multi-token (`Crosser S`) só com allowlist | P2 |
| Dados | Unificar casing `EXPRESSION`→`Expression` (e similares) no mestre | P1 |
| Dados | Não inventar PVC; empty transparente | — |
| IA | Opcional sugerir split; **mestre valida**; ver `FAL_AVALIACAO_IA_BUSCA_V1.md` | P2 |

## 6. Critérios de aceite

- Modelo **nunca** contém token de motor decimal/`10MT`/DENATRAN compact reconhecido.
- Versão comercial canônica (Intense, Unique, Expression) após alias.
- Ano fab ≠ modelo: ambos disponíveis na resposta Edge quando evidência existir; sem inventar.
- Matriz PLA-* PASS com evidência frio=quente.
