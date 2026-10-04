# Especificação — Fase 8: Back Office (Fatia A)

**Status:** Gate documental **APROVADO** — Fatia A **implementada**  
**Data:** 2026-10-04  
**Branch:** `plan`  
**PRD:** [FAL_PRD_3.0.md](../entrada/FAL_PRD_3.0.md)  
**Execução / gate:** [EXECUCAO_FASE8.md](./EXECUCAO_FASE8.md)  
**Base:** F7 encerrada (ciclo pedido + estoque operacional nas RPCs); placeholders `/admin/estoque`, `/admin/clientes`, `/admin/relatorios`

**Regra de implementação:** no modo `com_estoque`, o comportamento deve permanecer **funcionalmente equivalente** ao F7 validado (reserva → release no cancel → fulfill no envio).

---

## 1. Objetivo

Completar o painel operacional diário da FAL sem depender de código: **estoque com modos de loja**, **consulta de clientes** e **relatórios mínimos**, sem reabrir catálogo/pedidos F7 nem importar catálogo.

**Pergunta da fase:** Como a equipe administra estoque, clientes e indicadores sem SQL/código?

---

## 2. Escopo — Fatia A (travado)

### Entra

| Módulo | Entrega |
|--------|---------|
| Estoque | UI de saldos + histórico de movimentos + ajuste manual via RPC + configuração de modo de loja |
| Clientes | Listagem + detalhe (consulta) |
| Relatórios | Painel mínimo (pedidos por status + totais básicos) |

### Fora

- Reabrir CRUD de catálogo ou fluxos F7B–F7F (salvo bug concreto)
- Importação Excel/CSV de catálogo → **F8.1**
- Gateway/frete reais → **F9**
- WMS, multi-depósito, contagem cíclica completa
- CRM / segmentação B2B / edição massiva de clientes
- Redesign visual

---

## 3. Alinhamento PRD

| PRD | F8 Fatia A |
|-----|------------|
| Admin: estoque, pedidos, clientes, relatórios | Pedidos já existem; F8 preenche os três placeholders |
| RF10 — estoque com saldo e movimentações | Entra |
| BN — alterações de estoque geram movimentações | Entra (ajuste só via RPC auditável) |
| RF12 — import catálogo | Fora → F8.1 |

---

## 4. Modos de estoque da loja (decisão: 3 estados)

### 4.1 Estado atual do código

Não existe configuração de modo hoje. Comportamento vigente = **estoque real implícito**:

- `inventory.quantity_on_hand` / `quantity_reserved`
- `place_order` reserva; F7F libera/baixa
- `products.is_available` espelhado via `sync_product_availability`

Mocks em `src/data/mocks/*` **não** são modo operacional.

### 4.2 Decisão de domínio F8

Adotar **três estados explícitos** na configuração da loja. Motivo: a experiência admin e a comunicação comercial diferem entre “não controlar estoque” e “mostrar quantidade fictícia”. Não é preferência cosmética — são conceitos distintos.

| Modo | Venda depende de saldo? | Reserva real? | Baixa real? | Saldo na UI admin / loja |
|------|------------------------:|-------------:|------------:|--------------------------|
| `com_estoque` | Sim | Sim | Sim | Real (on hand / reserved / available) |
| `estoque_ficticio` | Não | Não | Não | Fictício (valor apresentado sem efeito operacional) |
| `sem_estoque` | Não | Não | Não | Não aplicável / oculto |

#### `com_estoque`

Fonte operacional real:

```text
saldo → reserva (place_order) → separação/fulfillment → baixa → disponível
```

Disponibilidade de venda deriva do saldo disponível (como hoje).

#### `estoque_ficticio`

- Existe apresentação de disponibilidade/quantidade para fins comerciais/UI
- **Proibido** reserva/baixa real (nem “escondida”)
- Disponibilidade comercial = regra definida (`is_available` ou quantidade fictícia ≥ demanda), **sem** alterar `quantity_on_hand` / `quantity_reserved` por pedido

#### `sem_estoque`

- Loja não trabalha com controle de estoque
- Disponibilidade comercial = `is_available` (ou equivalente)
- Saldo oculto na UI pública e tratado como N/A no admin
- **Proibido** reserva/baixa real

### 4.3 Snapshot por pedido (inegociável)

A configuração da loja é lida **somente na criação do pedido** (`place_order` e fluxos de reserva associados).

```text
Configuração atual da loja
       ↓
   place_order
       ↓
snapshot inventory_mode_at_order (ou equivalente)
       ↓
operações futuras (release / cancel / fulfill)
usam o SNAPSHOT do pedido
       ↓
Mudança posterior da config → somente pedidos NOVOS
```

**Invariantes**

1. Um pedido nunca é tratado parcialmente com modos diferentes.
2. Pedidos já criados **não** têm comportamento histórico alterado se o modo da loja mudar.
3. `release_order_reservations` / `fulfill_order_reservations` / cancel/envio respeitam o **snapshot do pedido**, não o modo atual da loja.
4. Pedidos legados (antes da F8): tratar como `com_estoque` (comportamento histórico real), documentado na migration futura.

### 4.4 Mudança de configuração da loja

| Situação | Comportamento |
|----------|---------------|
| Loja muda de modo | Afeta apenas pedidos **novos** |
| Pedidos abertos com reservas (snapshot `com_estoque`) | Continuam release/fulfill reais até encerrar |
| Pedidos com snapshot `sem_estoque` / `estoque_ficticio` | Nunca passam a reservar/baixar por causa da mudança |

Somente **administrador** altera a configuração (ver §6).

### 4.5 Contratos de dados (a implementar após gate)

| Peça | Descrição |
|------|-----------|
| Config loja | Campo/tabela de settings (ex. `store_settings.inventory_mode`) com enum dos 3 modos; default inicial `com_estoque` |
| Snapshot pedido | Coluna em `orders` (ex. `inventory_mode_at_order`) preenchida em `place_order` |
| Quantidade fictícia | Só relevante em `estoque_ficticio` — detalhe de armazenamento na implementação (produto ou inventory display); **não** pode alimentar reserva |

---

## 5. Módulos funcionais

### 5.1 Estoque (`/admin/estoque`)

- Listagem: produto (SKU/nome), on hand, reserved, available, modo da loja atual
- Detalhe/histórico: `inventory_movements` (tipo, qtd, reason, order, user, data)
- Ajuste manual **somente** via RPC auditável (ex. `adjust_inventory`) → movimento `adjust`
- UI deve deixar claro o modo atual (real / fictício / N/A)
- Não permitir UPDATE direto de `inventory` pela UI/PostgREST na implementação (alinhar ao P1 de orders)

### 5.2 Clientes (`/admin/clientes`)

- Listagem: nome, documento, e-mail/contato, data
- Detalhe: dados cadastrais + pedidos recentes (link para `/admin/pedidos/:id`)
- Sem CRM, sem edição massiva, sem exclusão nesta fatia

### 5.3 Relatórios (`/admin/relatorios`)

- Pedidos por status (reutilizar `admin_order_status_counts`)
- Totais básicos (ex.: contagem no período — RPC staff se necessário)
- Substituir `AdminPlaceholderPage`

---

## 6. Permissões

### 6.1 Matriz F8 (produto)

| Função | Admin | Gerente | Operador | Estoque | Atendimento |
|--------|:-----:|:-------:|:--------:|:-------:|:-----------:|
| Consultar estoque | ✓ | ✓ | ✓ | ✓ | — |
| Ajustar estoque | ✓ | ✓ | — | ✓ | — |
| Consultar clientes | ✓ | ✓ | ✓ | — | — |
| Relatórios | ✓ | ✓ | ✓ | — | — |
| Alterar configuração de modo estoque | ✓ | — | — | — | — |

### 6.2 Roles no código atual

Roles em `profiles.role` / `is_staff()`:

`customer` \| `administrador` \| `gerente` \| `operador` \| `estoque` \| `atendimento`

A role **`estoque` já existe** (CHECK F2 + `staffService`). A implementação F8 precisará de helpers granulares (não só `is_staff()`) para enforcer esta matriz nas RPCs/RLS novas.

### 6.3 Role `atendimento` — decisão F8

> **Sem permissões adicionais introduzidas pela F8.**

- Não ganha consulta/ajuste de estoque F8
- Não ganha consulta de clientes F8
- Não ganha relatórios F8

Acesso a pedidos/admin já existente via `is_staff()` permanece como está até revisão futura explícita — a F8 **não amplia** acesso por conveniência.

---

## 7. Contratos de API / services (futuros)

| Contrato | Papel |
|----------|--------|
| `getStoreInventoryMode` / `setStoreInventoryMode` | Ler/alterar modo (set = admin) |
| `adminInventoryService` | Listar saldos, movimentos |
| RPC `adjust_inventory` | Ajuste auditável (roles: admin, gerente, estoque) |
| `place_order` (evolução) | Gravar snapshot; ramificar reserva conforme modo |
| `release` / `fulfill` (evolução) | Respeitar snapshot do pedido |
| `adminCustomerService` | Listagem/detalhe staff |
| Página relatórios | Contadores + agregados mínimos |

Nenhum destes é implementado neste gate documental.

---

## 8. Critérios de saída da fase (pós-implementação)

- [ ] Modo da loja configurável com 3 estados
- [ ] Pedidos novos carregam snapshot; pedidos antigos não mudam comportamento
- [ ] Em `sem_estoque` / `estoque_ficticio` não há reserva/baixa real
- [ ] UI estoque com saldos/histórico/ajuste via RPC
- [ ] UI clientes consulta/detalhe
- [ ] UI relatórios mínimos
- [ ] Matriz de permissões enforçada no backend
- [ ] Placeholders removidos
- [ ] Sem import de catálogo nesta fatia

---

## 9. Ordem de implementação sugerida (após aprovação do gate)

1. Settings + enum de modo + snapshot em `orders`
2. Evoluir `place_order` / release / fulfill conforme snapshot
3. RPC `adjust_inventory` + revoke UPDATE direto em inventory (se aplicável)
4. UI `/admin/estoque`
5. UI `/admin/clientes`
6. UI `/admin/relatorios`
7. Auditoria rápida F8

**Gate aprovado (2026-10-04).** Implementação segue esta ordem.
