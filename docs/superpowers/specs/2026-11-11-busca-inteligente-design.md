# Design — Busca Inteligente FAL (unificação texto ↔ PVC)

**Data:** 2026-11-11  
**Repo:** https://github.com/efe777-creator/FAL-PECAS-AUTOMOTIVAS.git  
**App:** `fal-pecas/` (React 19 + Vite + Supabase)  
**Status:** Design para aprovação (sem alteração de código/banco até gate)

---

## 1. Problema

Auditoria funcional TinyFish (48 etapas, somente leitura) e auditoria técnica local do repositório convergiram:

| Entrada | Resultado |
|---------|-----------|
| Seletor Hyundai → HB20 → 2015 → 1.0 | **3** produtos (BRD2109, TDI2116, TDI2117) |
| Texto `HB20` | **3** produtos (mesmo conjunto) |
| Texto `HB20 2015` / `HB20 1.0 2015` / `HB20 1.6 2015` / `HB20 One` | **0** |

### Causa técnica definitiva (código + SQL)

Dois canais distintos na RPC `search_products`:

1. **Texto (`p_q`)** — tokens AND apenas em campos do produto (`sku`, `name`, `search_document`, marca, refs). **Não consulta PVC.**
2. **Veículo (`p_maker`/`p_model`/`p_year`/…)** — CTE via `product_vehicle_compatibility` + `vehicle_versions`.

A SearchBar navega só com `q`:

```ts
navigate(`/catalogo?q=${encodeURIComponent(qTrim)}`)
```

Não existe interpretador que transforme `HB20 2015` em `model=HB20&year=2015`.  
`search_document` **não** indexa maker/model/anos de aplicação.  
Logo o token `2015` falha o AND → zero resultados.

Isso **não** é o bug já corrigido do wildcard engine/versão vazios (VAL 2026-11-10).

---

## 2. Objetivo

Um **único pipeline** de busca:

```
Interface (texto | placa | garagem | seletor | categoria)
        ↓
Interpretador de intenção (determinístico primeiro; IA só depois)
        ↓
Orquestrador → searchCatalog / search_products
        ↓
Validador PVC (única fonte de compatibilidade)
        ↓
Resultados + ranqueamento + clarificação quando faltar dado
```

**Regra de ouro:** IA (quando existir) interpreta intenção; **nunca** inventa compatibilidade, preço ou estoque.

---

## 3. Abordagens avaliadas (P0)

| Abordagem | Prós | Contras | Decisão |
|-----------|------|---------|--------|
| **A. Indexar PVC em `search_document`** | Zero parser | Falsos positivos (anos em códigos); não separa motor; dilui ranking | Rejeitada como solução principal |
| **B. Só UI: forçar seletor YMM** | Simples | Cliente digita e continua falhando; placeholder mente | Rejeitada |
| **C. Interpretador determinístico → params estruturados + PVC** | Reusa RPC; testável; sem custo de API; unifica canais | Precisa dicionário de modelos/sinônimos | **Escolhida** |
| **D. C + index leve de maker/model (sem ano) no documento** | Ajuda `HB20` sozinho e typos | Opcional fase P1 | Complemento P1 |

**Escolhida: C (P0) + D opcional (P1) + interpretador IA (P2) com fallback C.**

---

## 4. Arquitetura-alvo

### 4.1 Novos módulos (fronteiras)

| Unidade | Responsabilidade | Não faz |
|---------|------------------|---------|
| `interpretSearchQuery` | Extrai peça/código/veículo/ano/motor/versão de texto | Compatibilidade |
| `searchVehicleSuggestions` | Sugestões de veículos do mestre | Produtos |
| `searchCatalog` (evolução) | Chama prep + interpretador + RPC | Decidir fitment fora do PVC |
| `SearchBar` | UI seções VEÍCULOS / PEÇAS; navega com params unificados | Lógica SQL |
| PVC / `search_products` | Única verdade de fitment | NLP |

### 4.2 Contrato de intenção (determinístico)

```ts
type SearchIntent = {
  raw: string
  productQuery: string | null   // tokens restantes (peça, código, marca peça)
  vehicle: {
    maker?: string
    model?: string
    year?: string
    engine?: string
    version?: string
  }
  codeHint?: string             // SKU/ref prioritário se detectado
  needsClarification: boolean
  clarification?: 'engine' | 'version' | 'year' | 'model'
  confidence: 'high' | 'medium' | 'low'
}
```

Exemplo: `terminal HB20 2015 1.0` →

```json
{
  "productQuery": "terminal",
  "vehicle": { "maker": "Hyundai", "model": "HB20", "year": "2015", "engine": "1.0" },
  "needsClarification": false,
  "confidence": "high"
}
```

Exemplo: `HB20 2015` → `productQuery: null`, vehicle model+year, `needsClarification` se houver motores distintos nas apps.

### 4.3 Fluxo URL unificado

Após interpretação, a navegação **deve** popular os mesmos query params do seletor:

`/catalogo?q=<productQuery>&maker=Hyundai&model=HB20&year=2015&engine=1.0`

- `q` só com tokens de produto (ou vazio se só veículo).
- Veículo sempre via maker/model/year/engine/version.
- Placa e garagem já geram esses params → passam a ser o mesmo contrato.

### 4.4 Autocomplete

```
[query]
  ├─ search_vehicle_suggestions (models + makers + anos comuns)
  └─ search_product_suggestions (existente)
UI:
  VEÍCULOS  → clique aplica filtros estruturados (não só q=)
  PEÇAS     → PDP ou catálogo com intent aplicada
```

Veículo **sem produtos** ainda aparece; mensagem: “Veículo reconhecido — sem peças compatíveis cadastradas”.

### 4.5 Papel da IA (P2 apenas)

- Entrada: linguagem natural / ambígua.
- Saída: mesmo `SearchIntent`.
- Gate: se confiança baixa ou indisponível → interpretador determinístico.
- Cache de interpretações; rate limit; nunca escrever PVC.

---

## 5. Dados e achados de UX (não confundir com bug)

| Sintoma TinyFish | Leitura técnica |
|------------------|-----------------|
| `Hb20 1.0 (12/...)` | `formatVehicleAppYear`: ano fim nulo → label `YY/...` **por design**; grafia vem do cadastro `models.name` |
| Aplicação “truncada” no card | `attachCompatibilitySummaries({ compact: true, maxEntries: 4 })` no catálogo; PDP usa `maxEntries: 40` |
| Preço divergente | Investigar `resolve` vs `price`/`promo_price` antes de classificar defeito |
| `HB20` sozinho = 3 | Nome/modelo aparece no texto do produto ou search_document parcial — **não** prova que ano funciona no texto |

---

## 6. Entregas (gates de aprovação)

1. **Auditoria técnica** — inventário + evidências SQL + matriz (somente leitura).
2. **Especificação definitiva** — comportamento, contratos, critérios de aceite.
3. **Implementação** — P0 → P1 → P2, cada um com VAL e aprovação antes do próximo.

Nenhuma migration/deploy sem aprovação explícita do eFe após a Entrega 1+2.

---

## 7. Critérios de sucesso (mínimo P0)

- `HB20 2015` → mesmos produtos do seletor para aquele ano (interseção PVC).
- `HB20 1.0 2015` ≠ misturar só 1.6 quando o filtro de motor for aplicado.
- `HB20` → reconhece veículo + lista peças (comportamento atual preservado ou melhorado).
- Código `TDI2116` continua prioridade textual.
- Sem IA obrigatória.
- Compatibilidade só via PVC.

---

## 8. Fora de escopo imediato

- Reescrever motor do zero / Meilisearch.
- Geração automática de aplicações por IA.
- Alterar regra de preço sem auditoria de fonte.
- Trocar label `YY/...` sem decisão de UX (pode ser P1 copy).
