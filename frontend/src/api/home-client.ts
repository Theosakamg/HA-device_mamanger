/**
 * API client for DmHome CRUD operations.
 */
import type { DmHome } from "../types/home";
import { CrudClient } from "./crud-client";

export class HomeClient extends CrudClient<DmHome> {
  constructor() {
    super("/homes");
  }
}
