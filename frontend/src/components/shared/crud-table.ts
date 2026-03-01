/**
 * Generic CRUD table component with inline editing and column sorting.
 */
import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { sharedStyles } from "../../styles/shared-styles";
import { i18n, localized } from "../../i18n";
import {
  SortState,
  toggleSort,
  sortIndicator,
  sortItems,
} from "../../utils/sorting";
import "./confirm-dialog";

export interface CrudColumn {
  key: string;
  label: string;
  type?: "text" | "boolean" | "number";
  editable?: boolean;
  sortable?: boolean;
}

export interface CrudConfig {
  columns: CrudColumn[];
  entityName: string;
  /** Column key whose value is used for the "filter devices" action button. */
  filterDevicesKey?: string;
  /** Custom empty-state message (i18n key or literal). Falls back to 'no_items'. */
  emptyMessage?: string;
}

@localized
@customElement("dm-crud-table")
export class DmCrudTable extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
      }
      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .toolbar h3 {
        margin: 0;
      }
      .enabled-cell {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .btn-filter {
        opacity: 0.5;
        transition: opacity 0.15s;
      }
      .btn-filter:hover {
        opacity: 1;
      }
      th.sortable {
        cursor: pointer;
        user-select: none;
        white-space: nowrap;
      }
      th.sortable:hover {
        background: rgba(0, 0, 0, 0.04);
      }
      .sort-indicator {
        display: inline-block;
        margin-left: 4px;
        font-size: 10px;
        opacity: 0.4;
      }
      th.sortable.sort-active .sort-indicator {
        opacity: 1;
      }
    `,
  ];

  @property({ type: Array }) items: Record<string, unknown>[] = [];
  @property({ type: Object }) config!: CrudConfig;
  @property({ type: Boolean }) loading = false;

  @state() private _showForm = false;
  @state() private _editingItem: Record<string, unknown> | null = null;
  @state() private _formData: Record<string, unknown> = {};
  @state() private _sort: SortState = { key: null, dir: null };
  @state() private _confirmOpen = false;
  @state() private _pendingDeleteItem: Record<string, unknown> | null = null;

  /** Return items sorted according to current sort state. */
  private get _sortedItems(): Record<string, unknown>[] {
    return sortItems(this.items, this._sort);
  }

  /** Toggle sort on a column key. */
  private _toggleSort(key: string) {
    this._sort = toggleSort(this._sort, key);
  }

  /** Render sort indicator arrow for a column. */
  private _sortIndicator(key: string) {
    return sortIndicator(this._sort, key);
  }

  render() {
    return html`
      <div class="toolbar">
        <h3>${this.config?.entityName ?? ""}</h3>
        <button class="btn btn-primary" @click=${this._openCreate}>
          + ${i18n.t("add")}
        </button>
      </div>

      ${this.loading
        ? html`<div class="loading">${i18n.t("loading")}</div>`
        : nothing}
      ${!this.loading && this.items.length === 0
        ? html`<div class="empty-state">
            ${this.config?.emptyMessage
              ? i18n.t(this.config.emptyMessage)
              : i18n.t("no_items")}
          </div>`
        : nothing}
      ${!this.loading && this.items.length > 0
        ? html`
            <table>
              <thead>
                <tr>
                  <th
                    class="sortable ${this._sort.key === "id"
                      ? "sort-active"
                      : ""}"
                    @click=${() => this._toggleSort("id")}
                  >
                    ${i18n.t("id")}<span class="sort-indicator"
                      >${this._sortIndicator("id")}</span
                    >
                  </th>
                  ${this.config.columns.map(
                    (col) =>
                      html` <th
                        class="sortable ${this._sort.key === col.key
                          ? "sort-active"
                          : ""}"
                        @click=${() => this._toggleSort(col.key)}
                      >
                        ${col.label}<span class="sort-indicator"
                          >${this._sortIndicator(col.key)}</span
                        >
                      </th>`
                  )}
                  <th>${i18n.t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                ${this._sortedItems.map(
                  (item) => html`
                    <tr>
                      <td>${item.id}</td>
                      ${this.config.columns.map(
                        (col) => html`
                          <td>
                            ${col.type === "boolean"
                              ? html`<span
                                    class="status-dot ${item[col.key]
                                      ? "status-enabled"
                                      : "status-disabled"}"
                                  ></span
                                  >${item[col.key]
                                    ? i18n.t("enabled")
                                    : i18n.t("disabled")}`
                              : (item[col.key] ?? "")}
                          </td>
                        `
                      )}
                      <td>
                        ${this.config.filterDevicesKey
                          ? html`<button
                              class="btn-icon btn-filter"
                              title="${i18n.t("filter_devices")}"
                              aria-label="${i18n.t("filter_devices")}"
                              @click=${() => this._filterDevices(item)}
                            >
                              🔍
                            </button>`
                          : nothing}
                        <button
                          class="btn-icon"
                          title="${i18n.t("edit")}"
                          aria-label="${i18n.t("edit")}"
                          @click=${() => this._openEdit(item)}
                        >
                          ✏️
                        </button>
                        <button
                          class="btn-icon"
                          title="${i18n.t("delete")}"
                          aria-label="${i18n.t("delete")}"
                          @click=${() => this._requestDelete(item)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  `
                )}
              </tbody>
            </table>
          `
        : nothing}
      <dm-confirm-dialog
        .open=${this._confirmOpen}
        .message=${i18n.t("confirm_delete")}
        @dialog-confirm=${this._onConfirmDelete}
        @dialog-cancel=${this._onCancelDelete}
      ></dm-confirm-dialog>

      ${this._showForm ? this._renderForm() : nothing}
    `;
  }

  private _renderForm() {
    const isEdit = this._editingItem !== null;
    return html`
      <div class="modal-overlay" @click=${this._closeForm}>
        <div class="modal" @click=${(e: Event) => e.stopPropagation()}>
          <div class="modal-header">
            <h2>
              ${isEdit ? i18n.t("edit") : i18n.t("add")}
              ${this.config.entityName}
            </h2>
            <button
              class="btn-icon"
              aria-label="${i18n.t("close") || "Close"}"
              @click=${this._closeForm}
            >
              ✕
            </button>
          </div>
          ${this.config.columns
            .filter((col) => col.editable !== false)
            .map(
              (col) => html`
                <div class="form-group">
                  <label>${col.label}</label>
                  ${col.type === "boolean"
                    ? html`
                        <select
                          @change=${(e: Event) =>
                            this._updateForm(
                              col.key,
                              (e.target as HTMLSelectElement).value === "true"
                            )}
                        >
                          <option
                            value="true"
                            ?selected=${Boolean(this._formData[col.key])}
                          >
                            ${i18n.t("enabled")}
                          </option>
                          <option
                            value="false"
                            ?selected=${!this._formData[col.key]}
                          >
                            ${i18n.t("disabled")}
                          </option>
                        </select>
                      `
                    : html`
                        <input
                          type="${col.type === "number" ? "number" : "text"}"
                          .value=${String(this._formData[col.key] ?? "")}
                          @input=${(e: Event) => {
                            const raw = (e.target as HTMLInputElement).value;
                            if (col.type === "number") {
                              const num = Number(raw);
                              this._updateForm(
                                col.key,
                                raw === "" ? null : Number.isNaN(num) ? raw : num
                              );
                            } else {
                              this._updateForm(col.key, raw);
                            }
                          }}
                        />
                      `}
                </div>
              `
            )}
          <div class="modal-actions">
            <button class="btn btn-secondary" @click=${this._closeForm}>
              ${i18n.t("cancel")}
            </button>
            <button class="btn btn-primary" @click=${this._submitForm}>
              ${i18n.t("save")}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private _openCreate() {
    this._editingItem = null;
    this._formData = {};
    this.config.columns.forEach((col) => {
      if (col.type === "boolean") this._formData[col.key] = true;
      else this._formData[col.key] = "";
    });
    this._showForm = true;
  }

  private _openEdit(item: Record<string, unknown>) {
    this._editingItem = item;
    this._formData = { ...item };
    this._showForm = true;
  }

  private _closeForm() {
    this._showForm = false;
    this._editingItem = null;
  }

  private _updateForm(key: string, value: unknown) {
    this._formData = { ...this._formData, [key]: value };
  }

  private _submitForm() {
    const detail = {
      isEdit: this._editingItem !== null,
      id: this._editingItem?.id,
      data: { ...this._formData },
    };
    this.dispatchEvent(
      new CustomEvent("crud-save", { detail, bubbles: true, composed: true })
    );
    this._closeForm();
  }

  private _requestDelete(item: Record<string, unknown>) {
    this._pendingDeleteItem = item;
    this._confirmOpen = true;
  }

  private _onConfirmDelete() {
    this._confirmOpen = false;
    if (!this._pendingDeleteItem) return;
    this.dispatchEvent(
      new CustomEvent("crud-delete", {
        detail: { id: this._pendingDeleteItem.id },
        bubbles: true,
        composed: true,
      })
    );
    this._pendingDeleteItem = null;
  }

  private _onCancelDelete() {
    this._confirmOpen = false;
    this._pendingDeleteItem = null;
  }

  /** Navigate to devices view filtered by this item's name. */
  private _filterDevices(item: Record<string, unknown>) {
    const key = this.config.filterDevicesKey;
    if (!key) return;
    const value = String(item[key] ?? "");
    this.dispatchEvent(
      new CustomEvent("crud-filter", {
        detail: { value },
        bubbles: true,
        composed: true,
      })
    );
  }
}
