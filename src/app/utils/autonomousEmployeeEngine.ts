export interface EmployeePhaseSummary {
  phaseNumber: number;
  completedTasks: string[];
  nextTasks: string[];
  summary: string;
}

export class AutonomousEmployeeEngine {
  private phaseCount = 1;
  private startTime = Date.now();
  private maxDurationMs = 6 * 60 * 60 * 1000; // 6 Hours max safety threshold
  private phaseHistory: EmployeePhaseSummary[] = [];

  constructor() {}

  /**
   * Check if continuous employee mode is active and within time threshold
   */
  public isWithinEmployeeShift(): boolean {
    const elapsed = Date.now() - this.startTime;
    return elapsed < this.maxDurationMs;
  }

  /**
   * Get current phase number
   */
  public getPhaseNumber(): number {
    return this.phaseCount;
  }

  /**
   * Advance to next continuous iteration phase
   */
  public advanceNextPhase(currentGoal: string, completedSummary: string): {
    phaseNumber: number;
    nextPrompt: string;
    logNotice: string;
  } {
    this.phaseCount++;
    
    this.phaseHistory.push({
      phaseNumber: this.phaseCount - 1,
      completedTasks: [currentGoal],
      nextTasks: ["Analyze previous performance", "Audit edge cases", "Execute next optimization phase"],
      summary: completedSummary.slice(0, 150)
    });

    const elapsedMins = Math.round((Date.now() - this.startTime) / 60000);

    const logNotice = `\n\n💼 **AUTONOMOUS EMPLOYEE MODE ACTIVE** (Shift Elapsed: ${elapsedMins} mins)\n* Phase ${this.phaseCount - 1} completed successfully.\n* Analyzing previous plan execution outcomes & auto-generating Phase ${this.phaseCount} master objectives...`;

    const nextPrompt = `Continuous Phase ${this.phaseCount} for goal: "${currentGoal}". Review previous phase execution results, perform self-audit, and execute next high-priority optimizations.`;

    return {
      phaseNumber: this.phaseCount,
      nextPrompt,
      logNotice
    };
  }
}
