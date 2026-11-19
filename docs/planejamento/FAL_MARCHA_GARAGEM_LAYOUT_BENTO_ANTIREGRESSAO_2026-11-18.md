# FAL — MARCHA Layout Bento Minha Garagem · Anti-regressão

**Data:** 2026-11-18  
**Branch feature:** `feature/garagem-layout-bento`  
**Destino:** `dev` (nunca `main` sem autorização)  
**Auditoria base:** [FAL_AUDITORIA_MINHA_GARAGEM_VISUAL_2026.md](./FAL_AUDITORIA_MINHA_GARAGEM_VISUAL_2026.md)

---

## 1. Escopo entregue

| Item | Evidência |
|------|-----------|
| Shell garagem (sidebar navy/yellow FAL) | `GarageShell.tsx` + `AccountLayout` modo `/conta/veiculos*` |
| Home bento | `GarageDashboardBento.tsx` |
| Nav canônica | `garageNav.ts` |
| Detail stage dominante | `AccountVehicleDetailPage.tsx` |
| Visual: canvas topo, copy humana, pintura bloqueada no GLB | `VehicleVisualPanel.tsx` |

Cores: tokens FAL (`fal-navy`, `fal-yellow`, `fal-accent`, `fal-success`) — sem purple do mockup.

---

## 2. Gate anti-regressão (obrigatório antes de merge `dev`)

```bash
cd fal-pecas
pnpm exec tsc --noEmit
pnpm exec vitest run src/lib/garageNav.test.ts src/services/garage/visualizationEngine.test.ts
```

| Gate | Critério | Resultado (2026-11-18) |
|------|----------|-----------|
| Typecheck | `tsc --noEmit` exit 0 | **PASS** |
| Vitest nav | `garageNav.test.ts` | **PASS** (4) — labels sem jargão; 9 abas; 6 atalhos |
| Vitest engine | `visualizationEngine.test.ts` | **PASS** (6) — modos intactos |

**Proibido regressar:**

- Rotas `/conta/veiculos` e `/conta/veiculos/:id?modulo=`
- Fluxo add placa\|manual (`intent=garage`)
- Módulos 2A montados na detail (historico…config)
- Engine `resolveVisualizationSource` (sem remoção de modos)

---

## 3. Smoke UI (manual / sessão autenticada)

1. `/conta/veiculos` — sidebar desktop + bento + grade mobile  
2. Seletor de veículo no header da shell  
3. Abrir detalhe — stage navy + tabs  
4. `?modulo=visual` — viewer acima; pintura desabilitada se GLB + modo ≠ Imagem  
5. Add veículo Placa|Manual ainda disponível  

Se sem sessão: marcar **não verificado em runtime** e não bloquear merge se gates §2 PASS.

---

## 4. Critério de done

- Commit na feature + push remoto  
- Merge FF/`--no-ff` na `dev` + push `origin/dev`  
- Gates §2 PASS  
- `main` intocada  
