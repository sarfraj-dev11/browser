export interface DecisionConfidenceReport {
  score: number; // 0 to 100
  isHighConfidence: boolean;
  notes: string;
}

export class ConfidenceEvaluator {
  constructor() {}

  /**
   * Evaluate confidence score for an AI model action decision
   */
  public evaluateConfidence(
    action: string,
    thought: string,
    idx?: number,
    isDeduplicated?: boolean
  ): DecisionConfidenceReport {
    let score = 95;
    const notes: string[] = [];

    if (thought.length < 15) {
      score -= 20;
      notes.push("Thought reasoning is unusually brief.");
    }

    if ((action === "click" || action === "type") && typeof idx !== "number") {
      score -= 30;
      notes.push("Missing target element index.");
    }

    if (isDeduplicated) {
      score -= 25;
      notes.push("Action matches previously completed deduplicated target.");
    }

    const clampedScore = Math.max(0, Math.min(100, score));

    return {
      score: clampedScore,
      isHighConfidence: clampedScore >= 70,
      notes: notes.length > 0 ? notes.join(" ") : "High-confidence decision validated."
    };
  }
}

export const globalConfidenceEvaluator = new ConfidenceEvaluator();
