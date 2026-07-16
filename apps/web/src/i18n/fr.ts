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
  nationalGuard: 'Garde nationale',
  mechInfantry: 'Infanterie mécanisée',
  recon: 'Véhicule de reconnaissance',
  afv: "Véhicule de combat d'infanterie",
  tank: 'Char de combat',
  gunship: 'Hélicoptère mitrailleur',
  attackHelicopter: "Hélicoptère d'attaque",
  fighter: 'Chasseur de supériorité aérienne',
}

export const BUILDING_LABELS_FR: Record<BuildingId, string> = {
  armsIndustry: "Industrie d'armement",
  recruitingOffice: 'Bureau de recrutement',
  localIndustry: 'Industrie locale',
  annexCity: 'Annexer la ville',
  armyBase: 'Base militaire',
  airBase: 'Base aérienne',
  militaryHospital: 'Hôpital militaire',
  fieldHospital: 'Hôpital de campagne',
  undergroundBunkers: 'Bunkers souterrains',
  combatOutpost: 'Avant-poste de combat',
}

/** One-line effect summary shown in the construction modal. */
export const BUILDING_EFFECTS_FR: Record<BuildingId, string> = {
  armsIndustry: '+10% à toutes les ressources de la ville',
  recruitingOffice: "+25% de main-d'œuvre",
  localIndustry: '+25% aux ressources de la province',
  annexCity: 'Production occupée 25% → 50%',
  armyBase: '+25% défense de la garnison',
  airBase: 'Débloque la mobilisation aérienne',
  militaryHospital: '+20 PdV/jour de soin',
  fieldHospital: 'Permet le soin en province (+5 PdV/jour)',
  undergroundBunkers: '+40% défense de la garnison',
  combatOutpost: '+20% défense de la garnison',
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
    case 'uprising':
      return {
        headline: `Soulèvement à ${event.provinceName} !`,
        body: `${formatEventTime(event.atMs)} ${event.provinceName} : excédée par l'occupation, la population s'est soulevée contre ${countryName(event.occupierId)} — le territoire retourne à ${countryName(event.homelandId)}.`,
        category: 'politique',
        involved: [event.occupierId, event.homelandId],
      }
    case 'peaceMade':
      return {
        headline: 'Traité de paix signé',
        body: `${formatEventTime(event.atMs)} — ${countryName(event.aId)} et ${countryName(event.bId)} ont mis fin aux hostilités et rétabli la paix.`,
        category: 'politique',
        involved: [event.aId, event.bId],
      }
    case 'peaceOffered':
      return {
        headline: 'Proposition de paix',
        body: `${formatEventTime(event.atMs)} — ${countryName(event.fromId)} tend la main à ${countryName(event.toId)} et propose un cessez-le-feu. La balle est dans leur camp.`,
        category: 'politique',
        involved: [event.fromId, event.toId],
      }
    case 'rightOfWay':
      return {
        headline: event.granted ? 'Droit de passage accordé' : 'Droit de passage révoqué',
        body: `${formatEventTime(event.atMs)} — ${countryName(event.granterId)} ${event.granted ? 'ouvre' : 'ferme'} ses frontières aux troupes de ${countryName(event.toId)}.`,
        category: 'politique',
        involved: [event.granterId, event.toId],
      }
  }
}
