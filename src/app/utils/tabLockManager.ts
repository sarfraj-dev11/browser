export class TabLockManager {
  private activeLocks: Set<string> = new Set();
  private sharedSessionCookies: Map<string, string> = new Map();

  constructor() {}

  public acquireTabLock(tabId: string): boolean {
    if (this.activeLocks.has(tabId)) {
      return false;
    }
    this.activeLocks.add(tabId);
    return true;
  }

  public releaseTabLock(tabId: string) {
    this.activeLocks.delete(tabId);
  }

  public syncSessionCookie(domain: string, cookieHeader: string) {
    this.sharedSessionCookies.set(domain, cookieHeader);
  }

  public getSessionCookie(domain: string): string | undefined {
    return this.sharedSessionCookies.get(domain);
  }
}

export const globalTabLockManager = new TabLockManager();
