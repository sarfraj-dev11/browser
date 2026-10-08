export class TabReclamator {
  private tabActivityMap: Map<string, number> = new Map();
  private frozenThresholdMs = 30000; // 30 seconds

  constructor() {}

  public recordTabActivity(tabId: string) {
    this.tabActivityMap.set(tabId, Date.now());
  }

  public isTabFrozen(tabId: string): boolean {
    const lastActive = this.tabActivityMap.get(tabId);
    if (!lastActive) return false;
    return Date.now() - lastActive > this.frozenThresholdMs;
  }
}

export const globalTabReclamator = new TabReclamator();
