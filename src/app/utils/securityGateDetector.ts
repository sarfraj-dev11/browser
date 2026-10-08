export interface SecurityGateStatus {
  isGateDetected: boolean;
  gateType?: "cloudflare" | "recaptcha" | "hcaptcha" | "2fa_otp" | "password";
  warningPrompt?: string;
}

export class SecurityGateDetector {
  private captchaKeywords = [
    "cf-turnstile",
    "g-recaptcha",
    "h-captcha",
    "verify you are human",
    "checking your browser",
    "enter 6-digit code",
    "enter otp",
    "two-factor authentication"
  ];

  constructor() {}

  /**
   * Scan DOM tree text for CAPTCHA security walls and authentication gates
   */
  public detectSecurityGate(accessibilityTree: string, pageTitle: string): SecurityGateStatus {
    const combinedText = `${pageTitle} ${accessibilityTree}`.toLowerCase();

    for (const keyword of this.captchaKeywords) {
      if (combinedText.includes(keyword)) {
        let gateType: SecurityGateStatus["gateType"] = "cloudflare";
        if (keyword.includes("recaptcha")) gateType = "recaptcha";
        if (keyword.includes("hcaptcha")) gateType = "hcaptcha";
        if (keyword.includes("otp") || keyword.includes("digit")) gateType = "2fa_otp";
        if (keyword.includes("password")) gateType = "password";

        return {
          isGateDetected: true,
          gateType,
          warningPrompt: `\n🔒 **SECURITY GATE INTERCEPTED**: Detected ${gateType.toUpperCase()} security wall on page. Auto-pausing automated loop to prevent infinite retry loops. Please complete verification manually.`
        };
      }
    }

    return { isGateDetected: false };
  }
}

export const globalSecurityGateDetector = new SecurityGateDetector();
