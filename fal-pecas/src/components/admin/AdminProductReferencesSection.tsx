import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Input } from '@/components/common/Input'
import { useToast } from '@/components/common/Toast'
import { entityStatusLabel, productReferenceTypeLabel } from '@/lib/adminLabels'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminDeleteReference,
  adminListReferences,
  adminUpsertReference,
} from '@/services/admin/adminProductService'
import type { ProductReference } from '@/types'
import { useCallback, useEffect, useState } from 'react'

type Props = {
  productId: string
}

export function AdminProductReferencesSection({ productId }: Props) {
  const toast = useToast()
  const [refs, setRefs] = useState<ProductReference[]>([])
  const [refCode, setRefCode] = useState('')
  const [refType, setRefType] = useState('manufacturer')
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setRefs(await adminListReferences(productId))
  }, [productId])

  useEffect(() => {
    void reload().catch((e) => setError(toUserMessage(e, 'Falha ao carregar referências')))
  }, [reload])

  return (
    <section className="space-y-3 rounded-[14px] border border-fal-line bg-white p-4">
      <h2 className="font-extrabold text-fal-navy">Referências</h2>
      {error ? <p className="m-0 text-sm text-fal-danger">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Input label="Código" value={refCode} onChange={(e) => setRefCode(e.target.value)} />
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Tipo</span>
          <select
            className="rounded-[10px] border border-fal-line px-3 py-2"
            value={refType}
            onChange={(e) => setRefType(e.target.value)}
          >
            <option value="manufacturer">Código do fabricante</option>
            <option value="oem">Código OEM (montadora)</option>
            <option value="internal">Código interno</option>
            <option value="competitor">Código concorrente</option>
            <option value="other">Outro</option>
          </select>
        </label>
        <div className="flex items-end">
          <Button
            type="button"
            onClick={() =>
              void adminUpsertReference({ productId, code: refCode, type: refType })
                .then(async () => {
                  setRefCode('')
                  await reload()
                  toast.push('Referência adicionada.', 'success')
                })
                .catch((e) => {
                  const msg = toUserMessage(e, 'Falha ao adicionar referência')
                  setError(msg)
                  toast.push(msg, 'error')
                })
            }
          >
            Adicionar
          </Button>
        </div>
      </div>
      <ul className="space-y-1 text-sm">
        {refs.map((r) => (
          <li key={r.id ?? r.code} className="flex justify-between border-b border-fal-line py-1">
            <span>
              <strong>{r.code}</strong> · {productReferenceTypeLabel(r.type)} ·{' '}
              {entityStatusLabel(r.status)}
            </span>
            {r.id ? (
              <button
                type="button"
                className="font-semibold text-fal-danger"
                onClick={() => {
                  const refId = r.id!
                  void confirmDialog({
                    title: 'Remover referência?',
                    message: `A referência "${r.code}" será removida deste produto.`,
                    confirmLabel: 'Remover',
                    danger: true,
                  })
                    .then(async ({ confirmed }) => {
                      if (!confirmed) return
                      await adminDeleteReference(refId)
                      await reload()
                      toast.push('Referência removida.', 'success')
                    })
                    .catch((err) => {
                      const msg = toUserMessage(err, 'Falha ao remover referência')
                      setError(msg)
                      toast.push(msg, 'error')
                    })
                }}
              >
                Remover
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
