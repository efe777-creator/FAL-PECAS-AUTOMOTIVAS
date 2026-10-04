# FAL Peças Automotivas

Plataforma de e-commerce B2C da FAL — **Fase 1 (UI) + Fase 2 (schema/RLS/services)**.

Stack: **React + TypeScript + Vite + Tailwind CSS + React Router + Supabase**.

> Docs de produto/planejamento também em [`../docs/`](../docs/) (PRD e alinhamentos).

## Como instalar

```bash
cd fal-pecas
npm install
```

## Variáveis de ambiente

Copie o exemplo e preencha com as chaves **anon** do seu projeto Supabase:

```bash
cp .env.example .env
```

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave **anon/public** (nunca `service_role`) |

Sem `.env`, o app sobe normalmente; Auth mostra aviso e não conecta.

### Criar projeto Supabase (resumo)

1. Acesse [https://supabase.com](https://supabase.com) e crie um projeto.
2. Em **Project Settings → API**, copie URL e `anon` `public` key.
3. Cole no `.env`.
4. Em Auth → URL Configuration, adicione `http://localhost:5173` e o redirect de recuperação.

Schema + RLS da Fase 2 estão em `supabase/migrations/` (aplicados no projeto Supabase).

## Como rodar

```bash
npm run dev
```

Abra a URL do Vite (geralmente `http://localhost:5173`).

## Build de produção

```bash
npm run build
npm run preview
```

## Estrutura

```text
src/
  app/           # App, router, ProtectedRoute
  assets/logos/  # Logo oficial (sem modificação)
  components/    # common, layout, navigation, product, vehicle, cart, account
  contexts/      # AuthContext, CartContext
  data/mocks/    # SOMENTE dados de demonstração
  hooks/
  lib/           # supabase.ts (cliente único)
  pages/
  services/      # camada desacoplada (sem sb.from em UI)
  styles/        # tokens + Tailwind
  types/
```

## Arquitetura

```text
Component → Hook / Context → Service → Supabase
```

- Auth: Supabase Auth (e-mail + senha). Username preparado (sem lookup inseguro no frontend).
- Carrinho visitante: `localStorage` temporário; contrato pronto para sync Supabase.
- Veículo: filtros opcionais (Montadora, Modelo, Ano, Motor).

## Context7

A integração Vite/Tailwind/Supabase Auth foi alinhada com documentação atual via Context7 MCP.

## Comandos

| Comando | Uso |
|---------|-----|
| `npm run dev` | Desenvolvimento |
| `npm run build` | Build produção |
| `npm run preview` | Preview do build |
| `npm run lint` | Oxlint |

## Fora da Fase 2 (próximas)

Fase 3 concluída: catálogo comercial + `/admin` (catálogo). Próximas: busca avançada (F4), conta (F5), checkout (F6), operação/estoque (F7–F8 restante).
