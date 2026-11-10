# FAL — Planejamento consolidado: Busca por placa

**Data:** 2026-11-09 (atualizado 2026-11-10)  
**Status:** Evolução 1 (PoC mock) em implementação — decisões oficiais travadas  
**Plano canônico:** [FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md](./FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md)  
**AJUSTE:** **028**  
**Home:** abaixo da campanha e antes dos destaques ([spec Home](./FAL_SPEC_HOME_EXPERIENCIA_COMPRA_2026-11-09.md))  
**Catálogo:** busca por placa também disponível (entrada compacta)

---

## 1. Fluxo principal

1. Informar a placa (Home e Catálogo).  
2. Consultar provedor → montadora, modelo, ano, versão, motor (só o disponível).  
3. Preencher filtros existentes **para conferência** (ainda **sem** aplicar busca).  
4. Cliente confirma ou corrige.  
5. **Só então** aplicar filtros no catálogo (`CatalogPage` / busca existente).  
6. Oferecer salvar na garagem (**sempre perguntar**).

## 2. Decisão oficial A — Garagem

- **Nunca** salvar automaticamente.  
- Pergunta clara: “Deseja salvar este veículo na sua garagem?”  
- Aceitar → `customerVehicleService` / `customer_vehicles`.  
- Recusar → continua sem exigir cadastro.  
- Autenticado → salva na conta.  
- Não autenticado → autenticar **somente** para salvar; preservar a busca (`state.from` / pending garage).

## 3. Decisão oficial B — Falha

Falha / indisponível / não encontrada / incompleta / ambígua / fora do cadastro FAL:

1. Mensagem simples.  
2. **Abrir seleção manual imediatamente** (`VehicleSelector` / filtros existentes).  
3. Permitir montadora, modelo, ano, motor, versão.  
4. Continuar a busca.  
5. Nova tentativa de placa **opcional**, sem bloquear o manual.

## 4. Integração (reaproveitar)

| Estrutura | Path |
|-----------|------|
| Filtros | `VehicleFilter` + estado catálogo |
| Opções veículo | `fal-pecas/src/services/vehicles/vehicleService.ts` |
| Busca produtos | `searchService` / RPC catálogo |
| Garagem | `fal-pecas/src/services/customers/customerVehicleService.ts` |
| Resultados | `CatalogPage.tsx` |
| Manual/conferência | `VehicleSelector.tsx` + `VehiclePlateConfirmation.tsx` |
| Entrada placa | `VehiclePlateSearch.tsx` |
| Consulta | Edge `plate-lookup` + `plateLookupService.ts` |

## 5. Obrigatórios técnicos

- Mapear externo → IDs internos FAL; chaves compostas `maker|model` (colisões de homônimos).  
- Não inventar versão/motor/ano ausentes.  
- Identificação ≠ garantia de compatibilidade da peça.  
- Consulta **no servidor** (Edge); cache `cached_plates`, rate limit, erros, LGPD.  
- Mock disponível (`PLATE_PROVIDER=mock`) para PoC/teste.  
- Provedor comercial: [API Placas](https://apiplacas.com.br/) — `GET https://wdapi2.com.br/v3/basico/{placa}` (~R$ 0,03). Secrets Edge: `APIPLACAS_TOKEN` + `PLATE_PROVIDER=apiplacas`. Sem chassi/Renavam.  
- Testar placas antiga/Mercosul e **dois clusters** de veículos do inventário FAL.

### Inventário VAL — dois clusters (operacional)

Sem taxonomia formal de “grupo” no schema. Critério VAL desta onda:

| Cluster | Montadora | Modelo de referência | Notas |
|---------|-----------|----------------------|--------|
| A — passeio popular | Volkswagen | Gol | Fixture completa / Mercosul |
| B — passeio/SUV | Chevrolet | Onix | Fixture completa / antiga + motor |

Campo opcional `vehicleGroup` no contrato para classificação futura.

## 6. Etapas / ondas

| # | Entrega | Nota |
|---|---------|------|
| 1 | Evolução 1 — PoC mock + fluxo ponta a ponta + scaffold apiplacas | Em curso |
| 2 | Evolução 2 — Seleção/avaliação API (apiplacas + alternativas) | Pós-PoC |
| 3 | Evolução 3 — Adapter real no Edge | Com autorização de saldo |
| 4 | Homologação | Testes + segurança |
| 5 | Lançamento gradual | Monitoramento |

**MVP-lite legado:** Home usava só `VehicleSelector` no slot da placa; Evolução 1 substitui pelo fluxo de placa + fallback manual.

## 7. Critérios de pronto (VAL 028 / Evolução 1)

Consulta mock ok; filtros só pós-confirmação; correção permitida; manual imediato na falha; garagem só com pergunta; 2 clusters; compatibilidade pela base FAL; mobile; credenciais só no servidor; adapter comercial plugável e **desligado**.

**Diretriz:** a placa reduz esforço, não cria obstáculo.
