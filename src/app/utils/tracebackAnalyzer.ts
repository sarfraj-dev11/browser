export interface DiagnosticReport {
  rootCause: string;
  suggestedAction: string;
  promptDirective: string;
}

export class TracebackAnalyzer {
  constructor() {}

  /**
   * Perform internal stack trace root cause diagnosis and generate prompt recovery directives
   */
  public analyzeError(error: any): DiagnosticReport {
    const msg = (error?.message || error?.toString() || "").toLowerCase();

    if (msg.includes("timeout") || msg.includes("timed out")) {
      return {
        rootCause: "Network Timeout / Page Load Delay",
        suggestedAction: "Wait for page render or try reloading target URL.",
        promptDirective: "\n⚠️ **RECOVERY DIRECTIVE**: Previous action timed out. Do NOT repeat the exact same request immediately. Scroll or verify page readiness first."
      };
    }

    if (msg.includes("not found") || msg.includes("404")) {
      return {
        rootCause: "Target Element or Route Not Found (404)",
        suggestedAction: "Re-verify DOM element list or search query URL.",
        promptDirective: "\n⚠️ **RECOVERY DIRECTIVE**: Target route or element was not found. Use search bar or navigate to parent category page."
      };
    }

    return {
      rootCause: "Unhandled IPC / Action Execution Exception",
      suggestedAction: "Select alternative element index or gesture.",
      promptDirective: `\n⚠️ **RECOVERY DIRECTIVE**: Action execution encountered error: "${msg.slice(0, 100)}". Try an alternate index target or scroll.`
    };
  }
}

export const globalTracebackAnalyzer = new TracebackAnalyzer();
