/**
 * API client for DmHome CRUD operations.
 */
import type { DmHome } from '../types/index';
import { BaseClient } from './base-client';

export class HomeClient extends BaseClient {
  /** Get all homes. */
  async getAll(): Promise<DmHome[]> {
    return this.get<DmHome[]>('/homes');
  }

  /** Get a single home by ID. */
  async getById(id: number): Promise<DmHome> {
    return this.get<DmHome>(`/homes/${id}`);
  }

  /** Create a new home. */
  async create(home: Partial<DmHome>): Promise<DmHome> {
    return this.post<DmHome>('/homes', home);
  }

  /** Update an existing home. */
  async update(id: number, home: Partial<DmHome>): Promise<DmHome> {
    return this.put<DmHome>(`/homes/${id}`, home);
  }

  /** Delete a home. */
  async remove(id: number): Promise<void> {
    await this.del(`/homes/${id}`);
  }
}
