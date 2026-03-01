/**
 * Settings view with tabs for managing reference entities.
 */
import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { sharedStyles } from "../../styles/shared-styles";
import { i18n, localized } from "../../i18n";
import "./model-tab";
import "./firmware-tab";
import "./function-tab";

/** Navigate to devices view filtered by a setting name. */
function navigateToDevicesWithFilter(value: string) {
  window.location.hash = `#devices?filter=${encodeURIComponent(value)}`;
}

type SettingsTab = "models" | "firmwares" | "functions";

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
            ? html`<dm-model-tab></dm-model-tab>`
            : ""}
          ${this._activeTab === "firmwares"
            ? html`<dm-firmware-tab></dm-firmware-tab>`
            : ""}
          ${this._activeTab === "functions"
            ? html`<dm-function-tab></dm-function-tab>`
            : ""}
        </div>
      </div>
    `;
  }
}
