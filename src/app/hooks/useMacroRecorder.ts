import { useState, useRef } from "react";
import { MacroStep } from "../types";

export const useMacroRecorder = (activeTabIdRef: { current: string }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSteps, setRecordedSteps] = useState<MacroStep[]>([]);
  const webviewRef = useRef<any>(null);

  const startRecording = () => {
    setRecordedSteps([]);
    setIsRecording(true);

    const activeTabId = activeTabIdRef.current;
    const webview = document.getElementById(`webview-${activeTabId}`) as any;
    if (webview) {
      webviewRef.current = webview;
      
      // Inject listener script
      const listenerScript = `
        (() => {
          if (window.__macro_listener_active__) return;
          window.__macro_listener_active__ = true;

          const getCleanSelector = (el) => {
            if (el.id) return "#" + el.id;
            let tag = el.tagName.toLowerCase();
            let classes = el.className;
            if (typeof classes === "string" && classes.trim()) {
              const cleanCls = classes.trim().replace(/\\s+/g, ".").split(".").filter(Boolean).slice(0, 3).join(".");
              if (cleanCls) return tag + "." + cleanCls;
            }
            return tag;
          };

          document.addEventListener("click", (e) => {
            const el = e.target;
            if (!el) return;
            const selector = getCleanSelector(el);
            const text = (el.innerText || el.textContent || "").trim();
            console.log("__macro_event__:" + JSON.stringify({
              action: "click_element",
              selector,
              text: text.substring(0, 30)
            }));
          }, { capture: true, passive: true });

          document.addEventListener("change", (e) => {
            const el = e.target;
            if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
              const selector = getCleanSelector(el);
              console.log("__macro_event__:" + JSON.stringify({
                action: "type_text",
                selector,
                text: el.value
              }));
            }
          }, { capture: true, passive: true });
        })()
      `;
      webview.executeJavaScript(listenerScript).catch((err: any) => {
        console.error("Failed to inject macro listener script:", err);
      });
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    webviewRef.current = null;
  };

  const addRecordedStep = (step: Omit<MacroStep, "id">) => {
    const newStep: MacroStep = {
      ...step,
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    };
    setRecordedSteps((prev) => [...prev, newStep]);
  };

  return {
    isRecording,
    recordedSteps,
    startRecording,
    stopRecording,
    addRecordedStep,
    setRecordedSteps
  };
};

export default useMacroRecorder;
