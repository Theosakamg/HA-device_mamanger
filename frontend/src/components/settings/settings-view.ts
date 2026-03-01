/**
 * Settings view with tabs for managing reference entities.
 */
import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { sharedStyles } from "../../styles/shared-styles";
import { i18n, localized } from "../../i18n";
import { DeviceModelClient } from "../../api/device-model-client";
import { DeviceFirmwareClient } from "../../api/device-firmware-client";
import { DeviceFunctionClient } from "../../api/device-function-client";
import type { CrudConfig } from "../shared/crud-table";
import "./crud-tab";

/** Navigate to devices view filtered by a setting name. */
function navigateToDevicesWithFilter(value: string) {
  window.location.hash = `#devices?filter=${encodeURIComponent(value)}`;
}

type SettingsTab = "models" | "firmwares" | "functions";

const _modelClient = new DeviceModelClient();
const _firmwareClient = new DeviceFirmwareClient();
const _functionClient = new DeviceFunctionClient();

@localized
@customElement("dm-settings-view")
export class DmSettingsView extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
      }
      .settings-container {
        max-width: 1000px;
        margin: 0 auto;
      }
    `,
  ];

  @state() private _activeTab: SettingsTab = "models";

  private get _modelConfig(): CrudConfig {
    return {
      entityName: i18n.t("tab_models"),
      filterDevicesKey: "name",
      columns: [
        {
          key: "name",
          label: i18n.t("model_name"),
          type: "text",
          editable: true,
        },
        {
          key: "template",
          label: i18n.t("model_template"),
          type: "text",
          editable: true,
        },
        {
          key: "enabled",
          label: i18n.t("enabled"),
          type: "boolean",
          editable: true,
        },
      ],
    };
  }

  private get _firmwareConfig(): CrudConfig {
    return {
      entityName: i18n.t("tab_firmwares"),
      filterDevicesKey: "name",
      columns: [
        {
          key: "name",
          label: i18n.t("firmware_name"),
          type: "text",
          editable: true,
        },
        {
          key: "enabled",
          label: i18n.t("enabled"),
          type: "boolean",
          editable: true,
        },
      ],
    };
  }

  private get _functionConfig(): CrudConfig {
    return {
      entityName: i18n.t("tab_functions"),
      filterDevicesKey: "name",
      columns: [
        {
          key: "name",
          label: i18n.t("function_name"),
          type: "text",
          editable: true,
        },
        {
          key: "enabled",
          label: i18n.t("enabled"),
          type: "boolean",
          editable: true,
        },
      ],
    };
  }

  render() {
    return html`
      <div class="settings-container">
        <h2>${i18n.t("settings_title")}</h2>

        <div class="tabs">
          <button
            class="tab ${this._activeTab === "models" ? "active" : ""}"
            @click=${() => {
              this._activeTab = "models";
            }}
          >
            ${i18n.t("tab_models")}
          </button>
          <button
            class="tab ${this._activeTab === "firmwares" ? "active" : ""}"
            @click=${() => {
              this._activeTab = "firmwares";
            }}
          >
            ${i18n.t("tab_firmwares")}
          </button>
          <button
            class="tab ${this._activeTab === "functions" ? "active" : ""}"
            @click=${() => {
              this._activeTab = "functions";
            }}
          >
            ${i18n.t("tab_functions")}
          </button>
        </div>

        <div
          @crud-filter=${(e: CustomEvent) =>
            navigateToDevicesWithFilter(e.detail.value)}
        >
          ${this._activeTab === "models"
            ? html`<dm-crud-tab
                .client=${_modelClient}
                .config=${this._modelConfig}
              ></dm-crud-tab>`
            : ""}
          ${this._activeTab === "firmwares"
            ? html`<dm-crud-tab
                .client=${_firmwareClient}
                .config=${this._firmwareConfig}
              ></dm-crud-tab>`
            : ""}
          ${this._activeTab === "functions"
            ? html`<dm-crud-tab
                .client=${_functionClient}
                .config=${this._functionConfig}
              ></dm-crud-tab>`
            : ""}
        </div>
      </div>
    `;
  }
}
