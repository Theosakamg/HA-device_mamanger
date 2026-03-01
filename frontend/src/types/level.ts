/**
 * DmLevel - Second-level hierarchical entity representing a floor/level.
 */
export interface DmLevel {
  id?: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
  homeId: number;
  /** Transient: parent home name (populated by API) */
  homeName?: string;
}
