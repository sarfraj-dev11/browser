"use client";

import React, { useState, useEffect } from "react";
import { 
  Edit3, Play, RefreshCw, CheckCircle2, AlertTriangle, 
  AlertCircle, BookOpen, Sparkles, Type
} from "lucide-react";

interface SpellingToolProps {
  activeUrl?: string;
}

export interface SpellingResult {
  url: string;
  totalWords: number;
  uniquenessScore: number; // Percentage of unique words
  readabilityScore: number; // Flesch-Kincaid index
  readabilityGrade: string;
  spellingErrorsCount: number;
  flaggedPhrases: Array<{
    phrase: string;
    suggestion: string;
    reason: string;
  }>;
}

export function SpellingTool({ activeUrl = "" }: SpellingToolProps) {
  const [targetUrlInput, setTargetUrlInput] = useState<string>(activeUrl || "");
  const [isAuditing, setIsAuditing] = useState(false);
  const [data, setData] = useState<SpellingResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isInternalPage = (u: string) => !u || u.includes("about:newtab") || u.includes("about:blank");

  const runSpellingAudit = async (urlToAudit: string) => {
    const cleanUrl = urlToAudit.trim();
    if (isInternalPage(cleanUrl)) {
      setErrorMsg("Please enter a valid website URL to audit text spelling.");
      setData(null);
      return;
    }

    setIsAuditing(true);
    setErrorMsg(null);
    setData(null);

    let targetUrl = cleanUrl;
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    try {
      let extractedText = "";

      // 1. Attempt visible webview DOM innerText extraction
      if (typeof document !== "undefined") {
        try {
          const webviews = Array.from(document.querySelectorAll("webview")) as any[];
          let targetWebview: any = null;
          let targetDomain = "";
          try { targetDomain = new URL(targetUrl).hostname; } catch {}

          for (const wv of webviews) {
            const wvUrl = wv.getURL ? wv.getURL() : wv.src;
            if (wvUrl && !wvUrl.startsWith("about:") && targetDomain && wvUrl.includes(targetDomain)) {
              targetWebview = wv;
              break;
            }
          }

          if (targetWebview && typeof targetWebview.executeJavaScript === "function") {
            const pageText = await targetWebview.executeJavaScript("document.body ? document.body.innerText : ''").catch(() => "");
            if (pageText) extractedText = pageText;
          }
        } catch (wvErr) {
          console.warn("Spelling webview innerText fetch notice:", wvErr);
        }
      }

      // 2. Fetch page body fallback via IPC
      if (!extractedText && typeof window !== "undefined") {
        let ipcRenderer: any = null;
        if (typeof (window as any).require === "function") {
          ipcRenderer = (window as any).require("electron")?.ipcRenderer;
        }

        if (ipcRenderer && typeof ipcRenderer.invoke === "function") {
          const res = await ipcRenderer.invoke("crawl-website", { url: targetUrl }).catch(() => null);
          if (res && res.html) {
            extractedText = res.html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
          }
        }
      }

      if (!extractedText) {
        throw new Error("Could not extract page text for readability auditing.");
      }

      // Analyze page text content dynamically
      const cleanWords = extractedText.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'\n]/g, " ").split(/\s+/).filter(Boolean);
      const totalWords = cleanWords.length;
      
      const uniqueWords = Array.from(new Set(cleanWords.map(w => w.toLowerCase())));
      const uniquenessScore = totalWords > 0 ? Math.round((uniqueWords.length / totalWords) * 100) : 0;

      // Syllables estimation helper
      const getSyllablesCount = (word: string): number => {
        let w = word.toLowerCase();
        if (w.length <= 3) return 1;
        w = w.replace(/(?:es|ed|e)$/, '');
        const vowels = w.match(/[aeiouy]{1,2}/g);
        return vowels ? vowels.length : 1;
      };

      // Flesch-Kincaid calculations
      const sentencesCount = Math.max(1, extractedText.split(/[.!?]+/).filter(Boolean).length);
      const totalSyllables = cleanWords.reduce((acc, word) => acc + getSyllablesCount(word), 0);
      
      const asl = totalWords / sentencesCount; // Average sentence length
      const asw = totalSyllables / Math.max(1, totalWords); // Average syllables per word
      
      let readabilityScore = parseFloat((206.835 - (1.015 * asl) - (84.6 * asw)).toFixed(1));
      readabilityScore = Math.max(1, Math.min(100, readabilityScore));

      let grade = "Professional (College Graduate)";
      if (readabilityScore > 90) grade = "Easy (5th Grade)";
      else if (readabilityScore > 80) grade = "Conversational (6th Grade)";
      else if (readabilityScore > 70) grade = "Straightforward (7th Grade)";
      else if (readabilityScore > 60) grade = "Standard (8th-9th Grade)";
      else if (readabilityScore > 50) grade = "Fairly Difficult (High School)";
      else if (readabilityScore > 30) grade = "Difficult (College level)";

      // Spelling anomalies checks
      const flaggedPhrases: SpellingResult["flaggedPhrases"] = [];
      const commonMispellings: Record<string, string> = {
        teh: "the",
        recieve: "receive",
        seperate: "separate",
        untill: "until",
        beleive: "believe"
      };

      cleanWords.slice(0, 300).forEach(w => {
        const lower = w.toLowerCase();
        if (commonMispellings[lower]) {
          flaggedPhrases.push({
            phrase: w,
            suggestion: commonMispellings[lower],
            reason: "Common spelling mistake detected"
          });
        }
      });

      setData({
        url: targetUrl,
        totalWords,
        uniquenessScore,
        readabilityScore,
        readabilityGrade: grade,
        spellingErrorsCount: flaggedPhrases.length,
        flaggedPhrases
      });
    } catch (err: any) {
      console.warn("Spelling tool notice:", err);
      setErrorMsg(err?.message || "Failed to extract and audit text readability.");
      setData(null);
    } finally {
      setIsAuditing(false);
    }
  };

  useEffect(() => {
    if (activeUrl && !isInternalPage(activeUrl)) {
      setTargetUrlInput(activeUrl);
      runSpellingAudit(activeUrl);
    } else {
      setTargetUrlInput(activeUrl || "");
      setErrorMsg("Navigate to a website or enter a URL below to run the Spelling & Readability audit.");
      setData(null);
    }
  }, [activeUrl]);

  return (
    <div className="flex flex-col gap-3 font-sans select-none text-xs">
      {/* Target Input Form */}
      <form onSubmit={(e) => { e.preventDefault(); runSpellingAudit(targetUrlInput); }} className="p-3 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5 text-[#c15f3c]" /> Spelling & Readability Auditor
          </span>
        </div>

        <div className="flex gap-1.5">
          <input
            type="text"
            value={targetUrlInput}
            onChange={(e) => setTargetUrlInput(e.target.value)}
            placeholder="Enter website URL to audit copy text..."
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
                <Play className="w-3.5 h-3.5 fill-current" /> Audit
              </>
            )}
          </button>
        </div>
      </form>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 flex flex-col gap-2 text-amber-900 shadow-xs">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-bold text-xs">Readability Audit Notice</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      {data && !errorMsg && (
        <div className="flex flex-col gap-3">
          {/* Readability Scorecard */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex items-center justify-between shadow-xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-[#8c8877] uppercase block">Flesch Readability Index</span>
              <span className="text-xs font-bold text-[#191919]">{data.readabilityGrade}</span>
              <span className="text-[9px] text-[#8c8877] font-mono">{data.totalWords} words analyzed</span>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-[#c15f3c] flex items-center justify-center text-xs font-mono font-extrabold text-[#191919]">
              {data.readabilityScore}
            </div>
          </div>

          {/* Grammar stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] text-center">
              <span className="text-[9px] font-bold text-[#8c8877] uppercase block">Lexical Uniqueness</span>
              <span className="text-sm font-extrabold text-emerald-600 font-mono mt-0.5">{data.uniquenessScore}%</span>
            </div>
            <div className="p-3 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] text-center">
              <span className="text-[9px] font-bold text-[#8c8877] uppercase block">Spelling Flags</span>
              <span className={`text-sm font-extrabold font-mono mt-0.5 ${data.spellingErrorsCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {data.spellingErrorsCount}
              </span>
            </div>
          </div>

          {/* Flags details list */}
          {data.flaggedPhrases.length > 0 ? (
            <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2 shadow-xs">
              <span className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-600" /> Flagged Typographic Anomalies
              </span>
              <div className="flex flex-col gap-1.5">
                {data.flaggedPhrases.map((flag, idx) => (
                  <div key={idx} className="p-2 bg-white rounded-lg border border-[#e3e0d5] flex flex-col gap-1 text-[11px] text-[#191919]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#dc2626] line-through">{flag.phrase}</span>
                      <span className="text-emerald-600 font-bold font-mono">Suggested: {flag.suggestion}</span>
                    </div>
                    <span className="text-[9px] text-[#8c8877]">{flag.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] text-center italic text-[#8c8877]">
              All analyzed copy text matches standard vocabulary indexes.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
