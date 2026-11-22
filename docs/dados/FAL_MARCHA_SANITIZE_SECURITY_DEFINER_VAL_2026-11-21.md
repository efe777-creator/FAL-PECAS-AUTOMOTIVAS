# VAL — sanitize SECURITY DEFINER + makers vazias inactive

**Branch:** `dev` · **Projeto:** wtbp · **Sem MAIN**

## Achado

`sanitize_garage_vehicle_fks` era **invoker**. No trigger de UPDATE da garagem (cliente), RLS público só enxerga `verified` → modelo `superseded` não remapeava para canônico e a FK era **zerada**.

## Correções

1. Migration `20261122220000`: `sanitize_garage_vehicle_fks` → **SECURITY DEFINER** (+ grants).
2. `SR` / `Yamaha` → `inactive` (só filhos quarentenados; árvore já filtrava).

## Pós

- `sanitize_security_definer` = true
- `makers_empty_public` = 0
- Vitest antiregress: **17/17**
