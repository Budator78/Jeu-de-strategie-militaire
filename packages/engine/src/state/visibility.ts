import type { Province } from "./Province";
import type { Unit } from "./Unit";

/**
 * Fog-of-war sight for one country: its own provinces plus their neighbors,
 * and anywhere its units stand plus one province around them. Shared by the
 * map view (human fog) and basicAI (so the AI plays under the same fog
 * instead of reading the whole world).
 */
export function computeVisibleProvinces(
  provinces: Record<string, Province>,
  units: Record<string, Unit>,
  countryId: string,
): Set<string> {
  const visible = new Set<string>();
  const reveal = (id: string) => {
    visible.add(id);
    for (const neighbor of provinces[id]?.neighbors ?? []) visible.add(neighbor);
  };
  for (const province of Object.values(provinces)) {
    if (province.ownerId === countryId) reveal(province.id);
  }
  for (const unit of Object.values(units)) {
    if (unit.ownerId === countryId) reveal(unit.provinceId);
  }
  return visible;
}
