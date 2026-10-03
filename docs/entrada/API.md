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

## 4. Services atuais (fundação)

| Service | Estado |
|---------|--------|
| `authService` | Supabase Auth real |
| `productService` / `categoryService` / `vehicleService` | **Supabase (Fase 2)** — fallback mock só sem env |
| `cartStorage` | localStorage visitante + stub sync |
| `orderService` / `customerService` | Stubs (schema pronto) |

Troca de mock → Supabase deve ocorrer **dentro dos services**, sem reescrever a UI.

---

## 5. Contratos futuros (sem implementação)

- `searchService` — texto + filtros veículo
- `compatibilityService`
- `inventoryService`
- `orderService` (criação + consulta própria)
- `addressService`
- `favoriteService`
- `importService` (orquestra Edge Function)
- `paymentService` / `shippingService` — **DECISÃO PENDENTE** provedores
- `admin/*` — protegido por roles

---

## 6. Autenticação na API

- Frontend: apenas anon key + JWT do usuário
- Admin operations: Edge Function com service_role **somente no servidor**, nunca no browser
- Policies RLS alinhadas a [DATABASE.md](./DATABASE.md) e [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 7. Versionamento / mobile

Services e tipos em `types/` devem permanecer estáveis o suficiente para um futuro app (React Native) consumir a mesma API Supabase / Edge Functions.
