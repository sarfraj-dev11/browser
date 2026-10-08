"use client";

import React, { useState, useEffect } from "react";
import { 
  Zap, Play, RefreshCw, CheckCircle2, AlertTriangle, 
  AlertCircle, Image, FileText, Sparkles, Scale
} from "lucide-react";

interface ImageAuditorProps {
  activeUrl?: string;
}

export interface ImageDetailItem {
  src: string;
  alt: string;
  hasAlt: boolean;
  format: string;
  isWebpOrSvg: boolean;
  width: number;
  height: number;
  hasSizeAttrs: boolean;
}

export interface ImageAuditorResult {
  url: string;
  totalImages: number;
  webpCoverageScore: number; // percentage
  missingAltCount: number;
  missingSizeCount: number;
  images: ImageDetailItem[];
}

export function ImageAuditorTool({ activeUrl = "" }: ImageAuditorProps) {
  const [targetUrlInput, setTargetUrlInput] = useState<string>(activeUrl || "");
  const [isAuditing, setIsAuditing] = useState(false);
  const [data, setData] = useState<ImageAuditorResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isInternalPage = (u: string) => !u || u.includes("about:newtab") || u.includes("about:blank");

  const runImageAudit = async (urlToAudit: string) => {
    const cleanUrl = urlToAudit.trim();
    if (isInternalPage(cleanUrl)) {
      setErrorMsg("Please enter a valid website URL to audit image assets.");
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
      let parsedDomain = "";
      try { parsedDomain = new URL(targetUrl).hostname; } catch {}

      const images: ImageDetailItem[] = [];
      let totalImages = 0;
      let missingAltCount = 0;
      let missingSizeCount = 0;

      // 1. Attempt visible webview DOM images extraction
      if (typeof document !== "undefined" && parsedDomain) {
        try {
          const webviews = Array.from(document.querySelectorAll("webview")) as any[];
          let targetWebview: any = null;

          for (const wv of webviews) {
            const wvUrl = wv.getURL ? wv.getURL() : wv.src;
            if (wvUrl && !wvUrl.startsWith("about:") && wvUrl.includes(parsedDomain)) {
              targetWebview = wv;
              break;
            }
          }

          if (targetWebview && typeof targetWebview.executeJavaScript === "function") {
            const extractScript = `
              (function() {
                try {
                  var imgs = Array.from(document.querySelectorAll('img')).map(function(img) {
                    var src = img.getAttribute('src') || "";
                    var alt = img.getAttribute('alt') || "";
                    var w = img.getAttribute('width') || "";
                    var h = img.getAttribute('height') || "";
                    return { src: src, alt: alt, width: w, height: h };
                  });
                  return imgs;
                } catch(e) {
                  return [];
                }
              })()
            `;
            const domImgs = await targetWebview.executeJavaScript(extractScript).catch(() => []);
            if (domImgs && domImgs.length > 0) {
              domImgs.forEach((img: any) => {
                const srcLower = img.src.toLowerCase();
                const isWebpOrSvg = srcLower.includes(".webp") || srcLower.includes(".svg");
                const hasAlt = Boolean(img.alt.trim());
                const hasSize = Boolean(img.width) && Boolean(img.height);

                if (!hasAlt) missingAltCount++;
                if (!hasSize) missingSizeCount++;

                images.push({
                  src: img.src,
                  alt: img.alt || "—",
                  hasAlt,
                  format: srcLower.endsWith(".png") ? "PNG" : srcLower.endsWith(".webp") ? "WebP" : srcLower.endsWith(".svg") ? "SVG" : "JPEG",
                  isWebpOrSvg,
                  width: parseInt(img.width) || 0,
                  height: parseInt(img.height) || 0,
                  hasSizeAttrs: hasSize
                });
              });
              totalImages = images.length;
            }
          }
        } catch (wvErr) {
          console.warn("Image webview audit notice:", wvErr);
        }
      }

      // 2. Fetch page HTML fallback via IPC
      if (images.length === 0 && typeof window !== "undefined") {
        let ipcRenderer: any = null;
        if (typeof (window as any).require === "function") {
          ipcRenderer = (window as any).require("electron")?.ipcRenderer;
        }

        if (ipcRenderer && typeof ipcRenderer.invoke === "function") {
          const res = await ipcRenderer.invoke("crawl-website", { url: targetUrl }).catch(() => null);
          if (res && res.html) {
            const html = res.html;
            const imgRegex = /<img\s+([^>]*?)>/gi;
            let match;
            while ((match = imgRegex.exec(html)) !== null && images.length < 15) {
              const attrs = match[1];
              const srcMatch = attrs.match(/src=["']([^"']*)["']/i);
              const altMatch = attrs.match(/alt=["']([^"']*)["']/i);
              const widthMatch = attrs.match(/width=["']([^"']*)["']/i);
              const heightMatch = attrs.match(/height=["']([^"']*)["']/i);

              if (srcMatch) {
                const src = srcMatch[1];
                const alt = altMatch ? altMatch[1] : "";
                const srcLower = src.toLowerCase();
                const isWebpOrSvg = srcLower.includes(".webp") || srcLower.includes(".svg");
                const hasAlt = Boolean(alt.trim());
                const hasSize = Boolean(widthMatch) && Boolean(heightMatch);

                if (!hasAlt) missingAltCount++;
                if (!hasSize) missingSizeCount++;

                images.push({
                  src,
                  alt: alt || "—",
                  hasAlt,
                  format: srcLower.endsWith(".png") ? "PNG" : srcLower.endsWith(".webp") ? "WebP" : srcLower.endsWith(".svg") ? "SVG" : "JPEG",
                  isWebpOrSvg,
                  width: widthMatch ? parseInt(widthMatch[1]) : 0,
                  height: heightMatch ? parseInt(heightMatch[1]) : 0,
                  hasSizeAttrs: hasSize
                });
              }
            }
            totalImages = images.length;
          }
        }
      }

      // If no images are found at all, handle as zero-content list rather than hardcoded mock
      const webpCount = images.filter(img => img.isWebpOrSvg).length;
      const webpCoverageScore = totalImages > 0 ? Math.round((webpCount / totalImages) * 100) : 0;

      setData({
        url: targetUrl,
        totalImages,
        webpCoverageScore,
        missingAltCount,
        missingSizeCount,
        images
      });
    } catch (err: any) {
      console.warn("Image audit check notice:", err);
      setErrorMsg(err?.message || "Failed to parse page image structures.");
      setData(null);
    } finally {
      setIsAuditing(false);
    }
  };

  useEffect(() => {
    if (activeUrl && !isInternalPage(activeUrl)) {
      setTargetUrlInput(activeUrl);
      runImageAudit(activeUrl);
    } else {
      setTargetUrlInput(activeUrl || "");
      setErrorMsg("Navigate to a website or enter a URL below to run the Image Assets audit.");
      setData(null);
    }
  }, [activeUrl]);

  return (
    <div className="flex flex-col gap-3 font-sans select-none text-xs">
      {/* Target Input Form */}
      <form onSubmit={(e) => { e.preventDefault(); runImageAudit(targetUrlInput); }} className="p-3 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#c15f3c]" /> Modern Format Image & Alt Tag Auditor
          </span>
        </div>

        <div className="flex gap-1.5">
          <input
            type="text"
            value={targetUrlInput}
            onChange={(e) => setTargetUrlInput(e.target.value)}
            placeholder="Enter website URL to audit images..."
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
              <span className="font-bold text-xs">Image Audit Notice</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      {data && !errorMsg && (
        <div className="flex flex-col gap-3">
          {/* WebP modern coverage score */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex items-center justify-between shadow-xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-[#8c8877] uppercase block">Modern Formats Coverage</span>
              <span className="text-xs font-bold text-[#191919]">
                {data.webpCoverageScore >= 80 ? "Excellent Next-Gen WebP Adoption" : "WebP Compression Recommended"}
              </span>
              <span className="text-[9px] text-[#8c8877] font-mono">{data.totalImages} total images analyzed</span>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-[#c15f3c] flex items-center justify-center text-xs font-mono font-extrabold text-[#191919]">
              {data.webpCoverageScore}%
            </div>
          </div>

          {/* Missing attributes stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] text-center">
              <span className="text-[9px] font-bold text-[#8c8877] uppercase block">Missing ALT text</span>
              <span className={`text-sm font-extrabold font-mono mt-0.5 ${data.missingAltCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {data.missingAltCount}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] text-center">
              <span className="text-[9px] font-bold text-[#8c8877] uppercase block">Missing Dimensions</span>
              <span className={`text-sm font-extrabold font-mono mt-0.5 ${data.missingSizeCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {data.missingSizeCount}
              </span>
            </div>
          </div>

          {/* Image listing detailing sizes & formats */}
          {data.images.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2.5 shadow-xs">
              <span className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5 text-[#c15f3c]" /> Image Asset Details
              </span>
              <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-0.5">
                {data.images.map((img, idx) => (
                  <div key={idx} className="p-2 bg-white rounded-lg border border-[#e3e0d5] flex items-center justify-between gap-3">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[10px] font-mono text-[#8c8877] truncate">{img.src}</span>
                      <span className="text-[11px] font-bold text-[#191919] truncate">Alt: "{img.alt}"</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-1.5 py-0.5 rounded bg-black/5 text-[9px] font-mono font-bold text-[#191919]">
                        {img.format}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                        img.hasAlt 
                          ? "bg-emerald-500/10 text-emerald-800 border border-emerald-500/20" 
                          : "bg-amber-500/10 text-amber-800 border border-amber-500/20"
                      }`}>
                        {img.hasAlt ? "Alt Tag" : "No Alt"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
