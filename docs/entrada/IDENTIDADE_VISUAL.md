# Identidade visual — FAL Peças Automotivas 3.0

**Status:** Fonte de verdade (Fase 1.5)  
**Não inventar** informações não confirmadas pelos materiais oficiais / protótipo / tokens do app.

---

## STATUS DO LOGO

**STATUS DO LOGO: EM USO NO APP — CANDIDATO PRINCIPAL CONFIRMADO PELO TIME**

Arquivo principal adotado na UI (Fase 1.5):

- Origem: `LOGOTIPO/logo-fal-transparente.png`
- App: `fal-pecas/src/assets/logos/logo-fal-transparente.png`
- Uso: Header (`Logo.tsx`) e Footer
- Tratamento: cópia bit-a-bit (hash verificado); **sem** recorte, redesenho, vetorização ou alteração de cores do arquivo
- Exibição: `object-contain` preservando proporção

> Nota: o plano original marcava “provisório aguardando oficial”. O time autorizou **atualizar o logo junto da Fase 1.5** apontando `logo-fal-transparente.png` como principal. Variantes do kit permanecem registradas abaixo. Se houver nova versão oficial posteriormente, **não substituir silenciosamente** — registrar variante e atualizar este documento.

Asset anterior do protótipo (mantido no repositório, não é mais o Header):

- `fal-pecas/src/assets/logos/logo-fal-header.png` (ZIP 3.3/3.5)

---

## 1. Kit LOGOTIPO (workspace)

Pasta: `PROGRAMAS WEB/LOGOTIPO/`

| Arquivo | Uso sugerido |
|---------|----------------|
| `logo-fal-transparente.png` | **Principal** — UI clara / header |
| `LOGO BOLINHA.png` | Ícone / favicon futuro |
| `LOGOTIPO C FUNDO.png` | Materiais com fundo |
| `LOGOTIPO COMPLETO C FUNDO.png` | Materiais completos |
| `LOGOTIPO_COMPLETO_C_FUNDO-removebg-preview.png` | Variante removebg |
| `LOGOTIPO C FUNDO teste exportação.png` | Teste de exportação |

---

## 2. Tipografia de marca (kit)

Pasta: `PROGRAMAS WEB/TIPOGRAFIA/`

| Arquivo | Notas |
|---------|--------|
| `TIPOGRAFIA S FUNDO.png` | Wordmark sem fundo |
| `TIPOGRAFIA C FUNDO.png` | Wordmark com fundo |
| `TIPOGRAFIA AMARELA C FUNDO.png` | Wordmark amarelo |

UI do produto (textos de interface): **Inter** (protótipo + app), fallback Arial/sans-serif.  
A tipografia custom “FAL” do logo é **gráfica** (não substituir por fonte web aproximada).

---

## 3. Cores (tokens do app / protótipo)

| Token | Hex (light) | Uso |
|-------|-------------|-----|
| `--fal-navy` | `#303846` | Marca / sidebar / estrutura (**não inverte no dark**) |
| `--fal-navy-dark` | `#252c36` | Topbar, footer, hero |
| `--fal-navy-2` | `#46515e` | Secundário |
| `--fal-yellow` | `#f2c84b` | CTA / primary button / destaques |
| `--fal-yellow-dark` | `#dcae27` | Focus |
| `--fal-yellow-hover` | `#ffd75c` | Hover primary |
| `--fal-accent` | `#3b82f6` (dark content `#60a5fa`) | Menu/aba ativos (UI, não CTA) |
| `--fal-warning` | `#d97706` | Alerta / processamento |
| `--fal-favorite` | `#e11d48` | Favorito liked |
| `--fal-fg` | `#252c36` (dark `#e8ecf0`) | Texto temático |
| `--fal-ink` | alias → `fal-fg` | Compatibilidade (classes `text-fal-ink`) |
| `--fal-bg` | `#f4f6f7` (dark `#1a1f26`) | Fundo página |
| `--fal-surface` | `#ffffff` (dark `#242b33`) | Cards / superfícies |
| `--fal-surface-2` | `#f8f9fa` (dark `#2c343e`) | Superfície secundária |
| `--fal-line` | `#dfe4e8` (dark `#3a4450`) | Bordas |
| `--fal-muted` | `#5a6570` (dark `#9aa3ad`) | Texto secundário |
| `--fal-success` | `#168a55` | Sucesso / compat |
| `--fal-danger` | `#c0392b` | Erro / remover |
| `--fal-auth-link` | `#7c5b00` | Links auth |

Fonte: `fal-pecas/src/styles/index.css` (`@theme` → `var(--fal-*)`; dark via `.dark` nos wrappers).

**Dark admin:** default + toggle em `AdminLayout` (chave `fal-admin-theme`).  
**Dark loja:** opcional + toggle no header (`storeTheme` / chave `fal-store-theme`, default light). Wrappers distintos — não vazam um no outro.  
Navy/amarelo de marca **não** invertidos. Logo transparente (wordmark carvão) no dark usa **placa clara** (`#f4f6f7`, padrão bolinha) — sem trocar o PNG principal.

---

## 4. Espaçamento, radius, sombra, container

| Token | Valor |
|-------|--------|
| Radius | `14px` (`--fal-radius`) |
| Shadow | `0 10px 30px rgba(33,42,52,.10)` |
| Container | máx. `1240px` |
| Breakpoints | ~620px / ~900px |

---

## 5. Componentes (padrão visual)

- **Botões:** primary amarelo, outline/light com `fal-surface`, dark, danger; `font-extrabold`; radius ~10px
- **Abas/menus ativos:** `fal-accent` (nunca amarelo) — `AdminTabs` / nav conta / MobileNav
- **Amarelo chrome:** sininho (`fal-yellow-dark` ícone + badge `fal-yellow`) — não é CTA
- **Favorito liked:** `fal-favorite` (vermelho)
- **Inputs/Selects:** borda `--fal-line`, focus ring amarelo ou accent
- **Cards produto/categoria:** borda leve, hover shadow + translateY
- **Nav mobile:** `fal-surface`; item ativo accent
- **Logo no header/footer escuro:** altura ~64–72px + placa clara no dark; `object-contain`
- **Glossário:** nav “Categorias” vs H1 interno “Classificação”; H1 admin Overview = **Painel**; conta = **Minha conta**

---

## 6. Responsivo

- Desktop: topbar + header + nav categorias
- Mobile: bottom nav; logo e busca compactos
- Footer: grid 1→2→4 colunas

---

## 7. Pendências de identidade

- Favicon a partir de `LOGO BOLINHA.png` (**DECISÃO PENDENTE**)
- Guia de uso mínimo (espaço de respiro, fundos permitidos) — expandir quando o time enviar brand book
- Painéis operacionais de pedido admin: ainda há badges Tailwind ad hoc em alguns detalhes (dívida)

---

## 8. Evolução UI 2026-11-16 (MARCHA)

Auditoria, spec e evidências:

- [FAL_AUDITORIA_UI_CORES_IDENTIDADE_2026-11-16.md](../planejamento/FAL_AUDITORIA_UI_CORES_IDENTIDADE_2026-11-16.md)
- [spec](../superpowers/specs/2026-11-16-ui-cores-identidade-design.md)
- Figma: https://www.figma.com/design/ZrVkWnp1krjj6c8uboRlYT
- [FAL_MARCHA_CONTA_HOME_DARK_LOJA_VAL_2026-11-16.md](../planejamento/FAL_MARCHA_CONTA_HOME_DARK_LOJA_VAL_2026-11-16.md)

Decisões: accent = ativo; amarelo = CTA + chrome (bell); dark admin + dark loja (wrappers separados); logo com placa no dark; favorito = vermelho; hub conta sem grid de 6 cards.
