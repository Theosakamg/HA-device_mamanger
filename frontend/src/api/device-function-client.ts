/**
 * API client for DmDeviceFunction CRUD operations.
 */
import type { DmDeviceFunction } from '../types/index';
import { BaseClient } from './base-client';

export class DeviceFunctionClient extends BaseClient {
  /** Get all device functions. */
  async getAll(): Promise<DmDeviceFunction[]> {
    return this.get<DmDeviceFunction[]>('/device-functions');
  }

  /** Get a single device function by ID. */
  async getById(id: number): Promise<DmDeviceFunction> {
    return this.get<DmDeviceFunction>(`/device-functions/${id}`);
  }

  /** Create a new device function. */
  async create(func: Partial<DmDeviceFunction>): Promise<DmDeviceFunction> {
    return this.post<DmDeviceFunction>('/device-functions', func);
  }

  /** Update an existing device function. */
  async update(id: number, func: Partial<DmDeviceFunction>): Promise<DmDeviceFunction> {
    return this.put<DmDeviceFunction>(`/device-functions/${id}`, func);
  }

  /** Delete a device function. */
  async remove(id: number): Promise<void> {
    await this.del(`/device-functions/${id}`);
  }
}
