# Importação de produtos — FAL Peças Automotivas 3.0

**Status:** Especificação futura (Fase 1.5)  
**NÃO implementado.** Ver PRD §9 e [DATABASE.md](./DATABASE.md) (`imports` / `import_items`).

---

## 1. Objetivo

Permitir carga em massa de produtos (e dados relacionados) via Excel/CSV, com validação, preview e upsert por **SKU**, sem duplicar silenciosamente.

---

## 2. Fluxo

```text
Upload → Leitura → Validação → Preview → Correção → Confirmação → Importação → Relatório
```

---

## 3. Formatos

- Excel (`.xlsx`)
- CSV (UTF-8; delimitador **DECISÃO PENDENTE**: `;` vs `,`)

---

## 4. Campos (especificação inicial)

### Obrigatórios (linha de produto)

- `sku`
- `name`
- `price` (ou regra explícita de preço)
- `status` (ou default draft)

### Recomendados / condicionais

- `slug` (gerável a partir do nome se ausente)
- `description`
- `brand` / `brand_sku`
- `category` / `subcategory`
- `manufacturer_code` e outros códigos
- `promo_price`
- `stock` (gera movimento se informado)
- `image_url` / path
- colunas de compatibilidade (montadora, modelo, ano, motor, versão) — opcionais por linha
- atributos técnicos (extensíveis)

Ausências não críticas → produto pode ser criado como **incompleto** (`is_incomplete = true`) com avisos.

---

## 5. Validação

| Severidade | Efeito |
|------------|--------|
| **Erro crítico** | Bloqueia a linha (ex.: SKU vazio, preço inválido, SKU malformado) |
| **Aviso** | Permite importar; registra no relatório (ex.: sem imagem, categoria inexistente a criar, compat parcial) |

Validações críticas no **backend** (Edge Function / RPC), não só no browser.

---

## 6. Upsert e duplicidade

- SKU existente → **atualiza**
- SKU novo → **cria**
- Nunca duplicar SKU silenciosamente
- Relatório deve listar: criados / atualizados / rejeitados / avisos

---

## 7. Preview

Antes de confirmar, o operador vê:

- totais (ok / aviso / erro)
- amostra de linhas
- possibilidade de corrigir arquivo e reenviar

---

## 8. Produtos incompletos

Critérios exemplo: sem imagem, sem categoria, sem compatibilidade, sem código fabricante.  
Admin deve conseguir filtrar `is_incomplete`.

---

## 9. Relatório

Persistir em `imports` / `import_items`:

- quem importou, quando, arquivo
- contagens
- detalhe por linha (erro/aviso/resultado)

---

## 10. Evolução

- Mapeamento de colunas configurável
- Import de só estoque / só preços / só compatibilidade
- Integração futura com fornecedor (HF) via `suppliers`

## Decisões pendentes

- Delimitador CSV padrão
- Criar categorias/marcas on-the-fly vs. exigir pré-cadastro
- Limite de linhas por arquivo
- Job assíncrono vs. síncrono
