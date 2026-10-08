"use client";

import React, { useState, useEffect } from "react";
import { 
  FolderSearch, Search, RefreshCw, Play, CheckCircle2, AlertTriangle, 
  Globe, AlertCircle, FileText, Heading, Link, Image, Sparkles, XCircle
} from "lucide-react";
import { crawlAndAuditWebsite, SeoAuditResult } from "../../utils/seoCrawler";

interface OnPageSeoToolProps {
  activeUrl?: string;
}

export function OnPageSeoTool({ activeUrl = "" }: OnPageSeoToolProps) {
  const [targetUrlInput, setTargetUrlInput] = useState<string>(activeUrl || "");
  const [isAuditing, setIsAuditing] = useState(false);
  const [data, setData] = useState<SeoAuditResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"errors" | "warnings" | "passed">("errors");
  const [showLinksList, setShowLinksList] = useState(true);

  const isInternalPage = (u: string) => !u || u.includes("about:newtab") || u.includes("about:blank");

  const runOnPageAudit = async (urlToAudit: string) => {
    const cleanUrl = urlToAudit.trim();
    if (isInternalPage(cleanUrl)) {
      setErrorMsg("Please enter or navigate to a valid website URL to perform an On-Page SEO audit.");
      setData(null);
      return;
    }

    setIsAuditing(true);
    setErrorMsg(null);
    setData(null);

    try {
      const res = await crawlAndAuditWebsite(cleanUrl);
      setData(res);
      // Default to error tab if errors exist, otherwise warnings
      if (res.errors.length > 0) setActiveTab("errors");
      else if (res.warnings.length > 0) setActiveTab("warnings");
      else setActiveTab("passed");
    } catch (err: any) {
      console.warn("On-page SEO notice:", err);
      setErrorMsg(err?.message || "Failed to retrieve DOM metadata for audit.");
      setData(null);
    } finally {
      setIsAuditing(false);
    }
  };

  useEffect(() => {
    if (activeUrl && !isInternalPage(activeUrl)) {
      setTargetUrlInput(activeUrl);
      runOnPageAudit(activeUrl);
    } else {
      setTargetUrlInput(activeUrl || "");
      setErrorMsg("Navigate to a website or enter a URL below to perform an On-Page SEO audit.");
      setData(null);
    }
  }, [activeUrl]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runOnPageAudit(targetUrlInput);
  };

  return (
    <div className="flex flex-col gap-3 font-sans select-none text-xs">
      {/* Header Input Form */}
      <form onSubmit={handleFormSubmit} className="p-3 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
            <FolderSearch className="w-3.5 h-3.5 text-[#c15f3c]" /> On-Page SEO Auditor
          </span>
          {data && (
            <span className="px-2 py-0.5 rounded-full bg-[#c15f3c]/10 text-[#c15f3c] text-[9px] font-bold border border-[#c15f3c]/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c15f3c] animate-pulse" /> SEO Evaluated
            </span>
          )}
        </div>

        <div className="flex gap-1.5">
          <input
            type="text"
            value={targetUrlInput}
            onChange={(e) => setTargetUrlInput(e.target.value)}
            placeholder="Enter URL to audit..."
            className="flex-1 bg-white border border-[#e3e0d5] rounded-lg px-2.5 py-1.5 text-xs text-[#191919] font-mono outline-none focus:border-[#c15f3c] transition-all"
          />
          <button
            type="submit"
            disabled={isAuditing || !targetUrlInput.trim()}
            className="px-3.5 py-1.5 rounded-lg bg-[#c15f3c] hover:bg-[#a34b2c] text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            {isAuditing ? (
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
              <span className="font-bold text-xs">On-Page SEO Notice</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      {data && !errorMsg && (
        <div className="flex flex-col gap-3">
          {/* SECTION 1: ON-PAGE SEO SCORE */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex items-center justify-between shadow-xs">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider">
                Overall SEO Score
              </span>
              <span className="text-sm font-bold text-[#191919] truncate">
                {data.seoScore >= 90 ? "SEO Fully Optimized" : data.seoScore >= 70 ? "Minor Warnings Present" : "Critical SEO Fixes Required"}
              </span>
              <span className="text-[10px] text-[#8c8877] font-mono truncate">
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
                  stroke={data.seoScore >= 90 ? "#16a34a" : data.seoScore >= 70 ? "#d97706" : "#dc2626"}
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${data.seoScore * 1.76} 200`}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <span className="absolute font-extrabold text-sm text-[#191919] font-mono">
                {data.seoScore}
              </span>
            </div>
          </div>

          {/* SECTION 2: METADATA PREVIEWS */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2.5 shadow-xs">
            <div className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#c15f3c]" /> Page HTML Metadata tags
            </div>

            {/* Title Tag */}
            <div className="p-2.5 rounded-lg bg-white border border-[#e3e0d5] flex flex-col gap-1">
              <div className="flex items-center justify-between text-[9px] font-bold text-[#8c8877]">
                <span>TITLE TAG</span>
                <span className={data.titleStatus === "good" ? "text-emerald-600" : "text-amber-600"}>
                  {data.titleLength} Chars • {data.titleStatus}
                </span>
              </div>
              <span className="text-xs font-semibold text-[#191919] leading-relaxed">
                {data.title || "—"}
              </span>
            </div>

            {/* Meta Description */}
            <div className="p-2.5 rounded-lg bg-white border border-[#e3e0d5] flex flex-col gap-1">
              <div className="flex items-center justify-between text-[9px] font-bold text-[#8c8877]">
                <span>META DESCRIPTION</span>
                <span className={data.descriptionStatus === "good" ? "text-emerald-600" : "text-amber-600"}>
                  {data.descriptionLength} Chars • {data.descriptionStatus}
                </span>
              </div>
              <p className="text-xs text-[#6e6b5e] leading-relaxed">
                {data.description || "—"}
              </p>
            </div>

            {/* Canonical Tag */}
            <div className="p-2.5 rounded-lg bg-white border border-[#e3e0d5] flex flex-col gap-1">
              <span className="text-[9px] font-bold text-[#8c8877]">CANONICAL LINK</span>
              <span className="text-[10px] font-mono text-[#c15f3c] truncate">
                {data.canonicalUrl || "Missing rel='canonical' tag"}
              </span>
            </div>
          </div>

          {/* SECTION 3: HEADINGS HIERARCHY TREE */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2.5 shadow-xs">
            <div className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
              <Heading className="w-3.5 h-3.5 text-[#c15f3c]" /> Headings Hierarchy Tree
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-white border border-[#e3e0d5]">
                <span className="text-[9px] font-bold text-[#8c8877] block">H1 Headings</span>
                <span className="text-xs font-mono font-bold text-[#191919]">{data.h1Count} tags</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-[#e3e0d5]">
                <span className="text-[9px] font-bold text-[#8c8877] block">H2 Headings</span>
                <span className="text-xs font-mono font-bold text-[#191919]">{data.h2Count} tags</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-[#e3e0d5]">
                <span className="text-[9px] font-bold text-[#8c8877] block">H3 Headings</span>
                <span className="text-xs font-mono font-bold text-[#191919]">{data.h3Count} tags</span>
              </div>
            </div>

            {data.h1List.length > 0 && (
              <div className="p-2 rounded-lg bg-white border border-[#e3e0d5] flex flex-col gap-1">
                <span className="text-[9px] font-bold text-[#8c8877]">H1 CONTENT TEXT</span>
                <div className="flex flex-col gap-1">
                  {data.h1List.map((h1, i) => (
                    <div key={i} className="text-[11px] text-[#191919] font-semibold leading-relaxed pl-2 border-l border-[#c15f3c]">
                      {h1}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: CONTENT & LINK STATS */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-[#c15f3c]" /> Content & Link Audits
              </span>
              {data.linksList && data.linksList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowLinksList(!showLinksList)}
                  className="text-[9px] font-bold text-[#c15f3c] hover:underline cursor-pointer"
                >
                  {showLinksList ? "Hide Hyperlinks" : `Show All Hyperlinks (${data.linksList.length})`}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-white border border-[#e3e0d5] flex flex-col">
                <span className="text-[9px] font-bold text-[#8c8877]">WORD COUNT</span>
                <span className="text-sm font-extrabold font-mono text-[#191919] mt-0.5">
                  {data.wordCount.toLocaleString()} words
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-[#e3e0d5] flex flex-col">
                <span className="text-[9px] font-bold text-[#8c8877]">TOTAL HYPERLINKS</span>
                <span className="text-sm font-extrabold font-mono text-[#191919] mt-0.5">
                  {data.totalLinks} links
                </span>
              </div>
            </div>

            <div className="flex flex-col bg-white rounded-lg border border-[#e3e0d5] p-2 divide-y divide-[#e3e0d5]">
              <div className="flex justify-between py-1 px-1">
                <span className="text-[#8c8877]">Internal Links</span>
                <span className="font-mono font-bold text-[#191919]">{data.internalLinks}</span>
              </div>
              <div className="flex justify-between py-1 px-1">
                <span className="text-[#8c8877]">External Outbound Links</span>
                <span className="font-mono font-bold text-[#191919]">{data.externalLinks}</span>
              </div>
            </div>

            {/* EXPANDABLE HYPERLINKS LIST */}
            {showLinksList && data.linksList && data.linksList.length > 0 && (
              <div className="mt-1 bg-white border border-[#e3e0d5] rounded-lg overflow-hidden flex flex-col max-h-56">
                <div className="bg-[#f9f8f6] px-2.5 py-1.5 border-b border-[#e3e0d5] text-[9px] font-bold text-[#8c8877] uppercase flex items-center justify-between">
                  <span>List of Links</span>
                  <span>Type</span>
                </div>
                <div className="overflow-y-auto divide-y divide-[#e3e0d5] max-h-48">
                  {data.linksList.map((lk, idx) => (
                    <div key={idx} className="p-2 flex items-start justify-between gap-3 hover:bg-black/5">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-[#191919] truncate">{lk.text}</span>
                        <a 
                          href={lk.href} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[9px] font-mono text-[#c15f3c] truncate hover:underline"
                          title={lk.href}
                        >
                          {lk.href}
                        </a>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase shrink-0 ${
                        lk.type === "internal" 
                          ? "bg-blue-500/10 text-blue-800 border border-blue-500/20" 
                          : "bg-amber-500/10 text-amber-800 border border-amber-500/20"
                      }`}>
                        {lk.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 5: IMAGE AUDIT */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2.5 shadow-xs">
            <div className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5 text-[#c15f3c]" /> Image Alt Tags Auditor
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-white border border-[#e3e0d5] flex flex-col items-center">
                <span className="text-[9px] font-bold text-[#8c8877] uppercase">Total Images</span>
                <span className="text-sm font-extrabold font-mono text-[#191919] mt-0.5">
                  {data.totalImages}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-[#e3e0d5] flex flex-col items-center">
                <span className="text-[9px] font-bold text-[#8c8877] uppercase text-amber-700">Missing Alt Tags</span>
                <span className="text-sm font-extrabold font-mono text-amber-600 mt-0.5">
                  {data.missingAltCount}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 6: DYNAMIC ISSUES CHECKLIST */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2 shadow-xs">
            {/* Tabs Selector */}
            <div className="flex border-b border-[#e3e0d5] pb-1">
              {[
                { id: "errors", label: `Errors (${data.errors.length})`, color: "text-red-600" },
                { id: "warnings", label: `Warnings (${data.warnings.length})`, color: "text-amber-600" },
                { id: "passed", label: `Passed (${data.passedChecks.length})`, color: "text-emerald-600" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 text-center py-1 text-[10px] font-bold transition-all border-b-2 cursor-pointer ${
                    activeTab === tab.id 
                      ? `${tab.color} border-current` 
                      : "text-[#8c8877] border-transparent hover:text-[#191919]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex flex-col gap-1.5 mt-1.5">
              {activeTab === "errors" && (
                data.errors.length > 0 ? (
                  data.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-1.5 p-2 rounded-lg bg-red-50 border border-red-200/80 text-red-950 text-[11px] leading-relaxed">
                      <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                      <span>{err}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-[10px] text-[#8c8877] text-center py-3 italic">No errors found. Good job!</span>
                )
              )}

              {activeTab === "warnings" && (
                data.warnings.length > 0 ? (
                  data.warnings.map((warn, i) => (
                    <div key={i} className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-950 text-[11px] leading-relaxed">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{warn}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-[10px] text-[#8c8877] text-center py-3 italic">No warnings found.</span>
                )
              )}

              {activeTab === "passed" && (
                data.passedChecks.length > 0 ? (
                  data.passedChecks.map((ok, i) => (
                    <div key={i} className="flex items-start gap-1.5 p-2 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-950 text-[11px] leading-relaxed">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{ok}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-[10px] text-[#8c8877] text-center py-3 italic">No passed audits.</span>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
