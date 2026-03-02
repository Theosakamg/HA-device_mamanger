/**
 * API client for hierarchy tree operations.
 */
import type { HierarchyTree } from "../types/device";
import { BaseClient } from "./base-client";

export class HierarchyClient extends BaseClient {
  /** Get the full hierarchy tree (homes → levels → rooms with device counts). */
  async getTree(): Promise<HierarchyTree> {
    return this.get<HierarchyTree>("/hierarchy");
  }

  /** Get a subtree for a specific home. */
  async getHomeTree(homeId: number): Promise<HierarchyTree> {
    return this.get<HierarchyTree>(`/homes/${homeId}/tree`);
  }
}
