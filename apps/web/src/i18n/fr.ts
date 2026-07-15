import type { BuildingId, ResearchId, ResourceType, UnitTypeId } from '@con/engine'

/** French HUD labels — the reference UI is played in French. */

export const RESOURCE_LABELS_FR: Record<ResourceType | 'gold', string> = {
  supplies: 'Approvisionnement',
  components: 'Composants',
  fuel: 'Carburant',
  electronics: 'Électronique',
  rareMaterials: 'Matériaux rares',
  manpower: "Main-d'œuvre",
  money: 'Argent',
  gold: 'Or',
}

export const UNIT_LABELS_FR: Record<UnitTypeId, string> = {
  infantry: 'Infanterie motorisée',
  tank: 'Char de combat',
  fighter: 'Chasseur de supériorité aérienne',
}

export const BUILDING_LABELS_FR: Record<BuildingId, string> = {
  armsIndustry: "Industrie d'armement",
  recruitingOffice: 'Bureau de recrutement',
}

export const RESEARCH_LABELS_FR: Record<ResearchId, string> = {
  infantryTier2: 'Infanterie Rang 2',
  tankTier2: 'Blindés Rang 2',
  fighterTier2: 'Supériorité aérienne Rang 2',
}

export function formatCostFr(cost: Record<string, number | undefined>): string {
  return Object.entries(cost)
    .map(([resource, amount]) => `${amount} ${RESOURCE_LABELS_FR[resource as ResourceType] ?? resource}`)
    .join(', ')
}
