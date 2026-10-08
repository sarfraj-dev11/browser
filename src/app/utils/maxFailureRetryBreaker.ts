export class MaxFailureRetryBreaker {
  private failureMap: Map<string, number> = new Map();
  private maxRetries = 2; // Allow max 2 retries (total 3 attempts) before blacklisting

  constructor() {}

  public recordFailure(targetKey: string): { isBlacklisted: boolean; attempts: number } {
    const cleanKey = targetKey.trim().toLowerCase();
    const current = (this.failureMap.get(cleanKey) || 0) + 1;
    this.failureMap.set(cleanKey, current);

    return {
      isBlacklisted: current >= this.maxRetries + 1,
      attempts: current
    };
  }

  public isBlacklisted(targetKey: string): boolean {
    const cleanKey = targetKey.trim().toLowerCase();
    const attempts = this.failureMap.get(cleanKey) || 0;
    return attempts >= this.maxRetries + 1;
  }

  public getBlacklistedTargets(): string[] {
    const list: string[] = [];
    this.failureMap.forEach((attempts, key) => {
      if (attempts >= this.maxRetries + 1) {
        list.push(key);
      }
    });
    return list;
  }

  public getCircuitBreakerPromptDirective(): string {
    const blacklisted = this.getBlacklistedTargets();
    if (blacklisted.length === 0) return "";

    return `\n🛑 **CIRCUIT BREAKER ACTIVATED**: The following targets have failed 3 times and are PERMANENTLY BLACKLISTED for this session: [${blacklisted.join(", ")}]. You are STRICTLY FORBIDDEN from selecting these targets again. Select a completely different action (scroll, search alternate terms, navigate to home, or try keypress shortcuts).`;
  }

  public clear() {
    this.failureMap.clear();
  }
}

export const globalMaxFailureRetryBreaker = new MaxFailureRetryBreaker();
