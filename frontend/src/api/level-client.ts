/**
 * API client for DmLevel CRUD operations.
 */
import type { DmLevel } from "../types/level";
import { CrudClient } from "./crud-client";

export class LevelClient extends CrudClient<DmLevel> {
  constructor() {
    super("/levels");
  }

  /** Get all levels, optionally filtered by home. */
  override async getAll(homeId?: number | string): Promise<DmLevel[]> {
    const query =
      homeId !== undefined && homeId !== "" ? `?home_id=${homeId}` : "";
    return super.getAll(query);
  }
}
