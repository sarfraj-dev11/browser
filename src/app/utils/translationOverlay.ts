export const translationOverlayScript = `
  (() => {
    // Avoid double injection
    if (window.__translationOverlayInjected) return;
    window.__translationOverlayInjected = true;

    try {
      // Create translation styles
      const style = document.createElement("style");
      style.textContent = \`
        .translate-badge-trigger {
          position: absolute;
          z-index: 100000;
          background: #c15f3c;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 10px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          gap: 3px;
          pointer-events: auto;
          transition: transform 0.15s ease;
        }
        .translate-badge-trigger:hover {
          transform: scale(1.08);
          background: #d66b44;
        }
        .translation-tooltip-box {
          position: absolute;
          z-index: 100001;
          background: rgba(27, 26, 24, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.08);
          color: #f4f3ee;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 11px;
          line-height: 1.5;
          max-width: 280px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          font-family: system-ui, -apple-system, sans-serif;
          pointer-events: auto;
        }
        .translation-tooltip-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding-bottom: 6px;
          margin-bottom: 8px;
          color: #8c8877;
          font-weight: bold;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .translation-tooltip-close {
          background: none;
          border: none;
          color: #8c8877;
          cursor: pointer;
          font-size: 12px;
          padding: 0 2px;
        }
        .translation-tooltip-close:hover {
          color: white;
        }
      \`;
      document.head.appendChild(style);

      let activeTrigger = null;
      let hoveredElement = null;

      // Handle hover trigger placement
      document.addEventListener("mouseover", (e) => {
        const target = e.target;
        if (!target) return;
        
        // Target readable elements with text
        const validTags = ["P", "SPAN", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "DIV"];
        if (!validTags.includes(target.tagName)) return;

        const text = (target.innerText || "").trim();
        // Ignore short text, helper selectors, and script blocks
        if (text.length < 15 || text.length > 800 || target.closest(".translate-badge-trigger") || target.closest(".translation-tooltip-box")) {
          return;
        }

        hoveredElement = target;
        const rect = target.getBoundingClientRect();
        
        // Remove old trigger if target changed
        if (activeTrigger) activeTrigger.remove();

        // Spawn translation trigger badge
        const badge = document.createElement("button");
        badge.className = "translate-badge-trigger";
        badge.innerHTML = "<span>🌐</span> Translate";
        
        // Place badge top-right of element
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
        badge.style.top = \`\${rect.top + scrollTop - 10}px\`;
        badge.style.left = \`\${rect.right + scrollLeft - 60}px\`;
        
        badge.addEventListener("click", (evt) => {
          evt.stopPropagation();
          badge.innerHTML = "<span>⏳</span> Translating...";
          badge.disabled = true;
          // Send request through Electron console event bridge
          console.log("TRANSLATE_REQUEST:" + text);
        });

        document.body.appendChild(badge);
        activeTrigger = badge;
      });

      // Clear badge if mouse leaves context
      document.addEventListener("mousemove", (e) => {
        if (!activeTrigger) return;
        const target = e.target;
        if (target !== hoveredElement && !target.closest(".translate-badge-trigger") && !target.closest(".translation-tooltip-box")) {
          activeTrigger.remove();
          activeTrigger = null;
        }
      });

      // Global callback function to render translation tooltip
      window.showTranslationTooltip = (translatedText) => {
        // Restore badge text
        if (activeTrigger) {
          activeTrigger.remove();
          activeTrigger = null;
        }

        if (!hoveredElement) return;

        // Remove old tooltip if any
        const oldTooltip = document.querySelector(".translation-tooltip-box");
        if (oldTooltip) oldTooltip.remove();

        // Spawn new tooltip
        const tooltip = document.createElement("div");
        tooltip.className = "translation-tooltip-box";
        
        const rect = hoveredElement.getBoundingClientRect();
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
        
        // Place tooltip below the hovered element
        tooltip.style.top = \`\${rect.bottom + scrollTop + 6}px\`;
        tooltip.style.left = \`\${Math.max(10, rect.left + scrollLeft)}px\`;

        tooltip.innerHTML = \`
          <div class="translation-tooltip-header">
            <span>AI Translation (English)</span>
            <button class="translation-tooltip-close">×</button>
          </div>
          <div>\${translatedText}</div>
        \`;

        tooltip.querySelector(".translation-tooltip-close").addEventListener("click", () => {
          tooltip.remove();
        });

        document.body.appendChild(tooltip);
      };

      console.log("Translation overlay system fully active.");
    } catch (e) {
      console.error("Failed to inject translation overlay:", e);
    }
  })();
`;
