import React, { useState } from "react";

const ThinkBlock = ({ text, isFinished, darkMode }: { text: string, isFinished?: boolean, darkMode?: boolean }) => {
  const [isOpen, setIsOpen] = useState(!isFinished);
  return (
    <div className={`my-2 text-[13px] ${darkMode ? 'text-zinc-400' : 'text-[#8c8877]'}`}>
      <div 
        className={`flex items-center gap-1.5 cursor-pointer select-none transition-colors ${darkMode ? 'hover:text-zinc-200' : 'hover:text-[#191919]'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-medium">{isFinished ? "Thought process" : "Thinking.."}</span>
        <svg 
          className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {isOpen && (
        <div className={`mt-2 pl-3 border-l-2 whitespace-pre-wrap ${darkMode ? 'border-zinc-700 text-zinc-300' : 'border-[#e3e0d5] text-[#191919]/70'}`}>
          {text}
        </div>
      )}
    </div>
  );
}

interface ChatMarkdownProps {
  text?: string;
  content?: string;
  darkMode?: boolean;
  onLinkClick?: (url: string) => void;
}

export const ChatMarkdown: React.FC<ChatMarkdownProps> = ({ text, content, darkMode = false, onLinkClick }) => {
  const rawText = text ?? content ?? "";
  const lines = rawText.split("\n");
  
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  
  let inThinkBlock = false;
  let thinkBlockLines: string[] = [];
  
  const renderedElements: React.ReactNode[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Handle think block tags
    if (trimmed === "<think>" || trimmed.startsWith("<think>")) {
      inThinkBlock = true;
      const content = trimmed.replace("<think>", "").trim();
      if (content) thinkBlockLines.push(content);
      return;
    }
    
    if (inThinkBlock) {
      if (trimmed === "</think>" || trimmed.endsWith("</think>")) {
        const content = trimmed.replace("</think>", "").trim();
        if (content) thinkBlockLines.push(content);
        
        renderedElements.push(<ThinkBlock key={`think-finished-${idx}`} text={thinkBlockLines.join("\n")} isFinished={true} darkMode={darkMode} />);
        thinkBlockLines = [];
        inThinkBlock = false;
      } else {
        thinkBlockLines.push(line);
      }
      return;
    }

    // Toggle code block state
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        const codeText = codeBlockLines.join("\n");
        renderedElements.push(
          <pre
            key={`code-${idx}`}
            className={`p-3 rounded-xl font-mono text-[11px] overflow-x-auto border my-1.5 text-left select-text ${
              darkMode ? "bg-zinc-900/90 border-zinc-800 text-zinc-200" : "bg-black/5 border-[#e3e0d5] text-[#191919]"
            }`}
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace' }}
          >
            <code>{codeText}</code>
          </pre>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    // 1. Checkboxes
    if (trimmed.startsWith("- [ ]") || trimmed.startsWith("- [/]") || trimmed.startsWith("- [x]")) {
      const isChecked = trimmed.startsWith("- [x]");
      const isInProgress = trimmed.startsWith("- [/]");
      const content = trimmed.substring(5).trim();
      const renderedContent = parseInlineStyles(content, onLinkClick, darkMode);

      renderedElements.push(
        <div
          key={idx}
          className={`flex items-center gap-2.5 py-0.5 ${
            isChecked
              ? darkMode ? "text-zinc-500 line-through opacity-70" : "text-[#8c8877] line-through opacity-70"
              : darkMode ? "text-zinc-200" : "text-[#191919]"
          }`}
        >
          {isInProgress ? (
            <span className="w-3 h-3 rounded-full border-2 border-[#c15f3c] border-t-transparent animate-spin shrink-0"></span>
          ) : (
            <input
              type="checkbox"
              checked={isChecked}
              readOnly
              disabled
              className="w-3.5 h-3.5 rounded border-[#e3e0d5] bg-white text-[#c15f3c] focus:ring-0 cursor-default shrink-0 accent-[#c15f3c]"
            />
          )}
          <span className="text-xs">{renderedContent}</span>
        </div>
      );
      return;
    }

    // 2. Titles/Headers
    if (trimmed.startsWith("###")) {
      renderedElements.push(
        <h4 key={idx} className={`text-xs font-bold mt-2 mb-1 ${darkMode ? "text-zinc-100" : "text-[#191919]"}`}>
          {parseInlineStyles(trimmed.substring(3).trim(), onLinkClick, darkMode)}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith("##") || trimmed.startsWith("📋") || trimmed.startsWith("🧠")) {
      renderedElements.push(
        <h3 key={idx} className={`text-xs font-extrabold uppercase tracking-wider mt-3 mb-1.5 ${darkMode ? "text-amber-400" : "text-[#c15f3c]"}`}>
          {parseInlineStyles(trimmed, onLinkClick, darkMode)}
        </h3>
      );
      return;
    }

    // 3. Bullet points / thoughts
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      const content = trimmed.substring(2).trim();
      renderedElements.push(
        <div key={idx} className={`flex gap-2 pl-1.5 ${darkMode ? "text-zinc-200" : "text-[#191919]"}`}>
          <span className={darkMode ? "text-amber-400 font-bold" : "text-[#c15f3c] font-bold"}>•</span>
          <span className="flex-1">{parseInlineStyles(content, onLinkClick, darkMode)}</span>
        </div>
      );
      return;
    }

    if (!trimmed) {
      renderedElements.push(<div key={idx} className="h-2"></div>);
      return;
    }

    renderedElements.push(
      <p key={idx} className={darkMode ? "text-zinc-200" : "text-[#191919]"}>
        {parseInlineStyles(line, onLinkClick, darkMode)}
      </p>
    );
  });

  // Handle unclosed code block
  if (inCodeBlock && codeBlockLines.length > 0) {
    const codeText = codeBlockLines.join("\n");
    renderedElements.push(
      <pre
        key="code-eof"
        className={`p-3 rounded-xl font-mono text-[11px] overflow-x-auto border my-1.5 text-left select-text ${
          darkMode ? "bg-zinc-900/90 border-zinc-800 text-zinc-200" : "bg-black/5 border-[#e3e0d5] text-[#191919]"
        }`}
        style={{ fontFamily: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace' }}
      >
        <code>{codeText}</code>
      </pre>
    );
  }

  // Handle unclosed think block
  if (inThinkBlock && thinkBlockLines.length > 0) {
    renderedElements.push(<ThinkBlock key="think-active" text={thinkBlockLines.join("\n")} isFinished={false} darkMode={darkMode} />);
  }

  return (
    <div 
      className="flex flex-col gap-1.5 leading-relaxed text-xs text-left"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      {renderedElements}
    </div>
  );
};

// Helper to parse bold **text**, inline `code`, and markdown links [label](url)
const parseInlineStyles = (text: string, onLinkClick?: (url: string) => void, darkMode: boolean = false) => {
  const tokenRegex = /(\*\*.*?\*\*|`[^`]+`|\[.*?\]\(.*?\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className={`font-bold ${darkMode ? "text-zinc-100" : "text-[#191919]"}`}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code 
          key={idx} 
          className={`px-1.5 py-0.5 rounded text-[10.5px] font-semibold font-mono ${
            darkMode ? "bg-zinc-800 text-amber-300 border border-zinc-700/60" : "bg-black/5 text-[#c15f3c]"
          }`}
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace' }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("[") && part.includes("](")) {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        const [_, label, url] = match;
        
        let faviconUrl = "";
        try {
          const parsed = new URL(url);
          faviconUrl = `https://www.google.com/s2/favicons?sz=32&domain=${parsed.hostname}`;
        } catch (e) {
          if (url.startsWith("http") || url.includes(".")) {
            const cleanUrl = url.startsWith("http") ? url : "https://" + url;
            try {
              const parsed = new URL(cleanUrl);
              faviconUrl = `https://www.google.com/s2/favicons?sz=32&domain=${parsed.hostname}`;
            } catch (err) {}
          }
        }

        return (
          <a
            key={idx}
            href={url}
            onClick={(e) => {
              e.preventDefault();
              if (onLinkClick) onLinkClick(url);
            }}
            className={`inline-flex items-center gap-1 underline transition-colors cursor-pointer align-middle ${
              darkMode ? "text-amber-400 hover:text-amber-300" : "text-[#c15f3c] hover:text-[#a34b2c]"
            }`}
          >
            {faviconUrl && (
              <img
                src={faviconUrl}
                className="w-3.5 h-3.5 object-contain bg-transparent shrink-0"
                alt=""
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            {label}
          </a>
        );
      }
    }
    return part;
  });
};

export default ChatMarkdown;
