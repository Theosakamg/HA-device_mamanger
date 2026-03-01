/**
 * DmRoom - Third-level hierarchical entity representing a room.
 */
import type { HierarchyEntity } from "./base";

export interface DmRoom extends HierarchyEntity {
  levelId: number;
  /** Transient: parent level name (populated by API) */
  levelName?: string;
}
