# VAL — Admin veículos lista + guia (FAL-UI-LAYOUT v1.6.0)

**Data:** 2026-11-23 · Branch: **`dev`** · Sem MAIN/Hostinger

## Escopo

Veículos entram no contrato Adaptive (lista + guia), alinhado a Produtos/Kits. Hub Integrações permanece chips/cards e abre a guia via ponte.

## Aceite

| Jornada | Critério | Status |
|---------|----------|--------|
| Manual | Criar modelo → verified → abrir guia → criar VV | Código: `adminUpsertModel` verified + guia após create |
| Integração | Sync/CSV → review → Verificar abre guia com form URL A1 → verified; casca enriquece VV na mesma guia | Hub sem `window.prompt`; `VEHICLES_OPEN_GUIDE_KEY` |
| UX | Lista `fal-admin-scroll`; busca termo livre; filtros qualidade/status/ano/montadora; duplo clique → guia | `AdminVehiclesPage` |
| Higiene | Save VV peela motor repetido no início de `version_name` | `peelEngineFromVersionName` |
| Padrão | Doc MINOR v1.6.0 + antiregress `moduleKey=vehicles` | Docs + `falUiLayoutAntiregress` FL1 |

## Smoke

```bash
cd fal-pecas
pnpm exec vitest run src/lib/vehicles/peelEngineFromVersionName.test.ts src/pages/admin/vehicles/adminVehiclesUx.smoke.test.ts src/lib/falUiLayoutAntiregress.test.ts
```

## Fora de escopo

MAIN · Hostinger · Adaptive no hub Integrações · PVC no import/sync · redesign loja
