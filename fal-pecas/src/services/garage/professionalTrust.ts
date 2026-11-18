/** Trust 1–5 = critérios verificáveis (sem medalha). Declarado ≠ verificado. */

export const PROFESSIONAL_TRUST_LEVELS = [1, 2, 3, 4, 5] as const

export type ProfessionalTrustLevel = (typeof PROFESSIONAL_TRUST_LEVELS)[number]

export const PROFESSIONAL_TRUST_LABEL: Record<ProfessionalTrustLevel, string> = {
  1: 'Perfil cadastrado',
  2: 'Identidade confirmada',
  3: 'Documentação analisada',
  4: 'Atuação documentada',
  5: 'Histórico profissional na FAL',
}

export function trustLabel(level: number): string {
  if (level >= 1 && level <= 5) {
    return PROFESSIONAL_TRUST_LABEL[level as ProfessionalTrustLevel]
  }
  return 'Nível desconhecido'
}

export function trustIsVerified(level: number): boolean {
  return level >= 2
}
