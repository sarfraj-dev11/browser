import React, { useEffect, useRef } from "react";
import { Image, AtSign, FileText, Sparkles, X } from "lucide-react";

interface PlusContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: () => void;
  onSelectMentions: () => void;
  onSelectPlanMode: () => void;
}

export const PlusContextMenu: React.FC<PlusContextMenuProps> = ({
  isOpen,
  onClose,
  onSelectMedia,
  onSelectMentions,
  onSelectPlanMode
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute bottom-12 left-0 z-[999] w-48 bg-[#1e1e1e] border border-[#333333] rounded-xl p-1.5 shadow-2xl animate-fade-in font-sans text-xs text-[#e3e3e3]"
    >
      <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#888888] flex items-center justify-between border-b border-[#2a2a2a] mb-1">
        <span>Add Context</span>
        <button
          onClick={onClose}
          className="text-[#888888] hover:text-[#ffffff] transition-colors p-0.5"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="flex flex-col gap-0.5">
        <button
          onClick={() => {
            onSelectMedia();
            onClose();
          }}
          className="w-full px-2.5 py-2 rounded-lg hover:bg-[#2a2a2a] transition-all flex items-center gap-2.5 text-left font-medium group"
        >
          <Image className="w-4 h-4 text-[#a0a0a0] group-hover:text-white transition-colors shrink-0" />
          <span className="flex-1">Media</span>
        </button>

        <button
          onClick={() => {
            onSelectMentions();
            onClose();
          }}
          className="w-full px-2.5 py-2 rounded-lg hover:bg-[#2a2a2a] transition-all flex items-center gap-2.5 text-left font-medium group"
        >
          <AtSign className="w-4 h-4 text-[#a0a0a0] group-hover:text-white transition-colors shrink-0" />
          <span className="flex-1">Mentions</span>
        </button>

        <button
          onClick={() => {
            onSelectPlanMode();
            onClose();
          }}
          className="w-full px-2.5 py-2 rounded-lg hover:bg-[#c15f3c]/20 hover:border-[#c15f3c]/40 border border-transparent transition-all flex items-center gap-2.5 text-left font-medium group text-white"
        >
          <FileText className="w-4 h-4 text-[#c15f3c] group-hover:scale-110 transition-transform shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-bold flex items-center justify-between">
              <span>Plan Mode</span>
              <span className="text-[9px] bg-[#c15f3c] text-white px-1.5 py-0.2 rounded font-mono uppercase">/plan</span>
            </div>
            <span className="text-[10px] text-[#999999] block truncate">Deep 6-8hr master roadmap</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default PlusContextMenu;
