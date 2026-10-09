import { useState } from 'react'
import { Button } from '@/components/common/Button'
import {
  APLICACAO_SECTION_LABEL,
  APPS_EMPTY_LABEL,
  MAIS_APLICACOES_LABEL,
  MENOS_APLICACOES_LABEL,
} from '@/lib/productLabels'
import type { CompatibilityAppGroup } from '@/types'

export type CompatibilityAppsVariant = 'card' | 'pdp'

const LINE_LIMIT: Record<CompatibilityAppsVariant, number> = {
  card: 4,
  pdp: 8,
}

/** Conta linhas de aplicação na ordem dos grupos. */
export function countCompatibilityLines(groups: CompatibilityAppGroup[]): number {
  return groups.reduce((n, g) => n + g.lines.length, 0)
}

/**
 * Recorta groups mantendo a ordem: primeiras `limit` linhas.
 * Cabeçalho de maker só entra se houver ≥1 linha no trecho.
 */
export function sliceCompatibilityGroups(
  groups: CompatibilityAppGroup[],
  limit: number,
): CompatibilityAppGroup[] {
  if (limit < 0) return []
  let remaining = limit
  const out: CompatibilityAppGroup[] = []
  for (const g of groups) {
    if (remaining <= 0) break
    const take = g.lines.slice(0, remaining)
    if (!take.length) continue
    out.push({ maker: g.maker, lines: take })
    remaining -= take.length
  }
  return out
}

export function CompatibilityAppsBlock({
  groups,
  summary,
  className = '',
  variant = 'card',
}: {
  groups?: CompatibilityAppGroup[] | null
  summary?: string | null
  className?: string
  variant?: CompatibilityAppsVariant
}) {
  const [expanded, setExpanded] = useState(false)
  const limit = LINE_LIMIT[variant]

  if (groups?.length) {
    const totalLines = countCompatibilityLines(groups)
    const hasMore = totalLines > limit
    const visible = expanded || !hasMore ? groups : sliceCompatibilityGroups(groups, limit)

    return (
      <div className={`space-y-1.5 text-sm text-fal-ink ${className}`.trim()}>
        <p className="m-0 font-semibold text-fal-navy">{APLICACAO_SECTION_LABEL}</p>
        {visible.map((g) => (
          <div key={g.maker}>
            <p className="m-0 font-bold text-fal-navy">{g.maker}</p>
            <ul className="m-0 list-none space-y-0.5 p-0 text-fal-muted">
              {g.lines.map((line) => {
                const mid = [line.engine, line.version].filter(Boolean).join(' · ')
                const key = `${line.model}-${mid}-${line.yearLabel ?? ''}`
                return (
                  <li key={key} className="grid grid-cols-[1fr_auto] gap-x-2">
                    <span className="min-w-0 truncate">
                      {line.model}
                      {mid ? ` ${mid}` : ''}
                    </span>
                    {line.yearLabel ? (
                      <span className="shrink-0 tabular-nums">{line.yearLabel}</span>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        {hasMore ? (
          <Button
            type="button"
            variant="light"
            size="sm"
            className="mt-1 font-semibold"
            aria-expanded={expanded}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setExpanded((v) => !v)
            }}
          >
            {expanded ? MENOS_APLICACOES_LABEL : MAIS_APLICACOES_LABEL}
          </Button>
        ) : null}
      </div>
    )
  }

  if (summary) {
    return (
      <div className={`text-sm ${className}`.trim()}>
        <p className="m-0 font-semibold text-fal-navy">{APLICACAO_SECTION_LABEL}</p>
        <ul className="mb-0 mt-1 list-none space-y-0.5 p-0 text-fal-ink">
          {summary.split(' · ').map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    )
  }

  return <p className={`m-0 text-sm text-fal-muted ${className}`.trim()}>{APPS_EMPTY_LABEL}</p>
}
