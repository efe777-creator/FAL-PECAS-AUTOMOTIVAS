# FAL — Planejamento consolidado: Busca por placa

**Data:** 2026-11-09  
**Status:** Planejamento consolidado — decisões oficiais travadas  
**Plano canônico:** [FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md](./FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md)  
**AJUSTE:** **028**  
**Home:** posição abaixo da campanha e antes dos destaques ([spec Home](./FAL_SPEC_HOME_EXPERIENCIA_COMPRA_2026-11-09.md))

---

## 1. Fluxo principal

1. Informar a placa (Home e, opcionalmente, catálogo).  
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
- Não autenticado → autenticar **somente** para salvar; preservar a busca.

## 3. Decisão oficial B — Falha

Falha / indisponível / não encontrada / incompleta / ambígua:

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
| Busca produtos | search/RPC catálogo existente |
| Garagem | `fal-pecas/src/services/customers/customerVehicleService.ts` |
| Resultados | `CatalogPage.tsx` |
| Manual/conferência | `VehicleSelector.tsx` |

## 5. Obrigatórios técnicos

- Mapear externo → IDs internos FAL; colisões de modelos homônimos.  
- Não inventar versão/motor/ano ausentes.  
- Identificação ≠ garantia de compatibilidade da peça.  
- Consulta **no servidor**; cache, rate limit, erros, LGPD.  
- Testar placas antiga/Mercosul e **dois grupos** de veículos.

## 6. Etapas de implementação

| # | Entrega | Nota MVP |
|---|---------|----------|
| 1 | Preparar cadastro veículos/apps (liga 002) | MVP |
| 2 | PoC fonte **gratuita** | MVP-lite |
| 3 | Serviço independente do provedor (Edge) | MVP se PoC ok |
| 4 | UI placa + conferência | Com 029 |
| 5 | Integração filtros pós-confirmação | Sim |
| 6 | Pergunta garagem | Sim |
| 7 | Testes | Antes de liberar |
| 8 | Lançamento gradual | Pós-VAL |

**MVP-lite:** se PoC atrasar, Home usa `VehicleSelector` no slot da placa (G1 não bloqueia).

## 7. Critérios de pronto (VAL 028)

Consulta ok; filtros só pós-confirmação; correção permitida; manual imediato na falha; garagem só com pergunta; 2 grupos; compatibilidade pela base FAL; mobile; credenciais protegidas.

**Diretriz:** a placa reduz esforço, não cria obstáculo.
