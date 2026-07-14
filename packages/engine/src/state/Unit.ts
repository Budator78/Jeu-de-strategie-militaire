import type { UnitTypeId } from "./UnitTypes";

export interface Unit {
  id: string;
  type: UnitTypeId;
  ownerId: string;
  provinceId: string;
  health: number;
  /**
   * Baked in at creation from UnitTypeDef's base stats plus any research
   * bonus researched at the time (see ordersResolver.ts, ResearchTypes.ts).
   * Combat reads these directly rather than re-deriving from UNIT_TYPES.
   */
  attack: number;
  defense: number;
}
