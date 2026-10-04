# Especificação — Estoque e operação comercial inicial

**Data:** 2026-10-04  
**Status:** Aprovado para implementação parcial (P0 modo OK); Balanço/Import **somente arquitetura**  
**Branch:** `plan`  
**Base:** F7 + F8 Fatia A + E2E 3 modos PASS · P0 troca de modo corrigido

---

## 1. Objetivo

A FAL começará a vender **sem controle físico obrigatório de estoque**.

- Modo inicial da loja: **`sem_estoque`**
- Ativar comercialmente só produtos que a FAL consegue vender ou obter rapidamente
- Manter a infraestrutura pronta para evoluir: `sem_estoque` → `estoque_ficticio` → `com_estoque`

Isso **não** significa “não ter produtos”. Significa: operação baseada em **disponibilidade comercial**, não em saldo contado.

---

## 2. Conceitos (não misturar)

| Conceito | Significado |
|----------|-------------|
| `products.is_available` | Disponibilidade **comercial** (pode oferecer/vender) |
| `inventory.quantity_on_hand` | Quantidade física existente |
| `inventory.quantity_reserved` | Quantidade física reservada |
| available (on_hand − reserved) | Quantidade física disponível |
| `store_settings.inventory_mode` | Modo atual da **loja** |
| `orders.inventory_mode_at_order` | Snapshot do modo na **criação** do pedido |

Regra: mudar o modo da loja **não** altera pedidos existentes.

---

## 3. Produtos — ativo / preparado / inativo

Usar o que já existe (sem inventar campos obrigatórios agora):

| Situação conceitual | Como representar hoje |
|---------------------|------------------------|
| **Ativo para venda** | `status` comercialmente ativo + `is_available = true` |
| **Cadastro preparado** | produto cadastrado, `is_available = false` (ainda não oferecer) |
| **Inativo** | `status` archived/inativo ou indisponível comercialmente |

**Catálogo ≠ produtos vendáveis.** Pode haver milhares cadastrados e dezenas/centenas ativos no início.

Futuro (só especificado): flags explícitas “Ativo para venda” / metadados de fornecimento — **não implementar nesta rodada**.

---

## 4. Checklist “Pode vender?”

Um produto só deve ficar `is_available = true` se:

1. Conseguimos comprar/obter  
2. Há fornecedor conhecido  
3. Preço de compra é minimamente conhecido  
4. Conseguimos formar preço de venda  
5. Aplicação está validada o suficiente  
6. Conseguimos atender no prazo prometido  

---

## 5. Tela Estoque (comportamento por modo)

Arquivo: `fal-pecas/src/pages/admin/inventory/AdminInventoryPage.tsx`

### Cabeçalho

- Label **Modo atual** (persistido)
- Admin: select + **confirmação inline** (sem `window.confirm`)
- Mensagem de sucesso específica do modo
- Erros Supabase/PostgREST com message/details/code (não genérico opaco)

### `sem_estoque` (modo de operação inicial)

- Coluna **Saldo** = `—` (nunca “0” enganoso)
- Sem ajuste físico
- Texto: vendas usam disponibilidade comercial (`is_available`)

### `estoque_ficticio`

- Quantidades apresentacionais + aviso de que não são estoque auditado
- Sem ajuste físico
- Pedidos não reservam/baixam físico

### `com_estoque`

- Colunas Físico / Reservado / Disponível  
- Ajuste via RPC `adjust_inventory` (nunca UPDATE direto)
- Reserva/baixa no ciclo F7

---

## 6. Impacto no catálogo

- `is_available` é a decisão comercial  
- Em `sem_estoque` / `estoque_ficticio`, **não** derivar indisponibilidade só porque não há saldo físico  
- Em `com_estoque`, `sync_product_availability` pode espelhar saldo → `is_available` (já existente)

---

## 7. Impacto no checkout

No modo `sem_estoque` (e `estoque_ficticio`):

- Compra depende de produto comercialmente disponível  
- **Não** depende de `quantity_on_hand`  
- `place_order` grava `inventory_mode_at_order` e **não** cria `reserve` / baixa  

---

## 8. Impacto nos pedidos

- Snapshot `inventory_mode_at_order` é imutável após criação  
- `release` / `fulfill` respeitam o snapshot (não o modo atual da loja)  
- Validado no E2E e no P0 (pedidos antigos mantêm snapshot após troca de modo)

---

## 9. Balanço — somente arquitetura (não implementar)

```text
Saldo sistema → Contagem física → Diferença → Revisão → Aprovação
    → adjust_inventory → inventory_movements → Novo saldo
```

Nunca: contagem → UPDATE direto em `inventory`.

---

## 10. Importação de estoque — somente arquitetura (não implementar)

```text
CSV → upload → validação → preview → correções → confirmação
    → lote auditável → movimentos
```

**Não é F8.1** (import de catálogo). Fluxos distintos:

- Catálogo: SKU, nome, categoria, marca, aplicação…  
- Estoque: SKU + quantidade (+ custo/localização depois)

Importação nunca sobrescreve silenciosamente; gera lote + movimentos.

---

## 11. Permissões

Reutilizar matriz F8:

- Alterar modo: **administrador** (`set_store_inventory_mode` + `is_administrador`)  
- Ajustar estoque: administrador / gerente / estoque (`adjust_inventory`)  
- Consultar estoque: staff autorizado  

Sem novas permissões nesta fase.

---

## 12. Fora do escopo

WMS · multi-depósito · lote · barcode · custo médio · NF · compras · modo por produto · F8.1 · F9 · redesign amplo · gateway/frete reais

---

## 13. P0 — Troca de modo (implementado 2026-10-04)

**Causa raiz:** `UPDATE store_settings` sem cláusula `WHERE` → erro Postgres/Supabase `21000` (“UPDATE requires a WHERE clause”). A UI ainda mascarava o erro com mensagem genérica.

**Correção:**

- RPC com `WHERE id is not null` + `row_security = off`  
- Confirmação inline; select controlado pelo modo persistido  
- Reload e UI semântica por modo  
- `formatInventoryError` para message/details/code  

**Estado final da loja após P0:** `sem_estoque`

Migrations:

- `20261004180000_fix_set_store_inventory_mode.sql`  
- `20261004180100_fix_set_mode_where_clause.sql`  

---

## 14. Ordem futura de implementação (após esta spec)

1. Operação comercial (produtos ativos + disciplina `is_available`) — em curso conceitual  
2. Refinos Visão geral Estoque (já com P0)  
3. Balanço  
4. Importação de estoque  
5. Contagem inicial  
6. Ativar `com_estoque` quando a operação física estiver pronta  
