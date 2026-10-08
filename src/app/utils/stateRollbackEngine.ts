export class StateRollbackEngine {
  private historyStack: string[] = [];

  constructor() {}

  public recordPageNavigation(url: string) {
    if (url && url !== "about:blank") {
      this.historyStack.push(url);
    }
  }

  public canRollback(): boolean {
    return this.historyStack.length > 1;
  }

  public getPreviousUrl(): string | null {
    if (this.historyStack.length > 1) {
      this.historyStack.pop(); // Remove current failing URL
      return this.historyStack[this.historyStack.length - 1]; // Return previous valid URL
    }
    return null;
  }
}

export const globalStateRollbackEngine = new StateRollbackEngine();
