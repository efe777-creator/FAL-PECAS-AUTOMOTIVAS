# Auditoria — UI, cores, identidade, hierarquia e copy (Admin + Loja)

**Versão:** V1  
**Data:** 2026-11-16  
**Auth:** eFe — Gate 0 **MARCHA** (docs; implementação só após plano tático aprovado)  
**Escopo leitura:** `fal-pecas/src` (admin + loja) + [`docs/entrada/IDENTIDADE_VISUAL.md`](../entrada/IDENTIDADE_VISUAL.md)  
**Spec de design:** [`docs/superpowers/specs/2026-11-16-ui-cores-identidade-design.md`](../superpowers/specs/2026-11-16-ui-cores-identidade-design.md)  
**Plano tático:** [`docs/superpowers/plans/2026-11-16-ui-cores-admin-loja.md`](../superpowers/plans/2026-11-16-ui-cores-admin-loja.md)  
**Referência visual externa:** Storexio Overview (layout/KPI — **não** copiar azul como marca FAL)

---

## 0. Método

Classificações de tela: **OK** · **AJUSTE** · **REPAGINE**.

Regras:

- Código ≠ homologação visual em browser
- Identidade oficial = `IDENTIDADE_VISUAL.md` + tokens em `fal-pecas/src/styles/index.css`
- Contagens de classes = grep em `pages/admin` + `components/admin` (ordem de grandeza)
- Sem inventar métricas de negócio; sem big bang na loja
- Objetivo declarado: **mais cor e destaque sem excessos**, sem perder FAL

Decisões travadas no brainstorm (2026-11-16):

| Tema | Decisão |
|------|---------|
| Ativo aba/menu | Azul **accent** (UI), não amarelo |
| Amarelo FAL | Só CTA / destaque pontual |
| Dark | Admin na 1ª entrega; **default dark** + botão liga/desliga; loja clara |
| Favorito | Coração **vermelho** quando ativo |
| Hierarquia | Alinhar labels; Busca na sidebar; não mover filas Pedidos→Logística |

---

## 1. Veredito executivo

A FAL **tem** identidade (navy + amarelo + logo + Button primary). O problema não é “falta de marca” — é **uso chapado**: superfícies brancas hardcoded, texto quase tudo `fal-navy`, amarelo competindo no menu ativo, semântica Tailwind ad hoc (`green` vs `emerald`), e Dashboard operacional com cara de lista plana + sitemap duplicado.

**Admin:** shell sólido; Dashboard = **REPAGINE**; tabs = **≥4 padrões** → unificar; hubs Pedidos maduros, Logística com copy técnica.

**Loja:** chrome pouco amarelo; favorito sem estado colorido; Checkout saturado de navy; copy de nav/empty inconsistente.

### Bloqueadores / prioridades UI-ID

| Prio | ID | Tipo | Problema |
|------|-----|------|----------|
| P0 | UI-ID-TOK | Tokens | `bg-fal-surface` = 0 usos; `bg-white` ~246 admin; sem dark; sem accent; `fal-ink` morto na loja |
| P0 | UI-ID-NAV | Shell | Ativo amarelo = CTA; Busca fora da sidebar; sem toggle dark |
| P0 | UI-ID-TAB | Chrome | 4+ sistemas de aba (Home / Notificações / Frete próprio / Preços) |
| P0 | UI-ID-FAV | Loja | Favorito `♥`/`♡` sem vermelho (`ProductCard`, `ProductPage`) |
| P0 | UI-ID-COPY | Copy | Nav ≠ H1 ≠ empty CTA (admin + loja) |
| P1 | UI-ID-DASH | Dashboard | Overview plano; KPIs sem hierarquia/cor; grid atalhos = sidebar |
| P1 | UI-ID-HUB | Hubs | Logística copy spec; tipografia H1 inconsistente entre hubs |
| P1 | UI-ID-STORE | Loja | Hardcodes `#f*`; MobileNav sem accent; empties multi-voice |
| P2 | UI-ID-CHK | Checkout | Steps/hierarquia navy saturados — repagine parcial |
| P2 | UI-ID-EMOJI | Chrome | Emoji como ícone (📦 Pedidos etc.) |

**Gate 0:** auditoria + spec + plano tático V2 · **MARCHA em implementação (2026-11-16/17)** — Figma https://www.figma.com/design/ZrVkWnp1krjj6c8uboRlYT

---

## 2. Identidade visual (âncora)

Fonte: [`IDENTIDADE_VISUAL.md`](../entrada/IDENTIDADE_VISUAL.md).

### 2.1 Não negociar

- Dupla: navy `#303846` + amarelo `#f2c84b` (próximo ao logo)
- Logo `logo-fal-transparente.png` — sem recolor/recorte
- UI type Inter; radius ~14px / botões ~10px
- Button primary amarelo + texto navy-dark

### 2.2 Onde a identidade “some” na UI

- Header loja: branco + navy; amarelo quase só badge carrinho
- MobileNav ativo: só `font-extrabold` navy — sem accent
- Admin conteúdo: cards brancos idênticos; hover amarelo raro
- Amarelo no **menu ativo** dilui o papel de CTA

### 2.3 Guardrails — mais cor sem excesso

1. Amarelo = ação (CTA)
2. Accent azul = “onde estou” (aba/menu)
3. Verde / âmbar / vermelho = só status / KPI / alerta
4. Favorito liked = vermelho
5. Máx. ~3 acentos por viewport
6. Fundos neutros (não pintar card inteiro de marca)
7. Storexio = layout/KPI, não a marca
8. Teste: sem logo, ainda deve parecer FAL (navy + CTA amarelo), não SaaS azul genérico

---

## 3. Cores — inventário

### 3.1 Tokens atuais (`fal-pecas/src/styles/index.css`)

| Token | Hex | Uso declarado |
|-------|-----|---------------|
| `--fal-navy` | `#303846` | Primária / textos / nav |
| `--fal-navy-dark` | `#252c36` | Topbar, footer, hero |
| `--fal-navy-2` | `#46515e` | Secundário |
| `--fal-yellow` | `#f2c84b` | CTA, badges |
| `--fal-yellow-dark` | `#dcae27` | Focus |
| `--fal-yellow-hover` | `#ffd75c` | Hover primary |
| `--fal-bg` | `#f4f6f7` | Fundo página |
| `--fal-surface` | `#ffffff` | Superfícies |
| `--fal-line` | `#dfe4e8` | Bordas |
| `--fal-muted` | `#5a6570` | Texto secundário (doc identidade cita `#6f7a85` — **divergência a reconciliar**) |
| `--fal-success` | `#168a55` | Sucesso |
| `--fal-danger` | `#c0392b` | Erro |
| `--fal-auth-link` | `#7c5b00` | Links auth |

**Ausentes hoje:** `fal-accent`, `fal-warning`, `fal-favorite`, `fal-fg`, pares dark, `fal-ink` no `@theme`.

### 3.2 Contagens admin (`pages/admin` + `components/admin`)

| Padrão | ~qtd | Leitura |
|--------|------|---------|
| `bg-white` | ~246 | Superfície hardcoded |
| `bg-fal-surface` | 0 | Token morto |
| `text-fal-navy` | ~488 | Texto forte universal |
| `bg-fal-yellow` | ~18 | Ativo/CTA pontual |
| amber / sky / green / emerald / red | dezenas | Semântica ad hoc |

Hotspots `bg-white`: `AdminOrdersHubPage`, `AdminHomeContentPage`, `AdminVehiclesPage`, `AdminOrderDetailPage`, `AdminDashboardPage`, `AdminImportsPage`.

### 3.3 Loja — hardcodes que quebram dark futuro

Exemplos: `#f8f9fa`, `#fafbfc`, `#fff8db`, `#fff8e6`, `#fffdf5`, `#f7f8f9`, `#f4f6f8`, `#e9edef`, `bg-white` em Header/cards. WhatsApp `#128C7E` (ok marca WA, fora do sistema FAL).

---

## 4. Hierarquia de páginas

### 4.1 Admin (router flat + sidebar 3 grupos)

```
/admin                          Painel (Dashboard)
├── Catálogo (sidebar)
│   produtos, aplicacoes, precos, importacoes, categorias,
│   home, promocoes, montadoras, veiculos, fabricantes, fornecedores
│   (+ busca: rota existe, NAV AUSENTE)
├── Vendas
│   pedidos (HUB), avisos, clientes
└── Operação
    estoque, logistica (HUB), pagamentos (HUB), relatorios, operadores
```

Hubs com filhos: Pedidos (lista/áreas/:id), Logística (origem/ME/caixas/…), Pagamentos (métodos/webhooks/…).

### 4.2 Incoerências

| Achado | Detalhe |
|--------|---------|
| Busca órfã na nav | `/admin/busca` no Dashboard, fora da sidebar |
| Aplicações | Só sidebar, não no grid do Dashboard |
| Promoções | Rota filha de Home; irmã flat na nav |
| Labels | `/avisos` vs “Notificações”; H1 “Central de Pedidos” vs menu “Pedidos”; Categorias vs “Classificação” |
| Breadcrumbs | Sem grupos Catálogo/Vendas/Operação; `prazos` sem label rico |
| Expedição | Filas em Pedidos; config em Logística — OK operacional; copy precisa deixar claro |

### 4.3 Loja

```
/ → /catalogo → /produto/:id → /carrinho → /checkout
/conta → perfil | enderecos | veiculos | favoritos | pedidos | avisos
```

Hierarquia estrutural OK; vocabulário fragmentado (Buscar / Catálogo / Buscar peça; Conta / Minha conta; Pedidos / Meus pedidos).

---

## 5. Dashboard

Arquivo: `fal-pecas/src/pages/admin/AdminDashboardPage.tsx`

**Ordem atual:** H1 → KPIs (6) → tabela atenção → fluxo operacional (grupos) → grids Catálogo/Vendas/Operação.

| Aspecto | Avaliação |
|---------|-----------|
| Dados | Bons (counts, attention, totals se permissão) |
| KPIs | Label + número; sem ícone/cor/delta/sparkline |
| Propósito | H1 fala pedidos; página também é índice geral |
| Atalhos | Duplicam sidebar → ruído |
| Overlap | Hub Pedidos + Relatórios |

**Veredito: REPAGINE** → Overview Storexio-traduzido FAL; atalhos compactos ou removidos.

---

## 6. Shell, tabs, hubs

### 6.1 AdminLayout

- Sidebar navy; ativo `bg-fal-yellow` → **AJUSTE** para accent
- Catálogo ~11 itens densos; falta Busca
- Mobile drawer bem cuidado (inert/Escape)
- Desktop sem topbar de ações (sino no aside) → toggle dark cabe no header mobile + aside desktop

### 6.2 Tabs (≥4 idiomas)

| Padrão | Onde | Ativo |
|--------|------|-------|
| Button primary/outline | HomeSectionTabs, Notificações, PaymentSection | amarelo |
| Link CSS manual | Promoções (Home) | amarelo |
| Cards navy | OwnDelivery | navy |
| Pills | PriceListDetail | navy |
| Wizard chips | OrderOpsWizardNav | navy/green |

### 6.3 Hubs

| Hub | Veredito | Nota |
|-----|----------|------|
| Pedidos | AJUSTE | Mais maduro; unificar H1/KPI color |
| Pagamentos | OK / AJUSTE leve | Fronteira clara com Home/Pedidos |
| Logística | AJUSTE | Copy técnica (“spec cotação…”) |

---

## 7. Microestados e copy

### 7.1 Favorito

- `ProductCard.tsx` / `ProductPage.tsx`: `{liked ? '♥' : '♡'}` sem classe de cor
- Decisão: ativo **vermelho** (`fal-favorite` ou `text-red-500` via token)

### 7.2 Glossário alvo (unificar)

| Conceito | Label canônico proposto |
|----------|-------------------------|
| Catálogo loja | **Catálogo** (nav); CTA empty **Ver catálogo** |
| Conta | **Minha conta** |
| Pedidos cliente | **Meus pedidos** |
| Pedidos admin | **Pedidos** (menu); H1 hub **Central de Pedidos** ok se breadcrumb “Pedidos” |
| Avisos admin | **Notificações** (label); rota pode permanecer `/avisos` |
| Categorias | **Categorias** (alinhar H1; evitar “Classificação” solto) |
| Busca admin | **Busca** na sidebar Catálogo |

---

## 8. Matriz AJUSTE / REPAGINE / OK

### Admin — REPAGINE

- `AdminDashboardPage.tsx`
- Sistema de Tabs (novo componente compartilhado)
- `AdminReportsPage.tsx` (visual alinhado Overview; médio)

### Admin — AJUSTE (alta)

- `AdminLayout.tsx` (ativo, Busca, dark toggle)
- Hubs Pedidos / Logística / (leve) Pagamentos
- `AdminHomeSectionTabs.tsx` + Home content
- Importações, Busca, Notificações, PriceListDetail
- Listas: Produtos, Veículos, Estoque, Categorias (tokens)

### Admin — OK (herdam tokens)

- Forbidden / NotFound
- Named entity CRUDs
- Customers, Operators
- Configs enxutas (origem, webhooks, etc.)
- Wizards import (polish leve)

### Loja — REPAGINE parcial

- `CheckoutPage.tsx` (P2)

### Loja — AJUSTE

- Favorito; Header/MobileNav; Home; Catálogo; PDP; Carrinho; Conta

### Loja — OK

- `Button.tsx` / `Badge.tsx`; NavBar; Footer

---

## 9. Backlog priorizado

### P0 — Sistema + chrome + microestado

1. Expandir tokens + `@custom-variant dark` + pares `.dark`
2. AdminLayout: `.dark` default, toggle, ativo accent, Busca na nav
3. `AdminTabs` único; migrar Home / Notificações / OwnDelivery / PriceList
4. Migrar hotspots `bg-white` → `bg-fal-surface` (Layout, Dashboard, hubs)
5. Semântica unificada (`fal-success` / `fal-warning` / `fal-danger`)
6. Favorito vermelho (card + PDP)
7. Glossário labels nos pontos tocados

### P1 — Overview + hubs + loja polish

1. Dashboard Overview (KPIs coloridos, atenção, fluxo; atalhos compactos)
2. Copy Logística + alinhamento H1 hubs
3. Relatórios visual
4. Loja: empties CTA único; hardcodes → tokens; MobileNav accent

### P2 — Depois

1. Checkout momentos
2. Reduzir emoji-ícone
3. Atualizar `IDENTIDADE_VISUAL.md` com accent/dark/favorite/warning
4. Dark loja (fora desta onda)

---

## 10. Critérios de pronto (pós-implementação)

- [x] Admin abre em dark legível; botão liga/desliga persiste
- [x] Menu/aba ativos = accent azul; CTA = amarelo
- [x] Dashboard parece Overview sem perder foco operacional (H1 Painel; sem sitemap)
- [x] Favorito liked vermelho
- [x] Labels unificados nas telas tocadas (Busca na nav; empties Ver catálogo; MobileNav Catálogo)
- [x] Teste “ainda é FAL?” — navy estrutural + CTA amarelo preservados
- [x] `IDENTIDADE_VISUAL.md` atualizado com tokens novos

---

## 11. Fora de escopo (1ª entrega)

- Dark mode na loja pública
- Redesign completo de todas as páginas
- Trocar primary amarelo por azul
- Novas métricas sem backend
- Mover expedição de Pedidos para Logística

---

## 12. Próximo passo

1. eFe revisa esta auditoria + spec  
2. Aprova plano tático em `docs/superpowers/plans/2026-11-16-ui-cores-admin-loja.md`  
3. MARCHA de implementação task-by-task
