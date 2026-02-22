/**
 * Device Manager Application
 * Main Web Component for HA Device Manager
 */
import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { APIClient } from "./api-client";
import { i18n } from "./i18n";
import type { Device } from "./types";

@customElement("device-manager-app")
export class DeviceManagerApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family:
        -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
        Arial, sans-serif;
      --primary-color: #03a9f4;
      --primary-dark: #0288d1;
      --danger-color: #f44336;
      --success-color: #4caf50;
      --text-primary: #212121;
      --text-secondary: #757575;
      --divider-color: #e0e0e0;
      --background: #ffffff;
      --card-background: #fafafa;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    header {
      background: var(--primary-color);
      color: white;
      padding: 20px;
      margin: -20px -20px 20px -20px;
      border-radius: 4px 4px 0 0;
    }

    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
    }

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding: 16px;
      background: var(--card-background);
      border-radius: 4px;
    }

    .toolbar h2 {
      margin: 0;
      font-size: 18px;
      color: var(--text-primary);
    }

    button {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    button:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    .btn-primary {
      background: var(--primary-color);
      color: white;
    }

    .btn-success {
      background: var(--success-color);
      color: white;
    }

    .btn-danger {
      background: var(--danger-color);
      color: white;
    }

    .btn-secondary {
      background: #9e9e9e;
      color: white;
    }

    .btn-small {
      padding: 6px 12px;
      font-size: 12px;
      margin-left: 8px;
    }

    .devices-list {
      background: var(--background);
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .device-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid var(--divider-color);
    }

    .device-item:last-child {
      border-bottom: none;
    }

    .device-info {
      flex: 1;
    }

    .device-name {
      font-size: 16px;
      color: var(--text-primary);
      margin: 0 0 4px 0;
      font-weight: 500;
    }

    .device-id {
      font-size: 12px;
      color: var(--text-secondary);
      margin: 0;
    }

    .device-actions {
      display: flex;
      gap: 8px;
    }

    .form-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .form-container {
      background: var(--background);
      border-radius: 8px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }

    .form-title {
      margin: 0 0 20px 0;
      font-size: 20px;
      color: var(--text-primary);
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      color: var(--text-primary);
      font-size: 14px;
      font-weight: 500;
    }

    input {
      width: 100%;
      padding: 12px;
      border: 1px solid var(--divider-color);
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
      font-family: inherit;
    }

    input:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: var(--text-secondary);
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-secondary);
    }

    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.3;
    }

    .error {
      background: #ffebee;
      color: #c62828;
      padding: 12px 16px;
      border-radius: 4px;
      margin-bottom: 16px;
      border-left: 4px solid var(--danger-color);
    }

    .success {
      background: #e8f5e9;
      color: #2e7d32;
      padding: 12px 16px;
      border-radius: 4px;
      margin-bottom: 16px;
      border-left: 4px solid var(--success-color);
    }

    @media (max-width: 768px) {
      .container {
        padding: 10px;
      }

      .device-item {
        flex-direction: column;
        align-items: flex-start;
      }

      .device-actions {
        margin-top: 12px;
        width: 100%;
      }

      .device-actions button {
        flex: 1;
      }
    }
  `;

  @state() private devices: Device[] = [];
  @state() private loading = false;
  @state() private showForm = false;
  @state() private editingDevice: Device | null = null;
  @state() private deviceName = "";
  @state() private error: string | null = null;
  @state() private success: string | null = null;

  private api = new APIClient();

  connectedCallback() {
    super.connectedCallback();
    this.loadDevices();
  }

  private async loadDevices() {
    this.loading = true;
    this.error = null;
    try {
      this.devices = await this.api.getDevices();
    } catch (error) {
      console.error("Failed to load devices:", error);
      this.error = i18n.t("error_loading");
    } finally {
      this.loading = false;
    }
  }

  private handleAddDevice() {
    this.editingDevice = null;
    this.deviceName = "";
    this.showForm = true;
    this.error = null;
    this.success = null;
  }

  private handleEditDevice(device: Device) {
    this.editingDevice = device;
    this.deviceName = device.name;
    this.showForm = true;
    this.error = null;
    this.success = null;
  }

  private handleCancelForm() {
    this.showForm = false;
    this.editingDevice = null;
    this.deviceName = "";
    this.error = null;
  }

  private async handleSaveDevice(e: Event) {
    e.preventDefault();

    const name = this.deviceName.trim();
    if (!name) {
      this.error = i18n.t("error_saving");
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      if (this.editingDevice) {
        await this.api.updateDevice(this.editingDevice.id, name);
        this.success = i18n.t("success_updated");
      } else {
        await this.api.createDevice(name);
        this.success = i18n.t("success_created");
      }
      this.showForm = false;
      await this.loadDevices();

      // Clear success message after 3 seconds
      setTimeout(() => {
        this.success = null;
      }, 3000);
    } catch (error) {
      console.error("Failed to save device:", error);
      this.error = i18n.t("error_saving");
    } finally {
      this.loading = false;
    }
  }

  private async handleDeleteDevice(device: Device) {
    if (!confirm(i18n.t("confirm_delete"))) {
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      await this.api.deleteDevice(device.id);
      this.success = i18n.t("success_deleted");
      await this.loadDevices();

      // Clear success message after 3 seconds
      setTimeout(() => {
        this.success = null;
      }, 3000);
    } catch (error) {
      console.error("Failed to delete device:", error);
      this.error = i18n.t("error_deleting");
    } finally {
      this.loading = false;
    }
  }

  render() {
    return html`
      <div class="container">
        <header>
          <h1>${i18n.t("app_title")}</h1>
        </header>

        ${this.error ? html`<div class="error">${this.error}</div>` : ""}
        ${this.success ? html`<div class="success">${this.success}</div>` : ""}

        <div class="toolbar">
          <h2>${i18n.t("devices_list")}</h2>
          <button
            class="btn-primary"
            @click=${this.handleAddDevice}
            ?disabled=${this.loading}
          >
            + ${i18n.t("add_device")}
          </button>
        </div>

        ${this.loading && this.devices.length === 0
          ? html` <div class="loading">${i18n.t("loading")}</div> `
          : this.devices.length === 0
            ? html`
                <div class="empty-state">
                  <div class="empty-state-icon">📦</div>
                  <p>${i18n.t("no_devices")}</p>
                </div>
              `
            : html`
                <div class="devices-list">
                  ${this.devices.map(
                    (device) => html`
                      <div class="device-item">
                        <div class="device-info">
                          <h3 class="device-name">${device.name}</h3>
                          <p class="device-id">ID: ${device.id}</p>
                        </div>
                        <div class="device-actions">
                          <button
                            class="btn-primary btn-small"
                            @click=${() => this.handleEditDevice(device)}
                            ?disabled=${this.loading}
                          >
                            ${i18n.t("edit")}
                          </button>
                          <button
                            class="btn-danger btn-small"
                            @click=${() => this.handleDeleteDevice(device)}
                            ?disabled=${this.loading}
                          >
                            ${i18n.t("delete")}
                          </button>
                        </div>
                      </div>
                    `
                  )}
                </div>
              `}
        ${this.showForm
          ? html`
              <div
                class="form-overlay"
                @click=${(e: Event) => {
                  if (e.target === e.currentTarget) this.handleCancelForm();
                }}
              >
                <div class="form-container">
                  <h2 class="form-title">
                    ${this.editingDevice
                      ? i18n.t("edit_device")
                      : i18n.t("add_device")}
                  </h2>
                  <form @submit=${this.handleSaveDevice}>
                    <div class="form-group">
                      <label for="device-name">${i18n.t("device_name")}</label>
                      <input
                        type="text"
                        id="device-name"
                        .value=${this.deviceName}
                        @input=${(e: Event) => {
                          this.deviceName = (
                            e.target as HTMLInputElement
                          ).value;
                        }}
                        placeholder=${i18n.t("device_name_placeholder")}
                        required
                        autofocus
                      />
                    </div>
                    <div class="form-actions">
                      <button
                        type="button"
                        class="btn-secondary"
                        @click=${this.handleCancelForm}
                        ?disabled=${this.loading}
                      >
                        ${i18n.t("cancel")}
                      </button>
                      <button
                        type="submit"
                        class="btn-success"
                        ?disabled=${this.loading}
                      >
                        ${i18n.t("save")}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            `
          : ""}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "device-manager-app": DeviceManagerApp;
  }
}
