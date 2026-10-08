export class PredictiveFetcher {
  private cache: Map<string, any> = new Map();

  constructor() {}

  /**
   * Pre-fetch target URL metadata asynchronously to speed up step execution latency
   */
  public prefetchUrl(url: string) {
    if (!url || !url.startsWith("http") || this.cache.has(url)) return;

    try {
      fetch(url, { method: "HEAD" })
        .then((res) => {
          this.cache.set(url, { status: res.status, ok: res.ok, timestamp: Date.now() });
        })
        .catch(() => {});
    } catch (e) {}
  }

  public getCachedUrlStatus(url: string) {
    return this.cache.get(url);
  }
}

export const globalPredictiveFetcher = new PredictiveFetcher();
