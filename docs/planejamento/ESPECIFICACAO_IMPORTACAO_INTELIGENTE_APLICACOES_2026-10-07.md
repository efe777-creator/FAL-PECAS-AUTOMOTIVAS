# Especificação — Importação Inteligente de Produtos e Aplicações FAL

**Data:** 2026-10-07 · **Status:** Spec fechada pós Fase A  
**Base:** Plano mestre backlog · `AUDITORIA_IMPORT_INTELIGENTE_FASE_A_2026-10-07.md`

## 1. Objetivo

Arquivo → mapeamento → normalização → identificação → análise → **prévia** → confirmação → execução transacional. Idempotente. **Produto ≠ aplicação.**

## 2. Aplicação lógica (deduplicável)

```text
Produto + Montadora + Modelo + Versão + Ano início + Ano fim
```

Mesma chave lógica N vezes no arquivo = **1 aplicação**.

## 3. Contrato de arquivo v1

| Coluna | Obrigatório |
|--------|-------------|
| Código (SKU FAL) | sim |
| Nome | sim (produto novo) |
| Montadora | sim |
| Modelo | sim |
| Versão | opcional |
| Ano início | opcional |
| Ano fim | opcional (vazio = vigente) |

**Fonte oficial de aplicação = essas colunas.** Nunca inferir do texto do Nome.

## 4. Schema (decisão Fase A)

**Evoluir `product_vehicle_compatibility`:**

- `year_start int null`
- `year_end int null` (null = vigente)
- CHECK coerente; unique lógica a definir (produto + vehicle_version + período ou produto + VV com um intervalo)
- `vehicle_versions`: mantém montadora/modelo/engine/version_name; `year` permanece para backfill/compat até busca migrar

**Não criar** tabela paralela de aplicações nesta fase.

## 5. Motor — etapas internas

```text
Arquivo → Mapeamento → Normalização → Identificação
  → Produto / Veículo / Período → Aplicação → Ação
  → Novo | Atualização | Já contemplado | Revisão | Erro
  → Prévia → Confirmar → Transação → Relatório
```

### Matching

| Confiança | Ação |
|-----------|------|
| Exata | reutilizar |
| Provável | **revisão** (vincular/criar) |
| Não identificado | novo ou revisão |

### Versão

Preservar original. Split (`1.0/1.6`) **somente** com regra segura; senão literal + revisão se ambíguo.

### Períodos (intervalos)

| Caso | Ação |
|------|------|
| Já coberto | noop |
| Expansão contínua | ampliar |
| Encerramento (... → ano fim) | atualizar fim |
| Lacuna / conflito | revisão |

Ano fim vazio = vigente (`20/...`), não “ainda fabricado hoje”.

### Produto

- Existe por SKU → reutiliza  
- Não existe → cria `draft`, `is_available=false`, sem preço/publicação/fabricante  
- Aplicação só após produto resolvido **na mesma transação**

## 6. Kind / staging

- `ImportKind`: `catalog_applications`
- Reusar `imports` / `import_items`
- Permissão: Admin / Gerente (`staff_can_import_catalog`)
- Prévia enriquece com lookup no banco e **congela** `action` / `period_action` / flags de criação no `import_items.payload`
- Apply recebe **somente** `p_import_id` — nunca decisões reenviadas pelo frontend

## 7. Apply transacional

RPC: `apply_catalog_applications_import(p_import_id uuid) → jsonb`

- Security definer + `staff_can_import_catalog`
- Kind `catalog_applications`; status `preview`/`validated`
- **Idempotência nível A:** mesmo `import_id` em `done`/`importing`/`failed` → rejeitar
- **Idempotência nível B:** novo `import_id` com mesmo arquivo → já cadastrado / já contemplado (sem duplicar)
- Sem `EXCEPTION WHEN OTHERS` no loop → falha crítica = **rollback total**
- `vehicle_versions` ambígua (várias iguais sem vínculo PVC) → revisão / RAISE — nunca “mais antigo”
- Período da aplicação = `PVC.year_start` / `PVC.year_end` (`vehicle_versions.year` só legado estrutural)
- Produto novo: `draft` + `is_available=false` + `price=0` (não vendável na loja)

## 8. UI wizard

Arquivo → Prévia enriquecida → Staging → Confirmação → Apply → Resultado  
Tela: `/admin/produtos/importar-aplicacoes`  
Export CSV de erros/revisões e histórico HF: próxima marcha.

## 9. Fora de escopo

Fabricante peça, fornecedor, estoque, pedido, checkout, pagamento, VIN, inferência pelo nome, F/G.

## 10. Aceite

arquivo → prévia → confirmação → catálogo atualizado; reimport ≈ idempotente; sem publicação automática; sem alterar F7/F8.
