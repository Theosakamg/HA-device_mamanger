/**
 * API client for DmRoom CRUD operations.
 */
import type { DmRoom } from "../types/room";
import { CrudClient } from "./crud-client";

export class RoomClient extends CrudClient<DmRoom> {
  constructor() {
    super("/rooms");
  }

  /** Get all rooms, optionally filtered by level. */
  override async getAll(levelId?: number | string): Promise<DmRoom[]> {
    const query =
      levelId !== undefined && levelId !== ""
        ? `?level_id=${encodeURIComponent(String(levelId))}`
        : "";
    return super.getAll(query);
  }
}
