# FAL_AUDITORIA_SEGURANCA_PERFORMANCE_V1

**Data:** 2026-11-11 · Somente leitura

---

## 1. Segurança / RLS

| Tema | Achado | Label |
|------|--------|-------|
| RPC search | `SECURITY INVOKER` + grant anon/authenticated | FATO repo |
| products SELECT | só `published` | FATO |
| PVC SELECT | via produto published | FATO |
| vehicles SELECT | status active | FATO |
| Client secrets | só `VITE_SUPABASE_URL` + anon (+ MP public key) | FATO |
| service_role | edges apenas | FATO |
| resolve_product_price | `SECURITY DEFINER` | FATO — esperado; expõe preço público |
| Rate limit busca | **Não** há rate limit app-level na SearchBar/RPC | FATO ausência |
| Injecção | params tipados RPC; LIKE com termos — risco baixo de SQL injection; possível abuso de carga | HIPÓTESE |

**Garagem:** RLS customer — só dono (FATO schema F5).  
**Placa:** edge com service role + token externo; cache placa — cuidado LGPD (placa = dado sensível de veículo) — **RECOMENDAÇÃO** revisar retenção/logs.

---

## 2. Performance

| Tema | Achado |
|------|--------|
| Algoritmo | `LIKE '%t%'` multi-coluna + unnest termos AND |
| FTS / trgm | Ausente |
| pageSize | 24 |
| Catálogo prod | 49 published — latência ok hoje |
| Escala | HIPÓTESE: degrada com dezenas de milhares de SKUs |
| Suggestions | query a cada 220ms após 2 chars — sem cache de resposta |
| Pós-processamento | N+1 enrich prices/apps/images por página |

Índices: ver auditoria arquitetura — btree pouco ajuda `%term%`.

---

## 3. Resiliência

| Falha | Comportamento |
|-------|----------------|
| Supabase down | ErrorState / “Catálogo indisponível” |
| Placa API down | Fallback manual (FATO) |
| Prep sinônimos ausente | prepareSearchQuery: se tabelas faltam, comportamento depende de try/catch — **NÃO VERIFICADO** path erro; tabelas **ausentes** em prod |
| IA | Não há dependência runtime atual |

---

## 4. Problemas

| ID | Descrição | P |
|----|-----------|---|
| SEC-01 | Sem rate limit em busca/suggestions | P2 |
| SEC-02 | Revisar retenção cached_plates / logs placa | P1 |
| PERF-01 | LIKE leading-wildcard sem FTS | P2 (escala) |
| PERF-02 | Enrich multi-RPC por página | P2 |
| OPS-01 | Drift migrations prod vs repo | **P0** |

## 5. Preservar

RLS published, INVOKER na busca, secrets só em edge, fallback placa, pageSize limitado.
