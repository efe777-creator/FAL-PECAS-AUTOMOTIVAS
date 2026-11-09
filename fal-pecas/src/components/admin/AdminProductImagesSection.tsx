import { confirmDialog } from '@/components/common/ConfirmDialog'
import { useToast } from '@/components/common/Toast'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminDeleteImage,
  adminListImages,
  adminSetPrimaryImage,
  adminUploadImage,
} from '@/services/admin/adminImageService'
import type { ProductImage } from '@/types'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  productId: string
}

export function AdminProductImagesSection({ productId }: Props) {
  const toast = useToast()
  const [images, setImages] = useState<ProductImage[]>([])
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setImages(await adminListImages(productId))
  }, [productId])

  useEffect(() => {
    void reload().catch((e) => setError(toUserMessage(e, 'Falha ao carregar imagens')))
  }, [reload])

  return (
    <section className="space-y-3 rounded-[14px] border border-fal-line bg-white p-4">
      <h2 className="font-extrabold text-fal-navy">Imagens</h2>
      <p className="m-0 text-xs text-fal-muted">
        Várias de uma vez neste produto · lote por código em{' '}
        <Link
          className="font-semibold text-fal-navy hover:underline"
          to="/admin/produtos/importar-imagens"
        >
          Importar imagens
        </Link>
      </p>
      {error ? <p className="m-0 text-sm text-fal-danger">{error}</p> : null}
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          const list = e.target.files
          if (!list?.length) return
          const arr = Array.from(list)
          e.target.value = ''
          void (async () => {
            try {
              for (const file of arr) await adminUploadImage(productId, file)
              await reload()
              toast.push(
                arr.length === 1 ? 'Imagem enviada.' : `${arr.length} imagens enviadas.`,
                'success',
              )
            } catch (err) {
              const msg = toUserMessage(err, 'Falha ao enviar imagem')
              setError(msg)
              toast.push(msg, 'error')
            }
          })()
        }}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {images.map((img) => (
          <div key={img.id} className="rounded-[10px] border border-fal-line p-2">
            <img src={img.publicUrl} alt={img.alt ?? ''} className="h-32 w-full object-contain" />
            <div className="mt-2 flex gap-2 text-xs">
              {img.isPrimary ? (
                <span className="font-bold text-fal-success">Principal</span>
              ) : (
                <button
                  type="button"
                  className="font-semibold text-fal-auth-link"
                  onClick={() =>
                    void adminSetPrimaryImage(productId, img.id)
                      .then(async () => reload())
                      .catch((err) => {
                        const msg = toUserMessage(err, 'Falha ao definir principal')
                        setError(msg)
                        toast.push(msg, 'error')
                      })
                  }
                >
                  Tornar principal
                </button>
              )}
              <button
                type="button"
                className="font-semibold text-fal-danger"
                onClick={() => {
                  void confirmDialog({
                    title: 'Excluir imagem?',
                    message: 'A imagem será removida do produto. Esta ação não pode ser desfeita.',
                    confirmLabel: 'Excluir',
                    danger: true,
                  })
                    .then(async ({ confirmed }) => {
                      if (!confirmed) return
                      await adminDeleteImage(img)
                      await reload()
                      toast.push('Imagem excluída.', 'success')
                    })
                    .catch((err) => {
                      const msg = toUserMessage(err, 'Falha ao excluir imagem')
                      setError(msg)
                      toast.push(msg, 'error')
                    })
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
      {!images.length ? (
        <p className="text-sm text-fal-muted">
          Sem imagem — produto marcado incompleto (cadastro permitido).
        </p>
      ) : null}
    </section>
  )
}
