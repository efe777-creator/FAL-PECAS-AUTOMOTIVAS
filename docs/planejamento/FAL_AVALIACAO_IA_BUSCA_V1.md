# Avaliação — IA na busca e placas (V1)

**Data:** 2026-11-12  
**Auth:** eFe — auditoria precisão busca  
**Premissa:** IA **não** mascara inconsistência de dados; cadastro mestre valida.

## 1. O que já existe

| Item | Valor |
|------|--------|
| Edge | `interpret-search-nl` |
| Provider | Groq `https://api.groq.com/openai/v1/chat/completions` |
| Modelo default | `openai/gpt-oss-20b` (override `GROQ_MODEL`) |
| Secret | `GROQ_API_KEY` (opcional; sem key → intent null) |
| Flag front | `VITE_SEARCH_NL_LLM=1` |
| Cliente | `interpretNaturalLanguage.ts` |
| Fallback | Sempre `interpretSearchQuery` (determinístico) |
| Validação | `mergeSearchIntent` — modelo/versão só se existirem no catálogo |
| Escopo atual | Interpretação de **texto de busca**, não de payload de placa |

### Comportamento

- Flag off ou sem Supabase → só determinístico (busca não quebra).
- Confiança determinística `high` ou `codeHint` → **não chama** LLM (economiza).
- Prompt: extrai productQuery + vehicle; proíbe inventar PVC/preço/estoque.

### Evidência prévia

- VAL `FAL_MARCHA_BUSCA_IA_GROQ_VAL_2026-11-11.md`: NL Groq útil em staging.
- Checklist deploy único menciona ligar `VITE_SEARCH_NL_LLM=1`; VALs anteriores também registram **off** no Netlify. **Homologar estado real do env de produção** antes de assumir IA ligada no site.

## 2. Custo / latência / segurança

| Aspecto | Avaliação |
|---------|-----------|
| Custo | Groq free-tier típico; chamada só se flag on + confiança não-alta |
| Latência | +1 RTT Edge + Groq no caminho de busca textual (só quando invocado) |
| Logs | Edge loga HTTP/parse fail; não deve logar PII de placa (hoje NL não recebe placa) |
| Segurança | Prompt injection mitigada por sanitize + merge com catálogo; sem escrita de PVC |

## 3. Comparar IA ligada × desligada (busca texto)

| | Desligada | Ligada |
|--|-----------|--------|
| Códigos / YMM curto | Determinístico | Idem (skip LLM) |
| Frases NL (“preciso de um pivô…”) | Parser NL leve / regras | Groq melhora recall de intent |
| Risco inventar versão | Baixo | Mitigado por merge (T05 One→clarification) |
| Dependência rede | Nenhuma extra | Groq + Edge |

**Veredito busca inteligente:** manter núcleo **determinístico**. IA é **aprimoramento opcional** de NL, já desenhada com fallback. **Não ativar/alterar produção sem homologação** e confirmação da flag.

## 4. IA para normalizar placa?

| Critério | Análise |
|----------|---------|
| Pode sugerir split maker/model/engine/version? | Sim, como **sugestão** paralela |
| Pode inventar motor/versão? | **Não** — rejeitar se não bater allowlist/mestre |
| Deve entrar no hot path da busca? | **Não** — busca PVC não depende de LLM |
| Consome na busca inteligente? | Só se acoplado errado; proposta = flag **separada** `VITE_PLATE_NL_LLM` (default off) |

### Recomendação

| Uso | Go / No-go |
|-----|------------|
| Busca texto NL (já implementado) | **Go condicional** — homologar flag + VAL on/off; default seguro = off se custo/latência preocupar |
| Placa: LLM no caminho crítico | **No-go** |
| Placa: assist opcional pós-`/basico`, validado por `splitApiModelo` + mestre | **Go P2** após P0 categoria/dados e P1 atributos; staging only |

## 5. Critérios de homologação IA

1. Matriz IA-ON / IA-OFF com mesmas queries; PVC idêntico quando intent equivalente.
2. Zero chamada LLM em queries `high` / código.
3. Placa: se assist existir, diff sugestão vs determinístico logado sem placa completa.
4. Aprovação explícita do responsável antes de `VITE_*_LLM=1` em produção.
