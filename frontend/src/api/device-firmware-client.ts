/**
 * API client for DmDeviceFirmware CRUD operations.
 */
import type { DmDeviceFirmware } from '../types/index';
import { BaseClient } from './base-client';

export class DeviceFirmwareClient extends BaseClient {
  /** Get all device firmwares. */
  async getAll(): Promise<DmDeviceFirmware[]> {
    return this.get<DmDeviceFirmware[]>('/device-firmwares');
  }

  /** Get a single device firmware by ID. */
  async getById(id: number): Promise<DmDeviceFirmware> {
    return this.get<DmDeviceFirmware>(`/device-firmwares/${id}`);
  }

  /** Create a new device firmware. */
  async create(firmware: Partial<DmDeviceFirmware>): Promise<DmDeviceFirmware> {
    return this.post<DmDeviceFirmware>('/device-firmwares', firmware);
  }

  /** Update an existing device firmware. */
  async update(id: number, firmware: Partial<DmDeviceFirmware>): Promise<DmDeviceFirmware> {
    return this.put<DmDeviceFirmware>(`/device-firmwares/${id}`, firmware);
  }

  /** Delete a device firmware. */
  async remove(id: number): Promise<void> {
    await this.del(`/device-firmwares/${id}`);
  }
}
