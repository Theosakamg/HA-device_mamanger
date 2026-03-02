/**
 * DmLevel - Second-level hierarchical entity representing a floor/level.
 */
import type { HierarchyEntity } from "./base";

export interface DmLevel extends HierarchyEntity {
  homeId: number;
  /** Transient: parent home name (populated by API) */
  homeName?: string;
}
