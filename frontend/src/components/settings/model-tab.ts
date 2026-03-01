/**
 * Model tab - CRUD management for device models.
 */
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { sharedStyles } from '../../styles/shared-styles';
import { i18n, localized } from '../../i18n';
import { DeviceModelClient } from '../../api/device-model-client';
import type { DmDeviceModel } from '../../types/index';
import type { CrudConfig } from '../shared/crud-table';
import '../shared/crud-table';

@localized
@customElement('dm-model-tab')
export class DmModelTab extends LitElement {
  static styles = [sharedStyles];

  @state() private _items: DmDeviceModel[] = [];
  @state() private _loading = true;

  private _client = new DeviceModelClient();

  private get _config(): CrudConfig {
    return {
      entityName: i18n.t('tab_models'),
      filterDevicesKey: 'name',
      columns: [
        { key: 'name', label: i18n.t('model_name'), type: 'text', editable: true },
        { key: 'template', label: i18n.t('model_template'), type: 'text', editable: true },
        { key: 'enabled', label: i18n.t('enabled'), type: 'boolean', editable: true },
      ],
    };
  }

  async connectedCallback() {
    super.connectedCallback();
    await this._load();
  }

  private async _load() {
    this._loading = true;
    try {
      this._items = await this._client.getAll();
    } catch (err) {
      console.error('Failed to load models:', err);
    }
    this._loading = false;
  }

  render() {
    return html`
      <dm-crud-table
        .items=${this._items}
        .config=${this._config}
        .loading=${this._loading}
        @crud-save=${this._onSave}
        @crud-delete=${this._onDelete}
      ></dm-crud-table>
    `;
  }

  private async _onSave(e: CustomEvent) {
    const { isEdit, id, data } = e.detail;
    try {
      if (isEdit) {
        await this._client.update(id, data);
      } else {
        await this._client.create(data);
      }
      await this._load();
    } catch (err) {
      console.error('Failed to save model:', err);
    }
  }

  private async _onDelete(e: CustomEvent) {
    try {
      await this._client.remove(e.detail.id);
      await this._load();
    } catch (err) {
      console.error('Failed to delete model:', err);
    }
  }
}
