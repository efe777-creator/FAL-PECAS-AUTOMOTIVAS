# Protocolo passos 4→9 (gated) — FINAL 2026-10-06

Documento de execução da sequência corrigida.

## Papéis

| Branch | Papel |
|--------|-------|
| `plan` | Só docs / planejamento |
| `dev` | Código integrado via `feat/...` |
| `main` | Estável / aprovado (PR + smoke + humano) |

## Checklist

| Passo | Ação | Resultado |
|-------|------|-----------|
| 4 | Commit+push docs em `plan` (auditoria + gate) | **feito** |
| 5 | F8.4 → `dev` | **feito** (`bba6c47`) |
| 6 | F8.5 feat → test/build → apply → smoke → merge `dev` | **feito** (`ae4c054` + apply + histórico) |
| 7 | PR `dev→main` | **MERGED** [#1](https://github.com/efe777-creator/FAL-PECAS-AUTOMOTIVAS/pull/1) → `762c697` |
| 8 | Init F9 docs em `plan` | **feito** |
| 9 | F9-A `feat/f9-a-frete-correios` → `dev` → `main` | **feito** (`454ce50` ⊂ `762c697`) |

## Bloqueios residuals (não fazer sem nova auth)

1. `migration repair` em massa / `db push` completo (histórico remoto divergente)
2. Force-push / alterar remote
3. Merge UI vitrine → `dev`/`main`
4. Iniciar F9-B…E sem auth explícita

## Fora de escopo

F8.6–F8.9; promoção cega `plan→dev`.
