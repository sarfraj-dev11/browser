export class AdaptiveRateLimiter {
  private currentDelayMs = 300;

  constructor() {}

  public getRecommendedDelay(stepDurationMs: number): number {
    if (stepDurationMs > 2000) {
      // Host or site is slow, increase delay to prevent rate limits
      this.currentDelayMs = Math.min(1200, this.currentDelayMs + 200);
    } else if (stepDurationMs < 500 && this.currentDelayMs > 200) {
      // Site is responding quickly, decrease delay for speed boost
      this.currentDelayMs = Math.max(200, this.currentDelayMs - 50);
    }
    return this.currentDelayMs;
  }
}

export const globalAdaptiveRateLimiter = new AdaptiveRateLimiter();
