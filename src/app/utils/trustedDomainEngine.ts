export interface SearchResult {
  title: string;
  link: string;
  snippet?: string;
  trustScore?: number;
  position?: number;
}

export class TrustedDomainEngine {
  // Dynamic whitelist of known top-tier platforms (expandable on the fly)
  private verifiedSeedDomains: Set<string> = new Set([
    "github.com", "developer.mozilla.org", "nextjs.org", "react.dev",
    "tailwindcss.com", "npmjs.com", "stackoverflow.com", "pypi.org",
    "w3schools.com", "typescriptlang.org", "blinkit.com", "zepto.com",
    "swiggy.com", "amazon.in", "amazon.com", "flipkart.com", "google.com",
    "wikipedia.org", "bing.com"
  ]);

  private spamKeywords: string[] = [
    "free-download-apk", "click-here-now", "free-coins", "unverified-crack",
    "malware-site", "bonus-claim-now"
  ];

  constructor() { }

  /**
   * Add new trusted domain dynamically at runtime
   */
  public addTrustedDomain(domain: string) {
    this.verifiedSeedDomains.add(domain.toLowerCase().trim());
  }

  /**
   * Multi-Factor Domain Trust Algorithm:
   * Evaluates TLD authority (.gov, .edu, .org, .dev), HTTPS protocol, PageRank position, and spam heuristics
   */
  public getDomainTrustScore(url: string, searchPosition: number = 5): number {
    let score = 50; // Base score for open web

    try {
      const cleanUrl = url.toLowerCase().trim();
      const urlObj = new URL(cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`);
      const hostname = urlObj.hostname.replace(/^www\./, "");

      // 1. Check Seed Verified Domains (+45 points)
      for (const seed of this.verifiedSeedDomains) {
        if (hostname.includes(seed)) {
          score += 45;
          break;
        }
      }

      // 2. High-Authority TLD Assessment
      if (hostname.endsWith(".gov") || hostname.endsWith(".gov.in") || hostname.endsWith(".edu") || hostname.endsWith(".ac.in")) {
        score += 45; // Government & Educational institutions get instant top-tier rating
      } else if (hostname.endsWith(".org") || hostname.endsWith(".dev") || hostname.endsWith(".io")) {
        score += 20;
      }

      // 3. Search Engine PageRank Position Weighting (Google/Serper filtered results)
      if (searchPosition <= 3) {
        score += 25; // Top 3 Google search results inherit high search engine trust
      } else if (searchPosition <= 5) {
        score += 15;
      } else if (searchPosition <= 10) {
        score += 10;
      }

      // 4. HTTPS Security Protocol Boost
      if (cleanUrl.startsWith("https://")) {
        score += 5;
      }

      // 5. Documentation / Official Store Path Bonus
      if (urlObj.pathname.includes("/docs") || urlObj.pathname.includes("/api") || urlObj.pathname.includes("/product") || urlObj.pathname.includes("/store")) {
        score += 10;
      }

      // 6. Spam Heuristic Penalty (-60 points)
      for (const spamWord of this.spamKeywords) {
        if (cleanUrl.includes(spamWord)) {
          score -= 60;
          break;
        }
      }
    } catch (e) {
      score = 40;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Filter and re-rank search results placing trusted domains at the top
   */
  public rankSearchResultsByTrust(results: SearchResult[]): SearchResult[] {
    const scored = results.map((r, index) => ({
      ...r,
      position: index + 1,
      trustScore: this.getDomainTrustScore(r.link, index + 1)
    }));

    // Sort descending by trustScore
    return scored.sort((a, b) => (b.trustScore || 0) - (a.trustScore || 0));
  }

  /**
   * System Prompt Directive for enforcement
   */
  public getTrustedDomainPromptDirective(): string {
    return `\n🌐 **DYNAMIC DOMAIN REPUTATION & TRUST POLICY**:\n- You MUST prioritize verified, high-trust domains (.gov, .edu, official docs, top Google ranked results, established platforms) when choosing alternative URLs.\n- Avoid low-reputation or spammy domains automatically flagged by trust scoring heuristics.`;
  }
}

export const globalTrustedDomainEngine = new TrustedDomainEngine();
