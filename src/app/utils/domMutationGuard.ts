export class DOMMutationGuard {
  private lastMutationTime = Date.now();
  private settlementThresholdMs = 300;

  constructor() {}

  /**
   * Record a DOM mutation event time
   */
  public notifyDOMMutation() {
    this.lastMutationTime = Date.now();
  }

  /**
   * Check if DOM tree has settled (no active re-renders or hydration mutations for 300ms)
   */
  public async waitForDOMSettlement(): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < 1500) {
      const timeSinceLastMutation = Date.now() - this.lastMutationTime;
      if (timeSinceLastMutation >= this.settlementThresholdMs) {
        return true;
      }
      await new Promise((res) => setTimeout(res, 100));
    }
    return false;
  }
}

export const globalDOMMutationGuard = new DOMMutationGuard();
