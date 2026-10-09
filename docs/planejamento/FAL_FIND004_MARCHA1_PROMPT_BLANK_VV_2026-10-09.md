# Prompt restrito — FIND-004 MARCHA 1  
## Correção `versao` vazia → todas as VVs compatíveis

**Uso:** colar / autorizar no Cursor **somente** quando eFe emitir MARCHA explícita `FIND-004` (código).  
**Estado até lá:** STOP — auditoria **não** libera implementação.  
**Referência:** [FAL_FIND004_APPS_CONTRATO_AUDITORIA_2026-10-09.md](./FAL_FIND004_APPS_CONTRATO_AUDITORIA_2026-10-09.md)

---

## Objetivo

Corrigir o motor de importação de aplicações para que `versao` em branco na planilha signifique: **todas as `vehicle_versions` ativas do modelo resolvido**, no período informado — **sem** escolher uma VV arbitrária e **sem** confundir com “todas as VVs do fabricante”.

Importação em massa permanece **BLOQUEADA** nesta marcha.

---

## Escopo permitido (após MARCHA)

1. Apresentar o contrato atual (`catalog_applications` + `resolveVehicleVersionMatch` + apply SQL) e a lacuna blank.  
2. Identificar a **camada mínima** a alterar (preferência: `applicationImportCore.ts` na prévia/expansão; apply SQL só se o payload expandido já for suficiente).  
3. Implementar a regra:
   - modelo resolvido + `versao` vazia + ≥1 VV ativa do modelo → expandir em N linhas lógicas (1 PVC por VV), mesmo `year_start`/`year_end`;
   - 0 VV ativa → manter create de **1** VV envelope (`version_name` null) + 1 PVC;
   - `versao` preenchida → comportamento atual (match/create por nome; split `1.0/1.6` intacto).  
4. Respeitar período: `ano_fim` vazio = `year_end` null (aberto); não inventar último ano de fabricação.  
5. `ano_inicio` vazio: **não** inventar; manter comportamento atual ou `review`/`error` documentado — sem nova regra de negócio inventada.  
6. Testes de regressão (Vitest) obrigatórios antes de declarar VAL.  
7. **Não** apply em massa; **não** migration repair B3; **não** tocar IMP-19 / MP.

---

## Escopo proibido

- Importar a planilha de 691 linhas  
- Associar VVs de outros modelos/montadoras  
- Escolher 1 VV nomeada quando houver várias  
- Schema novo (tabela “app por modelo”) nesta marcha  
- Contornar `staff_can_import_catalog`  

---

## Testes mínimos (aceitação MARCHA 1)

| ID | Caso |
|----|------|
| T1 | Blank + 3 VVs do mesmo modelo → 3 preview applyable com `vehicleVersionId` distintos |
| T2 | Blank + 0 VV → 1 `createVersion` envelope |
| T3 | Versão explícita inalterada |
| T4 | `ano_fim` vazio permanece `null` após expansão |
| T5 | Não expandir para VV de outro `model_id` |
| T6 | Duplicidade lógica / already_covered ainda coerente pós-expansão |

---

## Entregáveis

1. Diff mínimo + testes verdes  
2. Nota curta VAL (`FAL_FIND004_BLANK_VV_VAL_…`)  
3. STOP: revalidar planilha (MARCHA 3) **antes** de import admin (MARCHA 4)

---

## Texto de autorização esperado

> `MARCHA FIND-004` — implementar blank→todas VVs conforme este prompt; apply em massa continua bloqueado.

Sem essa frase (ou equivalente explícito), o agente **não** altera código.
