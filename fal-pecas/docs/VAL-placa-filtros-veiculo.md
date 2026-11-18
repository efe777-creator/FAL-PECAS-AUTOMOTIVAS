# VAL — Placa preenche 5 filtros + empty state sem PVC

## Critérios

1. Após consultar placa real (ex.: `INT8C36`), a tela de conferência mostra **Montadora, Modelo, Ano, Motor e Versão** preenchidos (não select em branco).
2. Motor/versão ausentes na API → option **“Não informado”** selecionada.
3. Nomes canônicos FAL (ex.: `Volkswagen`, `Cross Fox`) — não texto cru inconsistente.
4. Confirmar busca: catálogo mantém os 5 filtros; se zero PVC → mensagem *“Identificamos o veículo, mas ainda não temos peças compatíveis cadastradas.”*
5. Upsert idempotente: mesma chave natural `(maker, model, year, engine, version)` não duplica `vehicle_versions`.

## Como validar

1. Admin → Veículos → Importar mestre (opcional) com CSV `montadora;modelo;ano;motor;versao`.
2. Home → Buscar por placa → conferir selects.
3. Confirmar → catálogo; se sem peças, empty state específico.
4. Repetir a mesma placa: cache/upsert sem duplicar VV (`vehicle_versions_natural_uidx`).

## Testes automatizados

- `src/services/plates/reconcileVehicleFilter.test.ts` — 5 values ∈ options
- `src/services/plates/plateResultToFilter.test.ts` — motor/versão `""`
- `src/services/plates/plateFilterPipeline.test.ts` — pipeline placa → reconcile → options
- `src/services/admin/adminVehicleMasterImportService.test.ts` — preview CSV 5 colunas

## Evidência smoke (2026-11-10)

- `POST /functions/v1/plate-lookup` placa `INT8C36` → `status=found`, maker=`Volkswagen`, model=`Cross Fox`, year=`2007`, engine/version=null, `versionId` presente, mensagem de motor/versão.
- 2ª consulta (cache) → mesmos 5 campos canônicos + `versionId`.
- VV no banco: `Volkswagen | Cross Fox | 2007 | source=plate` (chave natural sem duplicata).
- Vitest: 22 testes do pacote plates/import OK; `tsc -b` OK.

## Evidência smoke (2026-11-18) — `GAF7032`

- Edge `plate-lookup` (prod): `found` · Chevrolet · Onix · 2016 · 1.4 · LT · fuel informativo · IDs canônicos · `apiplacas` (não mock).
- VV active no mestre: `Chevrolet | Onix | 2016 | 1.4 | LT`.
- UI `/veiculo` (Vite): conferência com **5 selects** preenchidos (Chevrolet / Onix / 2016 / 1.4 / LT) + combustível informativo.
- Confirmar → `/catalogo?vehicle=1&maker=Chevrolet&model=Onix&year=2016&engine=1.4&version=LT` com chips ativos.
- Empty state: *“Veículo reconhecido — sem peças compatíveis”* / *“Identificamos o veículo, mas ainda não temos peças compatíveis cadastradas.”* (PVC ausente — esperado).
- Prompt único `GarageAskPrompt` no catálogo: *“Deseja salvar este veículo na sua garagem?”* (Chevrolet Onix 2016 · 1.4 · LT · placa GAF7032).
- Anônimo → **Sim, salvar** → `/login` + `sessionStorage.fal_pending_garage_vehicle` com placa `GAF7032`; ask prompt limpo.
- Fix: prompt não some mais (Strict Mode / 2× `VehiclePlateSearch`); `ProductCard` sem `<a>` aninhado na categoria.
- Pós-auth: `resolveAuthReturnPath` usa `state.from` ou, se sumir (refresh), `pending.returnTo` do catálogo.
