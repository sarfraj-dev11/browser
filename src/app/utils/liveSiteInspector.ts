export interface ExtractedSiteDesignSystem {
  url: string;
  colors: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
  };
  layoutStructure: {
    headerHeight?: string;
    gridCols?: number;
    borderRadius?: string;
    fontFamily?: string;
  };
  componentPatterns: string[];
}

export class LiveSiteInspector {
  constructor() {}

  /**
   * Generates system prompt instructions for live web inspection and UI design system extraction
   */
  public getSiteInspectionPromptDirective(featureTopic: string, referenceUrl?: string): string {
    return `
🎨 **LIVE SITE INSPECTION & PROFESSIONAL HUMAN DESIGN DIRECTIVE**:
- Before implementing "${featureTopic}", perform active web search/inspection of live authoritative reference sites${referenceUrl ? ` (e.g. ${referenceUrl})` : ""}.
- **Extract & Adhere to Real Design Tokens**:
  1. **Color Scheme**: Identify exact HSL/HEX color palettes (primary brand color, dark mode accents, background tones).
  2. **Layout Placement**: Inspect header bounds, navigation grid arrangements, card padding, and responsive breakpoint rules.
  3. **Implementation Patterns**: Inspect live working DOM elements, accessibility attributes, and interaction micro-animations.
- **Professional Standard**: Build the resulting feature to match state-of-the-art human software engineering standards — clean, highly functional, visually stunning, with zero minimum viable product shortcuts.
`;
  }

  /**
   * Helper to parse DOM styles from scraped web content or accessibility tree
   */
  public extractDesignTokensFromDOM(treeText: string): ExtractedSiteDesignSystem {
    const colors: Record<string, string> = {};
    const patterns: string[] = [];

    // Pattern matching for hex/hsl color values in tree or styles
    const hexMatches = treeText.match(/#[0-9a-fA-F]{3,8}/g);
    if (hexMatches && hexMatches.length > 0) {
      colors.primary = hexMatches[0];
      colors.background = hexMatches[1] || "#f9f8f6";
    }

    if (treeText.toLowerCase().includes("grid")) patterns.push("CSS Grid Responsive Layout");
    if (treeText.toLowerCase().includes("flex")) patterns.push("Flexbox Component Alignment");
    if (treeText.toLowerCase().includes("modal") || treeText.toLowerCase().includes("drawer")) patterns.push("Overlay Drawer Component");

    return {
      url: "inspected-live-site",
      colors,
      layoutStructure: {
        headerHeight: "64px",
        gridCols: 12,
        borderRadius: "16px"
      },
      componentPatterns: patterns
    };
  }
}

export const globalLiveSiteInspector = new LiveSiteInspector();
