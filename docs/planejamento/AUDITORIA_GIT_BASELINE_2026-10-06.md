# Auditoria baseline Git — 2026-10-06 (estado REAL revalidado)

**Coletado em:** 2026-10-06 ~15:35 (local)  
**HEAD no momento:** `dev` @ `454ce50`  
**Remote:** `origin` → `https://github.com/efe777-creator/FAL-PECAS-AUTOMOTIVAS.git`  
**safe.directory:** OK  
**Opção A:** FECHADA (Plano Mestre §6.4)

---

## Correção da discrepância tip

| Ref | Tip real | Não confundir com |
|-----|----------|-------------------|
| `dev` / `origin/dev` / `HEAD` | **`454ce50`** | — |
| `main` / `origin/main` | **`aa83df5`** | NÃO é tip de `dev` |
| `plan` / `origin/plan` | **`9d552d2`** | — |

**Por que a auditoria antiga dizia `dev = aa83df5`?**  
Esse era o tip **histórico** (quando `dev ≡ main`). Depois entraram 5 commits em `dev`.  
`aa83df5` **é ancestral** de `dev` (está no histórico), mas o tip atual de `dev` é `454ce50`.  
A cópia do arquivo `AUDITORIA_GIT_*` vista em checkout `dev` podia estar **desatualizada** porque a reauditoria vivia só em `plan` (`3edf68d`/`9d552d2` ∉ `dev`).

---

## Branches

| Branch | Tip | Tracking | Nota |
|--------|-----|----------|------|
| `plan` | `9d552d2` | `origin/plan` | só docs |
| `dev` | `454ce50` | `origin/dev` | F8.4 + F8.5 código + F9-A |
| `main` | `aa83df5` | `origin/main` | atrasada 5 commits |

`main...dev` = `0 | 5` (main atrás; correto — sem promoção).

### Commits em `dev` e não em `main`

1. `0eb01f8` docs(f8.1)…  
2. `3d016f7` docs(f8): Opção A…  
3. `bba6c47` feat(f8.4)…  
4. `f1fe91c` feat(f8.5)…  
5. `454ce50` feat(f9-a)…

### Feature branches (locais)

| Branch | Tip | Já ancestral de `dev`? |
|--------|-----|------------------------|
| `feat/f8.4-baseline` | `bba6c47` | sim — **não re-mergear** |
| `feat/f8.5-list-extra-cost-percent` | `f1fe91c` | sim — **não re-mergear** |
| `feat/f9-a-frete-correios` | `454ce50` | sim (= tip `dev`) |

---

## Working tree em `dev` (não publicar neste pacote)

### UI vitrine — fora da trilha
- `M` CategoryCard / ProductCard  
- `??` `categoryEmoji.ts` (+ test), `public/icons/categories/*.png`

### Outros tracked
- `M` `docs/entrada/IMPORT.md`

### Ruído — **nunca versionar**
`agent-tools-*`, `fal-pecas/supabase/.temp/`, `ARQUIVOS IMPORTAÇÕES/`

---

## Migration / gates

| Item | Status |
|------|--------|
| Prepared F8.5 | `…/20261006160000_list_extra_cost_percent_prepared.sql` versionada |
| `db push` | **NÃO** |
| Smoke pós-apply | **PENDENTE** |
| PR `dev→main` | **NÃO** abrir até gate |

---

## Conclusão deste pacote

1. Tip real de `dev` = **`454ce50`** (não `aa83df5`).  
2. Baseline de código em `dev` **já preparado** — promoção F8.4/F8.5/F9-A **já feita** via `feat/*`.  
3. Próximo gate operacional: protocolo F8.5 apply (auth → `db push` → smoke) — **sem** mexer em `main` ainda.  
4. UI vitrine e ruído ficam fora até auth separada.
