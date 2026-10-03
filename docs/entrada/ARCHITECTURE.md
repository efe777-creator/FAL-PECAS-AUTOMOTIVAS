# Arquitetura — FAL Peças Automotivas 3.0

**Status:** Fonte de verdade documental (Fase 1.5)  
**Stack real aprovada:** React + TypeScript + Vite + React Router + Tailwind CSS + Supabase  
**PRD de referência:** [FAL_PRD_3.0.md](./FAL_PRD_3.0.md) (não alterado)  
**Alinhamento:** [../planejamento/ALINHAMENTO_FASE1_PRD.md](../planejamento/ALINHAMENTO_FASE1_PRD.md)

---

## 1. Arquitetura geral

A FAL 3.0 é uma plataforma B2C de e-commerce de peças automotivas, operacionalmente **independente da HF**. A fundação é um monólito modular no frontend, com backend gerenciado pelo Supabase (Auth, PostgreSQL, Storage, RLS; Edge Functions quando a lógica exigir servidor).

```text
Browser (React SPA)
  → pages / components (UI)
  → hooks / contexts (estado e orquestração)
  → services (regras de acesso a dados)
  → lib/supabase.ts (cliente anon único)
  → Supabase (Auth / Postgres / Storage / Edge Functions)
```

Componentes visuais **não** chamam `supabase.from(...)` diretamente.

---

## 2. Camadas e responsabilidades

| Camada | Responsabilidade |
|--------|------------------|
| `pages/` | Rotas, composição de seções, SEO básico |
| `components/` | UI reutilizável (layout, navegação, product, vehicle, common) |
| `hooks/` | Estados assíncronos (loading/erro/vazio) ligados a services |
| `contexts/` | Auth, Cart (estado global justificado) |
| `services/` | Isolamento do Supabase / mocks; contratos estáveis |
| `lib/supabase.ts` | Único `createClient` com chave **anon** |
| `types/` | Tipos de domínio compartilhados |
| `data/mocks/` | Dados de demonstração apenas |

---

## 3. Frontend

- **React 19 + TypeScript strict + Vite**
- **React Router** com lazy loading de páginas
- **Tailwind CSS v4** + tokens em `src/styles/index.css`
- Mobile-first; navegação inferior (`MobileNav`) no mobile
- Path alias `@/` → `src/`

Aplicação em: `fal-pecas/`

---

## 4. Autenticação

- Camada: **Supabase Auth**
- Fase atual: e-mail + senha (`signInWithPassword`, `signUp`, `resetPasswordForEmail`)
- Sessão persistente + `onAuthStateChange` via `AuthContext`
- Rotas protegidas: `/conta`, `/pedidos`
- Username: campo no cadastro (metadata); login por username **exige** resolução segura (Edge Function/RPC) — **não** lookup inseguro no frontend

---

## 5. Carrinho

```text
Visitante → localStorage (temporário)
Usuário autenticado → sincronização Supabase (futuro)
Pedido → persistência definitiva no banco (futuro)
```

`CartContext` + contrato `CartStorage` (`local` | `supabase`).

---

## 6. Supabase

| Recurso | Uso |
|---------|-----|
| Auth | Login, cadastro, recuperação, sessão |
| PostgreSQL | Schema Fase 2 aplicado ([DATABASE.md](./DATABASE.md), migrations em `fal-pecas/supabase/migrations/`) |
| Storage | Imagens de produto (futuro) |
| RLS | Obrigatório antes de dados reais |
| Edge Functions | Regras críticas / username / importação / webhooks (futuro) |
| Anon key | Única chave no frontend (`VITE_SUPABASE_*`) |
| service_role | **Proibido** no frontend |

---

## 7. Segurança

- Secrets apenas em `.env.local` (não versionado)
- `.env.example` com placeholders
- RLS: públicos só dados publicados; privados por `auth.uid()`
- Admin: papéis futuros — nunca expostos via anon sem policy
- Não criar policies permissivas (`using (true)` em dados privados) só para “fazer funcionar”

---

## 8. Relação FAL × HF

- FAL = entidade operacional própria (catálogo, preços, pedidos, regras)
- HF = possível **fonte** futura de produtos/estoque
- Integração HF = **DECISÃO PENDENTE** (interface, contratos, sincronização)

---

## 9. Crescimento futuro

- App mobile: consumir os mesmos services/contratos (API-first via Supabase + Edge Functions)
- Admin: app ou área separada com roles
- Escala de catálogo: índices, busca (RPC/full-text), paginação

---

## 10. Divergências PRD §10 × arquitetura atual

| PRD | Atual (aprovado) |
|-----|------------------|
| Next.js + App Router | Vite + React SPA |
| NestJS + Prisma | Supabase (Auth, Postgres, RLS) |
| SQLite em dev | Postgres Supabase / mocks |
| Monorepo apps/web\|api\|admin | App único `fal-pecas/` |
| OpenAPI Nest | Cliente Supabase + services |

Motivos: fundação rápida B2C, Auth/RLS nativos, baixo acoplamento reversível via `services/`.

---

## 11. Decisões pendentes

- Gateway de pagamento
- Provedores de frete
- Object storage definitivo (Supabase Storage vs outro)
- Fonte dos dados de veículos
- Interface HF
- Requisitos fiscais (CPF/CNPJ no checkout)
- Localização de `docs/` no futuro repositório Git (**DECISÃO PENDENTE**)
- Formalização definitiva do logo oficial após validação final

---

## Preservado do rascunho Fase 1

Conteúdo consolidado a partir de `fal-pecas/docs/architecture.md`: camadas, Auth, carrinho, princípios RLS, proibição de `service_role` no frontend.
