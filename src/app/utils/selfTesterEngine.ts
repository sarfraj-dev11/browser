export interface SelfTestResult {
  passed: boolean;
  checksRun: number;
  failures: string[];
  summary: string;
}

export class SelfTesterEngine {
  constructor() {}

  /**
   * Run autonomous backend DOM integrity and element responsiveness checks
   */
  public verifyPageIntegrity(url: string, domTreeLength: number, hasErrors: boolean): SelfTestResult {
    const failures: string[] = [];
    let checksRun = 0;

    // Check 1: URL validity
    checksRun++;
    if (!url || url === "about:blank") {
      failures.push("Target URL is blank or uninitialized.");
    }

    // Check 2: DOM tree populated
    checksRun++;
    if (domTreeLength < 50) {
      failures.push("DOM tree length is suspiciously small (< 50 chars). Page may be stalled or unrendered.");
    }

    // Check 3: Console errors flag
    checksRun++;
    if (hasErrors) {
      failures.push("Page contains unhandled console or network errors.");
    }

    const passed = failures.length === 0;
    const summary = passed
      ? `✅ All ${checksRun} backend integrity checks passed for ${url.slice(0, 40)}.`
      : `⚠️ Integrity verification failed ${failures.length}/${checksRun} checks: ${failures.join("; ")}`;

    return {
      passed,
      checksRun,
      failures,
      summary
    };
  }
}

export const globalSelfTesterEngine = new SelfTesterEngine();
