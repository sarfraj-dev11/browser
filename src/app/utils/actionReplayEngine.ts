export interface ReplayActionStep {
  step: number;
  action: string;
  target?: string;
  idx?: number;
  url?: string;
  timestamp: number;
}

export class ActionReplayEngine {
  private ledgerFile = ".agent_replay_ledger.json";
  private ledger: ReplayActionStep[] = [];

  constructor() {}

  public recordAction(step: ReplayActionStep) {
    this.ledger.push(step);
    try {
      if (typeof window !== "undefined" && window.require) {
        const fs = window.require("fs");
        const path = window.require("path");
        const os = window.require("os");
        const savePath = path.join(os.homedir(), ".gemini", "antigravity-ide", this.ledgerFile);
        fs.writeFileSync(savePath, JSON.stringify(this.ledger, null, 2), "utf8");
      }
    } catch (e) {}
  }

  public getLedger(): ReplayActionStep[] {
    return this.ledger;
  }
}

export const globalActionReplayEngine = new ActionReplayEngine();
