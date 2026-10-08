import { globalLiveSiteInspector, ExtractedSiteDesignSystem } from "./liveSiteInspector";
import { globalTrustedDomainEngine } from "./trustedDomainEngine";
import { globalSecurityGateDetector } from "./securityGateDetector";
import { domStamperScript } from "./domStamper";

export interface UniversalPageAudit {
  url: string;
  title: string;
  timestamp: number;
  trustScore: number;
  securityGate: { isGateDetected: boolean; gateType?: string };
  designTokens: ExtractedSiteDesignSystem;
  interactiveElementsCount: number;
  summaryDirective: string;
}

export class UniversalPageInspector {
  private visitedAuditLog: Map<string, UniversalPageAudit> = new Map();

  constructor() {}

  /**
   * Universal Deep Page Inspection triggered on EVERY visited website
   */
  public async inspectVisitedPage(
    url: string,
    pageTitle: string,
    rawDOMContent: string,
    accessibilityTreeText: string
  ): Promise<UniversalPageAudit> {
    const cleanUrl = url || "about:blank";
    const timestamp = Date.now();

    // 1. Domain Trust Score
    const trustScore = globalTrustedDomainEngine.getDomainTrustScore(cleanUrl);

    // 2. Security Gate & CAPTCHA Detection
    const securityGate = globalSecurityGateDetector.detectSecurityGate(rawDOMContent, pageTitle);

    // 3. Design Token & Visual Style Extraction
    const designTokens = globalLiveSiteInspector.extractDesignTokensFromDOM(rawDOMContent || accessibilityTreeText);

    // 4. Interactive Elements Count
    const elementMatches = accessibilityTreeText.match(/\[\d+\]/g);
    const interactiveElementsCount = elementMatches ? elementMatches.length : 0;

    // 5. System Prompt Inspection Directive
    const summaryDirective = `
🌐 **UNIVERSAL PAGE INSPECTION REPORT (${cleanUrl})**:
- **Domain Trust Score**: ${trustScore}/100
- **Security Check**: ${securityGate.isGateDetected ? `⚠️ GATE DETECTED (${securityGate.gateType})` : "✅ Clear / No Auth Gate"}
- **Design Tokens**: Primary Color (${designTokens.colors.primary || "#c15f3c"}), Grid Columns (${designTokens.layoutStructure.gridCols})
- **Interactive Elements**: ${interactiveElementsCount} clickable targets stamped
`;

    const audit: UniversalPageAudit = {
      url: cleanUrl,
      title: pageTitle || "Visited Webpage",
      timestamp,
      trustScore,
      securityGate,
      designTokens,
      interactiveElementsCount,
      summaryDirective
    };

    this.visitedAuditLog.set(cleanUrl, audit);
    return audit;
  }

  public getPageAudit(url: string): UniversalPageAudit | undefined {
    return this.visitedAuditLog.get(url);
  }

  public getVisitedLog(): UniversalPageAudit[] {
    return Array.from(this.visitedAuditLog.values());
  }
}

export const globalUniversalPageInspector = new UniversalPageInspector();
