# Relatório — Tela Operadores (acesso admin)

**Data:** 2026-10-06  
**main:** `8ac2780` (PR#15)

## Entregue

| Peça | Onde |
|------|------|
| Migration | `fal-pecas/supabase/migrations/20261006220000_admin_operators_access.sql` |
| RPCs | `admin_search_users`, `admin_set_user_role` (só administrador) |
| protect_profile_role | só `is_administrador()` pode mudar role (service_role/migration ok) |
| UI | `/admin/operadores` |
| Service | `adminOperatorsService.ts` |

## Fluxo

1. Cadastro → sempre `customer`  
2. Admin pesquisa e-mail na tela Operadores  
3. Define role staff ou revoga para `customer`  
4. Bloqueio: não remove o último administrador  

## Validação

- RPCs no projeto Supabase: OK  
- Testes 124 / build: OK  
- `lucasfeliciober@gmail.com`: promover após criar conta
