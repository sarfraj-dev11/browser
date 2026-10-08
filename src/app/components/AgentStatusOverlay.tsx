import React from "react";

interface AgentStatusOverlayProps {
  active: boolean;
  thought: string;
  onCancel: () => void;
}

export const AgentStatusOverlay: React.FC<AgentStatusOverlayProps> = ({ active, thought, onCancel }) => {
  if (!active) return null;

  // Extract the latest meaningful line from the raw agent log (strip markdown/checklists)
  const displayThought = (() => {
    const lines = (thought || "").split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      let line = lines[i].trim();
      if (!line) continue;
      if (/^\*\*(Task Checklist|Agent Thoughts)\*\*/.test(line)) continue; // section headers
      if (/^-\s*\[[x/\s]\]/.test(line)) continue; // checklist items
      line = line
        .replace(/^\*\s*\*\*Step\s*\d+\*\*:?\s*/i, "Step: ")
        .replace(/^[*\-•]\s*/, "")
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .trim();
      if (line) return line;
    }
    return "Working...";
  })();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100000] flex items-center gap-3.5 bg-black/90 backdrop-blur-md border border-white/10 px-5 py-3 rounded-full shadow-2xl animate-fade-in font-sans">
      <div className="flex items-center gap-2">
        <div className="relative flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
          Agent Brain
        </span>
      </div>

      <div className="h-4 w-px bg-white/15"></div>

      <span className="text-xs text-zinc-100 max-w-[320px] truncate" title={displayThought}>
        {displayThought}
      </span>

      <button
        onClick={onCancel}
        className="px-2.5 py-1 text-[9px] font-bold uppercase rounded-md bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white transition-all active:scale-95"
      >
        Stop
      </button>
    </div>
  );
};
export default AgentStatusOverlay;
