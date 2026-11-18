# FAL — R6 Migration repair (ledger G1–G7 / R3 / progressive)

**Data:** 2026-11-18  
**Projeto:** `wtbpwuiayednvlhvuhbh`  
**Branch:** `dev`  
**Autorização:** eFe — MARCHA 1–2–3  
**Status:** executado (ledger only; SQL não reaplicado)

---

## 1. Divergência

Aplicações via MCP `apply_migration` gravaram versions com timestamp de servidor. O repo usa nomes estáveis `20261118…` locais. O schema já contém as colunas/objetos; o CLI via nomes locais via como “pendentes”.

| Remoto (`schema_migrations`) | Arquivo local |
|------------------------------|---------------|
| *(ausente no ledger; schema já tem `maker_text`…)* | `20261118010000_customer_vehicles_progressive_text.sql` |
| `20261118035514_customer_vehicles_plate_normalized` | `20261118120000_customer_vehicles_plate_normalized.sql` |
| `20261118040113_g3_garage_personalization` | `20261118130000_g3_garage_personalization.sql` |
| `20261118040935_g6_cart_order_vehicle_snapshot` | `20261118140000_g6_cart_order_vehicle_snapshot.sql` |
| `20261118040934_g6_place_order_vehicle_snapshot` | `20261118140100_g6_place_order_vehicle_snapshot.sql` |
| `20261118041610_g7_customer_vehicle_part_events` | `20261118150000_g7_customer_vehicle_part_events.sql` |
| `20261118042142_r3_customer_vehicles_source_snapshot` | `20261118160000_r3_customer_vehicles_source_snapshot.sql` |

Entradas MCP remotas **permanecem** (histórico). Repair adiciona as versions **locais** como `applied`.

---

## 2. Procedimento executado

`INSERT` em `supabase_migrations.schema_migrations` das versions locais (equivalente a `supabase migration repair <version> --status applied`):

- `20261118010000`
- `20261118120000`
- `20261118130000`
- `20261118140000`
- `20261118140100`
- `20261118150000`
- `20261118160000`

**Não** executado: `db reset`, drop de rows MCP, reexecução dos `.sql`.

---

## 3. Risco

- Ledger-only: baixo risco de schema; histórico passa a ter duas keys por mudança lógica (MCP + local).
- Se no futuro alguém reaplicar o SQL local sem idempotência, haveria falha — por isso o ledger local fica `applied`.

## 4. Rollback

```sql
DELETE FROM supabase_migrations.schema_migrations
WHERE version IN (
  '20261118010000','20261118120000','20261118130000',
  '20261118140000','20261118140100','20261118150000','20261118160000'
);
```

Reavaliar antes de qualquer `db push`.

## 5. Verificação

- Colunas `maker_text`, `plate_normalized`, `color_hex`, `source_snapshot` presentes em `customer_vehicles`.
- `schema_migrations` contém versions locais listadas acima **e** as MCP `20261118035514`….
