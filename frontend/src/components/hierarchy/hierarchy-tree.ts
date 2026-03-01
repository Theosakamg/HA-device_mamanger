/**
 * Hierarchy tree component - collapsible tree of Home > Level > Room.
 */
import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { sharedStyles } from "../../styles/shared-styles";
import { i18n, localized } from "../../i18n";
import type { HierarchyTree, HierarchyNode } from "../../types/device";
import { HomeClient } from "../../api/home-client";
import { LevelClient } from "../../api/level-client";
import { RoomClient } from "../../api/room-client";
import { toSlug } from "../../utils/slug";
import "../shared/confirm-dialog";

@localized
@customElement("dm-hierarchy-tree")
export class DmHierarchyTreeComponent extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
      }
      .tree-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .tree-header h3 {
        margin: 0;
        font-size: 16px;
      }
      .tree-node {
        cursor: pointer;
        padding: 6px 8px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        transition: background 0.15s;
      }
      .tree-node:hover {
        background: rgba(0, 0, 0, 0.04);
      }
      .tree-node.selected {
        background: rgba(3, 169, 244, 0.1);
        color: var(--dm-primary);
        font-weight: 500;
      }
      .tree-children {
        padding-left: 20px;
      }
      .toggle {
        width: 16px;
        text-align: center;
        font-size: 10px;
        color: var(--dm-text-secondary);
      }
      .node-name {
        flex: 1;
      }
      .node-actions {
        display: flex;
        gap: 2px;
      }
      .node-actions button {
        padding: 2px 4px;
        font-size: 11px;
      }
      .inline-form {
        display: flex;
        gap: 4px;
        padding: 4px 8px;
        align-items: center;
      }
      .inline-form input {
        padding: 4px 8px;
        font-size: 13px;
        border: 1px solid var(--dm-border);
        border-radius: 4px;
        flex: 1;
      }
    `,
  ];

  @property({ type: Object }) tree: HierarchyTree | null = null;
  @property({ type: Object }) selectedNode: HierarchyNode | null = null;

  @state() private _expandedNodes: Set<string> = new Set();
  @state() private _addingTo: string | null = null;
  @state() private _newName = "";
  @state() private _confirmOpen = false;
  @state() private _pendingDeleteType: string | null = null;
  @state() private _pendingDeleteId: number | null = null;

  private static readonly _STORAGE_KEY = "dm_tree_expanded";

  private _homeClient = new HomeClient();
  private _levelClient = new LevelClient();
  private _roomClient = new RoomClient();

  connectedCallback() {
    super.connectedCallback();
    this._restoreExpandedState();
  }

  /** Restore expanded nodes from sessionStorage. */
  private _restoreExpandedState() {
    try {
      const raw = sessionStorage.getItem(DmHierarchyTreeComponent._STORAGE_KEY);
      if (raw) {
        const arr: string[] = JSON.parse(raw);
        if (Array.isArray(arr)) {
          this._expandedNodes = new Set(arr);
        }
      }
    } catch {
      // Ignore corrupt data
    }
  }

  /** Persist expanded nodes to sessionStorage. */
  private _saveExpandedState() {
    try {
      sessionStorage.setItem(
        DmHierarchyTreeComponent._STORAGE_KEY,
        JSON.stringify([...this._expandedNodes])
      );
    } catch {
      // Storage full or unavailable
    }
  }

  render() {
    return html`
      <div class="tree-header">
        <h3>${i18n.t("hierarchy_title")}</h3>
        <button
          class="btn btn-primary"
          style="padding: 4px 10px; font-size: 12px;"
          @click=${() => this._startAdd("home", 0)}
        >
          + ${i18n.t("home")}
        </button>
      </div>

      ${this._addingTo === "home:0" ? this._renderInlineAdd("home") : nothing}
      ${this.tree?.homes.map((home) => this._renderHomeNode(home)) ?? nothing}

      <dm-confirm-dialog
        .open=${this._confirmOpen}
        .message=${i18n.t("confirm_delete")}
        .cascade=${true}
        @dialog-confirm=${this._onConfirmDelete}
        @dialog-cancel=${this._onCancelDelete}
      ></dm-confirm-dialog>
    `;
  }

  private _renderHomeNode(home: HierarchyNode) {
    const key = `home:${home.id}`;
    const expanded = this._expandedNodes.has(key);
    const selected =
      this.selectedNode?.type === "home" && this.selectedNode?.id === home.id;

    return html`
      <div>
        <div
          class="tree-node ${selected ? "selected" : ""}"
          @click=${() => this._selectNode(home)}
        >
          <span
            class="toggle"
            @click=${(e: Event) => {
              e.stopPropagation();
              this._toggleExpand(key);
            }}
          >
            ${home.children.length > 0 ? (expanded ? "▼" : "▶") : "·"}
          </span>
          <span class="node-name">🏠 ${home.name}</span>
          <span class="badge">${home.deviceCount}</span>
          <span class="node-actions">
            <button
              class="btn-icon"
              title="${i18n.t("add_level")}"
              @click=${(e: Event) => {
                e.stopPropagation();
                this._startAdd("level", home.id);
              }}
            >
              +
            </button>
            <button
              class="btn-icon"
              title="${i18n.t("delete_home")}"
              @click=${(e: Event) => {
                e.stopPropagation();
                this._requestDelete("home", home.id);
              }}
            >
              🗑
            </button>
          </span>
        </div>
        ${this._addingTo === `level:${home.id}`
          ? this._renderInlineAdd("level")
          : nothing}
        ${expanded
          ? html`<div class="tree-children">
              ${home.children.map((lvl) => this._renderLevelNode(lvl, home.id))}
            </div>`
          : nothing}
      </div>
    `;
  }

  private _renderLevelNode(level: HierarchyNode, _homeId: number) {
    const key = `level:${level.id}`;
    const expanded = this._expandedNodes.has(key);
    const selected =
      this.selectedNode?.type === "level" && this.selectedNode?.id === level.id;

    return html`
      <div>
        <div
          class="tree-node ${selected ? "selected" : ""}"
          @click=${() => this._selectNode(level)}
        >
          <span
            class="toggle"
            @click=${(e: Event) => {
              e.stopPropagation();
              this._toggleExpand(key);
            }}
          >
            ${level.children.length > 0 ? (expanded ? "▼" : "▶") : "·"}
          </span>
          <span class="node-name">🏢 ${level.name}</span>
          <span class="badge">${level.deviceCount}</span>
          <span class="node-actions">
            <button
              class="btn-icon"
              title="${i18n.t("add_room")}"
              @click=${(e: Event) => {
                e.stopPropagation();
                this._startAdd("room", level.id);
              }}
            >
              +
            </button>
            <button
              class="btn-icon"
              title="${i18n.t("delete_level")}"
              @click=${(e: Event) => {
                e.stopPropagation();
                this._requestDelete("level", level.id);
              }}
            >
              🗑
            </button>
          </span>
        </div>
        ${this._addingTo === `room:${level.id}`
          ? this._renderInlineAdd("room")
          : nothing}
        ${expanded
          ? html`<div class="tree-children">
              ${level.children.map((room) => this._renderRoomNode(room))}
            </div>`
          : nothing}
      </div>
    `;
  }

  private _renderRoomNode(room: HierarchyNode) {
    const selected =
      this.selectedNode?.type === "room" && this.selectedNode?.id === room.id;

    return html`
      <div
        class="tree-node ${selected ? "selected" : ""}"
        @click=${() => this._selectNode(room)}
      >
        <span class="toggle">·</span>
        <span class="node-name">🚪 ${room.name}</span>
        <span class="badge">${room.deviceCount}</span>
        <span class="node-actions">
          <button
            class="btn-icon"
            title="${i18n.t("delete_room")}"
            @click=${(e: Event) => {
              e.stopPropagation();
              this._requestDelete("room", room.id);
            }}
          >
            🗑
          </button>
        </span>
      </div>
    `;
  }

  private _renderInlineAdd(type: string) {
    return html`
      <div class="inline-form">
        <input
          type="text"
          placeholder="${i18n.t("name")}"
          .value=${this._newName}
          @input=${(e: Event) => {
            this._newName = (e.target as HTMLInputElement).value;
          }}
          @keyup=${(e: KeyboardEvent) => {
            if (e.key === "Enter") this._confirmAdd(type);
            if (e.key === "Escape") this._cancelAdd();
          }}
        />
        <button
          class="btn btn-primary"
          style="padding: 4px 8px; font-size: 12px;"
          @click=${() => this._confirmAdd(type)}
        >
          ✓
        </button>
        <button
          class="btn btn-secondary"
          style="padding: 4px 8px; font-size: 12px;"
          @click=${this._cancelAdd}
        >
          ✕
        </button>
      </div>
    `;
  }

  private _toggleExpand(key: string) {
    const nextSet = new Set(this._expandedNodes);
    if (nextSet.has(key)) nextSet.delete(key);
    else nextSet.add(key);
    this._expandedNodes = nextSet;
    this._saveExpandedState();
  }

  /**
   * Expand all ancestor nodes so that the given node is visible in the tree.
   * Called externally by hierarchy-view when a child is clicked in the detail panel.
   */
  public expandToNode(node: HierarchyNode) {
    if (!this.tree) return;
    const nextSet = new Set(this._expandedNodes);

    for (const home of this.tree.homes) {
      if (node.type === "home" && node.id === home.id) break;
      for (const level of home.children) {
        if (node.type === "level" && node.id === level.id) {
          nextSet.add(`home:${home.id}`);
          break;
        }
        for (const room of level.children) {
          if (node.type === "room" && node.id === room.id) {
            nextSet.add(`home:${home.id}`);
            nextSet.add(`level:${level.id}`);
            break;
          }
        }
      }
    }

    this._expandedNodes = nextSet;
    this._saveExpandedState();
  }

  private _selectNode(node: HierarchyNode) {
    this.dispatchEvent(
      new CustomEvent("node-selected", {
        detail: { node },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _startAdd(type: string, parentId: number) {
    this._addingTo = `${type}:${parentId}`;
    this._newName = "";
  }

  private _cancelAdd() {
    this._addingTo = null;
    this._newName = "";
  }

  private async _confirmAdd(type: string) {
    if (!this._newName.trim()) return;
    const slug = toSlug(this._newName);
    const parentId = parseInt(this._addingTo?.split(":")[1] ?? "0", 10);
    try {
      if (type === "home") {
        await this._homeClient.create({ name: this._newName, slug });
      } else if (type === "level") {
        await this._levelClient.create({
          name: this._newName,
          slug,
          homeId: parentId,
        });
      } else if (type === "room") {
        await this._roomClient.create({
          name: this._newName,
          slug,
          levelId: parentId,
        });
      }
      this._cancelAdd();
      this.dispatchEvent(
        new CustomEvent("tree-changed", { bubbles: true, composed: true })
      );
    } catch (err) {
      console.error(`Failed to create ${type}:`, err);
    }
  }

  private _requestDelete(type: string, id: number) {
    this._pendingDeleteType = type;
    this._pendingDeleteId = id;
    this._confirmOpen = true;
  }

  private async _onConfirmDelete() {
    this._confirmOpen = false;
    const type = this._pendingDeleteType;
    const id = this._pendingDeleteId;
    this._pendingDeleteType = null;
    this._pendingDeleteId = null;
    if (!type || id == null) return;
    try {
      if (type === "home") await this._homeClient.remove(id);
      else if (type === "level") await this._levelClient.remove(id);
      else if (type === "room") await this._roomClient.remove(id);
      this.dispatchEvent(
        new CustomEvent("tree-changed", { bubbles: true, composed: true })
      );
    } catch (err) {
      console.error(`Failed to delete ${type}:`, err);
    }
  }

  private _onCancelDelete() {
    this._confirmOpen = false;
    this._pendingDeleteType = null;
    this._pendingDeleteId = null;
  }
}
