import { ApiManager } from "./ApiManager.js";

let singleton: ApiManager | null = null;

export function getApiManager(): ApiManager {
  if (!singleton) {
    singleton = new ApiManager();
  }
  return singleton;
}

export function setApiManager(manager: ApiManager): void {
  singleton = manager;
}
