# FAL — Pacotes de execução: Ondas 2–4 (Home / compra)

**Data:** 2026-11-10  
**Status:** Documentação de pacotes — **não** autoriza implementação  
**Spec pai:** [FAL_SPEC_HOME_EXPERIENCIA_COMPRA_2026-11-09.md](./FAL_SPEC_HOME_EXPERIENCIA_COMPRA_2026-11-09.md)  
**MVP:** [FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md](./FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md)

---

## Onda 2 — Catálogo e compra

**Objetivo:** achar a peça certa depois do veículo identificado; reduzir erro de aplicação.

| ID | Entrega | Dependências | Critério de aceite |
|----|---------|--------------|--------------------|
| C01 | Melhorar reconhecimento (códigos, nomes, sinônimos) | Flag + dados sinônimos (gate H) | Termos/códigos de amostra retornam hits esperados |
| C02 | Filtros/ordenação/aplicação no catálogo | RPC `search_products` | Facetas e veículo coerentes no mobile |
| C03 | Empty-state útil | CatalogPage | Sem página vazia: sugestões + manual + atendimento |
| C04 | PDP: técnico + compatibilidade visual | `CompatibilityAppsBlock` | Estados: confirmada / conferência / incompatível; ausência ≠ confirmada |
| C05 | Garantia/infos por categoria (025) | Schema categoria + admin | Texto por categoria na PDP/categoria sem inventar prazo |
| C07 | Carrinho: compatibilidade + disponibilidade + custos | Veículo ativo na sessão | Aviso claro se item não casa com veículo |
| C08–C10 | Progressivo no checkout (sem guest total) | Auth atual | Fluxo guest→login→checkout sem perder carrinho |

**Fora da Onda 2:** pedido 100% anônimo (RPC/RLS), kits, personalização Home.

**Arquivos típicos:** `CatalogPage.tsx`, `searchService.ts`, `ProductPage.tsx`, `CartPage.tsx`, `CategoriesEditorForm.tsx`, migrations 025.

---

## Onda 3 — Relacionamento e conversão

| ID | Entrega | Critério de aceite |
|----|---------|-------------------|
| C06+ | Garagem guest local → merge no login | Visitante salva local; ao autenticar, oferece associar |
| H12 | Kits com aplicação e estoque | Kit só aparece se todos itens OK e aplicação validada |
| H13 | Personalização leve da Home | Mesmos blocos; conteúdo adapta (veículo salvo / recorrente) |
| — | Recompra / favoritos por veículo | Atalhos na conta e na Home quando houver dados |

**Fora:** segundo gateway, Google/Apple Pay (C11 parcial só se viável MP).

---

## Onda 4 — Operação, segurança e escala

Cruzar com gates G3–G8 do MVP — **não** misturar com polish de Home.

| ID | Entrega | Gate |
|----|---------|------|
| C12 | MP produção + webhook + smoke cartão/Pix | G3 |
| C13 | Frete real / D-FRETE C / etiqueta ME / rastreio | G4 |
| C14 | Estoque/disponibilidade operacional | G2 dados |
| C15 | Atendimento / troca / pós-venda | — |
| C16–C17 | RLS/auth + termos/privacidade formal | G8 / 001 / 027 |
| H14 / C18–C19 | SEO conteúdo + perf LCP/INP/CLS | Medir em device real |
| H15 / C20 | Indicadores (placa, campanhas, abandono, ticket) | Baseline antes de meta |

---

## Ordem sugerida de autorização

1. Fechar Onda 1 + ops placa (smoke).  
2. Autorizar Onda 2 em PR dedicado.  
3. Em paralelo humano: G3/G4 (Onda 4 ops).  
4. Onda 3 só após Onda 2 estável (compatibilidade confiável).  

**Diretriz:** um pacote = um PR revisável; não empilhar kits + guest total + MP prod no mesmo PR.
