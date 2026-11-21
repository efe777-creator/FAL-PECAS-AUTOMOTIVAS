# FAL Marcha — UI Layout v1.0.2 VAL

**Data:** 2026-11-21 · Branch: **`dev`**  
**Padrão:** FAL-UI-LAYOUT **v1.0.2**  
**Origem:** dedupe caminhos/CTAs + reforço antiregress (FL11–FL13)

## Objetivo

Garantir que as correções de redundância (kits-manual, Link>Button, vocabulário, CTAs na guia) **não regredam**.

## Locks novos / reforçados

| ID | Garantia |
|----|----------|
| FL5↑ | Label **Listas de preço** (nav, hub, form produto, Home, import custos) — sem plural |
| FL10↑ | kits-manual: 1 CTA **Preços dos kits** → `/admin/kits/precos` |
| FL11 | Sem `<Link><Button>` nos hubs Adaptive + WorkSurfaces; `buttonClassName` nas surfaces |
| FL12 | QuickAdjust `embedded` sem Abrir lista/Importar duplicados; `showPricesLink` só Precificação |
| FL13 | Kits: Novo na guia / Cadastro completo + rotas canônicas |

## Comando

```bash
cd fal-pecas
pnpm test:ui-layout-antiregress
```

## Resultado

| Check | Status |
|-------|--------|
| `pnpm test:ui-layout-antiregress` | **PASS** 21/21 (FL1–FL13 + prefs + nav) |
| Vocabulário residual Home/fornecedor | **PASS** |
| contextualTitle Kits = Novo na guia | **PASS** |

## Não entra neste PATCH

- Novo produto guia curta (v1.1)
- Smoke E2E multi-guia / save 1 preço / PDP kit

**Assinatura:** marcha antiregress v1.0.2 · 2026-11-21
