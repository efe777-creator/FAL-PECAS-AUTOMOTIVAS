# Plan — CP-NOT P0 mark-read badge

> Spec: `docs/superpowers/specs/2026-11-17-notif-mark-read-badge-design.md`

## Files

| File | Change |
|------|--------|
| `fal-pecas/src/lib/notificationEvents.ts` | emit/subscribe |
| `fal-pecas/src/lib/notificationDisplay.ts` | badge respeita `readAt` |
| `fal-pecas/src/components/notifications/NotificationBell.tsx` | otimista + sync |
| `fal-pecas/src/components/notifications/NotificationInbox.tsx` | filtro ação |
| `fal-pecas/src/pages/Account/AccountNotificationsPage.tsx` | emit + otimista |
| `fal-pecas/src/pages/admin/AdminNotificationsPage.tsx` | emit + otimista |
