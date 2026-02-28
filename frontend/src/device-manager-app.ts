/**
 * Device Manager Application
 * Main Web Component for HA Device Manager
 */
import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { APIClient } from "./api-client";
import { i18n } from "./i18n";
import type { Device, DeviceFunction } from "./types";

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

    /* Table layout for devices */
    .devices-table-wrapper {
      overflow-x: auto;
    }

    .devices-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 720px;
      background: var(--background);
    }

    .devices-table th,
    .devices-table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--divider-color);
      vertical-align: middle;
      color: var(--text-primary);
    }

    .devices-table th {
      background: var(--card-background);
      font-weight: 600;
      color: var(--text-primary);
      font-size: 13px;
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .devices-table tr:hover {
      background: #f7f9fb;
    }

    .devices-table .col-meta {
      color: var(--text-secondary);
      font-size: 13px;
    }

    /* Use HA button spacing and danger color override */
    mwc-button.btn-small {
      --mdc-typography-button-font-size: 12px;
      margin-left: 8px;
    }

    mwc-button.danger {
      --mdc-theme-primary: var(--danger-color);
      color: white;
    }

    @media (max-width: 768px) {
      .devices-table-wrapper {
        overflow: visible;
      }

      .devices-table {
        min-width: 0;
      }

      /* Convert table to stacked cards on small screens */
      .devices-table thead {
        display: none;
      }

      .devices-table,
      .devices-table tbody,
      .devices-table tr,
      .devices-table td {
        display: block;
        width: 100%;
      }

      .devices-table tr {
        margin-bottom: 12px;
        border: 1px solid var(--divider-color);
        border-radius: 6px;
        padding: 12px;
        background: var(--background);
      }

      .devices-table td {
        padding: 8px 0;
        border: none;
      }

      .devices-table td[data-label]:before {
        content: attr(data-label) ": ";
        font-weight: 600;
        display: inline-block;
        width: 110px;
        color: var(--text-primary);
      }
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

    .action-icon {
      background: transparent;
      border: none;
      padding: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--primary-color);
      width: 36px;
      height: 36px;
      border-radius: 4px;
    }

    .action-icon:disabled {
      opacity: 0.5;
      cursor: default;
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
      max-width: 900px;
      width: 90%;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }

    /* make the form scrollable when tall and allow wider layout */
    .form-container {
      max-height: calc(100vh - 80px);
      overflow: auto;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 16px;
      align-items: start;
    }

    .form-block {
      background: var(--card-background);
      padding: 12px;
      border-radius: 6px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .block-title {
      margin: 0 0 8px 0;
      font-size: 13px;
      color: var(--text-primary);
      font-weight: 600;
    }

    .form-grid .form-group {
      margin-bottom: 12px;
    }

    @media (max-width: 768px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
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

  @state() private showImportModal = false;
  @state() private importLogs: {
    line?: number;
    status?: string;
    id?: number;
    error?: string;
  }[] = [];
  @state() private importLoading = false;
  @state() private importError: string | null = null;

  @state() private mac = "";
  @state() private ip = "";
  @state() private roomFr = "";
  @state() private positionFr = "";
  @state() private roomSlug = "";
  @state() private positionSlug = "";
  @state() private functionField = "";
  @state() private firmware = "";
  @state() private model = "";
  @state() private level: number | null = null;
  @state() private stateField = "";
  @state() private interlock: string | number | null = null;
  @state() private mode = "";
  @state() private target = "";
  @state() private haDeviceClass = "";
  @state() private extra = "";

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
    this.deviceName = device.name ?? "";
    this.mac = device.mac ?? "";
    this.ip = device.ip ? String(device.ip) : "";
    this.roomFr = device.roomFr ?? "";
    this.positionFr = device.positionFr ?? "";
    this.roomSlug = device.roomSlug ?? "";
    this.positionSlug = device.positionSlug ?? "";
    this.functionField = (device.function as string) ?? "";
    this.firmware = device.firmware ?? "";
    this.model = device.model ?? "";
    this.level = typeof device.level === "number" ? device.level : null;
    this.stateField =
      (device.state as string) ?? (device.status as string) ?? "";
    this.interlock = device.interlock ?? null;
    this.mode = device.mode ?? "";
    this.target = device.target ?? "";
    this.haDeviceClass = device.haDeviceClass ?? "";
    this.extra =
      typeof device.extra === "string"
        ? device.extra
        : JSON.stringify(device.extra ?? "");
    this.showForm = true;
    this.error = null;
    this.success = null;
  }

  private handleCancelForm() {
    this.showForm = false;
    this.editingDevice = null;
    this.deviceName = "";
    this.mac = "";
    this.ip = "";
    this.roomFr = "";
    this.positionFr = "";
    this.roomSlug = "";
    this.positionSlug = "";
    this.functionField = "";
    this.firmware = "";
    this.model = "";
    this.level = null;
    this.stateField = "";
    this.interlock = null;
    this.mode = "";
    this.target = "";
    this.haDeviceClass = "";
    this.extra = "";
    this.error = null;
  }

  private goToDeviceOffset(offset: number) {
    if (!this.editingDevice) return;
    const currentIndex = this.devices.findIndex(
      (d) => d.id === this.editingDevice?.id
    );
    if (currentIndex === -1) return;
    let newIndex = currentIndex + offset;
    if (newIndex < 0) newIndex = this.devices.length - 1;
    if (newIndex >= this.devices.length) newIndex = 0;
    const device = this.devices[newIndex];
    if (device) this.handleEditDevice(device);
  }

  private handlePrevEditing() {
    this.goToDeviceOffset(-1);
  }

  private handleNextEditing() {
    this.goToDeviceOffset(1);
  }

  private async handleReloadEditing() {
    if (!this.editingDevice || !this.editingDevice.id) return;
    this.loading = true;
    try {
      const device = await this.api.getDevice(this.editingDevice.id as number);
      this.handleEditDevice(device);
    } catch (err) {
      console.error("Failed to reload device:", err);
      this.error = i18n.t("error_loading");
    } finally {
      this.loading = false;
    }
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
      // Validate extra is valid JSON if provided
      if (this.extra && this.extra.trim() !== "") {
        try {
          JSON.parse(this.extra);
        } catch {
          this.error = i18n.t("error_invalid_extra");
          this.loading = false;
          return;
        }
      }

      const payload: Partial<Device> = {
        name,
        mac: this.mac || null,
        ip: this.ip || null,
        roomFr: this.roomFr || null,
        positionFr: this.positionFr || null,
        roomSlug: this.roomSlug || null,
        positionSlug: this.positionSlug || null,
        function: (this.functionField as DeviceFunction) || null,
        firmware: this.firmware || null,
        model: this.model || null,
        level: this.level ?? null,
        state: this.stateField || null,
        interlock: this.interlock ?? null,
        mode: this.mode || null,
        target: this.target || null,
        haDeviceClass: this.haDeviceClass || null,
        extra: this.extra || null,
      };

      if (this.editingDevice) {
        await this.api.updateDevice(this.editingDevice.id as number, payload);
        this.success = i18n.t("success_updated");
      } else {
        await this.api.createDevice(payload);
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
      await this.api.deleteDevice(device.id as number);
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

  private handleImportClick() {
    const input = this.renderRoot?.querySelector(
      "#csv-file-input"
    ) as HTMLInputElement | null;
    if (input) input.click();
  }

  private async handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    this.importLoading = true;
    this.importError = null;
    this.importLogs = [];
    this.showImportModal = true;

    try {
      const result = await this.api.importCSV(file);
      this.importLogs = result.logs ?? [];
    } catch (err) {
      console.error("CSV import failed", err);
      this.importError = (err as Error).message || String(err);
    } finally {
      this.importLoading = false;
      // clear the file input so same file can be re-selected later
      (input as HTMLInputElement).value = "";
      // reload devices to reflect newly imported ones
      await this.loadDevices();
    }
  }

  private handleCloseImportModal() {
    this.showImportModal = false;
    this.importLogs = [];
    this.importError = null;
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
          <div>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv,text/csv"
              style="display:none"
              @change=${this.handleFileChange}
            />
            <mwc-button
              raised
              class="btn-small"
              @click=${this.handleImportClick}
              ?disabled=${this.loading || this.importLoading}
            >
              ${i18n.t("import_csv") || "Import CSV"}
            </mwc-button>
            <mwc-button
              raised
              @click=${this.handleAddDevice}
              ?disabled=${this.loading}
            >
              + ${i18n.t("add_device")}
            </mwc-button>
          </div>
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
                <ha-card class="devices-list">
                  <div class="devices-table-wrapper">
                    <table class="devices-table" role="table">
                      <thead>
                        <tr>
                          <th>${i18n.t("device_name")}</th>
                          <th>${i18n.t("mac") || "MAC"}</th>
                          <th>${i18n.t("ip") || "IP"}</th>
                          <th>${i18n.t("function") || "Function"}</th>
                          <th>${i18n.t("location") || "Location"}</th>
                          <th>${i18n.t("actions") || "Actions"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${this.devices.map(
                          (device) => html`
                            <tr>
                              <td data-label="${i18n.t("device_name")}">
                                ${device.name}
                              </td>
                              <td
                                data-label="${i18n.t("mac") || "MAC"}"
                                class="col-meta"
                              >
                                ${device.mac ?? ""}
                              </td>
                              <td
                                data-label="${i18n.t("ip") || "IP"}"
                                class="col-meta"
                              >
                                ${device.ip ?? ""}
                              </td>
                              <td
                                data-label="${i18n.t("function") || "Function"}"
                                class="col-meta"
                              >
                                ${device.function ?? ""}${device.firmware
                                  ? ` • ${device.firmware}`
                                  : ""}${device.model
                                  ? ` • ${device.model}`
                                  : ""}
                              </td>
                              <td
                                data-label="${i18n.t("location") || "Location"}"
                                class="col-meta"
                              >
                                ${device.roomFr ?? ""}${device.positionFr
                                  ? ` • ${device.positionFr}`
                                  : ""}
                              </td>
                              <td>
                                <div class="device-actions">
                                  <button
                                    class="action-icon"
                                    title="${i18n.t("edit")}"
                                    @click=${() =>
                                      this.handleEditDevice(device)}
                                    ?disabled=${this.loading}
                                  >
                                    <ha-icon icon="mdi:pencil"></ha-icon>
                                  </button>
                                  <button
                                    class="action-icon"
                                    title="${i18n.t("delete")}"
                                    @click=${() =>
                                      this.handleDeleteDevice(device)}
                                    ?disabled=${this.loading}
                                  >
                                    <ha-icon icon="mdi:delete"></ha-icon>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          `
                        )}
                      </tbody>
                    </table>
                  </div>
                </ha-card>
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
                  <div
                    style="display:flex; align-items:center; justify-content:space-between; gap:12px;"
                  >
                    <h2 class="form-title">
                      ${this.editingDevice
                        ? i18n.t("edit_device")
                        : i18n.t("add_device")}
                    </h2>
                    ${this.editingDevice
                      ? html`
                          <div
                            style="display:flex; gap:8px; align-items:center;"
                          >
                            <mwc-button
                              dense
                              @click=${this.handlePrevEditing}
                              ?disabled=${this.loading}
                              >‹</mwc-button
                            >
                            <mwc-button
                              dense
                              @click=${this.handleReloadEditing}
                              ?disabled=${this.loading}
                              >⟳</mwc-button
                            >
                            <mwc-button
                              dense
                              @click=${this.handleNextEditing}
                              ?disabled=${this.loading}
                              >›</mwc-button
                            >
                          </div>
                        `
                      : ""}
                  </div>
                  <form @submit=${this.handleSaveDevice}>
                    <div class="form-grid">
                      <div class="form-block">
                        <h3 class="block-title">${i18n.t("identification")}</h3>
                        <div class="form-group">
                          <label for="device-name"
                            >${i18n.t("device_name")}</label
                          >
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
                        <div class="form-group">
                          <label for="device-mac">MAC</label>
                          <input
                            id="device-mac"
                            .value=${this.mac}
                            @input=${(e: Event) =>
                              (this.mac = (e.target as HTMLInputElement).value)}
                            placeholder="00:11:22:33:44:55"
                          />
                        </div>
                        <div class="form-group">
                          <label for="device-ip">IP</label>
                          <input
                            id="device-ip"
                            .value=${this.ip}
                            @input=${(e: Event) =>
                              (this.ip = (e.target as HTMLInputElement).value)}
                            placeholder="192.168.0.77"
                          />
                        </div>
                      </div>

                      <div class="form-block">
                        <h3 class="block-title">${i18n.t("location")}</h3>
                        <div class="form-group">
                          <label for="device-room">${i18n.t("room")}</label>
                          <input
                            id="device-room"
                            .value=${this.roomFr}
                            @input=${(e: Event) =>
                              (this.roomFr = (
                                e.target as HTMLInputElement
                              ).value)}
                          />
                        </div>
                        <div class="form-group">
                          <label for="device-position"
                            >${i18n.t("position")}</label
                          >
                          <input
                            id="device-position"
                            .value=${this.positionFr}
                            @input=${(e: Event) =>
                              (this.positionFr = (
                                e.target as HTMLInputElement
                              ).value)}
                          />
                        </div>
                        <div class="form-group">
                          <label for="device-level">Level</label>
                          <input
                            id="device-level"
                            type="number"
                            .value=${this.level ?? ""}
                            @input=${(e: Event) =>
                              (this.level = (e.target as HTMLInputElement).value
                                ? Number((e.target as HTMLInputElement).value)
                                : null)}
                          />
                        </div>
                      </div>

                      <div class="form-block">
                        <h3 class="block-title">${i18n.t("device")}</h3>
                        <div class="form-group">
                          <label for="device-function"
                            >${i18n.t("function")}</label
                          >
                          <input
                            id="device-function"
                            .value=${this.functionField}
                            @input=${(e: Event) =>
                              (this.functionField = (
                                e.target as HTMLInputElement
                              ).value)}
                          />
                        </div>
                        <div class="form-group">
                          <label for="device-firmware">Firmware</label>
                          <input
                            id="device-firmware"
                            .value=${this.firmware}
                            @input=${(e: Event) =>
                              (this.firmware = (
                                e.target as HTMLInputElement
                              ).value)}
                          />
                        </div>
                        <div class="form-group">
                          <label for="device-model">Model</label>
                          <input
                            id="device-model"
                            .value=${this.model}
                            @input=${(e: Event) =>
                              (this.model = (
                                e.target as HTMLInputElement
                              ).value)}
                          />
                        </div>
                      </div>

                      <div class="form-block">
                        <h3 class="block-title">${i18n.t("behavior")}</h3>
                        <div class="form-group">
                          <label for="device-state">State</label>
                          <select
                            id="device-state"
                            .value=${this.stateField}
                            @change=${(e: Event) =>
                              (this.stateField = (
                                e.target as HTMLSelectElement
                              ).value)}
                          >
                            <option value="">(none)</option>
                            <option value="Enable">Enable</option>
                            <option value="Enable-Hot">Enable-Hot</option>
                            <option value="Disable">Disable</option>
                            <option value="NA">NA</option>
                            <option value="KO">KO</option>
                          </select>
                        </div>
                        <div class="form-group">
                          <label for="device-interlock">Interlock</label>
                          <input
                            id="device-interlock"
                            .value=${String(this.interlock ?? "")}
                            @input=${(e: Event) =>
                              (this.interlock = (
                                e.target as HTMLInputElement
                              ).value)}
                          />
                        </div>
                        <div class="form-group">
                          <label for="device-mode">Mode</label>
                          <input
                            id="device-mode"
                            .value=${this.mode}
                            @input=${(e: Event) =>
                              (this.mode = (
                                e.target as HTMLInputElement
                              ).value)}
                          />
                        </div>
                        <div class="form-group">
                          <label for="device-target">Target</label>
                          <input
                            id="device-target"
                            .value=${this.target}
                            @input=${(e: Event) =>
                              (this.target = (
                                e.target as HTMLInputElement
                              ).value)}
                          />
                        </div>
                      </div>

                      <div class="form-block" style="grid-column: 1 / -1;">
                        <h3 class="block-title">${i18n.t("extra")}</h3>
                        <div class="form-group">
                          <label for="device-extra">Extra (JSON)</label>
                          <textarea
                            id="device-extra"
                            .value=${this.extra}
                            @input=${(e: Event) =>
                              (this.extra = (
                                e.target as HTMLTextAreaElement
                              ).value)}
                            rows="4"
                          ></textarea>
                        </div>
                      </div>
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
        ${this.showImportModal
          ? html`
              <div
                class="form-overlay"
                @click=${(e: Event) => {
                  if (e.target === e.currentTarget)
                    this.handleCloseImportModal();
                }}
              >
                <div class="form-container">
                  <h2 class="form-title">
                    ${i18n.t("import_results") || "Import results"}
                  </h2>

                  ${this.importLoading
                    ? html`<div class="loading">${i18n.t("loading")}</div>`
                    : this.importError
                      ? html`<div class="error">${this.importError}</div>`
                      : html`
                          <div
                            style="max-height:60vh; overflow:auto; padding:8px; background:#fff; border-radius:6px;"
                          >
                            ${this.importLogs.length === 0
                              ? html`<div class="empty-state">
                                  ${i18n.t("no_results") || "No results"}
                                </div>`
                              : html`
                                  <ul>
                                    ${this.importLogs.map(
                                      (l) =>
                                        html`<li>
                                          ${l.line}:
                                          ${l.status}${l.id
                                            ? ` (id: ${l.id})`
                                            : ""}${l.error
                                            ? ` — ${l.error}`
                                            : ""}
                                        </li>`
                                    )}
                                  </ul>
                                `}
                          </div>
                        `}

                  <div class="form-actions" style="margin-top:12px;">
                    <button
                      class="btn-secondary"
                      @click=${this.handleCloseImportModal}
                    >
                      ${i18n.t("close") || "Close"}
                    </button>
                  </div>
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
