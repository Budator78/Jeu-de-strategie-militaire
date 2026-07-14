import type { UnitTypeId } from "./UnitTypes";

export interface Unit {
  id: string;
  type: UnitTypeId;
  ownerId: string;
  provinceId: string;
  health: number;
}
