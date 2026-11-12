# VAL — Secure Fields failed (cartão) — 2026-11-12

## Sintoma

Alert checkout: `The integration with Secure Fields failed` (`fields_setup_failed`).

## Causa

1. Console: `Error when mounting field card-number-container: Container not found`.
2. React **StrictMode** double-mount desmonta o Brick no meio do setup dos Secure Fields → `fields_setup_failed`.
3. Remount automático no `onError` agravava a falha.
4. Mensagem em inglês ia direto ao cliente.

## Correção

| Item | Ação |
| --- | --- |
| `mapMpBrickError` | Copy PT; detecta setup failed |
| `MercadoPagoCardBrickPanel` | Sem remount auto em Secure Fields; mount atrasado; amount 2 decimais |
| `.env.local` | `VITE_MP_PUBLIC_KEY=TEST-…` + `VITE_MP_ENV=test` (homolog Brick) |

## Atenção ops

- Token do Brick **TEST** só casa com `MP_ACCESS_TOKEN` **TEST** na Edge. Pix prod continua com token prod.
- Netlify produção: manter Public Key **prod** válida no painel MP (campo Public Key, não Access Token). Domínio HTTPS.
- Reiniciar `npm run dev` após mudar `.env.local`.

## Verificação

- [ ] Dev reiniciado com TEST PK  
- [ ] Brick: campos seguros com altura > 0 / sem alert inglês  
- [ ] “Tentar novamente” remonta manualmente  
