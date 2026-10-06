# Protocolo passos 4→9 (gated) — 2026-10-06

Documento de execução da sequência corrigida. **Não substitui** autorização explícita para publish perigoso (`db push`, merge `main`).

## Papéis

| Branch | Papel |
|--------|-------|
| `plan` | Só docs / planejamento |
| `dev` | Código integrado via `feat/...` |
| `main` | Estável / aprovado (PR + smoke + humano) |

## Checklist

| Passo | Ação | Resultado nesta sessão |
|-------|------|------------------------|
| 4 | Commit+push docs em `plan` (auditoria + gate) | **feito** (`3edf68d` em `plan`) |
| 5 | F8.4 → `dev` | **já feito** (`bba6c47`) — sem re-merge |
| 6 | F8.5 feat → test/build → (auth) apply → smoke → merge `dev` | código **já em `dev`**; apply/smoke **aguardam auth** |
| 7 | PR `dev→main` | **não** — gate F8.5 incompleto |
| 8 | Init F9 docs em `plan` | **já feito** (`1940e12`) |
| 9 | F9-A `feat/f9-a-frete-correios` → `dev` | **já feito** (`454ce50`) |

## Bloqueios explícitos (não fazer sem nova auth)

1. `supabase db push` / apply da prepared F8.5  
2. Abrir ou mergear PR `dev→main`  
3. Force-push / alterar remote  
4. Commitar UI vitrine (ícones / ProductCard clamp) no meio desta trilha  

## Fora de escopo

F8.6–F8.9; promoção cega `plan→dev`.
