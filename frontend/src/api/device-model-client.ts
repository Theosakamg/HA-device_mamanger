/**
 * API client for DmDeviceModel CRUD operations.
 */
import type { DmDeviceModel } from "../types/index";
import { BaseClient } from "./base-client";

export class DeviceModelClient extends BaseClient {
  /** Get all device models. */
  async getAll(): Promise<DmDeviceModel[]> {
    return this.get<DmDeviceModel[]>("/device-models");
  }

  /** Get a single device model by ID. */
  async getById(id: number): Promise<DmDeviceModel> {
    return this.get<DmDeviceModel>(`/device-models/${id}`);
  }

  /** Create a new device model. */
  async create(model: Partial<DmDeviceModel>): Promise<DmDeviceModel> {
    return this.post<DmDeviceModel>("/device-models", model);
  }

  /** Update an existing device model. */
  async update(
    id: number,
    model: Partial<DmDeviceModel>
  ): Promise<DmDeviceModel> {
    return this.put<DmDeviceModel>(`/device-models/${id}`, model);
  }

  /** Delete a device model. */
  async remove(id: number): Promise<void> {
    await this.del(`/device-models/${id}`);
  }
}
