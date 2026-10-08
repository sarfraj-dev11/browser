export interface StepMemoryEntry {
  stepNumber: number;
  timestamp: number;
  actionType: "search" | "navigate" | "click" | "type" | "scroll" | "question" | "verify" | "open_tab";
  target: string;
  resultSummary: string;
  status: "success" | "failed" | "pending";
  errorDetails?: string;
}

export class ExecutionMemoryManager {
  private memoryLog: StepMemoryEntry[] = [];
  private visitedUrls: Set<string> = new Set();
  private searchedQueries: Set<string> = new Set();
  private completedTargets: Set<string> = new Set();
  private failedTargets: Map<string, number> = new Map();

  constructor() {}

  private normalizeTarget(target: string): string {
    let clean = target.trim().toLowerCase().replace(/\s+/g, " ");
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      try {
        const parsed = new URL(clean);
        return `${parsed.origin}${parsed.pathname.replace(/\/$/, "")}${parsed.search}`;
      } catch (e) {
        return clean.replace(/\/$/, "");
      }
    }
    return clean;
  }

  /**
   * Record a completed action step into memory
   */
  public recordStep(entry: Omit<StepMemoryEntry, "timestamp">) {
    const fullEntry: StepMemoryEntry = {
      ...entry,
      timestamp: Date.now()
    };
    this.memoryLog.push(fullEntry);

    const cleanTarget = this.normalizeTarget(entry.target);

    if (entry.status === "success") {
      this.completedTargets.add(`${entry.actionType}:${cleanTarget}`);
      this.failedTargets.delete(`${entry.actionType}:${cleanTarget}`);

      if (entry.actionType === "navigate" || entry.actionType === "search" || entry.actionType === "open_tab") {
        if (cleanTarget.startsWith("http")) {
          this.visitedUrls.add(cleanTarget);
        } else {
          this.searchedQueries.add(cleanTarget);
        }
      }
    } else if (entry.status === "failed") {
      const currentFails = this.failedTargets.get(`${entry.actionType}:${cleanTarget}`) || 0;
      this.failedTargets.set(`${entry.actionType}:${cleanTarget}`, currentFails + 1);
    }
  }

  /**
   * Check if a specific target (URL, search query, or button click) has already been successfully done
   */
  public isAlreadyCompleted(actionType: string, target: string): boolean {
    const cleanTarget = this.normalizeTarget(target);
    const key = `${actionType}:${cleanTarget}`;
    return this.completedTargets.has(key) || this.visitedUrls.has(cleanTarget) || this.searchedQueries.has(cleanTarget);
  }

  /**
   * Determine if the agent should re-check or re-execute a target.
   * Returns false if already completed and NO error occurred.
   * Returns true ONLY if an error occurred or target has not been attempted yet.
   */
  public shouldRecheck(actionType: string, target: string, hasErrorOnCurrentPage: boolean = false): boolean {
    const cleanTarget = this.normalizeTarget(target);
    const key = `${actionType}:${cleanTarget}`;

    // If an error occurred on the current page, re-checking is allowed for remediation
    if (hasErrorOnCurrentPage) {
      return true;
    }

    // If target failed previously, we may re-check to fix it
    if (this.failedTargets.has(key)) {
      return true;
    }

    // If already completed successfully, DO NOT re-check!
    if (this.completedTargets.has(key) || this.visitedUrls.has(cleanTarget) || this.searchedQueries.has(cleanTarget)) {
      return false;
    }

    return true;
  }

  /**
   * Generate structured prompt instructions detailing what has already been done, searched, and verified
   * so the AI model never repeats unnecessary steps.
   */
  public getMemoryPromptContext(): string {
    if (this.memoryLog.length === 0) {
      return "EXECUTION MEMORY: No previous actions recorded in this session.";
    }

    let summary = "### 🧠 EXECUTION STATE & DEDUPLICATION MEMORY:\n";

    if (this.searchedQueries.size > 0) {
      summary += `\n🔍 **Queries Searched**: ${Array.from(this.searchedQueries).join(", ")}`;
    }

    if (this.visitedUrls.size > 0) {
      summary += `\n🌐 **Pages/URLs Visited**: ${Array.from(this.visitedUrls).slice(-5).join(", ")}`;
    }

    if (this.completedTargets.size > 0) {
      summary += `\n✅ **Completed Verification Items**: ${Array.from(this.completedTargets).slice(-8).join("; ")}`;
    }

    summary += "\n\n🚫 **STRICT DEDUPLICATION RULE**: Do NOT repeat any of the completed actions or search queries listed above unless an explicit error occurred or new layout changes require it.";

    summary += "\n\n**Step-by-Step Execution Memory Audit**:";
    this.memoryLog.slice(-6).forEach((entry) => {
      const statusIcon = entry.status === "success" ? "✅" : entry.status === "failed" ? "❌" : "⏳";
      summary += `\n- Step ${entry.stepNumber} [${statusIcon} ${entry.actionType.toUpperCase()}]: ${entry.target} -> Output: "${entry.resultSummary}"`;
    });

    return summary;
  }

  /**
   * Reset or clear execution memory
   */
  public clear() {
    this.memoryLog = [];
    this.visitedUrls.clear();
    this.searchedQueries.clear();
    this.completedTargets.clear();
    this.failedTargets.clear();
  }
}
