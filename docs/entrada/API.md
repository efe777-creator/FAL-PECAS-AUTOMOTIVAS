# API / Services — FAL Peças Automotivas 3.0

**Status:** Fonte de verdade (Fase 1.5)  
**Arquitetura atual:** não assume NestJS REST. Usa Supabase.

---

## 1. Estratégia atual

```text
React
  → Hooks / Contexts
  → Services (TypeScript)
  → Supabase JS client (anon)
  → PostgreSQL (+ Auth + Storage)
```

Arquivos-chave:

- `fal-pecas/src/lib/supabase.ts` — cliente único
- `fal-pecas/src/services/*` — produtos, categorias, veículos, auth, cart, orders, customers
- `fal-pecas/src/contexts/AuthContext.tsx`, `CartContext.tsx`
- `fal-pecas/src/hooks/useCatalog.ts`

---

## 2. Onde fica a lógica

| Tipo de regra | Onde |
|---------------|------|
| UI / formatação / navegação | Components / pages |
| Orquestração async (loading/erro) | Hooks / contexts |
| Acesso a dados / mapeamento DTO | Services |
| Auth session | AuthContext + authService |
| Invariantes de negócio críticas (estoque, preço pedido, import upsert, permissões) | **Backend:** RLS, RPC Postgres, ou Edge Functions — **não** espalhar em componentes |

**Regra:** nenhuma regra crítica de negócio deve ficar espalhada nos componentes React.

---

## 3. Quando usar cada mecanismo Supabase

| Mecanismo | Uso |
|-----------|-----|
| **Supabase client** (`from`, `auth`) | CRUD simples sob RLS; sessão; leituras públicas de catálogo |
| **Database queries** | Filtros, joins leves, paginação; sempre com RLS |
| **RPC (Postgres functions)** | Busca complexa, compatibilidade, operações atômicas |
| **Edge Functions** | Username→email seguro, webhooks pagamento, importação pesada, jobs, segredos |
| **Storage** | Imagens de produto (buckets + policies) |

---

## 4. Services atuais (fundação → F6)

| Service | Estado |
|---------|--------|
| `authService` | Supabase Auth real |
| `productService` / `categoryService` / `vehicleService` / `searchService` | Supabase + RPC busca |
| `cart` / `CartContext` | local + sync auth (`carts`) |
| `placeOrderService` / `orderDetailService` / `orderQueryService` | Pedido F6 |
| `paymentService` / `shippingService` | Adapters simulados/mock (F6); reais na F9 |
| `customers/*` | Perfil, endereços, veículos, favoritos |
| `addressLookup` / `CepProvider` (F6C) | Consulta CEP → endereço normalizado; UI desacoplada do fornecedor |
| `FreightService` (F6C) | Facade sobre `ShippingProvider` com cache/debounce; mock permanece ativo |

Troca de mock → Supabase deve ocorrer **dentro dos services**, sem reescrever a UI.

---

## 4b. Precificação (Fase 6B)

| Contrato | Papel |
|----------|--------|
| `resolveProductPrice` / RPC SQL | **Única** camada que determina preço aplicável (contexto storefront; futuro assigned) |
| `adminPriceListService` | CRUD listas/itens + pipeline import CSV/XLSX (staff) |

**Invariantes:** frontend não envia preço nem `price_list_id` aceito; `place_order` continua recalculando no servidor; listas `assigned` não são enumeráveis publicamente.

Spec: [ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md](../planejamento/ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md).

---

## 4c. Endereço / frete (Fase 6C)

| Contrato | Papel |
|----------|--------|
| `CepProvider.lookupByCep` | Retorna logradouro/bairro/cidade/UF normalizados |
| `FreightService.quote` | Cotação com cache curto; delega a `ShippingProvider` |
| `ShippingProvider` | Contrato F6 (mock ativo); stubs Correios/Frenet/Carrier na 6C; reais na F9 |
| Admin origem | Configuração CEP/endereço de origem da loja (staff) |

**Invariantes:** UI não acopla a ViaCEP; `place_order` revalida frete no server; client não define valor de frete.

Spec: [ESPECIFICACAO_FASE6C_ENDERECOS_FRETE.md](../planejamento/ESPECIFICACAO_FASE6C_ENDERECOS_FRETE.md).

---

## 4d. Ciclo do pedido (F6D spec / F7A implementado)

| Contrato | Papel |
|----------|--------|
| `projectCustomerTimeline` (`orderLifecycle.ts`) | Projeção timeline cliente |
| `order_events` + RLS | Fatos append-only (`visibility`: internal \| customer) |
| `transition_order_status` / `orderTransitionService` | Única via staff para mudar `orders.status` |
| `buyAgainService` | Itens antigos → carrinho com preço/estoque atuais |
| `confirm_simulated_payment` | Após approve: `pagamento_aprovado` → `recebido` → `em_analise` + eventos |

**Invariantes:** cliente não altera status; indisponibilidade pós-pagamento não cancela automaticamente; site/admin/app compartilham o mesmo modelo.

Spec: [ESPECIFICACAO_FASE6D_CICLO_PEDIDO.md](../planejamento/ESPECIFICACAO_FASE6D_CICLO_PEDIDO.md) · Execução: [EXECUCAO_FASE7A.md](../planejamento/EXECUCAO_FASE7A.md).

---

## 5. Contratos futuros / outras fases

- `compatibilityService` (avançado)
- Operação pedido F7A–F7E; `inventoryService` operacional — F7F / F8
- `importService` catálogo completo (F8; preços por lista = 6B)
- `paymentService` / providers de frete **reais** — F9 (adapters preparados na 6C)
- `admin/*` — protegido por roles

---

## 6. Autenticação na API

- Frontend: apenas anon key + JWT do usuário
- Admin operations: Edge Function com service_role **somente no servidor**, nunca no browser
- Policies RLS alinhadas a [DATABASE.md](./DATABASE.md) e [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 7. Versionamento / mobile

Services e tipos em `types/` devem permanecer estáveis o suficiente para um futuro app (React Native) consumir a mesma API Supabase / Edge Functions.
