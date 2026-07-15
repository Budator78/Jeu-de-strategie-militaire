import type { BuildingId, GameEvent, ResearchId, ResourceType, UnitTypeId } from '@con/engine'

/** French HUD labels — the reference UI is played in French. */

export const RESOURCE_LABELS_FR: Record<ResourceType | 'gold', string> = {
  supplies: 'Ravitaillements',
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

export function formatEventTime(atMs: number): string {
  const day = Math.floor(atMs / 86_400_000) + 1
  const msOfDay = atMs % 86_400_000
  const totalSeconds = Math.floor(msOfDay / 1000)
  const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const ss = String(totalSeconds % 60).padStart(2, '0')
  return `Jour ${day} ${hh}:${mm}:${ss}`
}

export interface EventArticle {
  headline: string
  body: string
  category: 'politique' | 'economie'
  involved: string[]
}

/** Renders an engine event as a newspaper entry, in the reference UI's communiqué style. */
export function eventToArticle(event: GameEvent, countryName: (id: string | null) => string): EventArticle {
  switch (event.kind) {
    case 'warDeclared':
      return {
        headline: 'Déclaration de guerre',
        body: `${formatEventTime(event.atMs)} — Invasion ! Sans avertissement préalable, les unités de ${countryName(event.attackerId)} ont franchi la frontière et affrontent désormais ${countryName(event.defenderId)}.`,
        category: 'politique',
        involved: [event.attackerId, event.defenderId],
      }
    case 'provinceCaptured':
      return {
        headline: `${event.provinceName} est tombée.`,
        body: `${formatEventTime(event.atMs)} ${event.provinceName} : ${countryName(event.toId)} a pris le contrôle du territoire${event.fromId ? `, aux dépens de ${countryName(event.fromId)}` : ''}.`,
        category: 'politique',
        involved: [event.toId, ...(event.fromId ? [event.fromId] : [])],
      }
    case 'unitDestroyed':
      return {
        headline: 'Unité militaire anéantie',
        body: `${formatEventTime(event.atMs)} ${event.provinceName} : une unité (${UNIT_LABELS_FR[event.unitType]}) de ${countryName(event.ownerId)} a été détruite par ${countryName(event.byId)} après de violents combats.`,
        category: 'politique',
        involved: [event.ownerId, event.byId],
      }
    case 'marketTrade': {
      const verb = event.direction === 'playerBuys' ? 'acheté' : 'vendu'
      return {
        headline: 'Activité sur le marché',
        body: `${formatEventTime(event.atMs)} — ${countryName(event.countryId)} a ${verb} ${event.amount.toLocaleString('en-US')} ${RESOURCE_LABELS_FR[event.resource]} pour ${event.totalPrice.toLocaleString('en-US')} ${event.currency === 'gold' ? 'or' : 'argent'}.`,
        category: 'economie',
        involved: [event.countryId],
      }
    }
  }
}
