# Auditoria baseline Git — 2026-10-06 (reauditada)

**Horário (local):** 2026-10-06 ~15:32  
**Branch no momento da coleta:** `dev` @ `454ce50`  
**Remote:** `origin` → `https://github.com/efe777-creator/FAL-PECAS-AUTOMOTIVAS.git`  
**safe.directory:** OK (`D:/Programas WEB/PROGRAMAS WEB PENDRIVE/FAL PECAS AUTOMOTIVAS`) — sem alteração de `user.name`/`user.email`  
**Opção A (Plano Mestre §6.4):** FECHADA — `list_extra_cost` R$ fora do cálculo (informativo)

---

## Branches (tips = local ≡ remote)

| Branch | Tip | Mensagem | Tracking |
|--------|-----|----------|----------|
| `plan` | `1940e12` | docs(f9): inicializacao — spec, plano e roadmap | `origin/plan` |
| `dev` | `454ce50` | feat(f9-a): Correios sandbox PAC/SEDEX… | `origin/dev` |
| `main` | `aa83df5` | docs(auditoria): PRD vs situação pós-F8 | `origin/main` |

**Divergência `main...dev`:** `0 | 5` — `main` atrasada **5 commits** (correto: sem promoção cega).

Commits em `dev` e ainda **não** em `main`:

1. `0eb01f8` docs(f8.1)…
2. `3d016f7` docs(f8): fecha Opção A…
3. `bba6c47` feat(f8.4): baseline código…
4. `f1fe91c` feat(f8.5): Opção A adicional %…
5. `454ce50` feat(f9-a): Correios sandbox…

`plan` tip (`1940e12`) contém docs F9; ancestralidade inclui F8.5 (`f1fe91c`). Diff `plan...dev` ≈ só arquivos F9-A shipping (código F9-A está em `dev`, não no tip de `plan`).

---

## Ancestrais (protocolo plan ≠ dump de código)

| Entrega | Commit | Em `dev`? | Em `main`? | Via |
|---------|--------|-----------|------------|-----|
| F8.4 | `bba6c47` | sim | não | `feat/f8.4-baseline` → `dev` |
| F8.5 código + prepared SQL | `f1fe91c` | sim | não | `feat/f8.5-list-extra-cost-percent` → `dev` |
| F9-A Correios sandbox | `454ce50` | sim (tip) | não | `feat/f9-a-frete-correios` → `dev` |
| Init F9 (docs) | `1940e12` | parcialmente (docs no histórico de `plan`) | não | commits em `plan` |

**Regra confirmada:** não há promoção `plan → dev` como dump do working tree.

---

## Migration F8.5

| Item | Status |
|------|--------|
| Arquivo prepared | `fal-pecas/supabase/migrations/20261006160000_list_extra_cost_percent_prepared.sql` |
| `db push` / apply | **NÃO EXECUTADO** (sem autorização explícita) |
| Smoke pós-apply | **PENDENTE** |

---

## Working tree (fora da sequência 1→9 até auth separada)

### Código vitrine não commitado (não misturar em 1→9)
- `M` `fal-pecas/src/components/product/CategoryCard.tsx`
- `M` `fal-pecas/src/components/product/ProductCard.tsx`
- `??` `fal-pecas/src/lib/categoryEmoji.ts` (+ test)
- `??` `fal-pecas/public/icons/categories/{suspensao,freios,filtros}.png`

### Outros
- `M` `docs/entrada/IMPORT.md`
- Ruído: `agent-tools-*`, `fal-pecas/supabase/.temp/`, `ARQUIVOS IMPORTAÇÕES/`, etc. — **não versionar**

---

## PR / main

| Item | Status |
|------|--------|
| PR `dev→main` | **não aberto** (`gh pr list` vazio) |
| Merge `main` | bloqueado até gate F8.5 (apply se autorizado + smoke + aprovação humana) |

---

## Conclusão por passo (1→9)

| # | Passo | Status nesta reauditoria |
|---|-------|--------------------------|
| 1 | Opção A no Plano Mestre | **OK** (§6.3–6.4) |
| 2 | `safe.directory` | **OK** |
| 3 | Auditar baseline | **este documento** |
| 4 | Organizar `plan` (só docs) | tip `1940e12` no remote; re-push só se houver docs novas desta reauditoria |
| 5 | Organizar `dev` (F8.4) | **já em `dev`** — não re-mergear |
| 6 | F8.5 Opção A | código em `dev`; apply + smoke **pendentes de auth** |
| 7 | `main` | **bloqueado** até gate humano pós-F8.5 |
| 8 | Init F9 docs | **já em `plan`** (`1940e12`) |
| 9 | F9-A | **já em `dev`** (`454ce50`); não reimplementar |

---

## Política

- `plan` = documentação / planejamento  
- `dev` = código via `feat/...`  
- `main` = estável só pós gate  
- Nenhum `db push`, migration, commit, merge ou push sem autorização correspondente  
- F8.6–F8.9 fora da trilha crítica  
