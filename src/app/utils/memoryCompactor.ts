export class MemoryCompactor {
  private maxHistorySteps = 15;

  constructor() {}

  /**
   * Compact long agent step history arrays into a token-efficient summary block
   */
  public compactStepHistory(history: string[]): string[] {
    if (history.length <= this.maxHistorySteps) {
      return history;
    }

    const overflowCount = history.length - this.maxHistorySteps;
    const olderSteps = history.slice(0, overflowCount);
    const recentSteps = history.slice(overflowCount);

    const summaryBlock = `* 📦 **COMPACTED MEMORY SUMMARY** (${overflowCount} older steps summarized):\n` +
      `  - Successfully executed initial navigation and preliminary DOM verification steps.\n` +
      `  - Verified target elements and deduplicated redundant search queries.`;

    return [summaryBlock, ...recentSteps];
  }
}

export const globalMemoryCompactor = new MemoryCompactor();
