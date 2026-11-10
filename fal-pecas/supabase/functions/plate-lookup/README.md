# plate-lookup

Consulta de veículo por placa (AJUSTE-028).

## Provedores

| `PLATE_PROVIDER` | Comportamento |
|------------------|---------------|
| `mock` | Fixtures locais (PoC / teste) |
| `apiplacas` | API Placas — consulta **simples** `/basico/{placa}` |
| *(omitido)* | Se `APIPLACAS_TOKEN` existir → `apiplacas`; senão `mock` |

## API Placas (produção)

- Docs: https://apiplacas.com.br/documentacao
- Base: `https://wdapi2.com.br/v3`
- Rota usada: `GET /basico/{placa}` (~R$ 0,03) — **sem** chassi/Renavam/completa
- Auth: `Authorization: Bearer <token>`

## Secrets (Edge — nunca VITE_)

```bash
npx supabase secrets set `
  "PLATE_PROVIDER=apiplacas" `
  "APIPLACAS_TOKEN=SEU_TOKEN" `
  --project-ref wtbpwuiayednvlhvuhbh --yes

npx supabase functions deploy plate-lookup --project-ref wtbpwuiayednvlhvuhbh --yes
```

Opcional: `APIPLACAS_BASE_URL=https://wdapi2.com.br/v3`  
Nota: a CLI atual **não** usa `--use-api` em `secrets set`.

## Migration

Aplicar `20261110120000_plate_lookup_cache.sql` (cache).

## Deploy

```bash
npx supabase functions deploy plate-lookup --project-ref wtbpwuiayednvlhvuhbh --yes
```
