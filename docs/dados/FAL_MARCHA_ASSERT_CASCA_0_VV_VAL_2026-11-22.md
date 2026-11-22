# VAL — Assert placa avisa casca (0 VV)

**Branch:** `dev` · **Sem MAIN**

## Correção

`assertPlateAgainstCatalog`: modelo na árvore verified com `versionsByModel` vazio → zera `versionId`, rebaixa A→B e mensagem de casca (sem inventar motor/versão).

## Pós

- Vitest plateIdentityAssert + antiregress: **29/29**
