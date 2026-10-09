# Auditoria de copy UX — Trilha 0

**Data:** 2026-10-07  
**Escopo:** `fal-pecas/src` — loja + admin (import/checkout/login/operadores)  
**Modo:** inventário (Trilha 0)

## Regras de vocabulário

| Conceito | UI | Evitar |
|----------|-----|--------|
| Fabricante do veículo | **Montadora** | marca |
| Fabricante da peça | **Fabricante** (fase futura na vitrine) | marca |
| Fornecedor | **Fornecedor** | — |
| Código interno | **Código** / **Código FAL** | SKU (cliente) |
| Confirmação MP | linguagem de negócio | webhook, sandbox, VITE_* |

**Vitrine nesta fase:** Nome · Código FAL · Aplicações · Preço · Disponibilidade — **sem fabricante/marca/fornecedor.**

## Resumo

| Categoria | ~N | Severidade |
|-----------|----|------------|
| “Marca” indevida | 0 | — |
| Jargão técnico na UI | ~28 | Alta (checkout); Média (admin) |
| Copy enganosa | ~10 | Média–Alta |
| Rótulos pouco claros | ~8 | Média |

## Achados prioritários (cliente)

| Sev. | Local | Atual → Proposta |
|------|--------|------------------|
| Alta | Checkout / Pix / Card | “webhook” → confirmação automática Mercado Pago |
| Alta | Checkout | `VITE_*` / sandbox → “modo demonstração” |
| Alta | Catalog EmptyState | “Limpar filtros” não limpa query → acionar clear real |
| Média | Login/Register | textos Supabase/.env → só em dev ou remover |
| Média | ProductCard | brand visível → **ocultar** nesta fase (plano) |
| Média | Conta | “SKU” → “Código” |

## Achados admin (amostra)

- Operadores: coluna “role” → “Nível de acesso”
- Preços: RPC/CALCULATED → português de negócio
- Import: Upsert/draft/SKU → Atualizar ou criar / Rascunho / Código FAL
- Clientes: “F8” → “Seu perfil não pode consultar clientes”

## Pontos positivos

- Montadora consistente em `VehicleSelector` / catálogo / admin
- Card/PDP já usam “Código” (não SKU) na loja

## Próximos passos

1. Quick wins cliente (checkout jargon + limpar filtros + card sem fabricante)
2. Glossário admin preços/import
3. Opcional: `copy/pt-BR.ts` centralizado
