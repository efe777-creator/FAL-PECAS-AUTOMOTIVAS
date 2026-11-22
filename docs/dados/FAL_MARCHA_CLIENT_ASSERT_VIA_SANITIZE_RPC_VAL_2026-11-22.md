# VAL — Client assert FK via RPC sanitize

**Branch:** `dev` · **Projeto:** wtbp · **Sem MAIN**

## Achado

`assertVerifiedGarageFks` lia `models` no client. Sob RLS público (só verified), `superseded` era invisível → **zerava** FK em vez de remapear ao canônico (mesmo buraco que o SECURITY DEFINER do SQL fechou no trigger).

## Correção

`assertVerifiedGarageFks` chama `rpc('sanitize_garage_vehicle_fks')` (SECURITY DEFINER canônico).

## Pós

- Higiene wtbp: bad/órfãos = 0 · shell0 = 1 · sanitize_definer = true
- Vitest g1 + e1 + antiregress: **21/21**
