export interface AgentStateSnapshot {
  timestamp: number;
  goal: string;
  stepsTaken: number;
  url: string;
  tasksList: string[];
  history: string[];
}

export class StateSnapshotEngine {
  private snapshotFile = ".agent_snapshot.json";

  constructor() {}

  /**
   * Save current execution state snapshot to disk (Electron node environment or localStorage fallback)
   */
  public saveSnapshot(snapshot: AgentStateSnapshot): boolean {
    try {
      if (typeof window !== "undefined" && window.require) {
        const fs = window.require("fs");
        const path = window.require("path");
        const os = window.require("os");
        const savePath = path.join(os.homedir(), ".gemini", "antigravity-ide", this.snapshotFile);
        fs.writeFileSync(savePath, JSON.stringify(snapshot, null, 2), "utf8");
        return true;
      } else if (typeof localStorage !== "undefined") {
        localStorage.setItem(this.snapshotFile, JSON.stringify(snapshot));
        return true;
      }
    } catch (err) {
      console.warn("Failed to save state snapshot:", err);
    }
    return false;
  }

  /**
   * Load previous state snapshot if available
   */
  public loadLatestSnapshot(): AgentStateSnapshot | null {
    try {
      if (typeof window !== "undefined" && window.require) {
        const fs = window.require("fs");
        const path = window.require("path");
        const os = window.require("os");
        const savePath = path.join(os.homedir(), ".gemini", "antigravity-ide", this.snapshotFile);
        if (fs.existsSync(savePath)) {
          const content = fs.readFileSync(savePath, "utf8");
          return JSON.parse(content);
        }
      } else if (typeof localStorage !== "undefined") {
        const item = localStorage.getItem(this.snapshotFile);
        if (item) return JSON.parse(item);
      }
    } catch (err) {
      console.warn("Failed to load state snapshot:", err);
    }
    return null;
  }

  /**
   * Clear snapshot after clean session finish
   */
  public clearSnapshot() {
    try {
      if (typeof window !== "undefined" && window.require) {
        const fs = window.require("fs");
        const path = window.require("path");
        const os = window.require("os");
        const savePath = path.join(os.homedir(), ".gemini", "antigravity-ide", this.snapshotFile);
        if (fs.existsSync(savePath)) {
          fs.unlinkSync(savePath);
        }
      } else if (typeof localStorage !== "undefined") {
        localStorage.removeItem(this.snapshotFile);
      }
    } catch (err) {}
  }
}

export const globalStateSnapshotEngine = new StateSnapshotEngine();
