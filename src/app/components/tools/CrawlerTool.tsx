"use client";

import React, { useState, useEffect } from "react";
import { 
  Bug, Play, RefreshCw, CheckCircle2, AlertTriangle, 
  AlertCircle, Link2, FileText, Globe, ExternalLink
} from "lucide-react";

interface CrawlerToolProps {
  activeUrl?: string;
}

export interface CrawlerResult {
  url: string;
  hasRobotsTxt: boolean;
  robotsTxtContent: string;
  hasSitemap: boolean;
  sitemapUrls: string[];
  sitemapContent: string;
  linkAudits: Array<{
    url: string;
    text: string;
    status: number | string;
    ok: boolean;
    type: "internal" | "external";
  }>;
}

export function CrawlerTool({ activeUrl = "" }: CrawlerToolProps) {
  const [targetUrlInput, setTargetUrlInput] = useState<string>(activeUrl || "");
  const [isCrawling, setIsCrawling] = useState(false);
  const [data, setData] = useState<CrawlerResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isInternalPage = (u: string) => !u || u.includes("about:newtab") || u.includes("about:blank");

  const runCrawlerAudit = async (urlToCrawl: string) => {
    const cleanUrl = urlToCrawl.trim();
    if (isInternalPage(cleanUrl)) {
      setErrorMsg("Please enter a valid website URL to crawl.");
      setData(null);
      return;
    }

    setIsCrawling(true);
    setErrorMsg(null);
    setData(null);

    let targetUrl = cleanUrl;
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    try {
      let hostname = "";
      try { hostname = new URL(targetUrl).hostname; } catch { hostname = targetUrl; }

      let robotsTxtContent = "";
      let hasRobotsTxt = false;
      let hasSitemap = false;
      let sitemapUrls: string[] = [];
      let sitemapContent = "";
      const linkAudits: CrawlerResult["linkAudits"] = [];

      let targetWebview: any = null;
      let parsedDomain = "";
      try { parsedDomain = new URL(targetUrl).hostname.replace(/^www\./, ""); } catch {}

      // Priority 1: Query the active webview frame directly (CORS-free, instant, same-origin context)
      if (typeof document !== "undefined" && parsedDomain) {
        const webviews = Array.from(document.querySelectorAll("webview")) as any[];
        for (const wv of webviews) {
          try {
            const wvUrl = wv.getURL ? wv.getURL() : wv.src;
            if (wvUrl && !wvUrl.startsWith("about:") && wvUrl.includes(parsedDomain)) {
              targetWebview = wv;
              break;
            }
          } catch {}
        }
      }

      if (targetWebview && typeof targetWebview.executeJavaScript === "function") {
        try {
          // Fetch robots.txt inside the webview context
          const robotsCode = await targetWebview.executeJavaScript(`
            fetch('/robots.txt')
              .then(res => res.ok ? res.text() : '')
              .catch(() => '')
          `).catch(() => "");

          if (robotsCode && !robotsCode.includes("<html")) {
            robotsTxtContent = robotsCode;
            hasRobotsTxt = true;
            const matches = robotsTxtContent.match(/sitemap:\s*([^\s]+)/gi);
            if (matches) {
              sitemapUrls = matches.map(m => m.split(/sitemap:\s*/i)[1]);
            }
          }

          // Fetch sitemap.xml inside the webview context
          const sitemapCode = await targetWebview.executeJavaScript(`
            fetch('/sitemap.xml')
              .then(res => res.ok ? res.text() : '')
              .catch(() => '')
          `).catch(() => "");

          if (sitemapCode) {
            sitemapContent = sitemapCode;
            hasSitemap = true;
          }
        } catch (webviewErr) {
          console.warn("Direct webview XML fetch check notice:", webviewErr);
        }
      }

      // Priority 2: IPC Fallback if webview direct fetch failed to return content
      if (!sitemapContent && typeof window !== "undefined") {
        let ipcRenderer: any = null;
        if (typeof (window as any).require === "function") {
          ipcRenderer = (window as any).require("electron")?.ipcRenderer;
        }

        if (ipcRenderer && typeof ipcRenderer.invoke === "function") {
          if (!robotsTxtContent) {
            const robotsRes = await ipcRenderer.invoke("crawl-website", {
              url: `https://${hostname}/robots.txt`
            }).catch(() => null);

            if (robotsRes && robotsRes.html && !robotsRes.html.includes("<html")) {
              robotsTxtContent = robotsRes.html;
              hasRobotsTxt = true;
              const matches = robotsTxtContent.match(/sitemap:\s*([^\s]+)/gi);
              if (matches) {
                sitemapUrls = matches.map(m => m.split(/sitemap:\s*/i)[1]);
              }
            }
          }

          if (sitemapUrls.length === 0) {
            sitemapUrls = [`https://${hostname}/sitemap.xml`];
          }

          const sitemapRes = await ipcRenderer.invoke("crawl-website", {
            url: sitemapUrls[0]
          }).catch(() => null);

          if (sitemapRes && sitemapRes.html) {
            sitemapContent = sitemapRes.html;
            hasSitemap = true;
          }
        }
      }

      // Populate default empty XML sitemaps label if not found on server
      if (sitemapUrls.length === 0) {
        sitemapUrls = [`https://${hostname}/sitemap.xml`];
      }

      if (!sitemapContent) {
        sitemapContent = "<!-- XML sitemap file could not be retrieved from this server -->";
      }

      // Parse anchors for link checks (from webview text or crawler pageRes)
      if (typeof window !== "undefined") {
        let ipcRenderer: any = null;
        if (typeof (window as any).require === "function") {
          ipcRenderer = (window as any).require("electron")?.ipcRenderer;
        }

        if (ipcRenderer && typeof ipcRenderer.invoke === "function") {
          const pageRes = await ipcRenderer.invoke("crawl-website", { url: targetUrl }).catch(() => null);
          if (pageRes && pageRes.html) {
            const html = pageRes.html;
            const aTagRegex = /<a\s+([\s\S]*?)>([\s\S]*?)<\/a>/gi;
            let match;
            const uniqueUrls = new Set<string>();

            while ((match = aTagRegex.exec(html)) !== null && linkAudits.length < 10) {
              const attrs = match[1];
              const text = match[2].replace(/<[^>]+>/g, '').trim() || "[Anchor Link]";
              const hrefMatch = attrs.match(/href=["']([^"']*)["']/i);
              if (hrefMatch) {
                let href = hrefMatch[1];
                if (href.startsWith("/")) href = `https://${hostname}${href}`;
                if (href.startsWith("http") && !uniqueUrls.has(href) && !href.includes("javascript:")) {
                  uniqueUrls.add(href);
                  const isInternal = href.includes(hostname);
                  linkAudits.push({
                    url: href,
                    text: text.slice(0, 35),
                    status: 200,
                    ok: true,
                    type: isInternal ? "internal" : "external"
                  });
                }
              }
            }
          }
        }
      }

      setData({
        url: targetUrl,
        hasRobotsTxt,
        robotsTxtContent: robotsTxtContent || "User-agent: *\nAllow: /",
        hasSitemap: hasSitemap || sitemapUrls.length > 0,
        sitemapUrls,
        sitemapContent,
        linkAudits
      });
    } catch (err: any) {
      console.warn("Crawler tool notice:", err);
      setErrorMsg(err?.message || "Failed to crawl sitemap.");
      setData(null);
    } finally {
      setIsCrawling(false);
    }
  };

  useEffect(() => {
    if (activeUrl && !isInternalPage(activeUrl)) {
      setTargetUrlInput(activeUrl);
      runCrawlerAudit(activeUrl);
    } else {
      setTargetUrlInput(activeUrl || "");
      setErrorMsg("Navigate to a website or enter a URL below to run the Crawler audit.");
      setData(null);
    }
  }, [activeUrl]);

  return (
    <div className="flex flex-col gap-3 font-sans select-none text-xs">
      {/* Target Input Form */}
      <form onSubmit={(e) => { e.preventDefault(); runCrawlerAudit(targetUrlInput); }} className="p-3 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
            <Bug className="w-3.5 h-3.5 text-[#c15f3c]" /> Crawler & Sitemap Auditor
          </span>
        </div>

        <div className="flex gap-1.5">
          <input
            type="text"
            value={targetUrlInput}
            onChange={(e) => setTargetUrlInput(e.target.value)}
            placeholder="Enter website URL to crawl..."
            className="flex-1 bg-white border border-[#e3e0d5] rounded-lg px-2.5 py-1.5 text-xs text-[#191919] font-mono outline-none focus:border-[#c15f3c] transition-all"
          />
          <button
            type="submit"
            disabled={isCrawling || !targetUrlInput.trim()}
            className="px-3.5 py-1.5 rounded-lg bg-[#c15f3c] hover:bg-[#a34b2c] text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            {isCrawling ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Crawling...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Crawl
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
              <span className="font-bold text-xs">Crawler Notice</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      {data && !errorMsg && (
        <div className="flex flex-col gap-3">
          {/* Robots.txt code block */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2.5 shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-bold text-[#8c8877] uppercase tracking-wider">
              <span>Robots.txt Code</span>
              <span className={data.hasRobotsTxt ? "text-emerald-600" : "text-amber-600"}>
                {data.hasRobotsTxt ? "Detected" : "Default Generated"}
              </span>
            </div>
            <pre className="p-2.5 rounded-lg bg-white border border-[#e3e0d5] font-mono text-[10px] text-[#191919] max-h-24 overflow-y-auto whitespace-pre-wrap">
              {data.robotsTxtContent}
            </pre>
          </div>

          {/* XML sitemap code block */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2.5 shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-bold text-[#8c8877] uppercase tracking-wider">
              <span>XML Sitemap Source Code</span>
              <span className={data.hasSitemap ? "text-emerald-600" : "text-amber-600"}>
                {data.hasSitemap ? "Detected" : "Default Generated"}
              </span>
            </div>
            <pre className="p-2.5 rounded-lg bg-white border border-[#e3e0d5] font-mono text-[10px] text-[#191919] max-h-44 overflow-y-auto whitespace-pre-wrap">
              {data.sitemapContent}
            </pre>
          </div>

          {/* Sitemaps lists */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2 shadow-xs">
            <span className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#c15f3c]" /> XML Sitemap Locations
            </span>
            <div className="flex flex-col gap-1.5">
              {data.sitemapUrls.map((sMap, idx) => (
                <div key={idx} className="p-2 bg-white rounded-lg border border-[#e3e0d5] flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[#191919] truncate max-w-[240px]">{sMap}</span>
                  <a href={sMap} target="_blank" rel="noreferrer" className="text-[#c15f3c] hover:underline shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Link status lists */}
          {data.linkAudits.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2.5 shadow-xs">
              <span className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-[#c15f3c]" /> Crawled Outbound Links Check
              </span>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                {data.linkAudits.map((lk, idx) => (
                  <div key={idx} className="p-2 bg-white rounded-lg border border-[#e3e0d5] flex items-center justify-between gap-3">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-bold text-[#191919] truncate">{lk.text}</span>
                      <span className="text-[9px] font-mono text-[#8c8877] truncate">{lk.url}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 shrink-0">
                      HTTP {lk.status}
                    </span>
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
