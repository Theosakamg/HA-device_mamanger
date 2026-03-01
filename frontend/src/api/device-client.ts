/**
 * API client for DmDevice CRUD operations.
 */
import type { DmDevice } from "../types/index";
import { BaseClient } from "./base-client";

export class DeviceClient extends BaseClient {
  /** Get all devices, optionally filtered by room. */
  async getAll(roomId?: number): Promise<DmDevice[]> {
    const query = roomId !== undefined ? `?room_id=${roomId}` : "";
    return this.get<DmDevice[]>(`/devices${query}`);
  }

  /** Get a single device by ID. */
  async getById(id: number): Promise<DmDevice> {
    return this.get<DmDevice>(`/devices/${id}`);
  }

  /** Create a new device. */
  async create(device: Partial<DmDevice>): Promise<DmDevice> {
    return this.post<DmDevice>("/devices", device);
  }

  /** Update an existing device. */
  async update(id: number, device: Partial<DmDevice>): Promise<DmDevice> {
    return this.put<DmDevice>(`/devices/${id}`, device);
  }

  /** Delete a device. */
  async remove(id: number): Promise<void> {
    await this.del(`/devices/${id}`);
  }
}
