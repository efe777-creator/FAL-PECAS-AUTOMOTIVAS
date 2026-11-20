# FAL — VAL dark mode loja + admin

**Data:** 2026-11-20  
**Branch:** `dev`  
**Gate:** `npm run test:compat-antiregress` (inclui contrato CartButton + tokens `.dark`)

---

## Problema

`--fal-navy` **não inverte** no dark (marca/sidebar). Texto de conteúdo com só `text-fal-navy` fica ilegível em fundo escuro (ex.: Carrinho no header).

## Correção

1. Padrão loja: `text-fal-navy dark:text-fal-fg` em textos/links de conteúdo (~60 ocorrências / 27 arquivos + CartButton).
2. Fundos hex claros → tokens (`bg-fal-bg` / `bg-fal-surface` / `bg-fal-surface-2`) em catálogo, carrinho, checkout, placa, frete, GLB, MP shell.
3. Pix/condição: `emerald-800` + `dark:text-emerald-300`; credit line card com `dark:text-fal-fg/80`.
4. Admin: título Visual Assets → `text-fal-fg` (sidebar navy+branco já OK; conteúdo usa `text-fal-ink` ↔ fg).

## Não alterar (intencional)

- Navy em botão amarelo (`text-fal-navy-dark` sobre `bg-fal-yellow`)
- NavBar/Footer/sidebar admin (texto branco sobre navy)
- Placa Mercosul (cores institucionais)

## Verificação

- Antiregress PASS após patch
- Revalidar visual: header Carrinho no dark; PDP/catálogo; `/admin` light/dark toggle
