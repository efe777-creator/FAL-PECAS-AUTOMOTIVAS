# VAL — Notes #14 LGPD / políticas (fatia técnica)

**Branch:** `dev` · **Sem MAIN**  
**PDF:** Notes_211136 · item #14  
**Status Notes:** **PENDING** (reaberto 2026-11-22 — análise minuciosa de rigor)  
**Commit fatia:** `f712ac7` (código permanece)

## Correção técnica (não fecha o Notes)

1. Pós-venda: `RETURN_POLICY_BULLETS` completo no ack (sem truncar).
2. Cadastro: aceite alinhado ao checkout (termos + privacidade + trocas/devoluções).
3. Privacidade: caminho Minha Conta (`/conta`) para correção/exclusão.
4. Rodapé: Preferências de cookies reabre o banner (`openCookiePreferences`).

## Pós

- Vitest: `cookieNotice`, `postSaleAntiregress`
- `tsc --noEmit` OK
- Fechamento do Notes: ver auditoria DONE + plano de rigor em [FAL_AUDITORIA_NOTES_211136_DONE_2026-11-22.md](./FAL_AUDITORIA_NOTES_211136_DONE_2026-11-22.md)
