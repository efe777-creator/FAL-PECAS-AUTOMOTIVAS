# MARCHA 6 — Pacote de release (PRONTO, NÃO PUBLICADO) — 2026-11-14

**Auth requerida:** eFe · **Estado:** preparado · **Ação:** aguardando “autorizo publish / deploy”

## Escopo do deploy

- Front Netlify apenas (Vite build).
- **Sem** mudança Edge Functions.
- **Sem** migration / schema.
- Canais Pix/crédito/débito já controlados por `store_payment_display`.

## Pré-checks (antes do clique)

| Check | Como | Status pré-auth |
| --- | --- | --- |
| M4 gates | vitest canal/sessão/moments + tsc | PASS 14/11 14:19 (14 testes) |
| PCI file | `MpCardSecureFields.tsx` sem diff | PASS |
| M5 desktop PCI + Pix QR | Chrome real | PASS |
| M5 mobile | Android ou iPhone | PENDENTE eFe |
| `pnpm build` limpo | `fal-pecas` | rodar na hora do auth |

## Comando de build (na hora)

```bash
pnpm -C fal-pecas build
```

## Rollback

1. Redeploy do artefato Netlify anterior (front).
2. Contenção comercial sem redeploy: desligar `credit` e/ou `debit` em `store_payment_display`.
3. Não reverter Edge/webhook nesta MARCHA (não foram alterados).

## Critério GO

- eFe autoriza por escrito nesta conversa (“autorizo MARCHA 6” / “pode publicar”).
- Preferível: M5 mobile PASS; se eFe dispensar mobile, registrar no VAL.

## Critério NO-GO

- Digitação Secure Fields quebrada.
- Crédito↔débito remonta iframes.
- Build vermelho.

**Assinatura:** M6 pacote pronto · **NÃO PUBLICADO** · 2026-11-14.
