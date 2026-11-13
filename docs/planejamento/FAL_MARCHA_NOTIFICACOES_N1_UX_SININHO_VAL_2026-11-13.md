# VAL — CP-NOT N1 UX Sininho

**Data:** 2026-11-13  
**Auth:** eFe · MARCHA N1  
**Plano:** [FAL_PLANO_CENTRAL_NOTIFICACOES_2026-11-13.md](./FAL_PLANO_CENTRAL_NOTIFICACOES_2026-11-13.md)  
**Spec:** [FAL_SPEC_CENTRAL_NOTIFICACOES_2026-11-13.md](./FAL_SPEC_CENTRAL_NOTIFICACOES_2026-11-13.md)

---

## Entregue (código)

| Item | Evidência |
|------|-----------|
| Ícone sino (não `NT`) | `NotificationBell.tsx` — SVG + badge |
| Header loja (logado) | `Header.tsx` — desktop + mobile ao lado do menu |
| Drawer mobile → Notificações | Link `/conta/avisos` se autenticado |
| Conta / Admin | Bell já existia; herda sino + poll 30s |
| Ação necessária | Badge + filtro nas Centrais; sort no dropdown |
| Deep-link decisão | `#decisao` + `id="decisao"` em `AccountOrderDetailPage` |
| Testes | `appNotificationCopy.test.ts` PASS (5) |

## Critérios

| ID | Resultado |
|----|-----------|
| NOT-UX-01 | Código: sininho no header loja se `user` |
| NOT-UX-02 | Código: admin layout (pré-existente) + sino |
| NOT-UX-03 | Código: SVG sino + badge |
| NOT-UX-04 | Código: dropdown + Ver todos |
| NOT-UX-05 | Código: kinds decisão → `#decisao` + painel |
| NOT-04 | Mark-read preservado |
| NOT-05 / 06 | Href pedido + âncora decisão |

## Smoke humano (pendente operador)

- [ ] Login cliente → sino no header loja (desktop/mobile)
- [ ] Não lida → badge; abrir dropdown; Ver todos
- [ ] Notificação de decisão → selo Ação necessária → painel `#decisao`
- [ ] Operador → sino no admin; filtro Ação necessária

## Fora N1

Motor/outbox, WhatsApp, e-mail, admin templates, migration SQL de copy (título DB pode ainda ser o texto antigo; selo UI é a sinalização N1).
