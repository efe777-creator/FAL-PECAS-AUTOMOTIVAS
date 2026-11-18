# Consolida 3D — Fase 5 (segurança / perf / testes)

Data: 2026-11-18 · projeto Supabase `wtbpwuiayednvlhvuhbh` · branch `feature/consolida-3d-automotivo`

## Segurança

| Item | Status |
|------|--------|
| RPC `find_approved_visual_asset_for_identity` com ownership (staff OU membership do customer) | Aplicado (migration `consolida3d_compat_status_ownership`) |
| Status `review` / `retired` no check de assets | Aplicado |
| Facelift preenchido na compat sem match genérico (RPC + TS) | Aplicado |
| CarImages key **não** no Vite; Edge `carimages-image` | Código pronto; secret `CARIMAGES_API_KEY` deve ser **nova** (key antiga do chat comprometida — não reutilizar) |
| Bucket `vehicle-visual-assets` privado + signed URL | Mantido (E2) |
| Flag cliente `VITE_FAL_CARIMAGES=1` | Documentada em `.env.example` |

## Performance (baseline smoke — medir em runtime)

| Métrica | Evidência / meta operacional |
|---------|------------------------------|
| Smoke GLB `fal-smoke-palio-box` | Cubo leve; load+fit+OrbitControls no desktop |
| Dispose | `VehicleGlbViewer` cancela RAF, dispose controls/renderer |
| Mobile gesture | `touch-action: none` na zona do canvas |
| Auto-spin | Removido (GLB e procedural) |
| Recolor GLB | Removido na v1 |
| Draco/Meshopt/KTX2 | Não nesta fase — medir TTI/FPS com assets reais pós-PoC |

## Matriz de testes (Vitest)

| Área | Arquivo |
|------|---------|
| Compat / status viewer | `vehicleVisualAssetTypes.test.ts` |
| Transições ADM | `adminVisualAssetService.test.ts` |
| Adapter CarImages | `carImagesAdapter.test.ts` |
| Engine contratos | testes existentes visualizationEngine / XR gate |

Smoke manual restante: Palio approved → Orbit/presets; veículo sem GLB → banner “3D indisponível” + 2D/placeholder; sem membership → RPC null.
