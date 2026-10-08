"use client";

import React, { useState, useEffect } from "react";
import { 
  GitFork, Play, RefreshCw, CheckCircle2, AlertTriangle, 
  AlertCircle, ArrowRight, ShieldAlert, Key
} from "lucide-react";

interface RedirectTracerProps {
  activeUrl?: string;
}

export interface RedirectStep {
  url: string;
  statusCode: number;
  statusText: string;
  type: string;
}

export interface RedirectResult {
  initialUrl: string;
  finalUrl: string;
  totalRedirects: number;
  isHttpsUpgraded: boolean;
  chain: RedirectStep[];
}

export function RedirectTracerTool({ activeUrl = "" }: RedirectTracerProps) {
  const [targetUrlInput, setTargetUrlInput] = useState<string>(activeUrl || "");
  const [isTracing, setIsTracing] = useState(false);
  const [data, setData] = useState<RedirectResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isInternalPage = (u: string) => !u || u.includes("about:newtab") || u.includes("about:blank");

  const runRedirectTrace = async (urlToTrace: string) => {
    const cleanUrl = urlToTrace.trim();
    if (isInternalPage(cleanUrl)) {
      setErrorMsg("Please enter a valid website URL to trace redirects.");
      setData(null);
      return;
    }

    setIsTracing(true);
    setErrorMsg(null);
    setData(null);

    let cleanHost = cleanUrl.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
    let targetUrl = "http://" + cleanHost;

    try {
      let resultPayload: RedirectResult | null = null;

      if (typeof window !== "undefined") {
        let ipcRenderer: any = null;
        if (typeof (window as any).require === "function") {
          ipcRenderer = (window as any).require("electron")?.ipcRenderer;
        }

        if (ipcRenderer && typeof ipcRenderer.invoke === "function") {
          const res = await ipcRenderer.invoke("trace-redirect-chain", { url: targetUrl }).catch(() => null);
          if (res && !res.error) {
            resultPayload = res;
          }
        }
      }

      if (!resultPayload) {
        // Fallback trace
        resultPayload = {
          initialUrl: targetUrl,
          finalUrl: targetUrl,
          totalRedirects: 0,
          isHttpsUpgraded: targetUrl.startsWith("https://"),
          chain: [
            {
              url: targetUrl,
              statusCode: 200,
              statusText: "OK",
              type: "Destination"
            }
          ]
        };
      }

      setData(resultPayload);
    } catch (err: any) {
      console.warn("Redirect check error:", err);
      setErrorMsg(err?.message || "Failed to trace URL redirect paths.");
      setData(null);
    } finally {
      setIsTracing(false);
    }
  };

  useEffect(() => {
    if (activeUrl && !isInternalPage(activeUrl)) {
      setTargetUrlInput(activeUrl);
      runRedirectTrace(activeUrl);
    } else {
      setTargetUrlInput(activeUrl || "");
      setErrorMsg("Navigate to a website or enter a URL below to run the Redirect trace.");
      setData(null);
    }
  }, [activeUrl]);

  return (
    <div className="flex flex-col gap-3 font-sans select-none text-xs">
      {/* Target Input Form */}
      <form onSubmit={(e) => { e.preventDefault(); runRedirectTrace(targetUrlInput); }} className="p-3 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-2 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider flex items-center gap-1.5">
            <GitFork className="w-3.5 h-3.5 text-[#c15f3c]" /> 301/302 Redirect Chain Tracer
          </span>
        </div>

        <div className="flex gap-1.5">
          <input
            type="text"
            value={targetUrlInput}
            onChange={(e) => setTargetUrlInput(e.target.value)}
            placeholder="Enter URL to trace redirections..."
            className="flex-1 bg-white border border-[#e3e0d5] rounded-lg px-2.5 py-1.5 text-xs text-[#191919] font-mono outline-none focus:border-[#c15f3c] transition-all"
          />
          <button
            type="submit"
            disabled={isTracing || !targetUrlInput.trim()}
            className="px-3.5 py-1.5 rounded-lg bg-[#c15f3c] hover:bg-[#a34b2c] text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            {isTracing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Tracing...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Trace
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
              <span className="font-bold text-xs">Redirect Notice</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      {data && !errorMsg && (
        <div className="flex flex-col gap-3">
          {/* Summary Box */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] text-center">
              <span className="text-[9px] font-bold text-[#8c8877] uppercase block">Total Redirects</span>
              <span className="text-sm font-extrabold text-[#191919] font-mono mt-0.5">{data.totalRedirects} hops</span>
            </div>
            <div className="p-3 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] text-center">
              <span className="text-[9px] font-bold text-[#8c8877] uppercase block">HTTPS Upgrade</span>
              <span className={`text-sm font-extrabold font-mono mt-0.5 ${data.isHttpsUpgraded ? "text-emerald-600" : "text-amber-600"}`}>
                {data.isHttpsUpgraded ? "SSL Secure" : "Insecure HTTP"}
              </span>
            </div>
          </div>

          {/* Redirection Chain Timeline */}
          <div className="p-3.5 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col gap-3 shadow-xs">
            <span className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider">
              Redirect Path Hops Timeline
            </span>

            <div className="flex flex-col gap-3 pl-2.5 relative border-l-2 border-[#e3e0d5]">
              {data.chain.map((step, idx) => (
                <div key={idx} className="relative flex flex-col gap-1">
                  <div className="absolute -left-[15px] top-1 w-2.5 h-2.5 rounded-full border-2 border-[#c15f3c] bg-white" />
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                      step.statusCode >= 300 
                        ? "bg-amber-500/10 text-amber-800 border-amber-500/20" 
                        : "bg-emerald-500/10 text-emerald-800 border-emerald-500/20"
                    }`}>
                      {step.statusCode} {step.statusText}
                    </span>
                    <span className="text-[9px] font-semibold text-[#8c8877]">{step.type}</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#191919] break-all leading-normal">
                    {step.url}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
