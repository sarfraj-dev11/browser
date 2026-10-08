import { useState } from "react";

export interface HandPosition {
  x: number;
  y: number;
  visible: boolean;
  clicking: boolean;
}

export const useClickSimulator = (activeTabIdRef: { current: string }) => {
  const [handPosition, setHandPosition] = useState<HandPosition>({
    x: 0,
    y: 0,
    visible: false,
    clicking: false
  });

  const cdpEvaluate = async (expression: string): Promise<any> => {
    const activeTabId = activeTabIdRef.current;
    const webview = document.getElementById(`webview-${activeTabId}`) as any;
    if (!webview) return null;
    try {
      const webContentsId = webview.getWebContentsId();
      const { ipcRenderer } = (window as any).require("electron");
      return await ipcRenderer.invoke("cdp-evaluate", { webContentsId, expression });
    } catch(e) {}
    return null;
  };

  const waitForElement = async (selector?: string, text?: string, timeoutMs: number = 4000): Promise<boolean> => {
    const activeTabId = activeTabIdRef.current;
    const webview = document.getElementById(`webview-${activeTabId}`) as any;
    if (!webview) return true;

    const checkScript = `
      (() => {
        try {
          const selector = ${JSON.stringify(selector || "")};
          const textQuery = ${JSON.stringify(text || "")};
          
          const findElement = (doc) => {
            if (selector) {
              const el = doc.querySelector(selector);
              if (el) return el;
              
              // Shadow-DOM traversal fallback
              const findInShadows = (root) => {
                const candidates = Array.from(root.querySelectorAll("*"));
                for (const node of candidates) {
                  if (node.getAttribute && node.getAttribute("data-agent-idx") === selector.replace(/[^0-9]/g, "")) {
                    return node;
                  }
                  if (node.shadowRoot) {
                    const res = findInShadows(node.shadowRoot);
                    if (res) return res;
                  }
                }
                return null;
              };
              const shadowRes = findInShadows(doc);
              if (shadowRes) return shadowRes;
            } else if (textQuery) {
              const target = textQuery.trim().toLowerCase();
              const candidates = Array.from(doc.querySelectorAll("a, button, [role='button'], span, div, li, input, textarea"));
              for (const cand of candidates) {
                if (cand.innerText && cand.innerText.trim().toLowerCase() === target) return cand;
              }
              for (const cand of candidates) {
                if (cand.innerText && cand.innerText.trim().toLowerCase().includes(target)) {
                  if (cand.children.length <= 4) return cand;
                }
              }
            }
            
            const iframes = doc.querySelectorAll("iframe");
            for (const iframe of iframes) {
              try {
                const innerDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (innerDoc) {
                  const res = findElement(innerDoc);
                  if (res) return res;
                }
              } catch(e) {}
            }
            return null;
          };
          
          return findElement(document) !== null;
        } catch(e) {}
        return false;
      })()
    `;

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const exists = await cdpEvaluate(checkScript);
        if (exists) return true;
      } catch (e) {}
      await new Promise((res) => setTimeout(res, 200));
    }
    return false;
  };

  const simulateScroll = async (direction: "up" | "down", amount: number = 400, selector?: string, text?: string) => {
    const activeTabId = activeTabIdRef.current;
    const webview = document.getElementById(`webview-${activeTabId}`) as any;
    if (!webview) {
      window.scrollBy({ top: direction === "down" ? amount : -amount, behavior: "smooth" });
      return;
    }
    try {
      webview.focus();
      const webContentsId = webview.getWebContentsId();
      const { ipcRenderer } = (window as any).require("electron");

      if (selector || text) {
        const scrollScript = `
          (() => {
            try {
              const sel = ${JSON.stringify(selector || "")};
              const txt = ${JSON.stringify(text || "")};
              
              const findElement = (doc) => {
                if (sel) {
                  let el = doc.querySelector(sel);
                  if (el) return el;
                  
                  const findInShadows = (root) => {
                    const candidates = Array.from(root.querySelectorAll("*"));
                    for (const node of candidates) {
                      if (node.getAttribute && node.getAttribute("data-agent-idx") === sel.replace(/[^0-9]/g, "")) {
                        return node;
                      }
                      if (node.shadowRoot) {
                        const res = findInShadows(node.shadowRoot);
                        if (res) return res;
                      }
                    }
                    return null;
                  };
                  const shadowRes = findInShadows(doc);
                  if (shadowRes) return shadowRes;
                }
                
                if (txt) {
                  const target = txt.trim().toLowerCase();
                  const candidates = Array.from(doc.querySelectorAll("a, button, h1, h2, h3, h4, h5, h6, p, span, div, li, td, th"));
                  for (const cand of candidates) {
                    if (cand.innerText && cand.innerText.trim().toLowerCase() === target) return cand;
                  }
                  for (const cand of candidates) {
                    if (cand.innerText && cand.innerText.trim().toLowerCase().includes(target)) {
                      if (cand.children.length <= 4) return cand;
                    }
                  }
                }
                
                const iframes = doc.querySelectorAll("iframe");
                for (const iframe of iframes) {
                  try {
                    const innerDoc = iframe.contentDocument || iframe.contentWindow.document;
                    if (innerDoc) {
                      const res = findElement(innerDoc);
                      if (res) return res;
                    }
                  } catch(e) {}
                }
                return null;
              };
              
              const el = findElement(document);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                const origOutline = el.style.outline;
                const origOffset = el.style.outlineOffset;
                el.style.outline = "3px solid #c15f3c";
                el.style.outlineOffset = "2px";
                setTimeout(() => {
                  el.style.outline = origOutline;
                  el.style.outlineOffset = origOffset;
                }, 2000);
                return true;
              }
            } catch(e) {}
            return false;
          })()
        `;
        const scrolled = await cdpEvaluate(scrollScript);
        if (scrolled) {
          // Wait for smooth scrolling to settle
          await new Promise((res) => setTimeout(res, 800));
          return;
        }
      }

      const scrollVal = direction === "down" ? amount : -amount;
      await ipcRenderer.invoke("cdp-scroll", { webContentsId, amount: scrollVal });
      // Wait for layout scroll settling animations
      await new Promise((res) => setTimeout(res, 500));
    } catch (err) {
      console.error("Scroll execution error:", err);
    }
  };

  const simulateHandClick = async (selector?: string, text?: string) => {
    const activeTabId = activeTabIdRef.current;
    const webview = document.getElementById(`webview-${activeTabId}`) as any;

    if (!webview) {
      // Local about:newtab click handling
      let ticks = 0;
      const maxTicks = 20;
      let startX = handPosition.x || window.innerWidth / 2;
      let startY = handPosition.y || window.innerHeight / 2;
      let targetX = window.innerWidth + 50;
      let targetY = window.innerHeight + 50;
      let controlX = (startX + targetX) / 2 + (Math.random() * 120 - 60);
      let controlY = (startY + targetY) / 2 + (Math.random() * 120 - 60);
      let clickingState = false;
      let clickDispatched = false;

      setHandPosition({ x: startX, y: startY, visible: true, clicking: false });

      const localInterval = setInterval(() => {
        ticks++;
        if (ticks >= maxTicks) {
          clearInterval(localInterval);
          setHandPosition((prev) => ({ ...prev, visible: false, clicking: false }));
          return;
        }

        if (ticks === 12 && !clickDispatched) {
          clickDispatched = true;
          clickingState = true;
          
          try {
            let el: HTMLElement | null = null;
            if (selector) {
              el = document.querySelector(selector) as HTMLElement;
              if (!el && text) {
                const cleanText = text.replace(/\(current value:.*?\)/, "").trim().toLowerCase();
                const candidates = Array.from(document.querySelectorAll("a, button, [role='button'], span, div, li, input, textarea"));
                for (const cand of candidates) {
                  const candText = (cand.textContent || "").trim().replace(/\s+/g, " ").toLowerCase();
                  if (candText === cleanText || candText.includes(cleanText)) {
                    el = cand as HTMLElement;
                    break;
                  }
                }
              }
            } else if (text) {
              const target = text.trim().toLowerCase();
              const candidates = Array.from(document.querySelectorAll("a, button, [role='button'], span, div, li"));
              for (const cand of candidates) {
                if (cand.textContent && cand.textContent.trim().toLowerCase() === target) {
                  el = cand as HTMLElement;
                  break;
                }
              }
            }

            if (el) {
              const origOutline = el.style.outline;
              const origOffset = el.style.outlineOffset;
              el.style.outline = "3px solid #c15f3c";
              el.style.outlineOffset = "2px";
              setTimeout(() => {
                el.style.outline = origOutline;
                el.style.outlineOffset = origOffset;
              }, 1400);

              const simulateMouseEvent = (targetEl: HTMLElement, eventName: string) => {
                const evt = new MouseEvent(eventName, {
                  view: window,
                  bubbles: true,
                  cancelable: true,
                  buttons: 1
                });
                targetEl.dispatchEvent(evt);
              };
              simulateMouseEvent(el, "mousedown");
              simulateMouseEvent(el, "click");
              simulateMouseEvent(el, "mouseup");
              if (typeof el!.focus === "function") el!.focus();
            }
          } catch (e) {}
        }

        if (ticks > 15) {
          clickingState = false;
        }

        try {
          let el: HTMLElement | null = null;
          if (selector) {
            el = document.querySelector(selector) as HTMLElement;
            if (!el && text) {
              const cleanText = text.replace(/\(current value:.*?\)/, "").trim().toLowerCase();
              const candidates = Array.from(document.querySelectorAll("a, button, [role='button'], span, div, li, input, textarea"));
              for (const cand of candidates) {
                const candText = (cand.textContent || "").trim().replace(/\s+/g, " ").toLowerCase();
                if (candText === cleanText || candText.includes(cleanText)) {
                  el = cand as HTMLElement;
                  break;
                }
              }
            }
          } else if (text) {
            const target = text.trim().toLowerCase();
            const candidates = Array.from(document.querySelectorAll("a, button, [role='button'], span, div, li"));
            for (const cand of candidates) {
              if (cand.textContent && cand.textContent.trim().toLowerCase() === target) {
                el = cand as HTMLElement;
                break;
              }
            }
          }

          if (el) {
            const rect = el.getBoundingClientRect();
            targetX = rect.left + rect.width / 2;
            targetY = rect.top + rect.height / 2;
          }
        } catch (e) {}

        // Quadratic Bezier curve movement interpolation
        const t = ticks / maxTicks;
        const currentX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * targetX;
        const currentY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * targetY;

        setHandPosition({
          x: currentX,
          y: currentY,
          visible: true,
          clicking: clickingState
        });
      }, 20);
      
      return;
    }

    // Wait for V8 DOM MutationObserver to stabilize layouts shifts before matching coordinates
    await cdpEvaluate(`
      new Promise((resolve) => {
        let timeout = setTimeout(resolve, 120);
        const observer = new MutationObserver(() => {
          clearTimeout(timeout);
          timeout = setTimeout(resolve, 120);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => {
          observer.disconnect();
          resolve();
        }, 600);
      })
    `).catch(() => {});

    // Guest webview click handling
    let ticks = 0;
    const maxTicks = 6;
    let startX = handPosition.x || window.innerWidth / 2;
    let startY = handPosition.y || window.innerHeight / 2;
    let targetX = window.innerWidth + 50;
    let targetY = window.innerHeight + 50;
    let controlX = (startX + targetX) / 2 + (Math.random() * 120 - 60);
    let controlY = (startY + targetY) / 2 + (Math.random() * 120 - 60);
    let clickingState = false;
    let clickDispatched = false;
    let lastCoords = { x: 0, y: 0 };

    let active = true;
    setHandPosition({ x: startX, y: startY, visible: true, clicking: false });

    const trackingInterval = setInterval(async () => {
      ticks++;
      if (ticks >= maxTicks) {
        active = false;
        clearInterval(trackingInterval);
        setHandPosition((prev) => ({ ...prev, visible: false, clicking: false }));
        return;
      }

      if (ticks === 4 && !clickDispatched) {
        clickDispatched = true;
        clickingState = true;
        
        try {
          webview.focus();
          const webContentsId = webview.getWebContentsId();
          const { ipcRenderer } = (window as any).require("electron");
          
          await ipcRenderer.invoke("cdp-click", {
            webContentsId,
            x: lastCoords.x,
            y: lastCoords.y
          });

          const highlightScript = `
            (() => {
              try {
                const selector = ${JSON.stringify(selector || "")};
                const textQuery = ${JSON.stringify(text || "")};
                
                const findElementAcrossIframes = (doc, sel, text) => {
                  let target = null;
                  if (sel) {
                    target = doc.querySelector(sel);
                    
                    // Shadow-DOM traversal fallback inside iframes context
                    if (!target) {
                      const findInShadows = (root) => {
                        const candidates = Array.from(root.querySelectorAll("*"));
                        for (const node of candidates) {
                          if (node.getAttribute && node.getAttribute("data-agent-idx") === sel.replace(/[^0-9]/g, "")) {
                            return node;
                          }
                          if (node.shadowRoot) {
                            const res = findInShadows(node.shadowRoot);
                            if (res) return res;
                          }
                        }
                        return null;
                      };
                      target = findInShadows(doc);
                    }

                    if (!target && text) {
                      const cleanText = text.replace(/\\(current value:.*?\\)/, "").trim().toLowerCase();
                      const candidates = Array.from(doc.querySelectorAll("a, button, [role='button'], span, div, li, input, textarea, ytd-guide-entry-renderer"));
                      for (const cand of candidates) {
                        const candText = (cand.innerText || cand.textContent || "").trim().replace(/\\s+/g, " ").toLowerCase();
                        if (candText === cleanText) {
                          target = cand;
                          break;
                        }
                      }
                      if (!target) {
                        for (const cand of candidates) {
                          const candText = (cand.innerText || cand.textContent || "").trim().replace(/\\s+/g, " ").toLowerCase();
                          if (candText.includes(cleanText)) {
                            target = cand;
                            break;
                          }
                        }
                      }
                    }
                  } else if (text) {
                    const candidates = Array.from(doc.querySelectorAll("a, button, [role='button'], span, div, li, input, textarea, ytd-guide-entry-renderer"));
                    for (const cand of candidates) {
                      if (cand.innerText && cand.innerText.trim().toLowerCase() === text.trim().toLowerCase()) {
                        target = cand;
                        break;
                      }
                    }
                    if (!target) {
                      for (const cand of candidates) {
                        if (cand.innerText && cand.innerText.trim().toLowerCase().includes(text.trim().toLowerCase())) {
                          if (cand.children.length <= 4) {
                            target = cand;
                            break;
                          }
                        }
                      }
                    }
                  }
                  if (target) return { element: target, offsetLeft: 0, offsetTop: 0 };

                  const iframes = doc.querySelectorAll("iframe");
                  for (const iframe of iframes) {
                    try {
                      const innerDoc = iframe.contentDocument || iframe.contentWindow.document;
                      if (innerDoc) {
                        const res = findElementAcrossIframes(innerDoc, sel, text);
                        if (res && res.element) {
                          const rect = iframe.getBoundingClientRect();
                          return {
                            element: res.element,
                            offsetLeft: res.offsetLeft + rect.left,
                            offsetTop: res.offsetTop + rect.top
                          };
                        }
                      }
                    } catch(e) {
                      // Fallback offsets mapping for cross-origin boundaries
                      const rect = iframe.getBoundingClientRect();
                      return {
                        element: iframe,
                        offsetLeft: rect.left,
                        offsetTop: rect.top
                      };
                    }
                  }
                  return null;
                };

                const result = findElementAcrossIframes(document, selector, textQuery);
                if (result && result.element) {
                  const el = result.element;
                  
                  // Verify z-index overlap obscuring.
                  const rect = el.getBoundingClientRect();
                  const midX = rect.left + rect.width / 2;
                  const midY = rect.top + rect.height / 2;
                  const topEl = document.elementFromPoint(midX, midY);
                  if (topEl && topEl !== el && !el.contains(topEl) && !topEl.contains(el)) {
                    topEl.style.pointerEvents = "none";
                    setTimeout(() => { topEl.style.pointerEvents = ""; }, 1200);
                  }

                  const origOutline = el.style.outline;
                  const origOffset = el.style.outlineOffset;
                  el.style.outline = "3px solid #c15f3c";
                  el.style.outlineOffset = "2px";
                  setTimeout(() => {
                    el.style.outline = origOutline;
                    el.style.outlineOffset = origOffset;
                  }, 1400);
                  if (typeof el.focus === "function") el.focus();
                }
              } catch(e) {}
            })()
          `;
          await cdpEvaluate(highlightScript);
        } catch (e) {}
      }

      if (ticks > 4) {
        clickingState = false;
      }

      try {
        const webviewRect = webview.getBoundingClientRect();
        const script = `
          (() => {
            try {
              const selector = ${JSON.stringify(selector || "")};
              const textQuery = ${JSON.stringify(text || "")};
              
              const findElementAcrossIframes = (doc, sel, text) => {
                let target = null;
                if (sel) {
                  target = doc.querySelector(sel);
                  
                  // Shadow-DOM traversal fallback inside coordinates script
                  if (!target) {
                    const findInShadows = (root) => {
                      const candidates = Array.from(root.querySelectorAll("*"));
                      for (const node of candidates) {
                        if (node.getAttribute && node.getAttribute("data-agent-idx") === sel.replace(/[^0-9]/g, "")) {
                          return node;
                        }
                        if (node.shadowRoot) {
                          const res = findInShadows(node.shadowRoot);
                          if (res) return res;
                        }
                      }
                      return null;
                    };
                    target = findInShadows(doc);
                  }

                  if (!target && text) {
                    const cleanText = text.replace(/\\(current value:.*?\\)/, "").trim().toLowerCase();
                    const candidates = Array.from(doc.querySelectorAll("a, button, [role='button'], span, div, li, input, textarea, ytd-guide-entry-renderer"));
                    for (const cand of candidates) {
                      const candText = (cand.innerText || cand.textContent || "").trim().replace(/\\s+/g, " ").toLowerCase();
                      if (candText === cleanText) {
                        target = cand;
                        break;
                      }
                    }
                    if (!target) {
                      for (const cand of candidates) {
                        const candText = (cand.innerText || cand.textContent || "").trim().replace(/\\s+/g, " ").toLowerCase();
                        if (candText.includes(cleanText)) {
                          target = cand;
                          break;
                        }
                      }
                    }
                  }
                } else if (text) {
                  const candidates = Array.from(doc.querySelectorAll("a, button, [role='button'], span, div, li, input, textarea, ytd-guide-entry-renderer"));
                  for (const cand of candidates) {
                    if (cand.innerText && cand.innerText.trim().toLowerCase() === text.trim().toLowerCase()) {
                      target = cand;
                      break;
                    }
                  }
                  if (!target) {
                    for (const cand of candidates) {
                      if (cand.innerText && cand.innerText.trim().toLowerCase().includes(text.trim().toLowerCase())) {
                        if (cand.children.length <= 4) {
                          target = cand;
                          break;
                        }
                      }
                    }
                  }
                }
                if (target) return { element: target, offsetLeft: 0, offsetTop: 0 };

                const iframes = doc.querySelectorAll("iframe");
                for (const iframe of iframes) {
                  try {
                    const innerDoc = iframe.contentDocument || iframe.contentWindow.document;
                    if (innerDoc) {
                      const res = findElementAcrossIframes(innerDoc, sel, text);
                      if (res && res.element) {
                        const rect = iframe.getBoundingClientRect();
                        return {
                          element: res.element,
                          offsetLeft: res.offsetLeft + rect.left,
                          offsetTop: res.offsetTop + rect.top
                        };
                      }
                    }
                  } catch(e) {
                    // Fallback offsets mapping for cross-origin boundaries
                    const rect = iframe.getBoundingClientRect();
                    return {
                      element: iframe,
                      offsetLeft: rect.left,
                      offsetTop: rect.top
                    };
                  }
                }
                return null;
              };

              const result = findElementAcrossIframes(document, selector, textQuery);
              if (result && result.element) {
                const el = result.element;
                el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
                const rect = el.getBoundingClientRect();
                
                // Content Viewport intersections mapping
                const midX = result.offsetLeft + rect.left + rect.width / 2;
                const midY = result.offsetTop + rect.top + rect.height / 2;
                return JSON.stringify({
                  x: midX,
                  y: midY
                });
              }
            } catch (e) {}
            return "null";
          })()
        `;
        const coordStr = await cdpEvaluate(script);
        if (coordStr && coordStr !== "null") {
          const coords = JSON.parse(coordStr);
          lastCoords = coords;
          
          // Verify element coordinates are fully aligned inside the webview bounds
          const calculatedX = webviewRect.left + coords.x;
          const calculatedY = webviewRect.top + coords.y;
          
          if (calculatedX >= webviewRect.left && calculatedX <= webviewRect.right &&
              calculatedY >= webviewRect.top && calculatedY <= webviewRect.bottom) {
            targetX = calculatedX;
            targetY = calculatedY;
          } else {
            // Trigger auto-scroll recovery coordinates correction
            targetX = Math.max(webviewRect.left + 10, Math.min(webviewRect.right - 10, calculatedX));
            targetY = Math.max(webviewRect.top + 10, Math.min(webviewRect.bottom - 10, calculatedY));
          }
        }
      } catch (err) {
        // Suppress layout shift exceptions
      }

      // Quadratic Bezier curve movement interpolation
      const t = ticks / maxTicks;
      const currentX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * targetX;
      const currentY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * targetY;

      if (active) {
        setHandPosition({
          x: currentX,
          y: currentY,
          visible: true,
          clicking: clickingState
        });
      }
    }, 10);
  };

  const simulateTyping = async (text: string, selector?: string, submit?: boolean) => {
    const activeTabId = activeTabIdRef.current;
    const webview = document.getElementById(`webview-${activeTabId}`) as any;

    if (!webview) {
      // Local about:newtab typing handling
      try {
        const el = (selector ? document.querySelector(selector) : document.activeElement) as HTMLInputElement;
        if (el) {
          el.focus();
          const origOutline = el.style.outline;
          const origOffset = el.style.outlineOffset;
          el.style.outline = "3px solid #c15f3c";
          el.style.outlineOffset = "2px";
          setTimeout(() => {
            el.style.outline = origOutline;
            el.style.outlineOffset = origOffset;
          }, 2000);

          const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
          let currentStr = "";
          for (let i = 0; i < text.length; i++) {
            currentStr += text[i];
            el.value = currentStr;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            await delay(10);
          }
          el.dispatchEvent(new Event("change", { bubbles: true }));
          if (submit) {
            const enterEvt = new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true });
            el.dispatchEvent(enterEvt);
            if (el.form) el.form.submit();
          }
        }
      } catch (err) {
        console.error("Local typing error:", err);
      }
      return;
    }

    try {
      webview.focus();

      // Shadow-DOM input resolution, scroll alignment, and native focus trigger
      const focusScript = `
        (() => {
          try {
            const selector = ${JSON.stringify(selector || "")};
            let el = selector ? document.querySelector(selector) : null;
            
            // Search inside shadow roots recursively
            if (!el && selector) {
              const findInShadows = (root) => {
                const candidates = Array.from(root.querySelectorAll("*"));
                for (const node of candidates) {
                  if (node.getAttribute && node.getAttribute("data-agent-idx") === selector.replace(/[^0-9]/g, "")) {
                    return node;
                  }
                  if (node.shadowRoot) {
                    const res = findInShadows(node.shadowRoot);
                    if (res) return res;
                  }
                }
                return null;
              };
              el = findInShadows(document);
            }
            
            if (!el) {
              el = document.activeElement;
            }
            if (!el) {
              el = document.querySelector("input, textarea");
            }
            
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
              
              // Simulate a native click to trigger listeners and position cursor
              try {
                if (typeof el.click === "function") {
                  el.click();
                } else {
                  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                }
              } catch (clickErr) {}
              
              if (typeof el.focus === "function") el.focus();
              
              // Select all content and clear to prevent duplication
              try {
                if (typeof el.setSelectionRange === "function" && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
                  el.setSelectionRange(0, el.value.length);
                  document.execCommand('delete', false);
                } else if (el.isContentEditable || el.tagName === "DIV") {
                  const range = document.createRange();
                  range.selectNodeContents(el);
                  const sel = window.getSelection();
                  if (sel) {
                    sel.removeAllRanges();
                    sel.addRange(range);
                  }
                  document.execCommand('delete', false);
                }
              } catch(err) {}

              const origOutline = el.style.outline;
              const origOffset = el.style.outlineOffset;
              el.style.outline = "3px solid #c15f3c";
              el.style.outlineOffset = "2px";
              setTimeout(() => {
                el.style.outline = origOutline;
                el.style.outlineOffset = origOffset;
              }, 2000);
            }
          } catch(e){}
        })()
      `;
      await cdpEvaluate(focusScript);

      const webContentsId = webview.getWebContentsId();
      const { ipcRenderer } = (window as any).require("electron");
      
      // Perform hardware keyboard typing via Chrome DevTools Protocol
      await ipcRenderer.invoke("cdp-type", { webContentsId, text });

      if (submit) {
        await new Promise(r => setTimeout(r, 150));
        const submitScript = `
          (() => {
            try {
              const activeEl = document.activeElement;
              if (activeEl) {
                const form = activeEl.closest("form");
                if (form) {
                  const submitBtn = form.querySelector("button[type='submit'], input[type='submit'], button.search-button, button.cdx-search-input__end-button");
                  if (submitBtn) {
                    submitBtn.click();
                    return "button-clicked";
                  }
                  if (typeof form.submit === "function") {
                    form.submit();
                    return "form-submitted";
                  }
                }
                
                if (activeEl.tagName === "INPUT") {
                  const searchBtn = document.querySelector("button.search-button, button.cdx-search-input__end-button, .search-container button, button.cdx-button");
                  if (searchBtn && typeof searchBtn.click === "function") {
                    searchBtn.click();
                    return "neighbor-button-clicked";
                  }
                }
              }
            } catch(e) {}
            return "none";
          })()
        `;
        const submitResult = await cdpEvaluate(submitScript);
        if (submitResult === "none" || !submitResult) {
          await ipcRenderer.invoke("cdp-press-key", { webContentsId, key: "Enter" });
        }
      }
    } catch (err) {
      console.error("Webview typing simulation error:", err);
    }
  };

  const simulateKeyPress = async (key: string, ctrl?: boolean, shift?: boolean, alt?: boolean) => {
    const activeTabId = activeTabIdRef.current;
    const webview = document.getElementById(`webview-${activeTabId}`) as any;
    if (!webview) return;
    try {
      webview.focus();
      const webContentsId = webview.getWebContentsId();
      const { ipcRenderer } = (window as any).require("electron");

      // Sync copy selection to host system clipboard via DOM before triggering keys (recursive iframe search)
      if (key === "c" && ctrl) {
        const copyScript = `
          (() => {
            try {
              const getDeepSelectionRange = (doc) => {
                const sel = doc.getSelection();
                if (sel && sel.rangeCount > 0 && sel.toString()) {
                  return { selection: sel, range: sel.getRangeAt(0), document: doc };
                }
                const iframes = doc.querySelectorAll("iframe");
                for (const iframe of iframes) {
                  try {
                    const innerDoc = iframe.contentDocument || iframe.contentWindow.document;
                    if (innerDoc) {
                      const res = getDeepSelectionRange(innerDoc);
                      if (res) return res;
                    }
                  } catch(e) {}
                }
                return null;
              };
              
              const result = getDeepSelectionRange(document);
              if (result) {
                const selectedText = result.selection.toString();
                
                // Wrap text selection in standard blue highlight span container
                try {
                  const span = result.document.createElement("span");
                  span.style.backgroundColor = "#3399ff";
                  span.style.color = "white";
                  span.className = "__temp_selection_highlight__";
                  result.range.surroundContents(span);
                  setTimeout(() => {
                    if (span.parentNode) {
                      const parent = span.parentNode;
                      while (span.firstChild) {
                        parent.insertBefore(span.firstChild, span);
                      }
                      span.remove();
                    }
                  }, 4000);
                } catch(e) {
                  // Fallback client rect overlays in blue
                  const rects = result.range.getClientRects();
                  const overlays = [];
                  for (let i = 0; i < rects.length; i++) {
                    const r = rects[i];
                    const overlay = result.document.createElement("div");
                    overlay.style.position = "absolute";
                    overlay.style.left = (result.document.defaultView.scrollX + r.left) + "px";
                    overlay.style.top = (result.document.defaultView.scrollY + r.top) + "px";
                    overlay.style.width = r.width + "px";
                    overlay.style.height = r.height + "px";
                    overlay.style.backgroundColor = "rgba(51, 153, 255, 0.95)";
                    overlay.style.pointerEvents = "none";
                    overlay.style.zIndex = "999999";
                    result.document.body.appendChild(overlay);
                    overlays.push(overlay);
                  }
                  setTimeout(() => {
                    overlays.forEach(o => o.remove());
                  }, 4000);
                }
                return selectedText;
              }
            } catch(e){}
            return "";
          })()
        `;
        const selectedText = await cdpEvaluate(copyScript);
        if (selectedText) {
          const { clipboard } = (window as any).require("electron");
          clipboard.writeText(selectedText);
        }
      }

      // Programmatically highlight and select all text visually on Ctrl+A
      if (key === "a" && ctrl) {
        const selectAllScript = `
          (() => {
            try {
              const selection = window.getSelection();
              selection.removeAllRanges();
              const range = document.createRange();
              range.selectNodeContents(document.body);
              selection.addRange(range);
              
              // Apply highly visible blue selection backdrop feedback
              const origBg = document.body.style.backgroundColor;
              document.body.style.backgroundColor = "rgba(0, 120, 215, 0.15)";
              setTimeout(() => {
                document.body.style.backgroundColor = origBg;
              }, 3000);
            } catch(e){}
          })()
        `;
        await cdpEvaluate(selectAllScript).catch(() => {});
      }

      // Execute physical keys press via Chrome DevTools Protocol
      await ipcRenderer.invoke("cdp-press-key", {
        webContentsId,
        key,
        ctrl,
        shift,
        alt
      });

      // Sync paste clipboard text to target input via DOM after triggering keys (recursive iframe search)
      if (key === "v" && ctrl) {
        try {
          const { clipboard } = (window as any).require("electron");
          const clipText = clipboard.readText() || "";
          
          const pasteScript = `
            (() => {
              try {
                const clipText = ${JSON.stringify(clipText)};
                if (!clipText) return;
                const getDeepActiveElement = (doc) => {
                  let activeEl = doc.activeElement;
                  if (activeEl && activeEl.tagName === "IFRAME") {
                    try {
                      const innerDoc = activeEl.contentDocument || activeEl.contentWindow.document;
                      if (innerDoc) {
                        return getDeepActiveElement(innerDoc) || activeEl;
                      }
                    } catch(e) {}
                  }
                  return activeEl;
                };
                const activeEl = getDeepActiveElement(document);
                if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
                  const start = activeEl.selectionStart || 0;
                  const end = activeEl.selectionEnd || 0;
                  const val = activeEl.value || "";
                  activeEl.value = val.substring(0, start) + clipText + val.substring(end);
                  activeEl.dispatchEvent(new Event("input", { bubbles: true }));
                  activeEl.dispatchEvent(new Event("change", { bubbles: true }));
                }
              } catch(e){}
            })()
          `;
          await new Promise(r => setTimeout(r, 100));
          await cdpEvaluate(pasteScript);
        } catch(clipErr) {
          console.error("Paste execution error:", clipErr);
        }
      }
    } catch (err) {
      console.error("Keyboard shortcut simulation error:", err);
    }
  };

  const waitForNetworkIdle = async (timeoutMs: number = 4000): Promise<boolean> => {
    const activeTabId = activeTabIdRef.current;
    const webview = document.getElementById(`webview-${activeTabId}`) as any;
    if (!webview) return true;
    try {
      const webContentsId = webview.getWebContentsId();
      const { ipcRenderer } = (window as any).require("electron");
      return await ipcRenderer.invoke("cdp-wait-idle", { webContentsId, timeoutMs });
    } catch(e) {}
    return false;
  };

  const cdpGetFrameTree = async (): Promise<any> => {
    const activeTabId = activeTabIdRef.current;
    const webview = document.getElementById(`webview-${activeTabId}`) as any;
    if (!webview) return null;
    try {
      const webContentsId = webview.getWebContentsId();
      const { ipcRenderer } = (window as any).require("electron");
      return await ipcRenderer.invoke("cdp-get-frames", { webContentsId });
    } catch(e) {}
    return null;
  };

  const cdpFocusTab = async (): Promise<boolean> => {
    const activeTabId = activeTabIdRef.current;
    const webview = document.getElementById(`webview-${activeTabId}`) as any;
    if (!webview) return false;
    try {
      const webContentsId = webview.getWebContentsId();
      const { ipcRenderer } = (window as any).require("electron");
      return await ipcRenderer.invoke("cdp-focus-tab", { webContentsId });
    } catch(e) {}
    return false;
  };

  const cdpEmulateNetwork = async (latency: number, downloadThroughput: number, uploadThroughput: number): Promise<boolean> => {
    const activeTabId = activeTabIdRef.current;
    const webview = document.getElementById(`webview-${activeTabId}`) as any;
    if (!webview) return false;
    try {
      const webContentsId = webview.getWebContentsId();
      const { ipcRenderer } = (window as any).require("electron");
      return await ipcRenderer.invoke("cdp-emulate-network", {
        webContentsId,
        latency,
        downloadThroughput,
        uploadThroughput
      });
    } catch(e) {}
    return false;
  };

  const simulateSelectText = async (selector?: string) => {
    const activeTabId = activeTabIdRef.current;
    const webview = document.getElementById(`webview-${activeTabId}`) as any;
    if (!webview) return;
    try {
      webview.focus();
      const webContentsId = webview.getWebContentsId();
      const webviewRect = webview.getBoundingClientRect();
      const { ipcRenderer } = (window as any).require("electron");

      // 1. Retrieve element bounding rect offset client coordinates recursively
      const coordScript = `
        (() => {
          try {
            const selector = ${JSON.stringify(selector || "")};
            let el = selector ? document.querySelector(selector) : null;
            if (!el && selector) {
              const findInShadows = (root) => {
                const candidates = Array.from(root.querySelectorAll("*"));
                for (const node of candidates) {
                  if (node.getAttribute && node.getAttribute("data-agent-idx") === selector.replace(/[^0-9]/g, "")) {
                    return node;
                  }
                  if (node.shadowRoot) {
                    const res = findInShadows(node.shadowRoot);
                    if (res) return res;
                  }
                }
                return null;
              };
              el = findInShadows(document);
            }
            if (el) {
              try {
                el.scrollIntoView({ behavior: "instant", block: "center", inline: "nearest" });
              } catch(e){}
              
              const findElementOffsets = (doc, target) => {
                const rect = target.getBoundingClientRect();
                if (doc === document) {
                  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
                }
                const iframes = doc.querySelectorAll("iframe");
                for (const iframe of iframes) {
                  try {
                    const innerDoc = iframe.contentDocument || iframe.contentWindow.document;
                    if (innerDoc) {
                      const res = findElementOffsets(innerDoc, target);
                      if (res) {
                        const iframeRect = iframe.getBoundingClientRect();
                        return {
                          left: res.left + iframeRect.left,
                          top: res.top + iframeRect.top,
                          width: res.width,
                          height: res.height
                        };
                      }
                    }
                  } catch(e) {}
                }
                return null;
              };
              
              const offsets = findElementOffsets(document, el);
              if (offsets) {
                return JSON.stringify(offsets);
              }
            }
          } catch(e) {}
          return "null";
        })()
      `;

      const offsetsStr = await cdpEvaluate(coordScript);
      if (offsetsStr && offsetsStr !== "null") {
        const offsets = JSON.parse(offsetsStr);
        const startX = offsets.left + 5;
        const startY = offsets.top + offsets.height / 2;
        const endX = offsets.left + offsets.width - 5;
        const endY = offsets.top + offsets.height / 2;

        // 2. Animate visual hand pointer glide to start coordinates
        const initialX = handPosition.x || window.innerWidth / 2;
        const initialY = handPosition.y || window.innerHeight / 2;
        const glideSteps = 10;
        for (let i = 1; i <= glideSteps; i++) {
          const t = i / glideSteps;
          const curX = initialX + (webviewRect.left + startX - initialX) * t;
          const curY = initialY + (webviewRect.top + startY - initialY) * t;
          setHandPosition({ x: curX, y: curY, visible: true, clicking: false });
          await new Promise(r => setTimeout(r, 15));
        }

        // 3. Dispatch native CDP drag selection and animate hand swipe
        ipcRenderer.invoke("cdp-drag-select", {
          webContentsId,
          startX,
          startY,
          endX,
          endY
        }).catch(() => {});

        const dragSteps = 15;
        for (let i = 1; i <= dragSteps; i++) {
          const t = i / dragSteps;
          const curX = startX + (endX - startX) * t;
          const curY = startY + (endY - startY) * t;
          setHandPosition({
            x: webviewRect.left + curX,
            y: webviewRect.top + curY,
            visible: true,
            clicking: true
          });
          await new Promise(r => setTimeout(r, 20));
        }

        setHandPosition({
          x: webviewRect.left + endX,
          y: webviewRect.top + endY,
          visible: true,
          clicking: false
        });
        await new Promise(r => setTimeout(r, 200));
        setHandPosition(prev => ({ ...prev, visible: false }));

        // 4. Inject standard bright blue selection highlight stylesheet and write selection to clipboard
        const selectScript = `
          (() => {
            try {
              const selector = ${JSON.stringify(selector || "")};
              let el = selector ? document.querySelector(selector) : null;
              if (!el && selector) {
                const findInShadows = (root) => {
                  const candidates = Array.from(root.querySelectorAll("*"));
                  for (const node of candidates) {
                    if (node.getAttribute && node.getAttribute("data-agent-idx") === selector.replace(/[^0-9]/g, "")) {
                      return node;
                    }
                    if (node.shadowRoot) {
                      const res = findInShadows(node.shadowRoot);
                      if (res) return res;
                    }
                  }
                  return null;
                };
                el = findInShadows(document);
              }
              if (el) {
                const range = document.createRange();
                range.selectNodeContents(el);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                
                // Wrap text selection in standard blue highlight span container
                try {
                  const span = document.createElement("span");
                  span.style.backgroundColor = "#3399ff";
                  span.style.color = "white";
                  span.className = "__temp_selection_highlight__";
                  range.surroundContents(span);
                  setTimeout(() => {
                    if (span.parentNode) {
                      const parent = span.parentNode;
                      while (span.firstChild) {
                        parent.insertBefore(span.firstChild, span);
                      }
                      span.remove();
                    }
                  }, 4000);
                } catch(e) {
                  // Fallback client rect overlays in blue
                  const rects = range.getClientRects();
                  const overlays = [];
                  for (let i = 0; i < rects.length; i++) {
                    const r = rects[i];
                    const overlay = document.createElement("div");
                    overlay.style.position = "absolute";
                    overlay.style.left = (window.scrollX + r.left) + "px";
                    overlay.style.top = (window.scrollY + r.top) + "px";
                    overlay.style.width = r.width + "px";
                    overlay.style.height = r.height + "px";
                    overlay.style.backgroundColor = "rgba(51, 153, 255, 0.95)";
                    overlay.style.pointerEvents = "none";
                    overlay.style.zIndex = "999999";
                    document.body.appendChild(overlay);
                    overlays.push(overlay);
                  }
                  setTimeout(() => {
                    overlays.forEach(o => o.remove());
                  }, 4000);
                }

                const txt = el.innerText || el.textContent || "";
                return txt;
              }
            } catch(e) {}
            return "";
          })()
        `;
        const copiedText = await cdpEvaluate(selectScript);
        if (copiedText) {
          const { clipboard } = (window as any).require("electron");
          clipboard.writeText(copiedText);
          return copiedText;
        }
      }
    } catch(e) {}
    return "";
  };

  return { 
    handPosition, 
    simulateHandClick, 
    simulateTyping, 
    simulateKeyPress,
    simulateScroll,
    waitForElement,
    waitForNetworkIdle,
    cdpEvaluate,
    cdpGetFrameTree,
    cdpFocusTab,
    cdpEmulateNetwork,
    simulateSelectText
  };
};
