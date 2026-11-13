# FAL INV — Inteligência e Normalização Veicular (Charter V1)

**Data:** 2026-11-13  
**Auth:** eFe  
**Status:** Onda 1 em execução  
**Âncora:** mestre `manufacturers` → `models` → `vehicle_versions` + PVC

## 1. Missão

Reconhecer o veículo de verdade (placa, texto ou manual), normalizar nomenclaturas e entregar um `VehicleFilter` canônico para a busca — **sem inventar compatibilidade**.

## 2. Invariantes

1. Mestre atual permanece canônico; INV é camada aditiva.
2. PVC é a única prova de peça compatível.
3. Versão ≠ motor ≠ combustível ≠ câmbio.
4. Sem evidência → “Não informado” na UI; `null`/omitido no RPC.
5. Caso incerto não navega sozinho nem grava garagem.
6. Raw e fonte preservados; código sem mapa → `pending_validation`.
7. Fuel/câmbio informativos até PVC ter dimensão.
8. Onda 1 não altera `search_products`.
9. Placa = texto = manual → mesmos params RPC para a mesma identidade.
10. Feature flag `INV_RESOLVER_ENABLED` permite rollback de comportamento.

## 3. Contrato `resolveVehicleIdentity`

**Entrada:** `source` (`plate|text|manual|garage|import`), `raw`, campos parseados.

**Saída:**

| Campo | Valores |
|-------|---------|
| `status` | `exact` \| `incomplete` \| `ambiguous` \| `not_in_catalog` \| `pending_validation` |
| `confidenceBand` | `A` \| `B` \| `C` \| `D` |
| `filter` | `VehicleFilter` reconciliado |
| `vehicleVersionId` | só match único |
| `candidates` | obrigatório se `ambiguous` |
| `evidence` | `ruleId` + fonte |
| `raw` | sempre |

### Bandas

| Banda | Significado | UX |
|-------|-------------|-----|
| A | Exato no mestre | Confirmar e ver peças |
| B | Parcial seguro | Confirmar; ausentes = Não informado |
| C | Ambíguo | Escolher candidato |
| D | Desconhecido/pendente | Manual / não inventar |

### Ordem das regras

`splitApiModelo` → alias DB `validated` → chave natural → `reconcileVehicleFilter` → único/ambíguo → pendente/manual.

Alias `pending_validation` **nunca** altera filtro.

## 4. Matriz UX por status

| Situação | Mensagem | Ação |
|----------|----------|------|
| Exato (A) | Encontramos este veículo; confira antes de buscar | Confirmar e ver peças |
| Parcial (B) | Identificamos o veículo; complete o que souber | Confirmar com Não informado |
| Ambíguo (C) | Encontramos mais de uma configuração | Escolher candidato |
| Fora do mestre | Veículo identificado, mas fora do cadastro FAL | Corrigir manualmente |
| API indisponível | Consulta temporariamente indisponível | Continuar manualmente |
| Sem PVC | Veículo reconhecido; ainda sem peças compatíveis | Ajustar filtros |
| Código pendente | Código preservado para validação | Só dados conhecidos |

## 5. Schema Onda 1

- `vehicle_aliases` — normalização textual validada
- `vehicle_resolution_events` — telemetria append-only

**Adiado:** generations, engines, transmissions, applications, identifiers, sources.

## 6. Critérios de aceite Onda 1

Ver gates em [FAL_INV_ROADMAP_ONDAS_V1.md](./FAL_INV_ROADMAP_ONDAS_V1.md).
