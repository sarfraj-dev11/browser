export class JSONSelfCorrector {
  constructor() {}

  /**
   * Parse and repair malformed JSON LLM output strings
   */
  public parseAndRepairJSON<T>(rawString: string): T {
    let clean = rawString.trim();

    // Remove markdown code fences if present
    if (clean.startsWith("```")) {
      clean = clean.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    // Try standard JSON.parse first
    try {
      return JSON.parse(clean);
    } catch (e1) {
      // Attempt heuristic repairs: fix trailing commas, unescaped newlines
      let repaired = clean
        .replace(/,\s*([}\]])/g, "$1") // Remove trailing commas
        .replace(/(["'])\s*\n\s*(["'])/g, "$1 $2") // Fix unescaped newlines in string literals
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":'); // Quote unquoted keys

      try {
        return JSON.parse(repaired);
      } catch (e2) {
        // Fallback extraction: locate first '{' and last '}'
        const firstBrace = clean.indexOf("{");
        const lastBrace = clean.lastIndexOf("}");
        const sliced = firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace
          ? clean.slice(firstBrace, lastBrace + 1)
          : clean;
        try {
          return JSON.parse(sliced);
        } catch (e3) {
          // Truncation repair: walk back to each ',', '{' or '[' boundary and
          // try closing any open string + unbalanced brackets/braces
          for (let cut = sliced.length - 1; cut > 0; cut--) {
            const c = sliced[cut];
            if (c !== "," && c !== "{" && c !== "[") continue;
            let piece = sliced.slice(0, c === "," ? cut : cut + 1);
            // Close an unterminated string (odd unescaped quote count)
            const quoteCount = (piece.match(/(?<!\\)"/g) || []).length;
            if (quoteCount % 2 === 1) piece += '"';
            let braces = 0, brackets = 0;
            let inStr = false, esc = false;
            for (const ch of piece) {
              if (esc) { esc = false; continue; }
              if (ch === "\\") { esc = true; continue; }
              if (ch === '"') { inStr = !inStr; continue; }
              if (inStr) continue;
              if (ch === "{") braces++; else if (ch === "}") braces--;
              else if (ch === "[") brackets++; else if (ch === "]") brackets--;
            }
            piece += "]".repeat(Math.max(0, brackets)) + "}".repeat(Math.max(0, braces));
            try {
              return JSON.parse(piece);
            } catch (e4) {}
          }
          throw new Error(`JSON Repair failed for output: ${rawString.slice(0, 100)}...`);
        }
      }
    }
  }
}

export const globalJSONSelfCorrector = new JSONSelfCorrector();
