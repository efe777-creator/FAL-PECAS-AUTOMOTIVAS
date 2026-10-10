# HOLD — Repair B3 (histórico de migrations)

**Data:** 2026-10-09 · **Reconfirmado:** 2026-10-10 (plano consolidado — sem repair)  
**Status:** **HOLD** — sem alteração  
**Decisão operacional:** exigir aprovação explícita + doc de divergência/rollback antes de qualquer `migration repair`

---

## 1. Por que está em hold

`supabase db push --linked` falha com `DbPushMissingLocalError`: versões remotas **não** existem no diretório local `supabase/migrations`.  
Apply pontual via `db query --linked -f` funciona (ex.: FIND-012), mas **não** registra no histórico remoto.

## 2. Antes de autorizar repair

Documentar:

1. Lista de versões remotas órfãs vs locais  
2. Procedimento proposto (`migration repair --status reverted …` e/ou pull)  
3. Risco (histórico irreversível / drift)  
4. Rollback / verificação pós-repair (`db push` dry / status)  
5. Aprovação explícita eFe

## 3. Proibido agora

- `migration repair` “de passagem”  
- `db reset` remoto  
- Aplicar repair só para “destravar push” sem o pacote acima  

## 4. Paralelos liberados enquanto hold

- IMP-19 diagnóstico → MARCHA U1–U5 se aprovado  
- Smoke MP (humano)  
- FIND-004 quando planilha completa existir  
