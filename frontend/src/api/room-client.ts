/**
 * API client for DmRoom CRUD operations.
 */
import type { DmRoom } from '../types/index';
import { BaseClient } from './base-client';

export class RoomClient extends BaseClient {
  /** Get all rooms, optionally filtered by level. */
  async getAll(levelId?: number): Promise<DmRoom[]> {
    const query = levelId !== undefined ? `?level_id=${levelId}` : '';
    return this.get<DmRoom[]>(`/rooms${query}`);
  }

  /** Get a single room by ID. */
  async getById(id: number): Promise<DmRoom> {
    return this.get<DmRoom>(`/rooms/${id}`);
  }

  /** Create a new room. */
  async create(room: Partial<DmRoom>): Promise<DmRoom> {
    return this.post<DmRoom>('/rooms', room);
  }

  /** Update an existing room. */
  async update(id: number, room: Partial<DmRoom>): Promise<DmRoom> {
    return this.put<DmRoom>(`/rooms/${id}`, room);
  }

  /** Delete a room (cascades to devices). */
  async remove(id: number): Promise<void> {
    await this.del(`/rooms/${id}`);
  }
}
