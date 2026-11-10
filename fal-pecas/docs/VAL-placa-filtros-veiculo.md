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
