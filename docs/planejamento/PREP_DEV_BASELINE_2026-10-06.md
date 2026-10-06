# Prep baseline `dev` — 2026-10-06

Pacote: **auditar Git real + preparar baseline `dev`**  
Restrições respeitadas: sem `db push`, sem migration apply, sem `main`, sem apagar WT, sem re-merge, sem UI vitrine, sem ruído.

## Veredito

| Pergunta | Resposta |
|----------|----------|
| Tip real `dev`? | **`454ce50`** ≡ `origin/dev` |
| Tip real `main`? | **`aa83df5`** (ancestral de `dev`, tip atrasado) |
| Precisa promover F8.4 → `dev`? | **Não** — já em `bba6c47` ⊂ `dev` |
| Precisa re-merge F8.5 → `dev`? | **Não** — já em `f1fe91c` ⊂ `dev` |
| F9-A já em `dev`? | **Sim** — tip `454ce50` |
| Working tree limpo para merge? | Não necessário — nada a mergear; WT só tem UI/ruído **fora de escopo** |

## O que NÃO fazer agora

- `git merge` / `git rebase` das `feat/*` (já ancestral)  
- `supabase db push`  
- PR ou merge `dev→main`  
- `git add` de ícones/home, `agent-tools-*`, `.temp`, `ARQUIVOS IMPORTAÇÕES`  
- `git checkout --` / limpeza destrutiva do WT

## Próximo protocolo (quando autorizado — pacote separado)

```text
feat/f8.5-list-extra-cost-percent (já @ f1fe91c, já em dev)
  → revalidar testes + build (opcional se já PASS)
  → AUTORIZAÇÃO explícita
  → db push (prepared 20261006160000…)
  → smoke pós-apply
  → (código já está em dev; não precisa re-merge)
  → só então auth para PR dev→main
```

Nota: como o código F8.5 **já** está em `dev`, o “merge → dev” do protocolo clássico está **satisfeito**. O que falta é o **gate de banco + smoke**, não integração Git.

## Estado branches após este pacote

| Branch | Tip | Ação neste pacote |
|--------|-----|-------------------|
| `plan` | docs atualizados (esta prep + auditoria real) | commit+push docs |
| `dev` | `454ce50` | **nenhuma** alteração de tip |
| `main` | `aa83df5` | **nenhuma** |
