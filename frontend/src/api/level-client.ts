/**
 * API client for DmLevel CRUD operations.
 */
import type { DmLevel } from '../types/index';
import { BaseClient } from './base-client';

export class LevelClient extends BaseClient {
  /** Get all levels, optionally filtered by home. */
  async getAll(homeId?: number): Promise<DmLevel[]> {
    const query = homeId !== undefined ? `?home_id=${homeId}` : '';
    return this.get<DmLevel[]>(`/levels${query}`);
  }

  /** Get a single level by ID. */
  async getById(id: number): Promise<DmLevel> {
    return this.get<DmLevel>(`/levels/${id}`);
  }

  /** Create a new level. */
  async create(level: Partial<DmLevel>): Promise<DmLevel> {
    return this.post<DmLevel>('/levels', level);
  }

  /** Update an existing level. */
  async update(id: number, level: Partial<DmLevel>): Promise<DmLevel> {
    return this.put<DmLevel>(`/levels/${id}`, level);
  }

  /** Delete a level (cascades to rooms and devices). */
  async remove(id: number): Promise<void> {
    await this.del(`/levels/${id}`);
  }
}
