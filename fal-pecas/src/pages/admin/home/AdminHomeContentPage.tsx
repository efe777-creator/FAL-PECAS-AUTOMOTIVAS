import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import { useToast } from '@/components/common/Toast'
import { productStatusLabel } from '@/lib/adminLabels'
import {
  formatPaymentConditionLine,
  type PaymentDisplaySettings,
} from '@/lib/paymentDisplay'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useUnsavedChangesBlocker } from '@/hooks/useUnsavedChangesBlocker'
import {
  ADMIN_FEATURED_MAX,
  FEATURED_DISPLAY_LIMIT_MAX,
  FEATURED_DISPLAY_LIMIT_MIN,
  HOME_FEATURED_LIMIT_DEFAULT,
} from '@/lib/homeSections'
import { CODIGO_REFERENCIA_LABEL } from '@/lib/productLabels'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminGetPaymentDisplaySettings,
  adminUpsertPaymentDisplaySettings,
} from '@/services/store/paymentDisplayService'
import {
  adminAddFeaturedProduct,
  adminDeleteHomeBanner,
  adminGetHomeSettings,
  adminListFeaturedProducts,
  adminListHomeBanners,
  adminRemoveFeaturedProduct,
  adminSwapBannerOrder,
  adminSwapFeaturedOrder,
  adminUpdateFeaturedProduct,
  adminUploadHomeBannerImage,
  adminUpsertHomeBanner,
  adminUpsertHomeSettings,
  HOME_BANNER_IMAGE_IDEAL,
  type AdminFeaturedRow,
  type AdminHomeBanner,
  type AdminHomeSettings,
} from '@/services/admin/adminHomeContentService'
import { adminListProducts } from '@/services/admin/adminProductService'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

type Tab = 'banners' | 'featured' | 'payment'

const MAX_FEATURED = ADMIN_FEATURED_MAX

const emptyPayment = (): Omit<PaymentDisplaySettings, 'id'> => ({
  enabled: false,
  maxInstallments: 3,
  minInstallmentAmount: 20,
  interestFree: true,
  showOnCards: true,
  showOnPdp: true,
  footnote: null,
})

const emptyBanner = (): Omit<AdminHomeBanner, 'id'> => ({
  title: '',
  subtitle: '',
  ctaLabel: 'Ver catálogo',
  to: '/catalogo',
  imageSrc: '',
  imageSrcMobile: '',
  tone: 'navy',
  sortOrder: 100,
  active: true,
  startsAt: null,
  endsAt: null,
})

/** ISO → valor de input datetime-local. */
function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function AdminHomeContentPage() {
  useDocumentTitle('Home da loja | Admin FAL')
  const { push } = useToast()
  const [tab, setTab] = useState<Tab>('banners')
  const [banners, setBanners] = useState<AdminHomeBanner[]>([])
  const [featured, setFeatured] = useState<AdminFeaturedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Omit<AdminHomeBanner, 'id'> & { id?: string }>(emptyBanner())
  const [saving, setSaving] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchHits, setSearchHits] = useState<
    Array<{ id: string; name: string; commercialRef: string }>
  >([])
  const [searching, setSearching] = useState(false)
  const [listQ, setListQ] = useState('')
  const [listActive, setListActive] = useState<'all' | 'on' | 'off'>('all')
  const [payment, setPayment] = useState<Omit<PaymentDisplaySettings, 'id'> & { id?: string }>(
    emptyPayment(),
  )
  const [savingPayment, setSavingPayment] = useState(false)
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false)
  const [dirtyBanner, setDirtyBanner] = useState(false)
  const [dirtyPayment, setDirtyPayment] = useState(false)
  const [dirtySettings, setDirtySettings] = useState(false)
  const [homeSettings, setHomeSettings] = useState<AdminHomeSettings>({
    id: '',
    featuredDisplayLimit: HOME_FEATURED_LIMIT_DEFAULT,
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const bannerImageInputRef = useRef<HTMLInputElement>(null)
  const bannerMobileImageInputRef = useRef<HTMLInputElement>(null)

  const dirty = dirtyBanner || dirtyPayment || dirtySettings
  useUnsavedChangesBlocker(dirty, {
    message:
      'Há alterações em campanhas, destaques ou condições de pagamento ainda não salvas. Sair mesmo assim?',
  })
  useEffect(() => {
    if (!dirty) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const liveBanners = useMemo(() => banners.filter((b) => b.active).length, [banners])
  const liveFeatured = useMemo(() => featured.filter((f) => f.active).length, [featured])
  const paymentPreview = useMemo(() => {
    const sample = formatPaymentConditionLine(
      199.9,
      { ...emptyPayment(), ...payment, id: payment.id ?? 'x' },
      'card',
    )
    return sample ?? '— (desligado ou preço baixo demais)'
  }, [payment])

  const featuredFiltered = useMemo(() => {
    const q = listQ.trim().toLowerCase()
    return featured.filter((row) => {
      if (listActive === 'on' && !row.active) return false
      if (listActive === 'off' && row.active) return false
      if (!q) return true
      const hay = [row.name, row.commercialRef, row.sku, row.categoryName ?? '']
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [featured, listQ, listActive])

  async function reload() {
    setLoading(true)
    try {
      const [b, f, pay, settings] = await Promise.all([
        adminListHomeBanners(),
        adminListFeaturedProducts(),
        adminGetPaymentDisplaySettings(),
        adminGetHomeSettings().catch(() => ({
          id: '',
          featuredDisplayLimit: HOME_FEATURED_LIMIT_DEFAULT,
        })),
      ])
      setBanners(b)
      setFeatured(f)
      if (pay) setPayment(pay)
      else setPayment(emptyPayment())
      setHomeSettings(settings)
      setDirtySettings(false)
    } catch (err) {
      push(toUserMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  async function onSaveHomeSettings(e: FormEvent) {
    e.preventDefault()
    setSavingSettings(true)
    try {
      const saved = await adminUpsertHomeSettings(homeSettings)
      setHomeSettings(saved)
      setDirtySettings(false)
      push(`Home exibirá até ${saved.featuredDisplayLimit} destaques`, 'success')
    } catch (err) {
      push(toUserMessage(err), 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  async function onSavePayment(e: FormEvent) {
    e.preventDefault()
    setSavingPayment(true)
    try {
      const saved = await adminUpsertPaymentDisplaySettings(payment)
      setPayment(saved)
      setDirtyPayment(false)
      push(saved.enabled ? 'Condições ativas na loja' : 'Condições salvas (ainda desligadas)', 'success')
    } catch (err) {
      push(toUserMessage(err), 'error')
    } finally {
      setSavingPayment(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  async function onSaveBanner(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await adminUpsertHomeBanner({
        ...form,
        sortOrder: form.id
          ? form.sortOrder
          : banners.reduce((max, b) => Math.max(max, b.sortOrder), 0) + 10,
      })
      push(form.id ? 'Campanha atualizada' : 'Campanha criada', 'success')
      setForm(emptyBanner())
      setDirtyBanner(false)
      await reload()
    } catch (err) {
      push(toUserMessage(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function onDeleteBanner(id: string) {
    const { confirmed } = await confirmDialog({
      title: 'Excluir campanha?',
      message: 'Some da Home na hora. Não dá para desfazer.',
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!confirmed) return
    try {
      await adminDeleteHomeBanner(id)
      push('Campanha removida', 'success')
      if (form.id === id) {
        setForm(emptyBanner())
        setDirtyBanner(false)
      }
      await reload()
    } catch (err) {
      push(toUserMessage(err), 'error')
    }
  }

  async function onToggleBanner(b: AdminHomeBanner) {
    try {
      await adminUpsertHomeBanner({ ...b, active: !b.active })
      push(b.active ? 'Campanha desligada' : 'Campanha ligada na loja', 'success')
      await reload()
    } catch (err) {
      push(toUserMessage(err), 'error')
    }
  }

  async function onMoveBanner(index: number, dir: -1 | 1) {
    const other = banners[index + dir]
    const current = banners[index]
    if (!other || !current) return
    try {
      await adminSwapBannerOrder(current, other)
      await reload()
    } catch (err) {
      push(toUserMessage(err), 'error')
    }
  }

  async function onSearchProducts(e: FormEvent) {
    e.preventDefault()
    const q = searchQ.trim()
    if (q.length < 2) {
      push('Digite ao menos 2 caracteres', 'error')
      return
    }
    setSearching(true)
    try {
      const rows = await adminListProducts({ q, status: 'published', limit: 12 })
      setSearchHits(
        rows.map((p) => ({
          id: p.id,
          name: p.name,
          commercialRef: p.commercialRef || p.sku,
        })),
      )
    } catch (err) {
      push(toUserMessage(err), 'error')
    } finally {
      setSearching(false)
    }
  }

  async function onAddFeatured(productId: string) {
    if (featured.length >= MAX_FEATURED) {
      push(`Limite de ${MAX_FEATURED} destaques. Remova um antes de adicionar.`, 'error')
      return
    }
    try {
      const nextOrder = featured.reduce((max, r) => Math.max(max, r.sortOrder), 0) + 10
      await adminAddFeaturedProduct(productId, nextOrder)
      push('Produto nos Destaques', 'success')
      await reload()
    } catch (err) {
      push(toUserMessage(err), 'error')
    }
  }

  async function onMoveFeatured(index: number, dir: -1 | 1) {
    const other = featured[index + dir]
    const current = featured[index]
    if (!other || !current) return
    try {
      await adminSwapFeaturedOrder(current, other)
      await reload()
    } catch (err) {
      push(toUserMessage(err), 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="m-0 text-2xl font-extrabold text-fal-navy">Home da loja</h1>
        <p className="mt-1 text-sm text-fal-muted">
          Controle o que o cliente vê no carrossel e na faixa Destaques.
        </p>
      </div>

      <div className="rounded-fal border border-fal-line bg-white p-4 text-sm text-fal-ink">
        <p className="m-0 font-bold text-fal-navy">Como funciona (simples)</p>
        <ul className="mt-2 mb-0 list-disc space-y-1 pl-5 text-fal-muted">
          <li>
            <strong className="text-fal-ink">Campanhas</strong> = slides do carrossel (título + botão
            para o catálogo). Só os <em>ativos</em> e dentro da vigência aparecem.
          </li>
          <li>
            <strong className="text-fal-ink">Destaques</strong> = produtos que você escolhe. Você
            define quantos a Home mostra. Se a fila estiver vazia, a loja completa sozinha.
          </li>
          <li>
            <strong className="text-fal-ink">Ofertas</strong> = automáticas (preço promocional). Não
            se editam aqui — e a Home evita repetir o mesmo item em Destaques.
          </li>
          <li>
            <strong className="text-fal-ink">Pagamento</strong> = texto “em até Nx…” nos cards/PDP.
            Só aparece se você ligar aqui (não inventamos parcelas).
          </li>
        </ul>
        <p className="mt-3 mb-0 text-sm">
          Na loja agora:{' '}
          <strong>
            {liveBanners} campanha{liveBanners === 1 ? '' : 's'}
          </strong>
          {' · '}
          <strong>
            {liveFeatured
              ? `${liveFeatured} destaque${liveFeatured === 1 ? '' : 's'} escolhido${liveFeatured === 1 ? '' : 's'}`
              : 'destaques automáticos'}
          </strong>
          {' · '}
          <strong>pagamento {payment.enabled ? 'ligado' : 'desligado'}</strong>
          {' · '}
          <Link to="/" className="font-semibold text-fal-navy hover:underline" target="_blank">
            Abrir Home
          </Link>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={tab === 'banners' ? 'primary' : 'outline'}
          onClick={() => setTab('banners')}
        >
          Campanhas ({banners.length})
        </Button>
        <Button
          type="button"
          variant={tab === 'featured' ? 'primary' : 'outline'}
          onClick={() => setTab('featured')}
        >
          Destaques ({featured.length}/{MAX_FEATURED})
        </Button>
        <Button
          type="button"
          variant={tab === 'payment' ? 'primary' : 'outline'}
          onClick={() => setTab('payment')}
        >
          Pagamento
        </Button>
      </div>

      {loading ? <p className="text-sm text-fal-muted">Carregando…</p> : null}
      {dirty ? (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950"
          role="status"
        >
          Alterações não salvas
          {dirtyBanner ? ' (campanha)' : ''}
          {dirtySettings ? ' (quantidade de destaques)' : ''}
          {dirtyPayment ? ' (pagamento)' : ''}. Salve antes de sair do admin.
        </p>
      ) : null}

      {tab === 'banners' && !loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={(e) => void onSaveBanner(e)}
            className="space-y-3 rounded-fal border border-fal-line bg-white p-4"
          >
            <h2 className="m-0 text-lg font-bold text-fal-navy">
              {form.id ? 'Editar campanha' : 'Nova campanha'}
            </h2>
            <Input
              label="Título"
              value={form.title}
              onChange={(e) => {
                setDirtyBanner(true)
                setForm((f) => ({ ...f, title: e.target.value }))
              }}
              required
            />
            <Input
              label="Texto de apoio"
              value={form.subtitle}
              onChange={(e) => {
                setDirtyBanner(true)
                setForm((f) => ({ ...f, subtitle: e.target.value }))
              }}
            />
            <Input
              label="Texto do botão"
              value={form.ctaLabel}
              onChange={(e) => {
                setDirtyBanner(true)
                setForm((f) => ({ ...f, ctaLabel: e.target.value }))
              }}
            />
            <Input
              label="Para onde o botão leva"
              value={form.to}
              onChange={(e) => {
                setDirtyBanner(true)
                setForm((f) => ({ ...f, to: e.target.value }))
              }}
              placeholder="/catalogo?cat=suspensao"
            />
            <div className="space-y-2">
              <p className="m-0 text-xs font-extrabold text-fal-muted">Imagem da campanha</p>
              <p className="m-0 text-[13px] text-fal-muted">
                Dimensão ideal: <strong className="text-fal-ink">{HOME_BANNER_IMAGE_IDEAL.label}</strong>
                {' · '}
                {HOME_BANNER_IMAGE_IDEAL.hint}
              </p>
              {form.imageSrc ? (
                <div className="aspect-[3/1] w-full overflow-hidden rounded-xl border border-fal-line bg-fal-bg">
                  <img src={form.imageSrc} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="grid aspect-[3/1] w-full place-items-center rounded-xl border border-dashed border-fal-line bg-fal-bg text-[11px] text-fal-muted">
                  prévia retangular 3:1 · sem imagem
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <input
                  ref={bannerImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (!file) return
                    setUploadingBannerImage(true)
                    void adminUploadHomeBannerImage(file)
                      .then((url) => {
                        setDirtyBanner(true)
                        setForm((f) => ({ ...f, imageSrc: url }))
                        push('Imagem adicionada — salve a campanha', 'success')
                      })
                      .catch((err) => push(toUserMessage(err, 'Falha no upload'), 'error'))
                      .finally(() => setUploadingBannerImage(false))
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingBannerImage || saving}
                  onClick={() => bannerImageInputRef.current?.click()}
                >
                  {uploadingBannerImage ? 'Enviando…' : 'Adicionar imagem'}
                </Button>
                {form.imageSrc ? (
                  <Button
                    type="button"
                    variant="light"
                    disabled={uploadingBannerImage || saving}
                    onClick={() => {
                      setDirtyBanner(true)
                      setForm((f) => ({ ...f, imageSrc: '' }))
                    }}
                  >
                    Remover
                  </Button>
                ) : null}
              </div>
              <Input
                label="URL desktop (opcional — preenchida pelo upload)"
                value={form.imageSrc ?? ''}
                onChange={(e) => {
                  setDirtyBanner(true)
                  setForm((f) => ({ ...f, imageSrc: e.target.value }))
                }}
                placeholder="https://… ou /icons/…"
              />
              <p className="m-0 pt-2 text-xs font-extrabold text-fal-muted">
                Imagem mobile (opcional)
              </p>
              <p className="m-0 text-[13px] text-fal-muted">
                Se vazia, a loja usa a imagem desktop. Ideal: arte vertical ou crop 16:9 estreito.
              </p>
              {form.imageSrcMobile ? (
                <div className="aspect-[16/9] w-full max-w-xs overflow-hidden rounded-xl border border-fal-line bg-fal-bg">
                  <img src={form.imageSrcMobile} alt="" className="h-full w-full object-cover" />
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <input
                  ref={bannerMobileImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (!file) return
                    setUploadingBannerImage(true)
                    void adminUploadHomeBannerImage(file)
                      .then((url) => {
                        setDirtyBanner(true)
                        setForm((f) => ({ ...f, imageSrcMobile: url }))
                        push('Imagem mobile adicionada — salve a campanha', 'success')
                      })
                      .catch((err) => push(toUserMessage(err, 'Falha no upload'), 'error'))
                      .finally(() => setUploadingBannerImage(false))
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingBannerImage || saving}
                  onClick={() => bannerMobileImageInputRef.current?.click()}
                >
                  {uploadingBannerImage ? 'Enviando…' : 'Imagem mobile'}
                </Button>
                {form.imageSrcMobile ? (
                  <Button
                    type="button"
                    variant="light"
                    disabled={uploadingBannerImage || saving}
                    onClick={() => {
                      setDirtyBanner(true)
                      setForm((f) => ({ ...f, imageSrcMobile: '' }))
                    }}
                  >
                    Remover mobile
                  </Button>
                ) : null}
              </div>
              <Input
                label="URL mobile (opcional)"
                value={form.imageSrcMobile ?? ''}
                onChange={(e) => {
                  setDirtyBanner(true)
                  setForm((f) => ({ ...f, imageSrcMobile: e.target.value }))
                }}
                placeholder="https://…"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Início da vigência (opcional)"
                type="datetime-local"
                value={toDatetimeLocalValue(form.startsAt)}
                onChange={(e) => {
                  setDirtyBanner(true)
                  setForm((f) => ({ ...f, startsAt: e.target.value || null }))
                }}
              />
              <Input
                label="Fim da vigência (opcional)"
                type="datetime-local"
                value={toDatetimeLocalValue(form.endsAt)}
                onChange={(e) => {
                  setDirtyBanner(true)
                  setForm((f) => ({ ...f, endsAt: e.target.value || null }))
                }}
              />
            </div>
            <p className="m-0 text-[12px] text-fal-muted">
              Vazio = começa já / não encerra. Campanhas fora do período não aparecem na loja.
            </p>
            <Select
              label="Cor do slide"
              value={form.tone}
              options={[
                { value: 'navy', label: 'Azul FAL' },
                { value: 'steel', label: 'Aço' },
                { value: 'sand', label: 'Areia' },
              ]}
              onChange={(e) => {
                setDirtyBanner(true)
                setForm((f) => ({
                  ...f,
                  tone: e.target.value as AdminHomeBanner['tone'],
                }))
              }}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => {
                  setDirtyBanner(true)
                  setForm((f) => ({ ...f, active: e.target.checked }))
                }}
              />
              Mostrar na loja
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar'}
              </Button>
              {form.id ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForm(emptyBanner())
                    setDirtyBanner(false)
                  }}
                >
                  Limpar formulário
                </Button>
              ) : null}
            </div>
          </form>

          <div className="space-y-3">
            <p className="m-0 text-sm font-semibold text-fal-navy">
              Ordem na Home (↑ / ↓ = posição no carrossel)
            </p>
            {banners.map((b, index) => (
              <article
                key={b.id}
                className={`rounded-fal border p-4 ${
                  b.active ? 'border-fal-line bg-white' : 'border-dashed border-fal-line bg-fal-bg'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="m-0 font-bold text-fal-navy">{b.title}</p>
                    <p className="mt-1 text-sm text-fal-muted">{b.subtitle || '—'}</p>
                    <p className="mt-1 text-xs text-fal-muted">
                      {b.active ? 'Ativa' : 'Desligada'}
                      {b.startsAt || b.endsAt
                        ? ` · vigência ${b.startsAt ? toDatetimeLocalValue(b.startsAt) : '…'} → ${b.endsAt ? toDatetimeLocalValue(b.endsAt) : '…'}`
                        : ' · sem vigência'}
                      {' · '}
                      {b.to}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={index === 0}
                        onClick={() => void onMoveBanner(index, -1)}
                        aria-label="Subir"
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={index === banners.length - 1}
                        onClick={() => void onMoveBanner(index, 1)}
                        aria-label="Descer"
                      >
                        ↓
                      </Button>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setForm({ ...b })
                        setDirtyBanner(false)
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void onToggleBanner(b)}
                    >
                      {b.active ? 'Desligar' : 'Ligar'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void onDeleteBanner(b.id)}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              </article>
            ))}
            {!banners.length ? (
              <p className="text-sm text-fal-muted">
                Nenhuma campanha — a Home mostra o conteúdo padrão até você criar uma.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === 'payment' && !loading ? (
        <form
          onSubmit={(e) => void onSavePayment(e)}
          className="max-w-xl space-y-3 rounded-fal border border-fal-line bg-white p-4"
        >
          <h2 className="m-0 text-lg font-bold text-fal-navy">Condições nos cards e PDP</h2>
          <p className="m-0 text-sm text-fal-muted">
            Isto é só comunicação na vitrine. O checkout continua com Pix/cartão do provedor.
          </p>
          <label className="flex items-center gap-2 text-sm font-semibold text-fal-navy">
            <input
              type="checkbox"
              checked={payment.enabled}
              onChange={(e) => {
                setDirtyPayment(true)
                setPayment((p) => ({ ...p, enabled: e.target.checked }))
              }}
            />
            Mostrar na loja
          </label>
          <Input
            label="Máximo de parcelas"
            type="number"
            min={1}
            max={24}
            value={String(payment.maxInstallments)}
            onChange={(e) => {
              setDirtyPayment(true)
              setPayment((p) => ({
                ...p,
                maxInstallments: Number(e.target.value) || 1,
              }))
            }}
          />
          <Input
            label="Parcela mínima (R$)"
            type="number"
            min={0}
            step="0.01"
            value={String(payment.minInstallmentAmount)}
            onChange={(e) => {
              setDirtyPayment(true)
              setPayment((p) => ({
                ...p,
                minInstallmentAmount: Number(e.target.value) || 0,
              }))
            }}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={payment.interestFree}
              onChange={(e) => {
                setDirtyPayment(true)
                setPayment((p) => ({ ...p, interestFree: e.target.checked }))
              }}
            />
            Texto “sem juros”
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={payment.showOnCards}
              onChange={(e) => {
                setDirtyPayment(true)
                setPayment((p) => ({ ...p, showOnCards: e.target.checked }))
              }}
            />
            Nos cards
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={payment.showOnPdp}
              onChange={(e) => {
                setDirtyPayment(true)
                setPayment((p) => ({ ...p, showOnPdp: e.target.checked }))
              }}
            />
            Na página do produto
          </label>
          <Input
            label="Rodapé (só PDP, opcional)"
            value={payment.footnote ?? ''}
            onChange={(e) => {
              setDirtyPayment(true)
              setPayment((p) => ({ ...p, footnote: e.target.value }))
            }}
            placeholder="Ex.: sujeito à análise do cartão"
          />
          <p className="m-0 rounded-lg bg-fal-bg px-3 py-2 text-sm">
            Prévia (R$ 199,90): <strong>{paymentPreview}</strong>
          </p>
          <Button type="submit" variant="primary" disabled={savingPayment}>
            {savingPayment ? 'Salvando…' : 'Salvar condições'}
          </Button>
        </form>
      ) : null}

      {tab === 'featured' && !loading ? (
        <div className="space-y-3">
          <form
            onSubmit={(e) => void onSaveHomeSettings(e)}
            className="flex flex-wrap items-end gap-3 rounded-fal border border-fal-line bg-white p-3"
          >
            <div className="min-w-[180px]">
              <Input
                label="Quantidade na Home"
                type="number"
                min={FEATURED_DISPLAY_LIMIT_MIN}
                max={FEATURED_DISPLAY_LIMIT_MAX}
                value={String(homeSettings.featuredDisplayLimit)}
                onChange={(e) => {
                  setDirtySettings(true)
                  setHomeSettings((s) => ({
                    ...s,
                    featuredDisplayLimit: Number(e.target.value) || HOME_FEATURED_LIMIT_DEFAULT,
                  }))
                }}
              />
            </div>
            <p className="mb-2 max-w-md text-[13px] text-fal-muted">
              Quantos produtos a faixa Destaques mostra na loja (1–{FEATURED_DISPLAY_LIMIT_MAX}). A
              fila curada pode ter até {MAX_FEATURED} itens.
            </p>
            <Button type="submit" variant="primary" disabled={savingSettings}>
              {savingSettings ? 'Salvando…' : 'Salvar quantidade'}
            </Button>
          </form>
          <form
            onSubmit={(e) => void onSearchProducts(e)}
            className="flex flex-wrap items-end gap-2 rounded-fal border border-fal-line bg-white p-3"
          >
            <div className="min-w-[200px] flex-1">
              <Input
                label={`Incluir na fila (máx. ${MAX_FEATURED})`}
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Nome, código ou referência"
              />
            </div>
            <Button type="submit" variant="primary" disabled={searching}>
              {searching ? '…' : 'Buscar catálogo'}
            </Button>
            {searchHits.length ? (
              <ul className="m-0 w-full list-none space-y-1 p-0">
                {searchHits.map((hit) => (
                  <li
                    key={hit.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-fal-line px-2 py-1.5 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      <strong>{hit.name}</strong>
                      <span className="ml-2 text-xs text-fal-muted">{hit.commercialRef}</span>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={
                        featured.some((f) => f.productId === hit.id) ||
                        featured.length >= MAX_FEATURED
                      }
                      onClick={() => void onAddFeatured(hit.id)}
                    >
                      Incluir
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </form>

          <div className="flex flex-wrap items-end gap-2 rounded-fal border border-fal-line bg-white p-3">
            <div className="min-w-[180px] flex-1">
              <Input
                label="Filtrar lista"
                value={listQ}
                onChange={(e) => setListQ(e.target.value)}
                placeholder="Nome ou código na fila"
              />
            </div>
            <label className="block min-w-[8rem] text-sm">
              <span className="mb-1 block text-xs font-extrabold text-fal-muted">Na Home</span>
              <select
                className="w-full rounded-[9px] border border-fal-line px-2 py-2.5"
                value={listActive}
                onChange={(e) => setListActive(e.target.value as 'all' | 'on' | 'off')}
              >
                <option value="all">Todos</option>
                <option value="on">Ligados</option>
                <option value="off">Desligados</option>
              </select>
            </label>
            <p className="pb-2 text-sm text-fal-muted">
              {featuredFiltered.length}/{featured.length} · {liveFeatured} na loja
            </p>
          </div>

          {!featured.length ? (
            <p className="rounded-fal border border-dashed border-fal-line bg-fal-bg p-4 text-sm text-fal-muted">
              Fila vazia — a Home monta Destaques sozinha. Inclua produtos acima para escolher a
              ordem.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-fal border border-fal-line bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-fal-bg text-fal-muted">
                  <tr>
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">{CODIGO_REFERENCIA_LABEL}</th>
                    <th className="px-2 py-2">Nome</th>
                    <th className="px-2 py-2">Categoria</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Home</th>
                    <th className="px-2 py-2">Ordem</th>
                    <th className="px-2 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {featuredFiltered.map((row) => {
                    const index = featured.findIndex((f) => f.productId === row.productId)
                    return (
                      <tr
                        key={row.productId}
                        className={`border-t border-fal-line ${row.active ? '' : 'bg-fal-bg/60'}`}
                      >
                        <td className="px-2 py-2 text-xs text-fal-muted">{index + 1}</td>
                        <td className="px-2 py-2 font-mono text-xs">{row.commercialRef}</td>
                        <td className="px-2 py-2">
                          <Link
                            className="font-semibold text-fal-navy hover:underline"
                            to={`/admin/produtos/${row.productId}`}
                          >
                            {row.name}
                          </Link>
                        </td>
                        <td className="px-2 py-2 text-xs text-fal-muted">
                          {row.categoryName ?? '—'}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {productStatusLabel(row.status)}
                          {row.available ? '' : ' · indisp.'}
                        </td>
                        <td className="px-2 py-2 text-xs font-semibold">
                          {row.active ? (
                            <span className="text-emerald-800">Ligado</span>
                          ) : (
                            <span className="text-fal-muted">Off</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={index <= 0}
                              onClick={() => void onMoveFeatured(index, -1)}
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={index < 0 || index >= featured.length - 1}
                              onClick={() => void onMoveFeatured(index, 1)}
                            >
                              ↓
                            </Button>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex flex-wrap gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void adminUpdateFeaturedProduct(row.productId, {
                                  active: !row.active,
                                })
                                  .then(() => reload())
                                  .catch((err) => push(toUserMessage(err), 'error'))
                              }
                            >
                              {row.active ? 'Desligar' : 'Ligar'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void adminRemoveFeaturedProduct(row.productId)
                                  .then(() => {
                                    push('Removido dos Destaques', 'success')
                                    return reload()
                                  })
                                  .catch((err) => push(toUserMessage(err), 'error'))
                              }
                            >
                              Remover
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {!featuredFiltered.length ? (
                <p className="p-3 text-sm text-fal-muted">Nenhum item com esse filtro.</p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
