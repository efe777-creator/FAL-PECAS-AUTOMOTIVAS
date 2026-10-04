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

Troca de mock → Supabase deve ocorrer **dentro dos services**, sem reescrever a UI.

---

## 4b. Precificação (Fase 6B — planejada)

| Contrato | Papel |
|----------|--------|
| `resolveProductPrice` / RPC SQL | **Única** camada que determina preço aplicável (contexto storefront; futuro assigned) |
| `adminPriceListService` | CRUD listas/itens (staff) |
| `adminPriceImportService` | Pipeline CSV/XLSX com preview (staff) |

**Invariantes:** frontend não envia preço nem `price_list_id` aceito; `place_order` continua recalculando no servidor; listas `assigned` não são enumeráveis publicamente.

Spec: [ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md](../planejamento/ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md).

---

## 5. Contratos futuros / outras fases

- `compatibilityService` (avançado)
- `inventoryService` (UI operação — F7/F8)
- `importService` catálogo completo (F8; preços por lista = 6B)
- `paymentService` / `shippingService` reais — F9
- `admin/*` — protegido por roles

---

## 6. Autenticação na API

- Frontend: apenas anon key + JWT do usuário
- Admin operations: Edge Function com service_role **somente no servidor**, nunca no browser
- Policies RLS alinhadas a [DATABASE.md](./DATABASE.md) e [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 7. Versionamento / mobile

Services e tipos em `types/` devem permanecer estáveis o suficiente para um futuro app (React Native) consumir a mesma API Supabase / Edge Functions.
