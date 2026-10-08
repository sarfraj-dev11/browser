"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart3, Search, Palette, Type, Settings, Brain, RefreshCw, 
  Play, CheckCircle2, AlertTriangle, Globe, ChevronDown, ChevronUp,
  Activity, ShieldCheck, Cpu, Zap, Sparkles, FileText, AlertCircle
} from "lucide-react";
import { analyzeWebsiteFull, AnalysisResult } from "../../utils/growCitableAnalyzer";

interface AnalyzeWebsiteToolProps {
  activeUrl?: string;
}

export function AnalyzeWebsiteTool({ activeUrl = "" }: AnalyzeWebsiteToolProps) {
  const [targetUrlInput, setTargetUrlInput] = useState<string>(activeUrl || "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedDiagnostics, setExpandedDiagnostics] = useState<Record<string, boolean>>({});

  const isInternalPage = (u: string) => !u || u.includes("about:newtab") || u.includes("about:blank");

  const toggleDiagnostic = (id: string) => {
    setExpandedDiagnostics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const runAnalysisForUrl = async (urlToAnalyze: string) => {
    const cleanUrl = urlToAnalyze.trim();
    if (isInternalPage(cleanUrl)) {
      setErrorMsg("Please enter or navigate to a valid website URL to run a live audit.");
      setData(null);
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setData(null); // Clear previous result so gauge rings re-render freshly

    try {
      const res = await analyzeWebsiteFull(cleanUrl);
      setData(res);
    } catch (err: any) {
      console.warn("Analysis notice:", err);
      setErrorMsg(err?.message || "Audit failed to retrieve target website DOM data.");
      setData(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (activeUrl && !isInternalPage(activeUrl)) {
      setTargetUrlInput(activeUrl);
      runAnalysisForUrl(activeUrl);
    } else {
      setTargetUrlInput(activeUrl || "");
      setErrorMsg("Navigate to a website or enter a URL below to perform a live audit.");
      setData(null);
    }
  }, [activeUrl]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runAnalysisForUrl(targetUrlInput);
  };

  return (
    <div className="flex flex-col gap-3 font-sans select-none text-xs">
      {/* Target Audit Page Header & Input Form */}
      <form onSubmit={handleFormSubmit} className="p-3 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-[#c15f3c]" /> Target Audit Page
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
            placeholder="Enter website URL (e.g. growcitable.com)..."
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
                Auditing...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Run Audit
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
              <span className="font-bold text-xs">Live Audit Notice</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      {data && !errorMsg && (
        <div className="flex flex-col gap-3">
          {/* SECTION 1: 4 LIGHTHOUSE CORE SCORE RINGS */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-3 shadow-xs">
            <div className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#c15f3c]" /> Lighthouse Core Scores
              </span>
              <span className="text-[9px] font-mono text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {data.url}
              </span>
            </div>

            {/* 4 Gauge Rings Grid */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <ScoreRing score={data.coreScores.performance} label="Performance" />
              <ScoreRing score={data.coreScores.accessibility} label="Accessibility" />
              <ScoreRing score={data.coreScores.bestPractices} label="Best Practices" />
              <ScoreRing score={data.coreScores.seo} label="SEO" />
            </div>
          </div>

          {/* SECTION 2: CORE WEB VITALS METRICS */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2.5 shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-bold text-[#8c8877] uppercase tracking-wider">
              <span>Core Web Vitals Metrics</span>
              <span className="text-[#8c8877] font-normal lowercase">Expand view</span>
            </div>

            <div className="flex flex-col divide-y divide-[#e3e0d5] bg-white rounded-lg border border-[#e3e0d5] p-2">
              <MetricRow 
                status={data.metrics.fcpMs > 1800 ? "error" : data.metrics.fcpMs > 1000 ? "warning" : "pass"} 
                label="First Contentful Paint" 
                value={`${(data.metrics.fcpMs / 1000).toFixed(1)} s`} 
              />
              <MetricRow 
                status={data.metrics.lcpMs > 2500 ? "error" : data.metrics.lcpMs > 1500 ? "warning" : "pass"} 
                label="Largest Contentful Paint" 
                value={`${(data.metrics.lcpMs / 1000).toFixed(1)} s`} 
              />
              <MetricRow 
                status={data.metrics.tbtMs > 200 ? "error" : data.metrics.tbtMs > 100 ? "warning" : "pass"} 
                label="Total Blocking Time" 
                value={`${data.metrics.tbtMs} ms`} 
              />
              <MetricRow 
                status={data.metrics.cls > 0.1 ? "error" : "pass"} 
                label="Cumulative Layout Shift" 
                value={`${data.metrics.cls.toFixed(3)}`} 
              />
              <MetricRow 
                status={data.metrics.speedIndexMs > 2500 ? "error" : "warning"} 
                label="Speed Index" 
                value={`${(data.metrics.speedIndexMs / 1000).toFixed(1)} s`} 
              />
            </div>
          </div>

          {/* SECTION 3: DIAGNOSTICS */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2.5 shadow-xs">
            <div className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center justify-between">
              <span>Diagnostics</span>
              <span className="text-[#8c8877] font-normal text-[9px]">Performant Audits</span>
            </div>

            <div className="flex flex-col gap-1">
              {data.diagnostics.map((diag) => (
                <div key={diag.id} className="flex flex-col bg-white rounded-lg border border-[#e3e0d5] overflow-hidden">
                  <button
                    onClick={() => toggleDiagnostic(diag.id)}
                    className="flex items-center justify-between p-2.5 text-left hover:bg-[#faf8f5] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <StatusIcon status={diag.status} />
                      <span className="text-xs font-semibold text-[#191919] truncate">{diag.label}</span>
                      <span className="text-[11px] font-mono text-[#8c8877] shrink-0">— {diag.details}</span>
                    </div>
                    {expandedDiagnostics[diag.id] ? (
                      <ChevronUp className="w-3.5 h-3.5 text-[#8c8877] shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[#8c8877] shrink-0" />
                    )}
                  </button>

                  {expandedDiagnostics[diag.id] && (
                    <div className="p-2.5 pt-0 text-[11px] text-[#6e6b5e] border-t border-[#f0ede8] bg-[#faf8f5] leading-relaxed">
                      Detailed diagnostic analysis for {diag.label.toLowerCase()}. Optimizing this issue improves runtime execution efficiency and Lighthouse audit scores.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4: GENERAL & SECURITY AUDITS */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2.5 shadow-xs">
            <div className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider">
              General & Security Audits
            </div>

            <div className="flex flex-col gap-1">
              {data.generalAudits.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-[#e3e0d5]">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <StatusIcon status={item.status} />
                    <span className="text-xs font-semibold text-[#191919] truncate">{item.label}</span>
                    <span className="text-[11px] font-mono text-[#8c8877] shrink-0">— {item.details}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#8c8877] shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 5: ON-PAGE META & TECHNICAL AUDIT */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2.5 shadow-xs">
            <div className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-[#c15f3c]" /> On-Page Meta & Technical Audit
            </div>

            <SeoRow label="Title Tag" value={data.meta.title || "—"} ok={data.seo.titleLength >= 30 && data.seo.titleLength <= 70} />
            <SeoRow label="Title Length" value={`${data.seo.titleLength} chars`} ok={data.seo.titleLength >= 30 && data.seo.titleLength <= 70} />
            <SeoRow label="Meta Description" value={data.meta.description || "—"} ok={data.seo.descLength >= 120 && data.seo.descLength <= 170} />
            <SeoRow label="Canonical URL" value={data.meta.canonical || "—"} ok={data.seo.hasCanonical} />
            <SeoRow label="OG Title" value={data.meta.ogTitle || "—"} ok={!!data.meta.ogTitle} />
            <SeoRow label="Robots Meta" value={data.meta.robots || "—"} />
            <SeoRow label="HTTPS Security" value={data.seo.isHttps ? "Secure" : "Insecure"} ok={data.seo.isHttps} />
            <SeoRow label="Viewport Meta" value={data.seo.hasViewportMeta ? "Present" : "Missing"} ok={data.seo.hasViewportMeta} />
            <SeoRow label="Content Security Policy" value={data.seo.hasCSP ? "Enabled" : "Missing"} ok={data.seo.hasCSP} />
          </div>

          {/* SECTION 6: BRAND COLOR PALETTE */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2.5 shadow-xs">
            <div className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-[#c15f3c]" /> Brand Color Palette
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Primary", hex: data.colors.primary },
                { label: "Secondary", hex: data.colors.secondary },
                { label: "Accent", hex: data.colors.accent },
                { label: "Background", hex: data.colors.background }
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

            <div className="text-[10px] text-[#8c8877] italic">
              Harmony: <span className="font-semibold text-[#191919]">{data.colors.harmonyType}</span>
            </div>
          </div>

          {/* SECTION 7: TYPOGRAPHY & FONTS */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2.5 shadow-xs">
            <div className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-[#c15f3c]" /> Typography & Fonts Hierarchy
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-[#e3e0d5] flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-[#8c8877] uppercase">Heading Font</span>
                <span className="text-xs font-bold text-[#191919]">{data.fonts.heading.name}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 text-[9px] font-bold">
                {data.fonts.heading.source}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-[#e3e0d5] flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-[#8c8877] uppercase">Body Font</span>
                <span className="text-xs font-bold text-[#191919]">{data.fonts.body.name}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 text-[9px] font-bold">
                {data.fonts.body.source}
              </span>
            </div>
          </div>

          {/* SECTION 8: DETECTED TECH STACK */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2.5 shadow-xs">
            <div className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-[#c15f3c]" /> Detected Tech Stack
            </div>

            <div className="flex flex-col gap-2">
              {Object.entries(data.techStack).map(([cat, items]) => {
                if (!items.length) return null;
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

          {/* SECTION 9: AI INSIGHTS */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2.5 shadow-xs">
            <div className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-[#c15f3c]" /> AI Insights & Recommendations
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8c8877]">Niche Category</span>
              <span className="font-semibold text-[#191919]">{data.ai.niche}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8c8877]">Target Audience</span>
              <span className="font-semibold text-[#191919]">{data.ai.targetAudience}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8c8877]">CTA Button</span>
              <span className="font-mono font-bold text-[#c15f3c]">"{data.ai.ctaText}"</span>
            </div>

            <div className="p-2 rounded-lg bg-white border border-[#e3e0d5] text-[11px] text-[#6e6b5e] leading-relaxed mt-1">
              {data.ai.summary}
            </div>

            {data.ai.suggestions.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="text-[9px] font-bold text-[#8c8877] uppercase">Action Items</span>
                {data.ai.suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-[#191919] bg-white p-2 rounded border border-[#e3e0d5]">
                    <Sparkles className="w-3 h-3 text-[#c15f3c] shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 4 Lighthouse Core Score Gauge Ring Component
function ScoreRing({ score, label }: { score: number; label: string }) {
  const isGreen = score >= 90;
  const isOrange = score >= 50 && score < 90;
  const strokeColor = isGreen ? "#16a34a" : isOrange ? "#d97706" : "#dc2626";
  const bgFill = isGreen ? "rgba(22, 163, 74, 0.08)" : isOrange ? "rgba(217, 119, 6, 0.08)" : "rgba(220, 38, 38, 0.08)";

  const strokeDasharray = `${score * 1.76} 200`;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-14 h-14 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" stroke="#f0ede8" strokeWidth="4" fill={bgFill} />
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke={strokeColor}
            strokeWidth="4"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="absolute font-extrabold text-sm text-[#191919] font-mono">{score}</span>
      </div>
      <span className="text-[10px] font-bold text-[#6e6b5e] leading-tight">{label}</span>
    </div>
  );
}

function MetricRow({ status, label, value }: { status: "pass" | "warning" | "error"; label: string; value: string }) {
  const textColor = status === "pass" ? "text-emerald-600" : status === "warning" ? "text-amber-600" : "text-red-600";
  return (
    <div className="flex items-center justify-between py-2 px-1 text-xs">
      <div className="flex items-center gap-2">
        <StatusIcon status={status} />
        <span className="text-[#191919] font-semibold">{label}</span>
      </div>
      <span className={`font-mono font-bold ${textColor}`}>{value}</span>
    </div>
  );
}

function StatusIcon({ status }: { status: "pass" | "warning" | "error" }) {
  if (status === "pass") {
    return <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />;
  }
  if (status === "warning") {
    return <div className="w-2.5 h-2.5 bg-amber-500 shrink-0 transform rotate-45" />;
  }
  return <div className="w-2.5 h-2.5 bg-red-500 shrink-0 transform rotate-45" />;
}

function SeoRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#e3e0d5] text-xs">
      <span className="text-[#8c8877] font-medium shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0 font-semibold truncate ml-2">
        {ok !== undefined && (
          ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        )}
        <span className="truncate text-[#191919]">{value}</span>
      </div>
    </div>
  );
}
