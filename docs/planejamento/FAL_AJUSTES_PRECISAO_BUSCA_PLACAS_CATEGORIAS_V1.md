# FAL — Ajustes de precisão: busca, placas e categorias (V1)

**Data:** 2026-11-12  
**Auth:** eFe  
**Fase:** auditoria concluída — **implementação somente após aprovação**  
**Projeto:** `wtbpwuiayednvlhvuhbh`

## Complementos

- [FAL_DIAGNOSTICO_FILTROS_CATEGORIA_V1.md](./FAL_DIAGNOSTICO_FILTROS_CATEGORIA_V1.md)
- [FAL_DIAGNOSTICO_IDENTIFICACAO_PLACAS_V1.md](./FAL_DIAGNOSTICO_IDENTIFICACAO_PLACAS_V1.md)
- [FAL_MAPEAMENTO_ATRIBUTOS_VEICULARES_V1.md](./FAL_MAPEAMENTO_ATRIBUTOS_VEICULARES_V1.md)
- [FAL_AVALIACAO_IA_BUSCA_V1.md](./FAL_AVALIACAO_IA_BUSCA_V1.md)
- [FAL_MATRIZ_TESTES_AJUSTES_BUSCA_V1.csv](./FAL_MATRIZ_TESTES_AJUSTES_BUSCA_V1.csv)

## 1. Causas-raiz

| Problema | Causa-raiz | Tipo |
|----------|------------|------|
| Filtro categoria (grupo/subgrupo) vazio | **99/100** produtos em `category_id` da raiz `direcao`; folhas (Terminal, Axial, Pivô…) com 0 pubs. RPC `cat_ids` está correta. | **Dados** (+ UX empty) |
| Placa inconsistente / campos misturados | Parser composto/DENATRAN e aliases (em grande parte **já corrigidos**). Residuais: ano fab vs modelo; casing versão; trim multi-token; PVC ausente ≠ erro de placa. | **Código residual** + **dados** |
| Versão/motor no nome | Mitigado por `splitApiModelo` + `sanitizeEngine` + alias Intense. | Código (manter testes) |

## 2. Arquivos e funções envolvidos

| Área | Paths |
|------|-------|
| Categoria UI | `CatalogPage.tsx` (`setCategoryFacet`, `?cat=`) |
| Busca | `searchService.ts` → `search_products` |
| Categorias | `categoryService.ts`, `product_categories` |
| Placa | `plate-lookup`, `apiPlacasPlateProvider`, `splitApiModelo`, `vehicleCanonicalUpsert`, `reconcileVehicleFilter` |
| IA | `interpretNaturalLanguage.ts`, `interpret-search-nl` |

## 3. Estruturas de banco

- `product_categories` (parent_id, slug, status)
- `products.category_id`, `products.status`
- `vehicle_versions` / `manufacturers` / `models`
- `product_vehicle_compatibility`
- `cached_plates`

## 4. Correções necessárias (separadas)

### Correções de dados (P0)

1. Remapear produtos DIREÇÃO → folhas (Terminal / Axial / …) por regra nome/SKU.
2. Unificar casing de versões (`EXPRESSION` → `Expression`).
3. Relatório de integridade: produto em raiz que possui filhos.

### Correções de código (P1 — sem tocar núcleo PVC aprovado)

1. Ano fab + ano-modelo no contrato Edge/UI quando evidência API existir.
2. Empty state de categoria com contagem no pai.
3. Testes regressão CAT/PLA da matriz.

### Ajustes de interface (P1)

1. Mensagem clara quando grupo/subgrupo está vazio mas a raiz tem itens.
2. Confirmação de placa: exibir fuel; não empurrar fuel para modelo.

### Melhorias de IA (P2 — opcional)

1. Homologar `VITE_SEARCH_NL_LLM` on/off na busca texto (já implementado).
2. **Não** colocar LLM no hot path da placa.
3. Assist placa só com flag separada + validação mestre (staging).

## 5. Riscos

- Remap de categoria errado → SEO/links `?cat=` e cards.
- “Corrigir” RPC para incluir raiz ao filtrar filho → mascara dados e quebra taxonomia.
- Ligar LLM em prod sem VAL → latência/custo e versões inventadas (mitigado parcialmente pelo merge).

## 6. Dependências

- Aprovação eFe do plano de execução.
- Janela de dados (admin) para remap categoria.
- Secrets Groq só se homologar IA.

## 7. Ordem de implementação (após aprovação)

1. **P0 dados categoria** + VAL CAT-03/04.  
2. **P0/P1** casing versões + empty state categoria.  
3. **P1** contrato ano fab/modelo + testes.  
4. **P2** IA busca (flag) e/ou assist placa — só com homologação.  
5. Regressão T01–T16 busca inteligente (não regressar).

## 8. Testes de regressão

- Vitest `src/services/search` + `src/services/plates`.
- Matriz CSV `FAL_MATRIZ_TESTES_AJUSTES_BUSCA_V1.csv`.
- Smoke RPC: `direcao`, folha remapeada, HB20 2015, placa BB****29 Intense.

## 9. Critérios de aprovação

- Grupo/subgrupo com produtos cadastrados corretamente retorna count > 0.
- Placa: modelo limpo; Intense/Unique/Expression canônicos.
- Busca inteligente T01–T16 sem regressão.
- IA: sem ativação prod sem VAL explícito.
- Nenhuma migration/deploy nesta fase de auditoria (cumprido).

---

## Plano de execução priorizado

| Ordem | ID | Entrega | Esforço | Gate |
|-------|-----|---------|---------|------|
| 1 | EXEC-CAT-DATA | Script/admin remap `category_id` raiz→folha + relatório | M | Aprovar regras de classificação |
| 2 | EXEC-CAT-UX | Empty state + link “ver categoria pai” | S | Após ou paralelo a 1 |
| 3 | EXEC-VER-CASE | Normalizar version_name casing no mestre | S | Backup VV |
| 4 | EXEC-YEAR | yearFabrication / yearModel no Edge + UI | M | Spec mapeamento V1 |
| 5 | EXEC-PLA-TRIM | Trim multi-token allowlist (Crosser S) | S | Testes split |
| 6 | EXEC-IA-FLAG | Homologar NL LLM on/off site | S | VAL dedicado |
| 7 | EXEC-IA-PLATE | Assist placa opcional (flag nova, staging) | M | No-go hot path |

**Status:** aguardando **MARCHA / aprovação** do responsável. Não implementar automaticamente.
