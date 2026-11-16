# VAL — CP-NOT UI corte mobile/admin

**Data:** 2026-11-16  
**Auth:** eFe  
**Problema:** dropdown/inbox de notificações cortado no celular e no admin.

## Causa

1. Painel `absolute` dentro do sidebar admin (~260px) e headers estreitos — largura 22rem estourava o pai.
2. Badges (“Atenção”/“Nova”) na mesma linha do título → clip horizontal.
3. Sino duplicado no sidebar mobile + header.
4. Filtros longos (“Precisam de ação”) + “Marcar todas” competiam na mesma linha no mobile.

## Correção

| Item | Mudança |
|------|---------|
| `NotificationBell` | Portal `fixed` no `body`; mobile full-bleed (margem 12px); `maxWidth: calc(100vw - 24px)`; `shrink-0` |
| `NotificationInboxItem` | Badge abaixo do título; `break-words`; `max-w-full` / `overflow-hidden` |
| `NotificationInbox` | `overflow-x-hidden`; filtros empilhados no mobile; label curta “Ação”; “Marcar todas” full-width no mobile |
| `AdminLayout` | Sino só no header sticky no mobile; `overflow-x-hidden` |
| Nav | Abrir sino fecha drawer (`fal:close-mobile-nav`) |

## Validação CDP (390×844) — PASS

| Check | Resultado |
|-------|-----------|
| `documentElement.scrollWidth` | 390 (= vw), sem overflow-x |
| Cards da lista `/admin/avisos` | left 16, right 374, margem 16px |
| Sino no header | left 330, right 374, dentro do header |
| Painel portal | left 12, width 366, right 378 (margem 12px) |
| Textos do painel | right ≤ 365, sem overflowRight positivo |
| Labels mobile | “Ação (1)” + “Marcar todas como lidas” full-width |

**Nota:** `line-clamp-2` no compact do sino pode truncar corpo com reticências — esperado, não é corte de layout.

## Loja

`Header` já usa sino só no topo mobile (não no drawer) + mesmo portal. `/conta/avisos` compartilha `NotificationInbox` (mesmas correções). Sessão cliente não revalidada neste turno (redirect login).
