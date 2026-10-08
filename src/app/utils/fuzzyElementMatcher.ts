export interface ElementCandidate {
  index: number;
  text: string;
  role: string;
}

export class FuzzyElementMatcher {
  constructor() {}

  /**
   * Levenshtein Distance for fuzzy string matching
   */
  private levDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  /**
   * Find matching element index even if DOM indices shift dynamically between React/Vue re-renders
   */
  public findBestMatchingIndex(
    targetText: string,
    targetRole: string,
    candidates: ElementCandidate[]
  ): number | null {
    if (candidates.length === 0) return null;

    const cleanTargetText = targetText.trim().toLowerCase();
    let bestMatchIndex: number | null = null;
    let lowestDistance = Infinity;

    for (const cand of candidates) {
      const cleanCandText = cand.text.trim().toLowerCase();

      // Exact match
      if (cleanCandText === cleanTargetText && cand.role.toLowerCase() === targetRole.toLowerCase()) {
        return cand.index;
      }

      // Fuzzy text distance match
      const dist = this.levDistance(cleanTargetText, cleanCandText);
      if (dist < lowestDistance && dist <= Math.max(3, cleanTargetText.length * 0.4)) {
        lowestDistance = dist;
        bestMatchIndex = cand.index;
      }
    }

    return bestMatchIndex;
  }
}

export const globalFuzzyElementMatcher = new FuzzyElementMatcher();
