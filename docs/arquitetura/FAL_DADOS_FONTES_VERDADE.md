# FAL — Dados e fontes de verdade

**Versão:** 1.0  
**Data:** 2026-11-16  
**Status:** CANÔNICO  
**Arquitetura:** [FAL_ARQUITETURA_360.md](./FAL_ARQUITETURA_360.md)  
**Evidência:** [FAL_AUDITORIA_CONSOLIDADA_PRD4.md](../planejamento/FAL_AUDITORIA_CONSOLIDADA_PRD4.md)

---

## 1. Hierarquia em conflito

1. Regra de negócio aprovada no PRD  
2. Banco / RPC real  
3. Serviço oficial  
4. Docs técnicas recentes  
5. UI  
6. Docs antigas / mocks  

---

## 2. Entidades atuais (MVP)

### 2.1 Identidade comercial

| Entidade | Tabela | Dono | Invariantes |
|----------|--------|------|-------------|
| Perfil | `profiles` | Auth | 1:1 com auth user |
| Cliente | `customers` | Commerce | Liga pessoa à compra |
| Endereço | `customer_addresses` | Commerce | Pertence ao customer |
| Veículo salvo | `customer_vehicles` | Garage seed | Exige `version_id` canônico |

### 2.2 Catálogo

| Entidade | Tabela | Dono | Invariantes |
|----------|--------|------|-------------|
| Produto | `products` | Catálogo | SKU único; `commercial_ref` comercial |
| Categoria | `product_categories` | Catálogo | Árvore parent_id |
| Marca peça | `product_brands` | Catálogo | — |
| Imagens | `product_images` | Catálogo | — |
| Referências | `product_references` | Catálogo | OEM/codes |
| Fornecedor | `suppliers` / `supplier_products` | Supply | Custo em supplier_products |

**Espelhos:** `commercial_ref` vs `sku` (papéis distintos — não duplicar regra).  
**Publicação:** `status` ≠ `is_available`.

### 2.3 Veículo e fitment

| Entidade | Tabela | Dono | Invariantes |
|----------|--------|------|-------------|
| Montadora | `manufacturers` | INV/mestre | Canônico |
| Modelo | `models` | INV/mestre | FK manufacturer |
| Vida de linha | `models.production_year_*` | Mestre | Metadado assert; **nunca** predicado `search_products` |
| Versão | `vehicle_versions` | INV/mestre | Identidade técnica (snapshot) |
| Fitment | `product_vehicle_compatibility` | Fitment | Única prova compatível |
| Alias | `vehicle_aliases` | INV | Aditivo; pending ≠ filtro |
| Cache placa | `cached_plates` | INV | Não SoT |
| Eventos resolução | `vehicle_resolution_events` | INV | Telemetria |
| Instância cliente | `customer_vehicles` | Garagem | ≠ mestre; ≠ PVC |

**Espelho proibido como SoT:** usar `vehicle_versions.year` no lugar de PVC `year_start`/`year_end`.  
**Seletor de anos (UI):** VV + vida — **não** PVC.  
**Placa:** snapshot `yearModel`/`yearFabrication`; filtro = ano-modelo.  
**Writers / caminhos:** [FAL_MAPA_VEICULO_CAMINHOS_RELACOES_2026-11-21.md](./FAL_MAPA_VEICULO_CAMINHOS_RELACOES_2026-11-21.md) (lookup read-only; confirm = writer).

### 2.4 Preço

| Entidade | Tabela/RPC | Dono | Invariantes |
|----------|------------|------|-------------|
| Listas | `price_lists` / `price_list_items` | Comercial | SoT comercial |
| Override | `product_price_overrides` | Comercial | Exceção explícita |
| Promo | `product_promotions` | Comercial | Gate de lista |
| Resolução | `resolve_product_price(s)` | Comercial | Contrato de exibição/cobrança |

**Espelho permitido:** `products.price` sync — **nunca** substituir a RPC na decisão.

### 2.5 Estoque

| Entidade | Tabela | Dono | Invariantes |
|----------|--------|------|-------------|
| Saldo | `inventory` | Ops | on_hand / reserved |
| Movimentos | `inventory_movements` | Ops | Ledger |
| Modo loja | `store_settings` | Ops | com_estoque / ficticio / sem |

**Espelho:** `products.is_available` é projeção — SoT é inventory + regras de modo.

### 2.6 Pedido, pagamento, frete

| Entidade | Tabela | Dono | Invariantes |
|----------|--------|------|-------------|
| Pedido | `orders` / `order_items` | Commerce | Só via `place_order`; snapshots |
| Histórico status | `order_status_history` | Ops | Auditável |
| Eventos | `order_events` | Ops | Ocorrências |
| Pagamento | `payments` / `payment_events` | Pay | Ledger + idempotência |
| Roteamento | `payment_routing_config` | Pay | Híbrido MP/Asaas |
| Cotação | `shipping_quotes` | Logística | Consumida no place_order |
| Remessa | `shipments` | Logística | Tracking / packing meta |
| Caixas | `shipping_box_templates` | Logística | Packing ME |
| Frete próprio | `store_own_delivery_*` / tarifas | Logística | POL |

### 2.7 Comunicação

| Entidade | Tabela | Dono |
|----------|--------|------|
| Inbox | `app_notifications` | Intelligence/ops |
| Deliveries | `notification_deliveries` | Intelligence |
| Preferências | `notification_preferences` | Cliente |
| Canal WA futuro | `notification_channel_config` | Intelligence |

---

## 3. Entidades futuras (conceituais — sem migration agora)

| Entidade | Ambiente | Notas |
|----------|----------|-------|
| Organization | Parceiros/Workshop/Fornecedores | Oficina ou empresa |
| Org membership | Idem | Papéis |
| Service listing | Parceiros | Oferta de serviço |
| Service quote / proposal | Parceiros | Orçamento estruturado |
| Work order (OS) | Workshop | Execução |
| Garage history entry | Garage | Com proveniência |
| Mileage log | Garage | Quilometragem |
| Maintenance plan item | Garage | Lembretes com confiança |
| Expense entry | Garage | Gastos |
| Garage document | Garage | Comprovantes |
| Supplier catalog feed | Fornecedores | Integração |

**Regra:** ligar sempre a identidade canônica de cliente/veículo/produto/pedido existentes — não clonar.

---

## 4. Fluxos de informação (ponta a ponta)

### Veículo → busca → PDP

`placa/manual/NL` → Edge lookup **read-only** → INV assert (client) → **confirm humano** → writer confirm-upsert → `VehicleFilter` → `search_products` (**PVC**) → card/PDP → summary apps  

Mapa: [FAL_MAPA_VEICULO_CAMINHOS_RELACOES_2026-11-21.md](./FAL_MAPA_VEICULO_CAMINHOS_RELACOES_2026-11-21.md).

### Preço

listas/override/promo → `resolve_product_price` → card/PDP/cart/checkout → snapshot `order_items.unit_price`

### Estoque

`inventory` → disponibilidade → bloqueio compra (modo) → reserva/baixa no ciclo do pedido

### Pagamento

`place_order` (stub) → `create-fal-payment` + router → provider → webhook/sync → `payments` → status pedido

### Frete

itens + dims/POL → quote Edge → `shipping_quotes` → place_order → shipment → label/tracking

---

## 5. O que não duplicar

| Proibido | Motivo |
|----------|--------|
| Segundo cadastro de cliente por módulo | Identidade única |
| Segundo motor de fitment | PVC é a prova |
| Segundo place_order / INSERT orders | Integridade |
| Preço cobrado diferente do resolvido sem regra explícita | Confiança comercial |
| OS/histórico sem proveniência | Confiabilidade Garage |

---

## 6. Proveniência e confiança (Garage futuro)

Todo registro histórico deve carregar:

- `source` (cliente, oficina, pedido FAL, import)  
- `confidence` / banda  
- `recorded_by`  
- timestamp  

Cliente informado ≠ OS confirmada por oficina.
