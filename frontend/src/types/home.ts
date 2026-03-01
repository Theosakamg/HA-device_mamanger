/**
 * DmHome - Top-level hierarchical entity representing a home.
 */
export interface DmHome {
  id?: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
}
