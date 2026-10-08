export interface NetworkAnomaly {
  url: string;
  status: number;
  durationMs: number;
  type: "slow" | "error" | "cors";
  timestamp: number;
}

export class NetworkMonitor {
  private anomalies: NetworkAnomaly[] = [];
  private slowThresholdMs = 500;

  constructor() {}

  public recordRequest(url: string, status: number, durationMs: number) {
    if (status >= 400) {
      this.anomalies.push({
        url,
        status,
        durationMs,
        type: "error",
        timestamp: Date.now()
      });
    } else if (durationMs > this.slowThresholdMs) {
      this.anomalies.push({
        url,
        status,
        durationMs,
        type: "slow",
        timestamp: Date.now()
      });
    }
  }

  public getRecentAnomaliesSummary(): string {
    if (this.anomalies.length === 0) {
      return "";
    }
    const recent = this.anomalies.slice(-3);
    return `\n📡 **NETWORK DIAGNOSTICS**: Detected ${recent.length} recent anomalies:\n` +
      recent.map(a => `- [${a.type.toUpperCase()}] ${a.url.slice(0, 60)}... (${a.status ? `Status ${a.status}` : `${a.durationMs}ms`})`).join("\n");
  }

  public clear() {
    this.anomalies = [];
  }
}

export const globalNetworkMonitor = new NetworkMonitor();
