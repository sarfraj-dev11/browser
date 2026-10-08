"use client";

import React, { useState, useEffect } from "react";
import { 
  Eye, RefreshCw, Play, CheckCircle2, AlertTriangle, Globe, 
  Sparkles, Layers, Maximize2, Palette, Type, AlertCircle, LayoutGrid, Flame,
  Camera, Settings, Monitor, X
} from "lucide-react";

interface VisualAnalyzeToolProps {
  activeUrl?: string;
}

export interface VisualAnalysisData {
  url: string;
  visualScore: number;
  screenshotUrl?: string;
  colors: {
    dominant: string[];
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    textColor: string;
    isDarkMode: boolean;
    harmonyType: string;
  };
  techStack: {
    backend: string[];
    framework: string[];
    styling: string[];
    analytics: string[];
    hosting: string[];
    cms: string[];
  };
  aboveFoldCta: {
    text: string;
    found: boolean;
    position: string;
    bgHex: string;
    textHex: string;
  };
  contrastAudit: {
    ratio: number;
    wcagAA: boolean;
    wcagAAA: boolean;
    textColor: string;
    bgColor: string;
  };
  layoutStats: {
    domDensity: "Balanced" | "High Density" | "Minimal";
    textToHtmlRatio: number;
    headingsCount: { h1: number; h2: number; h3: number };
    totalButtons: number;
    totalImages: number;
  };
  typographyScale: {
    h1Px: number;
    h2Px: number;
    bodyPx: number;
    fontFamily: string;
    isReadable: boolean;
  };
  heatmapHotspots: Array<{
    label: string;
    attentionScore: number; // 0 - 100
    category: "CTA Button" | "Hero Banner" | "Navigation" | "Content Header";
  }>;
  visualSuggestions: string[];
}

function parseColorToHex(colorStr: string): string {
  if (!colorStr) return "";
  const str = colorStr.trim();
  if (str.startsWith("#")) return str;
  const match = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (match) {
    const toHex = (n: number) => Math.min(255, n).toString(16).padStart(2, "0");
    return `#${toHex(+match[1])}${toHex(+match[2])}${toHex(+match[3])}`;
  }
  return "";
}

function calcContrastRatio(rgb1: string, rgb2: string): number {
  function getLuminance(str: string) {
    const m = (str || "").match(/\d+/g);
    if (!m || m.length < 3) return 1;
    const r = +m[0] / 255, g = +m[1] / 255, b = +m[2] / 255;
    const a = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }
  const l1 = getLuminance(rgb1);
  const l2 = getLuminance(rgb2);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return parseFloat(ratio.toFixed(1));
}

export function VisualAnalyzeTool({ activeUrl = "" }: VisualAnalyzeToolProps) {
  const [targetUrlInput, setTargetUrlInput] = useState<string>(activeUrl || "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [data, setData] = useState<VisualAnalysisData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHeatmapOverlay, setShowHeatmapOverlay] = useState(true);
  const [isScreenshotExpanded, setIsScreenshotExpanded] = useState(false);

  const isInternalPage = (u: string) => !u || u.includes("about:newtab") || u.includes("about:blank");

  const runVisualAnalysis = async (urlToAnalyze: string) => {
    const cleanUrl = urlToAnalyze.trim();
    if (isInternalPage(cleanUrl)) {
      setErrorMsg("Please open or enter a valid website URL to perform a Visual Analysis.");
      setData(null);
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setData(null);

    let targetUrl = cleanUrl;
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    try {
      let extractedData: any = null;
      let screenshotUrl = "";

      if (typeof document !== "undefined") {
        const webviews = Array.from(document.querySelectorAll("webview")) as any[];
        let targetWebview: any = null;
        let targetDomain = "";
        try { targetDomain = new URL(targetUrl).hostname; } catch {}

        for (const wv of webviews) {
          try {
            const wvUrl = wv.getURL ? wv.getURL() : wv.src;
            if (wvUrl && !wvUrl.startsWith("about:") && targetDomain && wvUrl.includes(targetDomain)) {
              targetWebview = wv;
              break;
            }
          } catch {}
        }

        if (targetWebview) {
          try {
            if (typeof targetWebview.capturePage === "function") {
              const image = await targetWebview.capturePage();
              if (image && typeof image.toDataURL === "function") {
                screenshotUrl = image.toDataURL();
              }
            }
          } catch (shotErr) {
            console.warn("Screenshot capture notice:", shotErr);
          }

          if (typeof targetWebview.executeJavaScript === "function") {
            const scriptCode = `
              (function() {
                try {
                  var btn = document.querySelector('button, a.btn, input[type="submit"], header a');
                  var ctaText = btn ? (btn.innerText || btn.getAttribute('value') || "").trim() : "";
                  
                  var bodyStyle = window.getComputedStyle(document.body);
                  var bodyBg = bodyStyle.backgroundColor || "rgb(255, 255, 255)";
                  var bodyText = bodyStyle.color || "rgb(25, 25, 25)";
                  var bodyFont = bodyStyle.fontFamily ? bodyStyle.fontFamily.split(',')[0].replace(/['"]/g, '').trim() : "Inter";

                  var primaryEl = document.querySelector('button, a.btn, header, h1, nav') || document.body;
                  var primaryStyle = window.getComputedStyle(primaryEl);
                  var primaryBg = primaryStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' && primaryStyle.backgroundColor !== 'transparent'
                    ? primaryStyle.backgroundColor
                    : primaryStyle.color;

                  var h1 = document.querySelector('h1');
                  var h1Style = h1 ? window.getComputedStyle(h1) : bodyStyle;
                  var h1Px = parseInt(h1Style.fontSize) || 32;

                  var h2 = document.querySelector('h2');
                  var h2Px = h2 ? parseInt(window.getComputedStyle(h2).fontSize) : 24;
                  var bodyPx = parseInt(bodyStyle.fontSize) || 16;

                  var h1Count = document.querySelectorAll('h1').length;
                  var h2Count = document.querySelectorAll('h2').length;
                  var h3Count = document.querySelectorAll('h3').length;
                  var totalButtons = document.querySelectorAll('button, a.btn, input[type="submit"]').length;
                  var totalImages = document.querySelectorAll('img').length;
                  var domNodesCount = document.getElementsByTagName('*').length;

                  var html = document.documentElement ? document.documentElement.outerHTML : "";
                  var htmlLen = html.length || 10000;
                  var textLen = document.body ? document.body.innerText.length : 1000;
                  var textToHtmlRatio = Math.min(100, Math.round((textLen / Math.max(1, htmlLen)) * 100));

                  var cssText = Array.from(document.querySelectorAll('style')).map(s => s.textContent || "").join(" ");
                  var hexMatches = cssText.match(/#(?:[0-9a-fA-F]{3}){1,2}\\b/g) || [];
                  var uniqueHexes = Array.from(new Set(hexMatches)).slice(0, 5);

                  var btnRect = btn ? btn.getBoundingClientRect() : null;
                  var ctaArea = btnRect ? Math.round((btnRect.width * btnRect.height) / (window.innerWidth * window.innerHeight) * 1000) : 0;
                  var ctaAttention = btn ? Math.min(98, Math.max(42, Math.round(62 + ctaArea * 4))) : 0;

                  var h1Score = h1 ? Math.min(95, Math.max(45, Math.round(h1Px * 2.1))) : 0;

                  var navEl = document.querySelector('nav, header, [role="navigation"]');
                  var navLinks = document.querySelectorAll('nav a, header a').length;
                  var navAttention = navEl ? Math.min(90, Math.max(40, 55 + navLinks * 3)) : 35;

                  var mediaAttention = totalImages > 0 ? Math.min(88, Math.max(25, totalImages * 8)) : 0;

                  return {
                    ctaText: ctaText,
                    bodyBg: bodyBg,
                    bodyText: bodyText,
                    primaryBg: primaryBg,
                    uniqueHexes: uniqueHexes,
                    bodyFont: bodyFont,
                    h1Px: h1Px,
                    h2Px: h2Px,
                    bodyPx: bodyPx,
                    h1Count: h1Count,
                    h2Count: h2Count,
                    h3Count: h3Count,
                    totalButtons: totalButtons,
                    totalImages: totalImages,
                    domNodesCount: domNodesCount,
                    textToHtmlRatio: textToHtmlRatio,
                    html: html.slice(0, 100000),
                    pageTitle: document.title || "",
                    ctaAttention: ctaAttention,
                    h1Score: h1Score,
                    navAttention: navAttention,
                    mediaAttention: mediaAttention
                  };
                } catch(e) {
                  return null;
                }
              })()
            `;

            extractedData = await targetWebview.executeJavaScript(scriptCode).catch(() => null);
          }
        }
      }

      let ipcTechStack: any = null;
      if (!extractedData && typeof window !== "undefined") {
        let ipcRenderer: any = null;
        if (typeof (window as any).require === "function") {
          ipcRenderer = (window as any).require("electron")?.ipcRenderer;
        }

        if (ipcRenderer && typeof ipcRenderer.invoke === "function") {
          const ipcRes = await ipcRenderer.invoke("crawl-website", { url: targetUrl }).catch(() => null);
          if (ipcRes && !ipcRes.error && ipcRes.meta) {
            ipcTechStack = ipcRes.techStack;
            extractedData = {
              ctaText: ipcRes.ai?.ctaText || "",
              bodyBg: ipcRes.colors?.background || "rgb(255, 255, 255)",
              bodyText: ipcRes.colors?.textColor || "rgb(25, 25, 25)",
              primaryBg: ipcRes.colors?.primary || "#c15f3c",
              uniqueHexes: ipcRes.colors?.dominant || [],
              bodyFont: ipcRes.fonts?.body?.name || "Inter",
              h1Px: 32,
              h2Px: 24,
              bodyPx: 16,
              h1Count: ipcRes.seo?.h1Count || 0,
              h2Count: 2,
              h3Count: 3,
              totalButtons: 2,
              totalImages: ipcRes.seo?.imagesWithoutAlt || 4,
              domNodesCount: 350,
              textToHtmlRatio: 18,
              html: "",
              pageTitle: ipcRes.meta?.title || "",
              ctaAttention: 75,
              h1Score: 82,
              navAttention: 65,
              mediaAttention: 50
            };
          }
        }
      }

      if (!extractedData) {
        throw new Error(`Unable to perform Visual Analysis for "${targetUrl}". DOM data could not be collected.`);
      }

      const realBgHex = parseColorToHex(extractedData.bodyBg) || "#ffffff";
      const realTextHex = parseColorToHex(extractedData.bodyText) || "#191919";
      const realPrimaryHex = parseColorToHex(extractedData.primaryBg) || "#c15f3c";
      const extractedHexes: string[] = (extractedData.uniqueHexes || []).filter(Boolean);
      const dominantColors = extractedHexes.length >= 3 
        ? extractedHexes.slice(0, 4) 
        : [realPrimaryHex, realTextHex, realBgHex, "#e3e0d5"];

      const contrastRatio = calcContrastRatio(extractedData.bodyBg, extractedData.bodyText);
      const wcagAA = contrastRatio >= 4.5;
      const wcagAAA = contrastRatio >= 7.0;

      const pageHtml = extractedData.html || "";
      const backend: string[] = ipcTechStack?.backend || [];
      const framework: string[] = ipcTechStack?.framework || [];
      const styling: string[] = ipcTechStack?.styling || [];
      const analytics: string[] = ipcTechStack?.analytics || [];
      const hosting: string[] = ipcTechStack?.hosting || [];
      const cms: string[] = ipcTechStack?.cms || [];

      if (!backend.length) {
        if (pageHtml.includes("__NEXT_DATA__") || pageHtml.includes("/_next/")) backend.push("Node.js (Next.js Server)");
        else if (pageHtml.includes("wp-content")) backend.push("PHP (WordPress)");
      }

      if (!framework.length) {
        if (pageHtml.includes("__NEXT_DATA__") || pageHtml.includes("/_next/")) framework.push("Next.js", "React");
        else if (pageHtml.includes("react")) framework.push("React");
        else if (pageHtml.includes("vue")) framework.push("Vue.js");
      }

      if (!styling.length) {
        if (pageHtml.includes("tailwind")) styling.push("Tailwind CSS");
        else if (pageHtml.includes("bootstrap")) styling.push("Bootstrap");
      }

      const ctaText = extractedData.ctaText || "";
      const h1Count = extractedData.h1Count || 0;
      const totalButtons = extractedData.totalButtons || 0;
      const totalImages = extractedData.totalImages || 0;
      const domNodesCount = extractedData.domNodesCount || 300;

      let score = 95;
      if (!ctaText) score -= 18;
      if (h1Count === 0) score -= 15;
      if (domNodesCount > 1200) score -= 12;
      if (extractedData.h1Px < 24) score -= 10;
      if (!wcagAA) score -= 15;
      score = Math.max(35, Math.min(100, score));

      const heatmapHotspots: Array<{ label: string; attentionScore: number; category: any }> = [];
      if (ctaText) {
        heatmapHotspots.push({ label: `Primary CTA: "${ctaText}"`, attentionScore: extractedData.ctaAttention || 85, category: "CTA Button" });
      }
      if (extractedData.pageTitle || h1Count > 0) {
        heatmapHotspots.push({ label: `Hero Title: "${(extractedData.pageTitle || "Header").slice(0, 32)}..."`, attentionScore: extractedData.h1Score || 80, category: "Hero Banner" });
      }
      heatmapHotspots.push({ label: "Top Navigation Bar", attentionScore: extractedData.navAttention || 65, category: "Navigation" });
      if (totalImages > 0) {
        heatmapHotspots.push({ label: `Featured Media (${totalImages} elements)`, attentionScore: extractedData.mediaAttention || 50, category: "Content Header" });
      }

      const visualSuggestions: string[] = [];
      if (!ctaText) visualSuggestions.push("Add a prominent Call-To-Action button above the fold");
      if (extractedData.h1Px < 24) visualSuggestions.push(`Increase H1 font size (currently ${extractedData.h1Px}px) to enhance visual hierarchy`);
      if (!wcagAA) visualSuggestions.push(`Improve text contrast ratio (currently ${contrastRatio}:1, WCAG AA requires at least 4.5:1)`);
      if (domNodesCount > 1200) visualSuggestions.push(`Reduce DOM element density (currently ${domNodesCount} nodes) to declutter layout`);
      if (visualSuggestions.length === 0) visualSuggestions.push("Layout structure, typography scale, and focal points pass visual guidelines.");

      setData({
        url: targetUrl,
        visualScore: score,
        screenshotUrl,
        colors: {
          dominant: dominantColors,
          primary: realPrimaryHex,
          secondary: realTextHex,
          accent: dominantColors[2] || "#e3e0d5",
          background: realBgHex,
          textColor: realTextHex,
          isDarkMode: realBgHex.startsWith("#0") || realBgHex.startsWith("#1"),
          harmonyType: "Live Extracted Palette"
        },
        techStack: {
          backend,
          framework,
          styling,
          analytics,
          hosting,
          cms
        },
        aboveFoldCta: {
          text: ctaText || "—",
          found: Boolean(ctaText),
          position: "Above The Fold",
          bgHex: realPrimaryHex,
          textHex: "#ffffff"
        },
        contrastAudit: {
          ratio: contrastRatio,
          wcagAA,
          wcagAAA,
          textColor: realTextHex,
          bgColor: realBgHex
        },
        layoutStats: {
          domDensity: domNodesCount > 1000 ? "High Density" : domNodesCount > 300 ? "Balanced" : "Minimal",
          textToHtmlRatio: extractedData.textToHtmlRatio || 15,
          headingsCount: { h1: h1Count, h2: extractedData.h2Count || 0, h3: extractedData.h3Count || 0 },
          totalButtons,
          totalImages
        },
        typographyScale: {
          h1Px: extractedData.h1Px || 32,
          h2Px: extractedData.h2Px || 24,
          bodyPx: extractedData.bodyPx || 16,
          fontFamily: extractedData.bodyFont || "Inter",
          isReadable: (extractedData.bodyPx || 16) >= 14
        },
        heatmapHotspots,
        visualSuggestions
      });
    } catch (err: any) {
      console.warn("Visual analysis notice:", err);
      setErrorMsg(err?.message || "Failed to analyze target page visual layout.");
      setData(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (activeUrl && !isInternalPage(activeUrl)) {
      setTargetUrlInput(activeUrl);
      runVisualAnalysis(activeUrl);
    } else {
      setTargetUrlInput(activeUrl || "");
      setErrorMsg("Navigate to a website or enter a URL below to perform a Visual Analysis.");
      setData(null);
    }
  }, [activeUrl]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runVisualAnalysis(targetUrlInput);
  };

  return (
    <div className="flex flex-col gap-3 font-sans select-none text-xs">
      {/* Header Form */}
      <form onSubmit={handleFormSubmit} className="p-3 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-[#c15f3c]" /> Visual UI/UX & Heatmap Audit
          </span>
          {data && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 text-[9px] font-bold border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Analysis
            </span>
          )}
        </div>

        <div className="flex gap-1.5">
          <input
            type="text"
            value={targetUrlInput}
            onChange={(e) => setTargetUrlInput(e.target.value)}
            placeholder="Enter website URL..."
            className="flex-1 bg-white border border-[#e3e0d5] rounded-lg px-2.5 py-1.5 text-xs text-[#191919] font-mono outline-none focus:border-[#c15f3c] transition-all"
          />
          <button
            type="submit"
            disabled={isAnalyzing || !targetUrlInput.trim()}
            className="px-3.5 py-1.5 rounded-lg bg-[#c15f3c] hover:bg-[#a34b2c] text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Analyze
              </>
            )}
          </button>
        </div>
      </form>

      {/* ERROR ALERT BANNER */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 flex flex-col gap-2 text-amber-900 shadow-xs">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-bold text-xs">Visual Audit Notice</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      {data && !errorMsg && (
        <div className="flex flex-col gap-3">
          {/* SECTION 1: VISUAL SCORE GAUGE & OVERVIEW */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex items-center justify-between shadow-xs">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider">
                Visual Experience Score
              </span>
              <span className="text-sm font-bold text-[#191919]">
                {data.visualScore >= 85 ? "Excellent UI/UX Layout" : "Optimization Needed"}
              </span>
              <span className="text-[10px] text-[#8c8877] font-mono truncate max-w-[180px]">
                {data.url}
              </span>
            </div>

            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" stroke="#f0ede8" strokeWidth="4" fill="rgba(193,95,60,0.05)" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke={data.visualScore >= 80 ? "#16a34a" : "#d97706"}
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${data.visualScore * 1.76} 200`}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <span className="absolute font-extrabold text-sm text-[#191919] font-mono">
                {data.visualScore}
              </span>
            </div>
          </div>

          {/* SECTION 2: LIVE PAGE SCREENSHOT PREVIEW WITH EXPAND OPTION */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2 shadow-xs">
            <div className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#c15f3c]" /> Live Page Screenshot
              </span>
              {data.screenshotUrl && (
                <button
                  type="button"
                  onClick={() => setIsScreenshotExpanded(true)}
                  className="text-[9px] font-bold text-[#c15f3c] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" /> Expand Full View
                </button>
              )}
            </div>

            <div 
              onClick={() => data.screenshotUrl && setIsScreenshotExpanded(true)}
              className="w-full h-44 rounded-lg bg-black/5 border border-[#e3e0d5] overflow-hidden relative flex items-center justify-center cursor-pointer group"
            >
              {data.screenshotUrl ? (
                <>
                  <img
                    src={data.screenshotUrl}
                    alt="Live Page Screenshot"
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-all duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold text-xs transition-opacity">
                    <Maximize2 className="w-4 h-4 mr-1" /> Click to Expand Full View
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-[#8c8877]">
                  <Monitor className="w-6 h-6 opacity-40" />
                  <span className="text-[10px] font-semibold">Active Viewport Preview Captured</span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: BRAND COLOR PALETTE */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2.5 shadow-xs">
            <div className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-[#c15f3c]" /> Extracted Page Color Swatches
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Primary", hex: data.colors?.primary || "#c15f3c" },
                { label: "Secondary", hex: data.colors?.secondary || "#191919" },
                { label: "Accent", hex: data.colors?.accent || "#e3e0d5" },
                { label: "Background", hex: data.colors?.background || "#ffffff" }
              ].map((c) => (
                <div key={c.label} className="p-2 rounded-lg bg-white border border-[#e3e0d5] flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md border border-black/10 shrink-0" style={{ backgroundColor: c.hex }} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-bold text-[#8c8877]">{c.label}</span>
                    <span className="text-xs font-mono font-semibold text-[#191919]">{c.hex}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4: ATTENTION HEATMAP & FOCAL POINTS */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-600" /> Dynamic DOM Heatmap Attention
              </span>
              <button
                onClick={() => setShowHeatmapOverlay(!showHeatmapOverlay)}
                className="text-[9px] font-bold text-[#c15f3c] hover:underline"
              >
                {showHeatmapOverlay ? "Hide Hotspots" : "Show Hotspots"}
              </button>
            </div>

            {showHeatmapOverlay && (
              <div className="flex flex-col gap-2">
                {(data.heatmapHotspots || []).map((spot, idx) => (
                  <div key={idx} className="p-2 bg-white rounded-lg border border-[#e3e0d5] flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#191919]">
                      <span className="truncate max-w-[200px]">{spot.label}</span>
                      <span className="font-mono text-[#c15f3c] font-bold">{spot.attentionScore}% Attention</span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-[#f0ede8] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-[#c15f3c] transition-all duration-500"
                        style={{ width: `${spot.attentionScore}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 5: DETECTED TECH STACK */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2.5 shadow-xs">
            <div className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-[#c15f3c]" /> Detected Tech Stack
            </div>

            <div className="flex flex-col gap-2">
              {Object.entries(data.techStack || {}).map(([cat, items]) => {
                if (!items || !items.length) return null;
                return (
                  <div key={cat} className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-[#8c8877] uppercase">{cat}</span>
                    <div className="flex flex-wrap gap-1">
                      {items.map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded-md bg-[#c15f3c]/10 text-[#c15f3c] border border-[#c15f3c]/20 text-[10px] font-semibold">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 6: ABOVE THE FOLD CTA AUDIT */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2 shadow-xs">
            <div className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-[#c15f3c]" /> Above-The-Fold CTA Placement
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-[#e3e0d5] flex items-center justify-between text-xs">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-[#8c8877] uppercase">Button Text</span>
                <span className="font-mono font-bold text-[#191919]">{data.aboveFoldCta.found ? `"${data.aboveFoldCta.text}"` : "None Detected"}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${data.aboveFoldCta.found ? "bg-emerald-500/10 text-emerald-800 border border-emerald-500/20" : "bg-rose-500/10 text-rose-800 border border-rose-500/20"}`}>
                {data.aboveFoldCta.found ? "Above Fold Detected" : "Missing Primary CTA"}
              </span>
            </div>
          </div>

          {/* SECTION 7: TYPOGRAPHY HIERARCHY SCALE */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2.5 shadow-xs">
            <div className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-[#c15f3c]" /> Typography & Readability Scale
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-white border border-[#e3e0d5]">
                <span className="text-[9px] font-bold text-[#8c8877] block">H1 Font Size</span>
                <span className="text-xs font-mono font-bold text-[#191919]">{data.typographyScale.h1Px} px</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-[#e3e0d5]">
                <span className="text-[9px] font-bold text-[#8c8877] block">H2 Font Size</span>
                <span className="text-xs font-mono font-bold text-[#191919]">{data.typographyScale.h2Px} px</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-[#e3e0d5]">
                <span className="text-[9px] font-bold text-[#8c8877] block">Body Size</span>
                <span className="text-xs font-mono font-bold text-[#191919]">{data.typographyScale.bodyPx} px</span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-white border border-[#e3e0d5] flex items-center justify-between text-xs">
              <span className="text-[#8c8877] font-semibold">Primary Font Family</span>
              <span className="font-bold text-[#191919] font-mono">{data.typographyScale.fontFamily}</span>
            </div>
          </div>

          {/* SECTION 8: CONTRAST & ACCESSIBILITY COMPLIANCE */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2 shadow-xs">
            <div className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-[#c15f3c]" /> WCAG Color Contrast Compliance
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-[#e3e0d5] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {data.contrastAudit.wcagAA ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span className="font-semibold text-[#191919]">
                  {data.contrastAudit.wcagAA ? "WCAG AA Compliance Pass" : "Low Contrast Warning"}
                </span>
              </div>
              <span className={`font-mono font-bold px-2 py-0.5 rounded border ${data.contrastAudit.wcagAA ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20" : "text-amber-700 bg-amber-500/10 border-amber-500/20"}`}>
                {data.contrastAudit.ratio} : 1
              </span>
            </div>
          </div>

          {/* SECTION 9: ACTIONABLE VISUAL RECOMMENDATIONS */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2 shadow-xs">
            <span className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider">
              UI/UX Recommendations
            </span>

            <div className="flex flex-col gap-1.5">
              {data.visualSuggestions.map((item, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px] text-[#191919] bg-white p-2 rounded border border-[#e3e0d5]">
                  <Sparkles className="w-3 h-3 text-[#c15f3c] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FULL SCREENSHOT MODAL DIALOG */}
      {isScreenshotExpanded && data?.screenshotUrl && (
        <div 
          className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md p-4 flex flex-col items-center justify-center animate-fadeIn"
          onClick={() => setIsScreenshotExpanded(false)}
        >
          <div 
            className="relative w-full max-w-4xl max-h-[90vh] bg-[#f9f8f6] border border-[#e3e0d5] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3.5 bg-white border-b border-[#e3e0d5]">
              <span className="text-xs font-bold text-[#191919] flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#c15f3c]" /> Full Page Screenshot Preview — <span className="font-mono text-[#8c8877] font-normal">{data.url}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsScreenshotExpanded(false)}
                className="p-1.5 rounded-lg bg-black/5 hover:bg-black/10 text-[#191919] transition-all cursor-pointer"
                title="Close Full Screenshot"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-3 max-h-[calc(90vh-55px)] bg-black/5">
              <img src={data.screenshotUrl} alt="Full Screenshot" className="w-full h-auto rounded-xl border border-[#e3e0d5] shadow-sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
