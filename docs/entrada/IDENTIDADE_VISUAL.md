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

| Token | Hex | Uso |
|-------|-----|-----|
| `--fal-navy` | `#303846` | Primária / textos / nav |
| `--fal-navy-dark` | `#252c36` | Topbar, footer, hero |
| `--fal-navy-2` | `#46515e` | Secundário |
| `--fal-yellow` | `#f2c84b` | CTA, badges (próximo ao amarelo do logo) |
| `--fal-yellow-dark` | `#dcae27` | Focus |
| `--fal-yellow-hover` | `#ffd75c` | Hover primary |
| `--fal-bg` | `#f4f6f7` | Fundo página |
| `--fal-surface` | `#ffffff` | Superfícies |
| `--fal-line` | `#dfe4e8` | Bordas |
| `--fal-muted` | `#6f7a85` | Texto secundário |
| `--fal-success` | `#168a55` | Sucesso / compat |
| `--fal-danger` | `#c0392b` | Erro / remover |
| `--fal-auth-link` | `#7c5b00` | Links auth |

Fonte: `fal-pecas/src/styles/index.css`.

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

- **Botões:** primary amarelo, outline (hero), dark, light; `font-extrabold`; radius ~10px
- **Inputs/Selects:** borda `--fal-line`, focus ring amarelo
- **Cards produto/categoria:** borda leve, hover shadow + translateY
- **Nav mobile:** barra inferior branca, ícone + label
- **Logo no header:** altura ~64–72px, largura auto, `object-contain`

---

## 6. Responsivo

- Desktop: topbar + header + nav categorias
- Mobile: bottom nav; logo e busca compactos
- Footer: grid 1→2→4 colunas

---

## 7. Pendências de identidade

- Validação formal de contraste do logo transparente no footer escuro
- Favicon a partir de `LOGO BOLINHA.png` (**DECISÃO PENDENTE**)
- Guia de uso mínimo (espaço de respiro, fundos permitidos) — expandir quando o time enviar brand book
