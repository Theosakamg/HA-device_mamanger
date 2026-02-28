/**
 * API Client for HA Device Manager
 */
import type { Device } from "./types";

/**
 * Home Assistant Element interface for auth token access
 */
interface HomeAssistantElement extends HTMLElement {
  hass?: {
    auth?: {
      data?: {
        access_token?: string;
      };
    };
    connection?: {
      options?: {
        auth?: {
          data?: {
            access_token?: string;
          };
        };
      };
    };
  };
}

export class APIClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = "/api/device_manager";
  }

  /**
   * Get Home Assistant authentication token
   */
  private getAuthToken(): string {
    try {
      // Try to get token from Home Assistant frontend
      const haElement = document.querySelector(
        "home-assistant"
      ) as HomeAssistantElement | null;
      if (haElement?.hass?.auth?.data?.access_token) {
        return haElement.hass.auth.data.access_token;
      }

      // Fallback: try to get from connection
      if (haElement?.hass?.connection?.options?.auth?.data?.access_token) {
        return haElement.hass.connection.options.auth.data.access_token;
      }
    } catch (error) {
      console.error("Failed to get auth token:", error);
    }
    return "";
  }

  /**
   * Get all devices
   */
  async getDevices(): Promise<Device[]> {
    const token = this.getAuthToken();
    const response = await fetch(`${this.baseUrl}/devices`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch devices: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get a specific device
   */
  async getDevice(id: number): Promise<Device> {
    const token = this.getAuthToken();
    const response = await fetch(`${this.baseUrl}/devices/${id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch device: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a new device
   */
  async createDevice(device: Partial<Device>): Promise<Device> {
    const token = this.getAuthToken();
    const response = await fetch(`${this.baseUrl}/devices`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(device),
    });

    if (!response.ok) {
      throw new Error(`Failed to create device: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update a device
   */
  async updateDevice(id: number, device: Partial<Device>): Promise<Device> {
    const token = this.getAuthToken();
    const response = await fetch(`${this.baseUrl}/devices/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(device),
    });

    if (!response.ok) {
      throw new Error(`Failed to update device: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Delete a device
   */
  async deleteDevice(id: number): Promise<void> {
    const token = this.getAuthToken();
    const response = await fetch(`${this.baseUrl}/devices/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete device: ${response.statusText}`);
    }
  }

  /**
   * Import devices from CSV file (multipart/form-data)
   */
  async importCSV(file: File): Promise<{
    logs?: { line?: number; status?: string; id?: number; error?: string }[];
  }> {
    const token = this.getAuthToken();
    const form = new FormData();
    form.append("file", file, file.name);

    const response = await fetch(`${this.baseUrl}/import`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // NOTE: let the browser set Content-Type for multipart
      },
      body: form,
    });

    if (!response.ok) {
      throw new Error(`Failed to import CSV: ${response.statusText}`);
    }

    return response.json();
  }
}
