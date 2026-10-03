# Especificação — Fase 4B: Auditoria e polimento do Painel Admin

**Status:** Implementada — ver [EXECUCAO_FASE4B.md](./EXECUCAO_FASE4B.md)  
**Data:** 2026-10-03  
**Branch:** `plan`  
**Base:** painel `/admin` (Fase 3) + motor de busca (Fase 4)

## Objetivo

Fechar lacunas do painel administrativo de catálogo **sem reconstruir** o `/admin`.

## Escopo

- Entrada “Painel Administrativo” na Conta/Header (só staff)
- Veículos: editar + ativar/inativar na UI
- Produtos: arquivar com confirmação como remoção comercial
- Labels/status em português; feedback básico
- Documentar mestre vs comercial (filtros dinâmicos = evolução futura)

## Fora

Pedidos, clientes, estoque, relatórios, checkout, faceted search, segundo painel, nova auth, DELETE permanente de produto.

## Decisões

| Tema | Decisão |
|------|---------|
| Remoção comercial | Arquivar (`archived`); some da loja e da busca F4 |
| DELETE permanente | Não exposto — FKs/histórico; service permanece sem UI |
| Filtros públicos | Hoje ainda leem cadastro mestre; dívida documentada (não expandir 4B) |
| Fabricante ≠ fornecedor ≠ montadora | Preservado |

## Critérios

CA-01…CA-25 do prompt mestre 4B (aplicáveis).
