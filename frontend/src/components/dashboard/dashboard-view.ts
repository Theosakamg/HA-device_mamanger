/**
 * Dashboard view - overview with global statistics and charts.
 */
import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { sharedStyles } from "../../styles/shared-styles";
import { i18n, localized } from "../../i18n";
import { StatsClient } from "../../api/stats-client";
import type {
  StatEntry,
  DeploymentByGroup,
} from "../../api/stats-client";

interface StatItem {
  label: string;
  count: number;
  color: string;
  percentage: number;
}

interface DeploymentItem {
  label: string;
  total: number;
  success: number;
  fail: number;
  successRate: number;
  color: string;
}

@localized
@customElement("dm-dashboard-view")
export class DmDashboardView extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
      }

      /* ── Page header ── */
      .page-header {
        margin-bottom: 28px;
      }
      .page-title {
        font-size: 24px;
        font-weight: 700;
        color: var(--dm-text);
        margin: 0 0 4px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .page-subtitle {
        color: var(--dm-text-secondary);
        font-size: 14px;
        margin: 0;
      }

      /* ── KPI cards row ── */
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        margin-bottom: 28px;
      }
      @media (max-width: 900px) {
        .kpi-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      @media (max-width: 480px) {
        .kpi-grid {
          grid-template-columns: 1fr;
        }
      }

      .kpi-card {
        background: var(--dm-card-bg);
        border-radius: 12px;
        box-shadow: var(--dm-shadow);
        padding: 20px 24px;
        display: flex;
        align-items: center;
        gap: 16px;
        transition:
          transform 0.15s,
          box-shadow 0.15s;
        border-top: 4px solid transparent;
        position: relative;
        overflow: hidden;
      }
      .kpi-card::before {
        content: "";
        position: absolute;
        top: 0;
        right: 0;
        width: 80px;
        height: 80px;
        border-radius: 50%;
        opacity: 0.06;
        transform: translate(20px, -20px);
      }
      .kpi-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
      }
      .kpi-card.blue {
        border-top-color: #03a9f4;
      }
      .kpi-card.blue::before {
        background: #03a9f4;
      }
      .kpi-card.teal {
        border-top-color: #009688;
      }
      .kpi-card.teal::before {
        background: #009688;
      }
      .kpi-card.purple {
        border-top-color: #9c27b0;
      }
      .kpi-card.purple::before {
        background: #9c27b0;
      }
      .kpi-card.orange {
        border-top-color: #ff9800;
      }
      .kpi-card.orange::before {
        background: #ff9800;
      }

      .kpi-icon {
        font-size: 32px;
        line-height: 1;
        flex-shrink: 0;
      }
      .kpi-body {
        min-width: 0;
      }
      .kpi-value {
        font-size: 36px;
        font-weight: 700;
        line-height: 1;
        color: var(--dm-text);
      }
      .kpi-card.blue .kpi-value {
        color: #03a9f4;
      }
      .kpi-card.teal .kpi-value {
        color: #009688;
      }
      .kpi-card.purple .kpi-value {
        color: #9c27b0;
      }
      .kpi-card.orange .kpi-value {
        color: #ff9800;
      }
      .kpi-label {
        font-size: 13px;
        color: var(--dm-text-secondary);
        margin-top: 4px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* ── Charts row ── */
      .charts-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 28px;
      }
      @media (max-width: 768px) {
        .charts-grid {
          grid-template-columns: 1fr;
        }
      }

      .chart-card {
        background: var(--dm-card-bg);
        border-radius: 12px;
        box-shadow: var(--dm-shadow);
        padding: 20px 24px;
      }
      .chart-title {
        font-size: 15px;
        font-weight: 600;
        color: var(--dm-text);
        margin: 0 0 18px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--dm-border);
      }

      /* ── Bar chart ── */
      .bar-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .bar-row {
        display: grid;
        grid-template-columns: 130px 1fr 40px;
        align-items: center;
        gap: 10px;
      }
      .bar-label {
        font-size: 13px;
        color: var(--dm-text);
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .bar-track {
        height: 10px;
        background: var(--dm-bg);
        border-radius: 99px;
        overflow: hidden;
      }
      .bar-fill {
        height: 100%;
        border-radius: 99px;
        transition: width 0.5s ease;
        min-width: 4px;
      }
      .bar-count {
        font-size: 13px;
        font-weight: 600;
        color: var(--dm-text-secondary);
        text-align: right;
      }

      /* ── Color palette for bars ── */
      .color-0 {
        background: #03a9f4;
      }
      .color-1 {
        background: #9c27b0;
      }
      .color-2 {
        background: #4caf50;
      }
      .color-3 {
        background: #ff9800;
      }
      .color-4 {
        background: #f44336;
      }
      .color-5 {
        background: #009688;
      }
      .color-6 {
        background: #3f51b5;
      }
      .color-7 {
        background: #e91e63;
      }
      .color-8 {
        background: #795548;
      }
      .color-9 {
        background: #607d8b;
      }

      /* ── Empty / loading states ── */
      .empty-chart {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 80px;
        color: var(--dm-text-secondary);
        font-size: 14px;
      }
      .loading-skeleton {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .skeleton-bar {
        height: 10px;
        background: linear-gradient(
          90deg,
          #eeeeee 25%,
          #f5f5f5 50%,
          #eeeeee 75%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 99px;
      }
      .skeleton-kpi {
        height: 36px;
        width: 80px;
        background: linear-gradient(
          90deg,
          #eeeeee 25%,
          #f5f5f5 50%,
          #eeeeee 75%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 4px;
      }
      @keyframes shimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }

      /* ── Footer note ── */
      .refresh-hint {
        text-align: right;
        font-size: 12px;
        color: var(--dm-text-secondary);
        margin-top: -4px;
      }
    `,
  ];

  @state() private _loading = true;
  @state() private _totalBuildings = 0;
  @state() private _totalFloors = 0;
  @state() private _totalRooms = 0;
  @state() private _totalDevices = 0;
  @state() private _byFirmware: StatItem[] = [];
  @state() private _byModel: StatItem[] = [];
  @state() private _deploymentTotal = 0;
  @state() private _deploymentSuccess = 0;
  @state() private _deploymentFail = 0;
  @state() private _deploymentByFirmware: DeploymentItem[] = [];
  @state() private _deploymentByModel: DeploymentItem[] = [];
  @state() private _expandedFirmware = false;
  @state() private _expandedModel = false;
  @state() private _expandedDeployFirmware = false;
  @state() private _expandedDeployModel = false;

  private _statsClient = new StatsClient();

  async connectedCallback() {
    super.connectedCallback();
    await this._loadData();
  }

  private async _loadData() {
    this._loading = true;
    try {
      const stats = await this._statsClient.getStats();
      this._totalBuildings = stats.buildings;
      this._totalFloors = stats.floors;
      this._totalRooms = stats.rooms;
      this._totalDevices = stats.devices;
      this._byFirmware = this._toStatItems(stats.byFirmware);
      this._byModel = this._toStatItems(stats.byModel);
      this._deploymentTotal = stats.deployment.total;
      this._deploymentSuccess = stats.deployment.success;
      this._deploymentFail = stats.deployment.fail;
      this._deploymentByFirmware = this._toDeploymentItems(
        stats.deploymentByFirmware
      );
      this._deploymentByModel = this._toDeploymentItems(
        stats.deploymentByModel
      );
    } catch (err) {
      console.error("Dashboard: failed to load stats", err);
    }
    this._loading = false;
  }

  private _toStatItems(entries: StatEntry[]): StatItem[] {
    const max = entries[0]?.count ?? 1;
    return entries.map((entry, i) => ({
      label: entry.name,
      count: entry.count,
      color: `color-${i % 10}`,
      percentage: Math.round((entry.count / max) * 100),
    }));
  }

  private _toDeploymentItems(entries: DeploymentByGroup[]): DeploymentItem[] {
    return entries.map((entry, i) => ({
      label: entry.name,
      total: entry.total,
      success: entry.success,
      fail: entry.fail,
      successRate:
        entry.total > 0 ? Math.round((entry.success / entry.total) * 100) : 0,
      color: `color-${i % 10}`,
    }));
  }

  private _renderKpi(
    icon: string,
    value: number,
    label: string,
    colorClass: string
  ) {
    return html`
      <div class="kpi-card ${colorClass}">
        <div class="kpi-icon">${icon}</div>
        <div class="kpi-body">
          ${this._loading
            ? html`<div class="skeleton-kpi"></div>`
            : html`<div class="kpi-value">${value}</div>`}
          <div class="kpi-label">${label}</div>
        </div>
      </div>
    `;
  }

  private _renderBarChart(
    title: string,
    icon: string,
    items: StatItem[],
    expanded: boolean,
    onToggle: () => void
  ) {
    const displayItems = expanded ? items : items.slice(0, 4);
    const hasMore = items.length > 4;

    return html`
      <div class="chart-card">
        <div class="chart-title">${icon} ${title}</div>
        ${this._loading
          ? html`
              <div class="loading-skeleton">
                ${[80, 60, 45, 30].map(
                  (w) =>
                    html`<div class="skeleton-bar" style="width:${w}%"></div>`
                )}
              </div>
            `
          : items.length === 0
            ? html`<div class="empty-chart">${i18n.t("no_devices")}</div>`
            : html`
                <div class="bar-list">
                  ${displayItems.map(
                    (item) => html`
                      <div class="bar-row">
                        <span class="bar-label" title="${item.label}"
                          >${item.label}</span
                        >
                        <div class="bar-track">
                          <div
                            class="bar-fill ${item.color}"
                            style="width: ${item.percentage}%"
                          ></div>
                        </div>
                        <span class="bar-count">${item.count}</span>
                      </div>
                    `
                  )}
                </div>
                ${hasMore
                  ? html`
                      <button
                        class="btn btn-secondary"
                        style="width: 100%; margin-top: 12px; font-size: 13px;"
                        @click=${onToggle}
                      >
                        ${expanded
                          ? `▲ ${i18n.t("dashboard_show_less")}`
                          : `▼ ${i18n.t("dashboard_show_more")} (${items.length - 4})`}
                      </button>
                    `
                  : ""}
              `}
      </div>
    `;
  }

  private _renderDeploymentChart(
    title: string,
    icon: string,
    items: DeploymentItem[],
    expanded: boolean,
    onToggle: () => void
  ) {
    const displayItems = expanded ? items : items.slice(0, 4);
    const hasMore = items.length > 4;

    return html`
      <div class="chart-card">
        <div class="chart-title">${icon} ${title}</div>
        ${this._loading
          ? html`
              <div class="loading-skeleton">
                ${[80, 60, 45, 30].map(
                  (w) =>
                    html`<div class="skeleton-bar" style="width:${w}%"></div>`
                )}
              </div>
            `
          : items.length === 0
            ? html`<div class="empty-chart">${i18n.t("no_devices")}</div>`
            : html`
                <div class="bar-list">
                  ${displayItems.map(
                    (item) => html`
                      <div class="bar-row">
                        <span
                          class="bar-label"
                          title="${item.label} - ${item.success}/${item.total} (${item.successRate}%)"
                          >${item.label}</span
                        >
                        <div class="bar-track">
                          <div
                            class="bar-fill"
                            style="width: ${item.successRate}%; background: #4caf50;"
                          ></div>
                        </div>
                        <span class="bar-count"
                          >${item.success}/${item.total} (${item.successRate}%)</span
                        >
                      </div>
                    `
                  )}
                </div>
                ${hasMore
                  ? html`
                      <button
                        class="btn btn-secondary"
                        style="width: 100%; margin-top: 12px; font-size: 13px;"
                        @click=${onToggle}
                      >
                        ${expanded
                          ? `▲ ${i18n.t("dashboard_show_less")}`
                          : `▼ ${i18n.t("dashboard_show_more")} (${items.length - 4})`}
                      </button>
                    `
                  : ""}
              `}
      </div>
    `;
  }

  render() {
    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return html`
      <div class="page-header">
        <h1 class="page-title">📊 ${i18n.t("dashboard_title")}</h1>
        <p class="page-subtitle">${i18n.t("dashboard_subtitle")}</p>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid">
        ${this._renderKpi(
          "🏢",
          this._totalBuildings,
          i18n.t("buildings"),
          "blue"
        )}
        ${this._renderKpi("🏗️", this._totalFloors, i18n.t("floors"), "teal")}
        ${this._renderKpi("🚪", this._totalRooms, i18n.t("rooms"), "purple")}
        ${this._renderKpi(
          "📱",
          this._totalDevices,
          i18n.t("devices"),
          "orange"
        )}
      </div>

      <!-- Distribution Charts -->
      <div class="charts-grid">
        ${this._renderBarChart(
          i18n.t("dashboard_by_firmware"),
          "💾",
          this._byFirmware,
          this._expandedFirmware,
          () => (this._expandedFirmware = !this._expandedFirmware)
        )}
        ${this._renderBarChart(
          i18n.t("dashboard_by_hardware"),
          "🔧",
          this._byModel,
          this._expandedModel,
          () => (this._expandedModel = !this._expandedModel)
        )}
      </div>

      <!-- Deployment Statistics -->
      <div style="margin-top: 32px;">
        <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 16px; color: var(--dm-text);">
          🚀 ${i18n.t("dashboard_deployment_title")}
        </h2>

        <!-- Deployment KPI Cards -->
        <div class="kpi-grid" style="grid-template-columns: repeat(3, 1fr);">
          ${this._renderKpi(
            "📦",
            this._deploymentTotal,
            i18n.t("dashboard_deployment_total"),
            "blue"
          )}
          ${this._renderKpi(
            "✅",
            this._deploymentSuccess,
            i18n.t("dashboard_deployment_success"),
            "teal"
          )}
          ${this._renderKpi(
            "❌",
            this._deploymentFail,
            i18n.t("dashboard_deployment_fail"),
            "purple"
          )}
        </div>

        <!-- Deployment Charts -->
        <div class="charts-grid" style="margin-top: 16px;">
          ${this._renderDeploymentChart(
            i18n.t("dashboard_deployment_by_firmware"),
            "💾",
            this._deploymentByFirmware,
            this._expandedDeployFirmware,
            () => (this._expandedDeployFirmware = !this._expandedDeployFirmware)
          )}
          ${this._renderDeploymentChart(
            i18n.t("dashboard_deployment_by_hardware"),
            "🔧",
            this._deploymentByModel,
            this._expandedDeployModel,
            () => (this._expandedDeployModel = !this._expandedDeployModel)
          )}
        </div>
      </div>

      <p class="refresh-hint">
        ${i18n.t("dashboard_last_refresh")} ${now}
        <button
          class="btn btn-secondary"
          style="margin-left:8px;padding:4px 10px;font-size:12px;"
          @click=${this._loadData}
        >
          ↻ ${i18n.t("dashboard_refresh")}
        </button>
      </p>
    `;
  }
}
