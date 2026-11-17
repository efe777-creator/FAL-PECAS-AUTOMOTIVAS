# Design — Admin Produtos: dark mode + filtros modelo/versão/motor

**Data:** 2026-11-17  
**Status:** APROVADO PARA MARCHA (plano)  
**Tela:** `/admin/produtos` (`AdminProductsPage`)  
**Decisões:** dark = global tokens + polish da tela (C); filtros de veículo = independentes (C); abordagem 1

---

## 1. Problema

1. **Contraste no dark:** na lista de produtos, código, nome, status e preço ficam quase ilegíveis. Causa: a classe `dark` vive no layout admin interno; `body` continua com tokens light; células sem `text-fal-fg` herdam cor escura no fundo escuro. Links/botões usam classes light-first (`text-emerald-800`, banner `amber-*`, “Editar” mobile `bg-fal-navy`).
2. **Filtro incompleto:** só existe select de Montadora. O operador precisa filtrar também por Modelo, Versão e Motor, **sem** exigir Montadora primeiro.

## 2. Objetivos

1. Corrigir herança de cor/fundo no wrapper `.dark` e remapear tokens auxiliares (`auth-link`).
2. Deixar tabela, selects e ações da tela Produtos legíveis no dark (e ok no light).
3. Adicionar filtros independentes Modelo / Versão / Motor na listagem admin, estendendo o filtro de compatibilidade já usado pela Montadora.

## 3. Não-objetivos

- Mover `dark` para `<html>` / `documentElement`
- Dark na loja (vitrine)
- Cascata obrigatória Montadora → Modelo → …
- Filtro por ano
- Nova RPC / migration no banco
- Redesign do painel “Alterações em lote”
- Alterar API pública do `Button` além do que o tema já corrige

## 4. Tema dark (global)

**Arquivo:** `fal-pecas/src/styles/index.css`

1. Em `.dark`, além dos overrides de variáveis: `color: var(--fal-fg)` e `background-color: var(--fal-bg)` para herança correta sob o wrapper admin.
2. Remap dark: `--fal-auth-link` para tom âmbar/amarelo legível (ex. próximo de `--fal-yellow` / warning), e `--color-fal-auth-link: var(--fal-auth-link)`.
3. Em `@layer base`, `input` e `select` com `color: var(--fal-fg)` e `background-color: var(--fal-surface)` (controles nativos ficam alinhados ao tema; options do SO podem variar).

Navy/yellow de marca **não** invertem (já documentado no arquivo).

## 5. Filtros de veículo (independentes)

### 5.1 UI — `AdminProductsPage.tsx`

- Novos estados: `modelId`, `versionName`, `engine` (strings; vazio = Todos).
- Selects **Modelo**, **Versão**, **Motor** no formulário de filtros, junto à Montadora.
- Independentes na query: qualquer combinação válida.
- **Sugestão de lista (não bloqueio):** se Montadora preenchida, `adminListModels(manufacturerId)` enxuga modelos; se Modelo (e/ou Montadora) preenchidos, opções de versão/motor vêm de `adminListVersions` / distincts filtrados. Sem Montadora, listas carregam o universo ativo necessário.
- `listParams`, `reload`, `clearFilters` e botão Limpar incluem os novos campos.
- Grid do formulário ajustado para caber os selects (quebra em 2 linhas no desktop se preciso).
- Classes explícitas nos selects: `bg-fal-surface text-fal-fg border-fal-line`.

### 5.2 Service — `adminProductService.ts`

Estender `AdminProductListParams`:

- `modelId?: string`
- `versionName?: string`
- `engine?: string`

Quando **qualquer** de `manufacturerId | modelId | versionName | engine` estiver preenchido:

1. Consultar `product_vehicle_compatibility` com `vehicle_versions!inner(...)`.
2. Aplicar `.eq` / `.ilike` nos campos informados (mesmo espírito de `resolveVersionIds` em `adminApplicationService.ts`).
3. Restringir `products.id IN (product_ids)`; se conjunto vazio → `{ items: [], hasMore: false }`.

Sem filtro de veículo → comportamento atual (sem join).

Helpers de opções (distinct version_name / engine) podem viver em `adminVehicleService` ou helper local puro testável — preferir reutilizar `adminListModels` / `adminListVersions` quando bastar.

## 6. Polish só em Produtos

| Elemento | Mudança |
|----------|---------|
| Células tabela (código, nome, status, preço) | `text-fal-fg` (nome mantém `font-semibold`) |
| “Disponível” | `text-fal-success` (remover `text-emerald-800`) |
| “Editar” desktop | permanece `text-fal-auth-link` |
| Card mobile “Editar” | deixar `bg-fal-navy text-white`; usar padrão alinhado (`Button` primary ou link `text-fal-auth-link` + área tocável) |
| Banner “carregar mais” | `border-fal-warning/40 bg-fal-warning/10 text-fal-fg` |

## 7. Testes

- Extrair (ou cobrir) lógica pura de “há filtro de veículo?” / montagem dos predicados e unit test (padrão de `adminMeasureGapFilter.test.ts`).
- Verificação manual: `/admin/produtos` em dark e light — contraste da tabela, selects, botões; filtrar só motor, só modelo, combinações, Limpar.

## 8. Riscos

- Listas de modelo/versão/motor **sem** montadora podem ficar longas; aceitável nesta entrega (filtros independentes).
- `ilike` em engine/version_name pode cruzar homônimos entre montadoras — esperado pelo modo independente.
- Options nativas de `<select>` no SO escuro/claro podem diferir do tema; controles com fundo/texto FAL mitigam o problema principal.
