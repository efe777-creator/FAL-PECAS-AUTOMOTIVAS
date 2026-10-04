# Especificação — Fase 6B: Listas de Preços e Precificação Comercial

**Status:** Implementada  
**Data:** 2026-10-03  
**Branch:** `plan`  
**Base:** [ESPECIFICACAO_FASE6_ECOMMERCE.md](./ESPECIFICACAO_FASE6_ECOMMERCE.md) (aprovada), [DATABASE.md](../entrada/DATABASE.md), [API.md](../entrada/API.md), [ROADMAP_FASES_3.0.md](./ROADMAP_FASES_3.0.md)  
**Execução:** [EXECUCAO_FASE6B.md](./EXECUCAO_FASE6B.md)

---

## 1. Objetivo

Criar o **motor comercial de listas de preços** da FAL, permitindo múltiplas condições (Base, Promocional, Oficinas, Parceiros, Atacado, Especial…) **sem alterar a identidade do produto** e **sem reconstruir** o e-commerce da Fase 6.

Responde: *qual é o preço aplicável deste produto para este contexto comercial?*

---

## 2. Auditoria do estado atual (Etapa A)

| Tema | Achado |
|------|--------|
| Fonte de preço | `products.price` + `products.promo_price` (único modelo) |
| UI catálogo/PDP/card | `promoPrice ?? price` espalhado |
| Carrinho | Congela `CartItem.price` no add; **não** é fonte de verdade no pedido |
| `place_order` | `coalesce(promo_price, price)` no SQL; ignora preço do cliente — **bom gancho** |
| `order_items` | Snapshot `unit_price` sem `price_list_id` |
| Tabelas `price_list*` | **Inexistentes** |
| Import Excel/CSV app | Só stub `imports`/`import_items` (F2); **sem** UI; **sem** lib xlsx/csv no `package.json` |
| RLS products | SELECT público se `published` — preços atuais são públicos |
| Segmentação cliente→lista | **Inexistente** (`customers` só cpf/cnpj) |

**Transição:** não remover `products.price` / `promo_price` na 6B. Migrar valores para listas; manter colunas como **espelho/legado** sincronizado a partir da Lista Base (e promo legado → itens da Lista Promocional), até Fases futuras descontinuarem o uso direto.

---

## 3. Escopo

### Implementar (Etapa B, após gate)

- Tabelas `price_lists`, `price_list_items`, histórico de preço, extensão de imports para preços
- Seed: **Preço Base** (`is_default`) + **Lista Promocional**
- Migração controlada: `products.price` → Base; `promo_price` (se preenchido) → Promocional
- Função SQL + service TS `resolve_product_price` (única camada de resolução)
- Admin `/admin/precos` (listas, itens, importação CSV/XLSX com preview)
- Integração catálogo/busca DTOs com preço resolvido
- Ajuste **mínimo** em `place_order` para usar resolução + gravar `price_list_id` no item
- Histórico de alteração (manual / importação / sistema)
- Testes CA (seção 14) + preservação F6 (atomicidade, reserva, idempotência, snapshots)

### Fora (explícito)

- CRM, cupons, cashback, campanhas complexas, preço por quantidade, tributos
- Segmentação completa cliente/grupo → lista (só **ganchos** de schema/contrato)
- Marketplace / ERP / integrações externas
- Reconstruir checkout, carrinho, pedidos, estoque, pagamento
- Guest checkout, gateway real (F9)

---

## 4. Decisões oficiais (fechadas)

| Tema | Decisão |
|------|---------|
| Fonte comercial | `price_list_items` via `resolve_product_price`; UI/services **não** usam `product.price` como verdade |
| `products.price` | Mantido; espelha Lista Base após migração; deprecado para lógica nova |
| `products.promo_price` | Migrado para itens da Lista Promocional; deprecado para lógica nova |
| Listas iniciais | **Preço Base** (default) + **Lista Promocional** |
| Escopo de lista | `public` (vitrine/checkout comum) \| `assigned` (futuro B2B — não atribuível pelo cliente) |
| F6B resolução vitrine | Só listas `scope=public`, `status=active`, dentro da vigência, com item do produto; **maior `priority` vence**; se nenhuma → lista `is_default`; se ainda falhar → erro (sem inventar preço) |
| Cliente escolhe lista? | **Não** — nunca via frontend |
| Totais pedido | Continuam **somente** no servidor (`place_order`) |
| Import | Pipeline upload → parse → validação → preview → confirmação → relatório; chave = **SKU** |
| Lib Excel | Não existe hoje; Etapa B adiciona **uma** lib leve (`xlsx` SheetJS ou equivalente) só se necessário para `.xlsx`; CSV pode ser parser nativo |
| Imports genéricos F8 | 6B usa/estende `imports`/`import_items` com `kind='price_list'` (ou metadado equivalente), sem antecipar importador completo de catálogo |

---

## 5. Modelo de dados

### 5.1 `price_lists`

| Campo | Tipo | Regra |
|-------|------|--------|
| id | uuid PK | |
| name | text not null | |
| slug | text unique | |
| description | text | |
| status | text | `draft` \| `active` \| `inactive` |
| scope | text | `public` \| `assigned` |
| priority | int not null default 0 | Maior = mais prioritário na resolução pública |
| valid_from / valid_until | timestamptz null | Vigência opcional |
| is_default | boolean | **No máx. uma** lista `is_default=true` |
| created_at / updated_at | timestamptz | |

### 5.2 `price_list_items`

| Campo | Tipo | Regra |
|-------|------|--------|
| id | uuid PK | |
| price_list_id | uuid FK | |
| product_id | uuid FK | |
| price | numeric(12,2) | `>= 0` |
| created_at / updated_at | | |
| **UNIQUE** | `(price_list_id, product_id)` | |

### 5.3 `price_change_history`

| Campo | Tipo |
|-------|------|
| id | uuid |
| product_id | uuid |
| price_list_id | uuid |
| old_price | numeric null |
| new_price | numeric |
| changed_by | uuid null (auth.users) |
| source | `manual` \| `import` \| `system` |
| import_id | uuid null |
| created_at | timestamptz |

### 5.4 Extensões

- `order_items.price_list_id` uuid null FK → `price_lists` (auditoria comercial do snapshot)
- `imports`: campos/metadata `kind`, `price_list_id`, contadores no `report` jsonb
- Ganchos futuros (sem UI 6B): `customers.price_list_id` nullable **ou** tabela `customer_price_lists` — documentar preferência: **`customer_group` + `customer_group_price_lists` na F7/F8**, placeholder comentado na migration 6B se útil; **não** exigir preenchimento agora

### 5.5 Seed

1. Lista `preco-base` — name “Preço Base”, `is_default=true`, `scope=public`, `priority=0`, `status=active`
2. Lista `promocional` — “Lista Promocional”, `scope=public`, `priority=100`, `status=active` (sem vigência inicial; admin pode setar)

### 5.6 Migração de dados

1. Mapear todos `products` com `price`  
2. Validar `price >= 0`  
3. Upsert em `price_list_items` da Base  
4. Onde `promo_price is not null`, upsert na Promocional  
5. Conferir contagens Base = produtos com preço; Promocional = count(promo_price)  
6. Trigger ou sync: updates admin na Base espelham `products.price` (e opcionalmente promo legado) durante transição

---

## 6. Motor de resolução

### 6.1 Contrato

```ts
interface PriceResolutionContext {
  /** F6B: sempre 'storefront'. Futuro: 'b2b' etc. */
  channel: 'storefront'
  /** auth.uid() / customer_id — F6B não muda lista; futuro assigned */
  customerId?: string | null
  at?: string // ISO; default now()
}

interface ResolvedProductPrice {
  productId: string
  amount: number
  priceListId: string
  priceListSlug: string
  currency: 'BRL'
  /** true se veio da lista default por fallback */
  usedDefaultFallback: boolean
}

function resolveProductPrice(productId: string, ctx?: PriceResolutionContext): Promise<ResolvedProductPrice>
function resolveProductPrices(productIds: string[], ctx?: PriceResolutionContext): Promise<Map<string, ResolvedProductPrice>>
```

Implementação canônica: **RPC/SQL** `resolve_product_price(p_product_id, p_customer_id, p_at)` usada por:

- services de catálogo/busca (batch)
- `place_order` (por item)
- admin preview (opcional)

### 6.2 Algoritmo F6B (explícito — sem comportamento implícito)

Para canal `storefront` e produto publicado:

1. Considerar listas com `status = 'active'`, `scope = 'public'`, vigência válida em `p_at` (`valid_from/until` null = sem limite).
2. Entre essas, manter só as que possuem `price_list_items` para o `product_id`.
3. Se houver ≥1: escolher **maior `priority`**; empate → lista com `updated_at` mais recente (documentar).
4. Se zero: usar item na lista `is_default = true` (ainda que priority baixa).
5. Se ainda sem preço: **erro** `price_unresolved` (não cair em número mágico).
6. Listas `scope = 'assigned'` **ignoradas** no storefront até existir vínculo admin (futuro).

**Promocional vs Base:** Promocional tem `priority` maior → se tiver item e estiver ativa/vigente, **vence** a Base. Não “toda lista ativa” no sistema substitui a Base — só as elegíveis pelo algoritmo acima.

### 6.3 Onde NÃO pode viver a lógica

ProductCard, CatalogPage, ProductPage, CartPage, CheckoutPage — apenas consomem `resolvedPrice` / DTO já resolvido.

---

## 7. Integração Fase 6 (`place_order`)

Alteração **mínima e justificada**:

| Antes | Depois |
|-------|--------|
| `v_unit := coalesce(promo_price, price)` | `v_unit` + `v_price_list_id` via `resolve_product_price` |
| insert `order_items` sem lista | insert com `price_list_id` |
| Demais passos | **Inalterados**: auth, doc, endereço, frete mock, reserva, idempotência, limpeza carrinho, payments/shipments |

Preservar CA F6: atomicidade, totais server-side, reserva, idempotência, snapshots, fail→release.

Payload do cliente continua **sem** preço e **sem** `price_list_id` aceito.

---

## 8. Catálogo e carrinho

- DTO produto loja: incluir `resolvedPrice: number`, `resolvedPriceListId?`, `listPrice?` (Base, para riscar UI se diferente), deprecando uso direto de `price`/`promoPrice` na UI nova.
- Sort por preço na busca: ordenar por **preço resolvido** (ajustar RPC ou pós-processo batch — preferir SQL na Etapa B).
- Carrinho: pode guardar snapshot UX; antes de `place_order` o servidor recalcula. Opcional F6B: revalidar preços ao abrir checkout (toast se mudou).

---

## 9. Admin `/admin/precos`

Sem redesenhar o AdminLayout — novo item de menu staff.

**Listas:** CRUD, ativar/desativar, vigência, prioridade, marcar default (com exclusividade).  
**Itens:** busca por SKU/nome, CRUD preço na lista.  
**Importação:** selecionar lista → upload CSV/XLSX → validação → preview → confirmar → relatório.

Formato mínimo CSV:

```text
SKU;PRECO
PVI1032;89,90
```

Separador `;` ou `,` detectado; decimal BR `,` ou `.`.

---

## 10. Pipeline de importação (obrigatório)

```text
Upload → Parsing → Validação → Preview → Confirmação → Aplicação → Relatório
```

Validar: SKU inexistente, preço inválido/negativo, duplicidade no arquivo, produto archived, linha vazia, coluna ausente.

Preview: SKU, nome, preço atual na lista, novo preço, ação (criar/atualizar/ignorar), problema.

Relatório + registro em `imports` + linhas em `import_items` + `price_change_history` com `source=import`.

Nunca aplicar no upload.

---

## 11. Segurança / RLS

| Ator | Pode |
|------|------|
| Anon / cliente | Ler **apenas** preço resolvido via RPC/view pública (listas `public` elegíveis) — **não** listar todas as listas assigned |
| Staff | CRUD listas/itens/import |
| Cliente | **Nunca** alterar lista, preço, atribuir lista a si, enviar preço/total |

Proibido: `GET` público retornando Oficinas/Parceiros/Especial.

---

## 12. Futuro (só arquitetura)

```text
Customer → (customer_group) → price_list(scope=assigned)
         → resolve_product_price
```

Sem reconstruir catálogo/carrinho/checkout/pedidos.

---

## 13. Módulos de execução (Etapa B)

Ver [EXECUCAO_FASE6B.md](./EXECUCAO_FASE6B.md): M1…M10.

---

## 14. Critérios de aceite

### Estrutura
- Múltiplas listas; Base + Promocional; UNIQUE item; vigência; prioridade; um default

### Admin
- CRUD listas/itens; import CSV+XLSX; preview; relatório; histórico

### Segurança
- Cliente não escolhe lista privilegiada; não altera preço; RLS; backend resolve

### E-commerce (preservar F6)
- Catálogo usa preço resolvido; carrinho ≠ verdade; `place_order` resolve; total server-side; reserva; idempotência; snapshot + `price_list_id`; pedido antigo imutável se preço mudar depois

### Testes obrigatórios (T1–T15)
Conforme prompt mestre (Base only; Base+Promo; três listas; vencida; inativa; SKU inválido; preço inválido; import OK; manipular list_id; manipular price; snapshot; imutabilidade; atomicidade; release; idempotência).

---

## 15. Gate

1. **Aprovar esta spec + EXECUCAO_FASE6B** (humano)  
2. Só então Etapa B (código/migrations)  
3. Sem push sem autorização  
4. Não editar `.cursor/plans`  

**Estado:** Etapa B concluída — implementação + build + checklist T1–T15.
