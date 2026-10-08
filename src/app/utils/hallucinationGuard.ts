export interface HallucinationCheckResult {
  isValid: boolean;
  correctedIdx?: number;
  correctedAction?: string;
  warning?: string;
}

export class HallucinationGuard {
  constructor() {}

  /**
   * Validate model element index against live DOM tree size to prevent hallucinated invalid indices
   */
  public validateDecision(
    action: string,
    idx: number | undefined,
    maxDomIndex: number
  ): HallucinationCheckResult {
    if (action === "click" || action === "type") {
      if (typeof idx !== "number" || isNaN(idx)) {
        return {
          isValid: false,
          correctedAction: "scroll",
          warning: "Model specified click/type without a valid numeric element index. Defaulting to scroll."
        };
      }

      if (idx < 0 || idx > maxDomIndex) {
        const clampedIdx = Math.max(0, Math.min(idx, maxDomIndex));
        return {
          isValid: false,
          correctedIdx: clampedIdx,
          warning: `Hallucinated index ${idx} detected (Max available DOM index is ${maxDomIndex}). Auto-corrected index to ${clampedIdx}.`
        };
      }
    }

    return { isValid: true };
  }
}

export const globalHallucinationGuard = new HallucinationGuard();
