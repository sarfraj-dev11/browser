export const domStamperScript = `
  (() => {
    try {
      // Clear previous visual overlays wrapper
      const oldWrapper = document.getElementById("__agent_badge_wrapper__");
      if (oldWrapper) oldWrapper.remove();

      // Read max existing agent index to lock index assignments
      let maxIdx = 0;
      const scanMaxIdx = (root) => {
        if (!root) return;
        const allNodes = Array.from(root.querySelectorAll("*"));
        allNodes.forEach(node => {
          if (node.hasAttribute("data-agent-idx")) {
            const val = parseInt(node.getAttribute("data-agent-idx") || "0", 10);
            if (val > maxIdx) maxIdx = val;
          }
          if (node.shadowRoot) {
            scanMaxIdx(node.shadowRoot);
          }
        });
      };
      scanMaxIdx(document);

      const interactiveTags = [
        "a", "button", "input", "textarea", "select", 
        "[role='button']", "[role='link']", 
        "ytd-guide-entry-renderer", "ytd-video-renderer", 
        "ytd-compact-link-renderer", "[onclick]",
        "[role='checkbox']", "[role='tab']"
      ];

      // Recursively collect elements inside open Shadow roots
      const collectInteractiveElements = (root) => {
        let list = [];
        const candidates = Array.from(root.querySelectorAll(interactiveTags.join(", ")));
        candidates.forEach(el => {
          list.push(el);
          if (el.shadowRoot) {
            list = list.concat(collectInteractiveElements(el.shadowRoot));
          }
        });

        // Search recursively inside other non-interactive containers that might contain shadowRoots
        const allNodes = Array.from(root.querySelectorAll("*"));
        allNodes.forEach(node => {
          if (node.shadowRoot && !candidates.includes(node)) {
            list = list.concat(collectInteractiveElements(node.shadowRoot));
          }
        });
        return list;
      };
      
      const elements = collectInteractiveElements(document);
      let idx = maxIdx + 1;
      const tree = [];

      // Create a floating overlay wrapper
      const wrapper = document.createElement("div");
      wrapper.id = "__agent_badge_wrapper__";
      wrapper.style.position = "absolute";
      wrapper.style.top = "0";
      wrapper.style.left = "0";
      wrapper.style.width = "100%";
      wrapper.style.height = "100%";
      wrapper.style.pointerEvents = "none";
      wrapper.style.zIndex = "2147483647"; // Above everything
      document.body.appendChild(wrapper);
      const bodyRect = document.body.getBoundingClientRect();

      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        
        // Skip elements that are invisible, transparent, or collapsed
        if (
          rect.width === 0 || 
          rect.height === 0 || 
          style.display === "none" || 
          style.visibility === "hidden" || 
          parseFloat(style.opacity || "1") === 0
        ) {
          return;
        }

        // Semantic Compression: check if a parent interactive node is already tagged and duplicates text
        const isInteractive = (node) => {
          const tag = node.tagName.toLowerCase();
          return ["a", "button", "input", "textarea", "select"].includes(tag) || 
                 node.hasAttribute("onclick") || 
                 node.getAttribute("role") === "button" || 
                 node.getAttribute("role") === "link";
        };

        let parent = el.parentElement;
        let parentIdx = null;
        while (parent) {
          if (parent.hasAttribute("data-agent-idx")) {
            parentIdx = parent.getAttribute("data-agent-idx");
            break;
          }
          parent = parent.parentElement;
        }

        if (parentIdx && !isInteractive(el)) {
          const parentEl = document.querySelector("[data-agent-idx='" + parentIdx + "']");
          if (parentEl) {
            const parentText = (parentEl.innerText || parentEl.textContent || "").trim().toLowerCase();
            const childText = (el.innerText || el.textContent || "").trim().toLowerCase();
            if (parentText && childText && parentText.includes(childText)) {
              return;
            }
          }
        }

        // Lock element index: use existing tag or allocate a new one sequentially
        let elementIdx = el.getAttribute("data-agent-idx");
        if (!elementIdx) {
          el.setAttribute("data-agent-idx", String(idx));
          elementIdx = String(idx);
          idx++;
        }

        // Create small absolute visual index badge
        const badge = document.createElement("span");
        badge.innerText = elementIdx;
        badge.style.position = "absolute";
        badge.style.backgroundColor = "#c15f3c";
        badge.style.color = "white";
        badge.style.fontSize = "9px";
        badge.style.fontWeight = "bold";
        badge.style.padding = "1px 4.5px";
        badge.style.borderRadius = "4px";
        badge.style.border = "1px solid #3e3a30";
        badge.style.boxShadow = "0 1.5px 3.5px rgba(0,0,0,0.35)";
        badge.style.transform = "translate(-50%, -50%)";
        badge.style.pointerEvents = "none";

        // Align badge to the top-left coordinate of the item
        badge.style.left = (rect.left - bodyRect.left) + "px";
        badge.style.top = (rect.top - bodyRect.top) + "px";
        
        wrapper.appendChild(badge);
        
        const tagName = el.tagName.toLowerCase();
        let role = "button";
        if (tagName === "input" || tagName === "textarea") {
          role = "input";
        } else if (tagName === "select") {
          role = "select";
        } else if (tagName === "a" || el.getAttribute("role") === "link") {
          role = "link";
        } else if (["p", "span", "h1", "h2", "h3", "h4", "h5", "h6", "li"].includes(tagName)) {
          role = "text";
        }

        let label = "";
        if (role === "input") {
          label = el.placeholder || el.name || el.id || "";
          const val = el.value;
          if (val) label += " (current value: \\"" + val + "\\")";
        } else {
          label = (el.innerText || el.textContent || "").trim().replace(/\\s+/g, " ");
          if (label.length > 60) label = label.substring(0, 57) + "...";
        }

        if (!label) {
          label = el.getAttribute("aria-label") || el.getAttribute("title") || "unlabeled";
        }

        tree.push("[" + elementIdx + "] (" + role + ") \\"" + label + "\\"");
      });

      // Sort tree numerically by element index for consistent LLM output ordering
      tree.sort((a, b) => {
        const idxA = parseInt(a.match(/^\\[(\\d+)\\]/)[1], 10);
        const idxB = parseInt(b.match(/^\\[(\\d+)\\]/)[1], 10);
        return idxA - idxB;
      });

      return JSON.stringify({
        tree: tree.join("\\n"),
        count: idx - 1
      });
    } catch(e) {
      return JSON.stringify({ tree: "Error parsing DOM: " + e.message, count: 0 });
    }
  })()
`;
