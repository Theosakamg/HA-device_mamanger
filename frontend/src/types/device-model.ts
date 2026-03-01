/**
 * DmDeviceModel - Reference entity for device models/hardware types.
 */
export interface DmDeviceModel {
  id?: number;
  enabled: boolean;
  name: string;
  template?: string;
  createdAt?: string;
  updatedAt?: string;
}
