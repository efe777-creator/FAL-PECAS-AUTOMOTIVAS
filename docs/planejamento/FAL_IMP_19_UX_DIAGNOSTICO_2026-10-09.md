# FAL-IMP-19 — Diagnóstico UX global

**Data:** 2026-10-09  
**Modo:** SOMENTE LEITURA — **STOP antes de implementação**  
**Runtime:** `wtbp` (código local)  
**Decisão operacional:** paralelo a smoke MP; sem apply FIND-004; sem repair B3  
**Findings:** FIND-019 · FIND-021 · FIND-022 · FIND-013 (parcial) · FIND-020

---

## 1. Objetivo

Inventariar empty / loading / erro / copy inconsistentes na loja e no admin, priorizar por impacto no cliente, e **separar** correções cosméticas de mudanças que toquem preço, disponibilidade, identidade ou compra.

---

## 2. Componentes canônicos (fato)

| Componente | Uso | Observação |
|------------|-----|------------|
| `Loading` | Spinner + label | Padrão bom; labels variam (“Carregando…”, “Verificando permissões…”) |
| `EmptyState` | title + description + CTA opcional | Loja/conta usam bem; admin nem sempre |
| `ErrorState` | title + message + retry opcional | Catálogo / favoritos / veículo; muitas telas admin só `alert`/texto |

---

## 3. Inventário por superfície

### 3.1 Loja (cliente)

| Área | Empty | Loading | Erro | Severidade sugerida |
|------|-------|---------|------|---------------------|
| Catálogo | Empty + chips filtros (IMP-11) | `Loading` + load more | `ErrorState` | Baixa residual |
| Home | Empty categorias / destaques | `Loading` | parcial | Baixa |
| PDP | Empty “não encontrado” | `Loading` | sem ErrorState se fetch falha (vira “não encontrado”) | **Média** |
| Carrinho | Empty CTA catálogo | — | — | Baixa |
| Checkout | Empty carrinho | estados MP | `pix_simulated` ainda no fluxo | **Alta** (FIND-015 / F9) — **fora** de IMP-19 visual |
| Conta (pedidos, fav, endereços, veículos) | EmptyState | Loading | Favoritos tem ErrorState | Baixa–média |
| Footer | — | — | “Privacidade/Termos (em breve)” | P4 FIND-021 |
| Auth / staff gate | — | “Verificando permissões…” sem timeout | FIND-013 se trava | **Média** |

### 3.2 Admin

| Padrão | Achado |
|--------|--------|
| Loading | Quase todas as `*Page` usam `Loading` |
| Empty | Inconsistente — várias listas ficam só “vazias” sem `EmptyState` |
| Erro | Muitas só `setError` string / toast; poucas `ErrorState` + retry |
| Imports | Fluxos longos (prévia→confirm) — feedback OK nos imports recentes |

### 3.3 Misconfig / mocks (FIND-019)

| Camada | Comportamento |
|--------|---------------|
| `searchCatalog` / `listPublishedProducts` / `getProductById` | Sem Supabase → **`mockProducts`** silencioso |
| Auth | `AuthNotConfiguredError` explícito |
| Risco | Deploy/misconfig mostra catálogo fictício como se fosse loja real |

**Proposta (não implementar agora):** empty “Catálogo indisponível / configuração” em vez de mock na loja pública; mocks só em `import.meta.env.DEV` ou flag explícita.

---

## 4. Priorização (impacto × frequência × dependência)

| Pri | Item | Tipo | Dependência | Nota |
|-----|------|------|-------------|------|
| P0 paralelo | Checkout/MP estados reais | **Compra** | Smoke MP / F9-F | **Não** misturar em IMP-19 UI |
| A | FIND-019 mock silencioso loja | Integridade | Flag env | Alto risco misconfig |
| B | StaffRoute timeout / erro sessão (FIND-013) | Operação | Auth | “Verificando…” infinito |
| C | PDP: distinguir erro de rede vs 404 | Cliente | — | Hoje colapsa em Empty |
| D | Admin: EmptyState + ErrorState padrão nas listas | Operação | — | Volume médio |
| E | FIND-021 páginas legais | Compliance | Copy jurídico | P4 |
| F | FIND-020 limpeza órfãos | Higiene | Gate | P3 |
| — | FIND-004 apps vazias no card | Dados | Planilha | **Fora** IMP-19 |

---

## 5. Fronteiras do bloco

### Dentro de IMP-19 (quando autorizado)

- Padronizar empty/loading/erro (copy + componentes)
- Timeout/feedback em `StaffRoute` / sessão
- Gate anti-mock silencioso na loja (FIND-019)
- Footer legal mínimo ou ocultar (FIND-021)

### Fora de IMP-19

- Preço / resolve / Liberar  
- Identidade D-REF / commercial_ref  
- Disponibilidade / publish  
- Checkout MP / frete / carrinho pricing (já FIND-006)  
- Import apps (FIND-004)  
- Redesign F11 / card visual (já M1–M6)

---

## 6. Plano mínimo proposto (para aprovação)

| # | Entrega | Aceite |
|---|---------|--------|
| U1 | Loja: sem mock silencioso se `!isSupabaseConfigured` (empty honesto) | FIND-019 |
| U2 | `StaffRoute`: timeout + mensagem + link login/home | FIND-013 residual |
| U3 | PDP: ErrorState em falha de fetch vs Empty 404 | Smoke manual |
| U4 | Checklist admin: EmptyState nas listas principais (produtos, pedidos, clientes, preços) | Visual |
| U5 | Footer: ocultar ou stub Privacidade/Termos | FIND-021 |
| — | Relatório VAL-19 | Vitest/lint + smoke |

**Não** nesta proposta: F9-F polish checkout; repair B3; schema.

---

## 7. STOP / marcha

| Item | Status |
|------|--------|
| Diagnóstico IMP-19 | **Concluído** |
| Implementação U1–U5 | **Feito** — [VAL-19](./FAL_IMP_19_UX_VAL_2026-10-09.md) (MARCHA 2026-10-09) |
| Smoke MP | Paralelo humano — [prep](./FAL_MP_SMOKE_PREP_2026-10-09.md) |
| FIND-004 apply | STOP arquivo |
| Repair B3 | HOLD — [doc](./FAL_B3_MIGRATION_REPAIR_HOLD_2026-10-09.md) |
