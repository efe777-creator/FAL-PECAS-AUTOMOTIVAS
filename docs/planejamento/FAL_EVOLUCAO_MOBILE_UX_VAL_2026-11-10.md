# VAL — Evolução MOBILE-UX (auditoria + correções)

**Data:** 2026-11-10  
**Auth:** eFe — Evolução MOBILE-UX  
**Spec:** [FAL_EVOLUCAO_MOBILE_UX_2026-11-10.md](./FAL_EVOLUCAO_MOBILE_UX_2026-11-10.md)  
**Deploy eFe:** `6af36e358faa97d9751b5be0` → https://fal-pecas-automotivas-efe.netlify.app  

---

## Entregas

| Fatia | Resultado |
|-------|-----------|
| P0 nav Meus carros (Header + MobileNav → `/conta/veiculos`) | PASS |
| Hub garagem CTAs placa + catálogo | PASS |
| Inventário loja/conta/admin no doc | PASS |
| Matriz A–E (Crítico/Importante/Melhoria) | PASS |
| Críticos loja/conta (NAV-01…06, hit targets) | PASS |
| Admin cards mobile (produtos, veículos+configs, pedidos, home destaques) | PASS (código + build) |
| AdminLayout hit targets ≥44px | PASS |
| Build `tsc -b` + Vite prod | PASS |
| Publish eFe | PASS |

---

## Smoke pós-publish (viewport phone ~390×844)

| Check | Resultado |
|-------|-----------|
| Bottom bar “Meus carros” → `/conta/veiculos` | PASS |
| Menu hamburger “Meus carros” | PASS |
| Garagem: título + CTAs “Buscar por placa / veículo” e “Abrir catálogo” | PASS |
| Sem scroll-x na Home (bodyW = clientW = 390) | PASS |
| Guest → login com `from` | OK via `ProtectedRoute` (sessão smoke já autenticada) |
| Admin produtos cards no phone | **PENDENTE sessão staff** no browser de smoke (redirect loja) |

---

## CWV / desempenho

| Item | Status |
|------|--------|
| Code-split por rota (Vite) | OK (monitorar) |
| LCP/INP/CLS rede móvel | **Documentado** — medir em PageSpeed/CrUX eFe na próxima janela ops; dono: eFe |

---

## Critérios de aprovação da evolução

- [x] Navegação mobile Meus carros  
- [x] Área cliente hub garagem + consulta  
- [x] Admin listas rotina em cards (código; smoke UI staff pendente)  
- [x] Smoke multi-viewport loja/conta pós-publish  
- [x] CWV: gargalos conhecidos documentados com dono  
- [x] Desktop: tabelas admin preservadas (`hidden md:block`)

---

## Fora / follow-up

Imports densos, redesign total, Evolução 1 MVP. Demais tabelas admin (clientes, estoque, imports) sob demanda.

**Assinatura:** VAL MOBILE-UX PASS (nav+garagem+admin cards+publish eFe) · smoke admin staff pendente · CWV ops · 2026-11-10.
