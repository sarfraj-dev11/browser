"use client";

import React, { useState } from "react";
import { 
  BarChart3, Eye, Link2, TrendingUp, FolderSearch, Trophy, 
  Bug, Edit3, GitFork, Zap, ArrowLeft, Play, ShieldAlert, CheckCircle2 
} from "lucide-react";
import { AnalyzeWebsiteTool } from "./AnalyzeWebsiteTool";
import { VisualAnalyzeTool } from "./VisualAnalyzeTool";
import { RankTrackerTool } from "./RankTrackerTool";
import { OnPageSeoTool } from "./OnPageSeoTool";
import { AuthorityTool } from "./AuthorityTool";
import { CrawlerTool } from "./CrawlerTool";
import { SpellingTool } from "./SpellingTool";
import { RedirectTracerTool } from "./RedirectTracerTool";
import { ImageAuditorTool } from "./ImageAuditorTool";

export type ToolItem = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const TOOLS_LIST: ToolItem[] = [
  {
    id: "analyze_website",
    name: "Analyze Website",
    description: "Deep Performance, SEO & Security Audit",
    icon: BarChart3
  },
  {
    id: "visual_analyze",
    name: "Visual Analyze",
    description: "UI/UX, Heatmap & Visual Hierarchy",
    icon: Eye
  },
  {
    id: "rank_tracker",
    name: "Rank Tracker",
    description: "SERP Keyword Position Tracking",
    icon: TrendingUp
  },
  {
    id: "on_page_seo",
    name: "On-Page SEO",
    description: "Meta tags, H1-H6 & Content Auditor",
    icon: FolderSearch
  },
  {
    id: "authority",
    name: "Authority",
    description: "Domain & Page Authority Analytics",
    icon: Trophy
  },
  {
    id: "crawler",
    name: "Crawler",
    description: "Robots, Sitemap & Broken Link Checker",
    icon: Bug
  },
  {
    id: "spelling",
    name: "Spelling",
    description: "Grammar, Spelling & Readability Auditor",
    icon: Edit3
  },
  {
    id: "redirect_tracer",
    name: "Redirect Tracer",
    description: "301/302 Redirect Chain Inspection",
    icon: GitFork
  },
  {
    id: "image_auditor",
    name: "Image Auditor",
    description: "Alt tags, Compression & WebP Audit",
    icon: Zap
  }
];

interface ToolsPanelProps {
  activeUrl?: string;
}

export function ToolsPanel({ activeUrl = "https://example.com" }: ToolsPanelProps) {
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);

  const selectedTool = TOOLS_LIST.find((t) => t.id === selectedToolId);

  if (selectedToolId && selectedTool) {
    return (
      <div className="flex flex-col h-full overflow-y-auto pr-1 pb-4 scrollbar-none font-sans select-none gap-3">
        {/* Top Header with Back Button */}
        <div className="flex items-center gap-2 pb-2 border-b border-[#e3e0d5]">
          <button
            onClick={() => setSelectedToolId(null)}
            className="p-1.5 rounded-lg bg-[#f9f8f6] hover:bg-[#eae7dc] text-[#6e6b5e] hover:text-[#191919] border border-[#e3e0d5] transition-all"
            title="Back to Tools"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-2">
            <selectedTool.icon className="w-4 h-4 text-[#c15f3c]" />
            <span className="text-xs font-bold text-[#191919]">{selectedTool.name}</span>
          </div>
        </div>

        {/* Selected Tool View */}
        {selectedToolId === "analyze_website" && <AnalyzeWebsiteTool activeUrl={activeUrl} />}
        {selectedToolId === "visual_analyze" && <VisualAnalyzeTool activeUrl={activeUrl} />}
        {selectedToolId === "rank_tracker" && <RankTrackerTool activeUrl={activeUrl} />}
        {selectedToolId === "on_page_seo" && <OnPageSeoTool activeUrl={activeUrl} />}
        {selectedToolId === "authority" && <AuthorityTool activeUrl={activeUrl} />}
        {selectedToolId === "crawler" && <CrawlerTool activeUrl={activeUrl} />}
        {selectedToolId === "spelling" && <SpellingTool activeUrl={activeUrl} />}
        {selectedToolId === "redirect_tracer" && <RedirectTracerTool activeUrl={activeUrl} />}
        {selectedToolId === "image_auditor" && <ImageAuditorTool activeUrl={activeUrl} />}
        
        {selectedToolId !== "analyze_website" && selectedToolId !== "visual_analyze" && selectedToolId !== "rank_tracker" && selectedToolId !== "on_page_seo" && selectedToolId !== "authority" && selectedToolId !== "crawler" && selectedToolId !== "spelling" && selectedToolId !== "redirect_tracer" && selectedToolId !== "image_auditor" && (
          <div className="p-4 rounded-xl bg-[#f9f8f6] border border-[#e3e0d5] flex flex-col items-center justify-center text-center gap-2 my-auto">
            <selectedTool.icon className="w-8 h-8 text-[#c15f3c]" />
            <h3 className="text-xs font-bold text-[#191919]">{selectedTool.name} Tool</h3>
            <p className="text-[10px] text-[#8c8877] max-w-[200px] leading-relaxed">
              {selectedTool.description}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 h-full overflow-y-auto pr-1 pb-4 scrollbar-none font-sans select-none">
      <div className="text-[10px] font-bold text-[#8c8877] uppercase tracking-wider mb-1 px-1 flex items-center justify-between">
        <span>SEO & Analytics Tools</span>
        <span className="text-[9px] bg-[#c15f3c]/10 text-[#c15f3c] px-1.5 py-0.5 rounded-full font-semibold">
          {TOOLS_LIST.length} Active
        </span>
      </div>

      {/* Grid of Tool Cards */}
      <div className="flex flex-col gap-2">
        {TOOLS_LIST.map((tool) => {
          const IconComp = tool.icon;
          return (
            <div
              key={tool.id}
              onClick={() => setSelectedToolId(tool.id)}
              className="group flex items-center justify-between p-2.5 rounded-xl bg-[#f9f8f6] hover:bg-[#eae7dc] border border-[#e3e0d5] hover:border-[#c15f3c]/40 cursor-pointer transition-all duration-150 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-black/5 group-hover:bg-[#c15f3c]/10 text-[#6e6b5e] group-hover:text-[#c15f3c] flex items-center justify-center transition-colors shrink-0">
                  <IconComp className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-[#191919] group-hover:text-[#c15f3c] transition-colors truncate">
                    {tool.name}
                  </span>
                  <span className="text-[9px] text-[#8c8877] truncate">
                    {tool.description}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
