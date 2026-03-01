/**
 * Firmware tab - CRUD management for device firmwares.
 */
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { sharedStyles } from '../../styles/shared-styles';
import { i18n, localized } from '../../i18n';
import { DeviceFirmwareClient } from '../../api/device-firmware-client';
import type { DmDeviceFirmware } from '../../types/index';
import type { CrudConfig } from '../shared/crud-table';
import '../shared/crud-table';

@localized
@customElement('dm-firmware-tab')
export class DmFirmwareTab extends LitElement {
  static styles = [sharedStyles];

  @state() private _items: DmDeviceFirmware[] = [];
  @state() private _loading = true;

  private _client = new DeviceFirmwareClient();

  private get _config(): CrudConfig {
    return {
      entityName: i18n.t('tab_firmwares'),
      filterDevicesKey: 'name',
      columns: [
        { key: 'name', label: i18n.t('firmware_name'), type: 'text', editable: true },
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
      console.error('Failed to load firmwares:', err);
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
      console.error('Failed to save firmware:', err);
    }
  }

  private async _onDelete(e: CustomEvent) {
    try {
      await this._client.remove(e.detail.id);
      await this._load();
    } catch (err) {
      console.error('Failed to delete firmware:', err);
    }
  }
}
