# Auditoria Fase 4B — 2026-10-03

**STATUS: APROVADA**

**Escopo:** polimento do `/admin` existente (entrada, veículos, arquivar, UX PT).  
**Não reconstruído:** painel, auth, motor de busca F4.

---

## O que já existia (F3)

Dashboard, produtos (CRUD + refs/apps/imagens), categorias, fabricantes, montadoras, fornecedores, StaffRoute, RLS staff write-only.

## Corrigido na 4B

| Item | Resultado |
|------|-----------|
| Link Painel Admin (Conta + header) | OK — só staff |
| Veículos editar/status UI | OK |
| Arquivar com confirmação | OK |
| Labels status PT | OK |
| DELETE permanente produto | **Não implementado na UI** (decisão: arquivar) |
| Filtros dinâmicos comerciais | **Documentado** — dívida; não expandido |

## CA (resumo)

| IDs | Resultado |
|-----|-----------|
| CA-01…04 acesso | OK |
| CA-05…08 entidades | OK (já F3 + labels) |
| CA-09…10 veículos | OK |
| CA-11…13 arquivar | OK (RPC/F4 só published) |
| CA-14 DELETE | N/A — não exposto |
| CA-15…20 UX/refs | OK |
| CA-21 sem duplicar painel | OK |
| CA-22…24 F4/build | OK |
| CA-25 filtros comerciais | Dívida documentada (mestre ≠ facetado) |

## Dívida / próximo

1. Filtros públicos derivados de produtos published + PVC (evolução F4/loja).
2. Hardening `profiles.role` UPDATE (dívida F3).
3. **Fase 5** — Experiência do cliente.

## Fora

Pedidos, estoque, checkout, faceted search.
