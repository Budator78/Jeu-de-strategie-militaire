import { computeVictoryPoints } from '@con/engine'
import { HUMAN_COUNTRY_ID, useGameStore } from '../../state/gameStore'
import './hud.css'

function fmt(amount: number): number {
  return Math.floor(amount * 10) / 10
}

export function ResourceBar() {
  const country = useGameStore((s) => s.state.countries[HUMAN_COUNTRY_ID])
  const vp = useGameStore((s) => computeVictoryPoints(s.state, HUMAN_COUNTRY_ID))
  const vpTarget = useGameStore((s) => s.state.config.victoryPointTarget)
  if (!country) return null

  return (
    <div className="resource-bar">
      <span className="country-name">{country.name}</span>
      <span className="vp">
        VP: {vp}/{vpTarget}
      </span>
      <span className="gold">Gold: {fmt(country.gold)}</span>
      <span>Money: {fmt(country.resources.money)}</span>
      <span>Supplies: {fmt(country.resources.supplies)}</span>
      <span>Components: {fmt(country.resources.components)}</span>
      <span>Fuel: {fmt(country.resources.fuel)}</span>
      <span>Electronics: {fmt(country.resources.electronics)}</span>
      <span>Rare materials: {fmt(country.resources.rareMaterials)}</span>
      <span>Manpower: {fmt(country.resources.manpower)}</span>
    </div>
  )
}
