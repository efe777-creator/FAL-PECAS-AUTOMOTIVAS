# VAL — FAL-UI-LAYOUT v1.5.3 (guias · dimensões · edição)

**Data:** 2026-11-22 · **Branch:** `dev` · **Bump:** MINOR  
**Docs:** [padrão](./FAL_PADRAO_TELAS_LAYOUT_DESIGN_v1_2026-11-21.md) · [estudo](./FAL_ESTUDO_GUIAS_DIMENSOES_EDICAO_2026-11-22.md)  
**Locks:** **FL26** · **FL27**

## Escopo

| Onda | Item | Status |
|------|------|--------|
| 1 | Doc estudo dimensões/edição | ✓ |
| 1 | Guia Preços: Custo \| Margem % \| Preço | ✓ |
| 1 | Híbrido: dblclick / Enter / F2 → modal; inline preço; Editar | ✓ |
| 1 | Paridade lista completa (triggers) | ✓ |
| 3 | Prefs `guideDensity` + presets Estreita(420)/Larga(720) | ✓ |
| 3 | `data-guide-density` + CSS compact (só grade) | ✓ |
| 2 | Garagem: Resumo in-place; chips mobile; Visual em Mais | ✓ |
| — | Antiregress FL26/FL27 | ✓ |
| — | Sem MAIN / deploy | ✓ |

## Smoke (browser / manual)

1. `/admin/precos` → Abrir guia → ver coluna **Margem** → dblclick linha → modal → Esc/Fechar.
2. Clique no preço → inline → Enter grava / Esc cancela.
3. PanelChrome: **Estreita** / **Larga** / **Compacta**.
4. `/conta/veiculos/:id` desktop: sidebar troca módulo sem chip duplicado; **Garagem** → Resumo; **Todos os veículos** → lista.

## Fora

MAIN · Ads · Button radius global · helpdesk · CNPJ
