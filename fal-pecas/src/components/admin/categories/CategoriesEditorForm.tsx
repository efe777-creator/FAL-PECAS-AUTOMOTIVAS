import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import {
  CATEGORY_EMOJI_PALETTE,
  CATEGORY_IMG_KEYS,
  resolveCategoryIcon,
} from '@/lib/categoryEmoji'
import {
  categoryDepth,
  categoryLevelLabel,
  CATEGORY_MAX_DEPTH,
} from '@/services/admin/adminCategoryService'
import type { Category } from '@/types'
import type { FormEvent, RefObject } from 'react'

export type CreateLevel = 1 | 2 | 3

type Props = {
  formRef: RefObject<HTMLFormElement | null>
  nameInputRef: RefObject<HTMLInputElement | null>
  measuresSectionRef: RefObject<HTMLDivElement | null>
  items: Category[]
  editing: Category | null
  createLevel: CreateLevel
  name: string
  description: string
  parentId: string
  subgrupoCategoriaId: string
  sortOrder: string
  emoji: string
  defaultWeightKg: string
  defaultLengthCm: string
  defaultWidthCm: string
  defaultHeightCm: string
  resultingDepth: number
  categoriaOptions: Category[]
  parentOptions: Category[]
  busyId: string | null
  busyApplyMeasures: boolean
  childrenCount: (parentId: string) => number
  onSubmit: (e: FormEvent) => void
  onStartCreate: (level: CreateLevel) => void
  onReset: () => void
  onDelete: (cat: Category) => void
  onApplyDefaultMeasures: () => void
  onName: (v: string) => void
  onDescription: (v: string) => void
  onParentId: (v: string) => void
  onSubgrupoCategoriaId: (v: string) => void
  onSortOrder: (v: string) => void
  onEmoji: (v: string) => void
  onDefaultWeightKg: (v: string) => void
  onDefaultLengthCm: (v: string) => void
  onDefaultWidthCm: (v: string) => void
  onDefaultHeightCm: (v: string) => void
}

/** Formulário criar/editar classificação (extraído da página admin). */
export function CategoriesEditorForm({
  formRef,
  nameInputRef,
  measuresSectionRef,
  items,
  editing,
  createLevel,
  name,
  description,
  parentId,
  subgrupoCategoriaId,
  sortOrder,
  emoji,
  defaultWeightKg,
  defaultLengthCm,
  defaultWidthCm,
  defaultHeightCm,
  resultingDepth,
  categoriaOptions,
  parentOptions,
  busyId,
  busyApplyMeasures,
  childrenCount,
  onSubmit,
  onStartCreate,
  onReset,
  onDelete,
  onApplyDefaultMeasures,
  onName,
  onDescription,
  onParentId,
  onSubgrupoCategoriaId,
  onSortOrder,
  onEmoji,
  onDefaultWeightKg,
  onDefaultLengthCm,
  onDefaultWidthCm,
  onDefaultHeightCm,
}: Props) {
  const previewIcon = resolveCategoryIcon({
    name,
    slug: editing?.slug,
    emoji: emoji || null,
  })
  const highlighted = Boolean(editing || name || parentId || createLevel > 1)

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className={`grid gap-3 rounded-[14px] border bg-white p-4 md:grid-cols-2 ${
        highlighted ? 'border-fal-yellow-dark ring-2 ring-fal-yellow/40' : 'border-fal-line'
      }`}
    >
      <div className="md:col-span-2 flex flex-wrap items-center gap-3">
        <span className="text-xs font-extrabold uppercase tracking-wide text-fal-muted">
          {editing
            ? `Editando ${categoryLevelLabel(categoryDepth(items, editing.id))}`
            : `Criando ${categoryLevelLabel(createLevel)}`}
        </span>
        {!editing ? (
          <div className="flex flex-wrap gap-1">
            {([1, 2, 3] as CreateLevel[]).map((lv) => (
              <button
                key={lv}
                type="button"
                className={`rounded-md px-2 py-1 text-xs font-bold ${
                  createLevel === lv ? 'bg-fal-navy text-white' : 'bg-fal-bg text-fal-navy'
                }`}
                onClick={() => onStartCreate(lv)}
              >
                {categoryLevelLabel(lv)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Input
        ref={nameInputRef}
        label="Nome"
        value={name}
        onChange={(e) => onName(e.target.value)}
        required
        hint="Nós da planilha e manuais: edite nome/pai/ícone aqui."
      />
      <Input
        label="Descrição (opcional)"
        value={description}
        onChange={(e) => onDescription(e.target.value)}
      />

      {createLevel === 2 ? (
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-fal-navy">Categoria pai</span>
          <select
            className="w-full rounded-[10px] border border-fal-line bg-white px-3 py-2"
            value={parentId}
            onChange={(e) => onParentId(e.target.value)}
            required
          >
            <option value="">Selecione…</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[13px] text-fal-muted">
            Só categorias cadastradas (manual ou importação).
          </span>
        </label>
      ) : null}

      {createLevel === 3 ? (
        <>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-fal-navy">Categoria</span>
            <select
              className="w-full rounded-[10px] border border-fal-line bg-white px-3 py-2"
              value={subgrupoCategoriaId}
              onChange={(e) => {
                const catId = e.target.value
                onSubgrupoCategoriaId(catId)
                const grupos = items
                  .filter(
                    (c) =>
                      c.parentId === catId &&
                      c.status !== 'archived' &&
                      categoryDepth(items, c.id) === 2,
                  )
                  .sort((a, b) => a.name.localeCompare(b.name))
                const first = grupos[0]
                onParentId(first?.id ?? '')
                onSortOrder(first ? String(childrenCount(first.id)) : '0')
              }}
              required
            >
              <option value="">Selecione…</option>
              {categoriaOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-fal-navy">Grupo pai</span>
            <select
              className="w-full rounded-[10px] border border-fal-line bg-white px-3 py-2"
              value={parentId}
              onChange={(e) => {
                onParentId(e.target.value)
                if (e.target.value) {
                  onSortOrder(String(childrenCount(e.target.value)))
                }
              }}
              required
              disabled={!subgrupoCategoriaId}
            >
              <option value="">
                {subgrupoCategoriaId ? 'Selecione o grupo…' : 'Escolha a categoria antes…'}
              </option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[13px] text-fal-muted">
              Só grupos cadastrados nesta categoria (manual ou importação).
            </span>
          </label>
        </>
      ) : null}

      {createLevel === 1 ? (
        <div className="rounded-[10px] border border-dashed border-fal-line bg-fal-bg px-3 py-3 text-sm text-fal-muted">
          Categoria raiz (planilha: coluna <code className="text-xs">categoria</code>) — sem pai.
        </div>
      ) : null}

      <Input
        label="Ordem"
        inputMode="numeric"
        value={sortOrder}
        onChange={(e) => onSortOrder(e.target.value)}
        hint="Menor número primeiro entre irmãos. Também dá para usar ↑↓ na árvore."
      />

      {resultingDepth === 1 ? (
        <div className="md:col-span-2 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-fal-navy">Ícone (só categoria raiz)</span>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-fal-line bg-fal-bg">
              {previewIcon.type === 'image' ? (
                <img
                  src={previewIcon.src}
                  alt={previewIcon.alt}
                  className="h-7 w-7 object-contain"
                />
              ) : (
                <span className="text-2xl">{previewIcon.value}</span>
              )}
            </span>
            <button
              type="button"
              className="text-xs font-semibold text-fal-muted underline"
              onClick={() => onEmoji('')}
            >
              Automático (slug/nome)
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              title="Asset Suspensão"
              className={`rounded-[10px] border px-2 py-1 ${
                emoji === CATEGORY_IMG_KEYS.suspensao
                  ? 'border-fal-navy ring-2 ring-fal-yellow/50'
                  : 'border-fal-line'
              }`}
              onClick={() => onEmoji(CATEGORY_IMG_KEYS.suspensao)}
            >
              <img
                src="/icons/categories/suspensao.png"
                alt="Suspensão"
                className="h-7 w-7 object-contain"
              />
            </button>
            <button
              type="button"
              title="Asset Freios"
              className={`rounded-[10px] border px-2 py-1 ${
                emoji === CATEGORY_IMG_KEYS.freios
                  ? 'border-fal-navy ring-2 ring-fal-yellow/50'
                  : 'border-fal-line'
              }`}
              onClick={() => onEmoji(CATEGORY_IMG_KEYS.freios)}
            >
              <img
                src="/icons/categories/freios.png"
                alt="Freios"
                className="h-7 w-7 object-contain"
              />
            </button>
            <button
              type="button"
              title="Asset Filtros"
              className={`rounded-[10px] border px-2 py-1 ${
                emoji === CATEGORY_IMG_KEYS.filtros
                  ? 'border-fal-navy ring-2 ring-fal-yellow/50'
                  : 'border-fal-line'
              }`}
              onClick={() => onEmoji(CATEGORY_IMG_KEYS.filtros)}
            >
              <img
                src="/icons/categories/filtros.png"
                alt="Filtros"
                className="h-7 w-7 object-contain"
              />
            </button>
            {CATEGORY_EMOJI_PALETTE.map((em) => (
              <button
                key={em}
                type="button"
                className={`grid h-10 w-10 place-items-center rounded-[10px] border text-xl ${
                  emoji === em ? 'border-fal-navy ring-2 ring-fal-yellow/50' : 'border-fal-line'
                }`}
                onClick={() => onEmoji(em)}
              >
                {em}
              </button>
            ))}
          </div>
          <Input
            label="Ícone customizado (opcional)"
            value={emoji}
            onChange={(e) => onEmoji(e.target.value)}
            hint="Apenas Categoria (raiz). Emoji ou img:suspensao / img:freios / img:filtros. Vazio = automático."
          />
        </div>
      ) : (
        <p className="md:col-span-2 text-sm text-fal-muted">
          Ícone só na <strong>Categoria</strong> (raiz). Grupo e subgrupo não têm ícone.
        </p>
      )}

      <div
        id="medidas-padrao"
        ref={measuresSectionRef}
        className="md:col-span-2 space-y-3 rounded-[10px] border border-dashed border-fal-line bg-fal-bg/60 p-3"
      >
        <div>
          <h3 className="m-0 text-sm font-extrabold text-fal-navy">Medidas padrão (frete)</h3>
          <p className="mb-0 mt-1 text-[13px] text-fal-muted">
            Peso/dims médios da classificação. A cotação do carrinho lê o produto (não inventa
            default). Salve e aplique à subárvore para SKUs novos/globais — se este nó estiver
            vazio, o apply usa o padrão do pai. Medidas manuais do produto não são alteradas.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Peso (kg)"
            inputMode="decimal"
            value={defaultWeightKg}
            onChange={(e) => onDefaultWeightKg(e.target.value)}
            placeholder="ex.: 1,2"
          />
          <Input
            label="Comprimento (cm)"
            inputMode="decimal"
            value={defaultLengthCm}
            onChange={(e) => onDefaultLengthCm(e.target.value)}
          />
          <Input
            label="Largura (cm)"
            inputMode="decimal"
            value={defaultWidthCm}
            onChange={(e) => onDefaultWidthCm(e.target.value)}
          />
          <Input
            label="Altura (cm)"
            inputMode="decimal"
            value={defaultHeightCm}
            onChange={(e) => onDefaultHeightCm(e.target.value)}
          />
        </div>
        {editing ? (
          <Button
            type="button"
            variant="outline"
            disabled={busyApplyMeasures}
            onClick={() => void onApplyDefaultMeasures()}
          >
            {busyApplyMeasures
              ? 'Aplicando…'
              : 'Aplicar padrão aos produtos (respeitar medidas deste produto)'}
          </Button>
        ) : (
          <p className="m-0 text-[13px] text-fal-muted">
            Crie/salve a classificação para poder aplicar o padrão em lote.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2 md:col-span-2">
        <Button type="submit" variant="primary" disabled={resultingDepth > CATEGORY_MAX_DEPTH}>
          {editing ? 'Salvar alterações' : `Criar ${categoryLevelLabel(createLevel).toLowerCase()}`}
        </Button>
        {highlighted ? (
          <Button type="button" variant="light" onClick={onReset}>
            Cancelar
          </Button>
        ) : null}
        {editing ? (
          <Button
            type="button"
            variant="light"
            disabled={busyId === editing.id}
            onClick={() => void onDelete(editing)}
          >
            Excluir
          </Button>
        ) : null}
      </div>
    </form>
  )
}
