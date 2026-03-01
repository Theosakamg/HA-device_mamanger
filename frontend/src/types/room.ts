/**
 * DmRoom - Third-level hierarchical entity representing a room.
 */
export interface DmRoom {
  id?: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
  levelId: number;
  /** Transient: parent level name (populated by API) */
  levelName?: string;
}
