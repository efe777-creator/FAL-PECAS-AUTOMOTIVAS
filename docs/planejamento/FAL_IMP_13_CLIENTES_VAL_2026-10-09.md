# FAL-IMP-13 / VAL-13 — Clientes

**Data:** 2026-10-09  
**Gate:** Onda 2  
**Runtime:** `wtbpwuiayednvlhvuhbh`

---

## 1. Auditado

| Área | Achado |
|------|--------|
| Conta loja (`/conta/*`) | Perfil, endereços, veículos, favoritos, pedidos — fluxo completo |
| Admin `/admin/clientes` | Lista + detalhe + RPC `staff_can_view_customers_f8` OK |
| Dados wtbp | **3** customers · **3** addresses · RPC staff presente |
| Gaps | Sem busca na lista; telefone só no detalhe; sem empty; detalhe sem loading/endereços; home conta sem resumo |

**Fora do escopo:** CRM, grupos HF, exclusão admin, e-mail (só Auth).

---

## 2. Alterado

| Camada | Mudança |
|--------|---------|
| `adminCustomerService` | Phone na listagem; `addressCount` no detalhe |
| `AdminCustomersPage` | Busca local; coluna telefone; empty; loading detalhe; contagem; seleção destacada |
| `AccountHomePage` | Resumo pedidos / endereços / veículos |

**Não alterado:** schema; roles Bloco F; CRM; FIND-013 permissões granulares.

---

## 3. VAL-13

| Teste | Resultado |
|-------|-----------|
| SQL customers | **3** |
| Browser admin | Busca + colunas Nome/Usuário/**Telefone**/Documento/Desde · 3 linhas |
| Lint | sem erros novos |

---

## 4. Status

| | |
|--|--|
| FAL-IMP-13 | **Concluído** |
| FAL-VAL-13 | **PASS** |
| Próximo | `FAL-IMP-14` **condicionado** (pedidos/estoque) · ou paralelo MP / FIND-006 · ou IMP-15 só pós D-FRETE |

**Nota protocolo:** não aprofundar IMP-14 sem necessidade/schema confirmado.
