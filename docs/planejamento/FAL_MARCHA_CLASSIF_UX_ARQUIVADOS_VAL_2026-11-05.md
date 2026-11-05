# VAL — MARCHA Classificação · UX arquivados (sem mesclar)

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`

---

## Escopo

1. Remover bloco/fluxo **Mesclar classificações** (UI + service).  
2. Remover **Publicar todas arquivadas** e checkbox **Mostrar arquivadas**.  
3. Lista principal só com ativos.  
4. Link discreto **Ver arquivados (N)** → mini menu com seleção + **Publicar** / **Excluir**.

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Sem UI/API de mesclar na página | **PASS** |
| 2 | Sem botão bulk “Publicar todas arquivadas” | **PASS** |
| 3 | “Ver arquivados” discreto no topo (só se N>0) | **PASS** |
| 4 | Mini menu: checkbox + Publicar / Excluir (filhos antes) | **PASS** |
| 5 | `tsc --noEmit` | **PASS** |

---

## STOP

eFe pode limpar categorias/grupos arquivados pelo menu e republicar o que quiser. Próximo: Onda 4 relacionados (26) ou gate humano.

**Assinatura:** VAL classif UX arquivados PASS 2026-11-05.
