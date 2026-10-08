"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  RefreshCw,
  HelpCircle,
  Lock,
  BookOpen,
  Compass,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Zap,
  Cpu,
  Layers,
  Terminal,
  RotateCcw,
  Sparkles,
  ChevronRight
} from "lucide-react";

interface Factor {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badge: string;
  color: string;
  bgColor: string;
  borderColor: string;
  summary: string;
  keyMechanisms: string[];
  codeExample: string;
  impactScore: number;
}

const factors: Factor[] = [
  {
    id: "factor-1",
    title: "1. DOM State Diffing & Cycle Detection",
    subtitle: "Automatic detection of non-responsive actions & infinite loops",
    icon: RefreshCw,
    badge: "Automated Self-Healing",
    color: "#c15f3c",
    bgColor: "#c15f3c/10",
    borderColor: "#c15f3c/30",
    summary:
      "When the AI agent performs an action (e.g. clicking an element) that fails to change the DOM tree or URL, the system detects a zero-diff cycle. Instead of repeating the broken action, it increments failure metrics and injects diagnostic warnings into the agent's prompt.",
    keyMechanisms: [
      "DOM Snapshot Comparison (diffing current vs previous Accessibility Tree)",
      "URL Stagnation Monitoring (detecting unfulfilled navigation)",
      "Prompt Interception: Automatically warns the model that previous action had 0 layout impact",
      "Dynamic Selector Switching: Forces model to select alternate element indices or fallback gestures"
    ],
    codeExample: `if (url === lastUrl && accessibilityTree === lastTree) {
  actionFailCount++;
  if (actionFailCount >= 1) {
    failWarning = "⚠️ WARNING: Action had 0 layout effect. Do not repeat same index target. Try scrolling or alternate selectors.";
  }
}`,
    impactScore: 98
  },
  {
    id: "factor-2",
    title: "2. Human-in-the-Loop Clarification (Inline Question Sheet)",
    subtitle: "Gracefully asking the user for guidance when stuck or ambiguous",
    icon: HelpCircle,
    badge: "Interactive Clarification",
    color: "#d97706",
    bgColor: "#d97706/10",
    borderColor: "#d97706/30",
    summary:
      "Rather than guessing incorrectly or crashing when instructions are ambiguous or elements are hidden, the AI activates the ask_question tool. This temporarily replaces the chat input with a structured question card for immediate user resolution.",
    keyMechanisms: [
      "Inline Input Replacement: Replaces default chat form with structured choice buttons",
      "Custom Response Write-In: Allows users to type custom instructions if preset choices don't apply",
      "Zero-Overlay Integration: Clean UI flow without interrupting main browser viewport",
      "Asynchronous Resolve Promise: Agent execution pauses gracefully until user clicks or skips"
    ],
    codeExample: `ask_question: async (question, options) => {
  return new Promise((resolve) => {
    setActiveQuestion({ question, options, resolve });
  });
}`,
    impactScore: 95
  },
  {
    id: "factor-3",
    title: "3. CAPTCHA & Security Gate Detection",
    subtitle: "Pausing execution on login walls & anti-bot challenges",
    icon: Lock,
    badge: "Gatekeeper Guard",
    color: "#dc2626",
    bgColor: "#dc2626/10",
    borderColor: "#dc2626/30",
    summary:
      "Detects Cloudflare Turnstile, ReCAPTCHA, hCaptcha, 2FA OTP prompts, and password fields across active webviews. Automatically pauses automated interactions and notifies the user to log in or complete verification manually.",
    keyMechanisms: [
      "Iframe & Class Inspection: Scans DOM for Cloudflare, Google ReCAPTCHA, and Turnstile elements",
      "Title & Body Text Heuristics: Identifies 'Just a moment...', 'Verify you are human', etc.",
      "Password & OTP Field Monitoring: Pauses before interacting with sensitive auth inputs",
      "Polling & Manual Resume: Auto-resumes once security gate disappears or user confirms completion"
    ],
    codeExample: `const isBlocked = title.includes("verify you are human") || captchaElements.length > 0;
if (isBlocked) {
  actions.onAuthOrCaptchaWait({ active: true, type: "captcha", message: "CAPTCHA detected" });
  await pollUntilResolved();
}`,
    impactScore: 99
  },
  {
    id: "factor-4",
    title: "4. Learned Rules & Memory Engine (/learn)",
    subtitle: "Persistent user corrections stored in vector & JSON databases",
    icon: BookOpen,
    badge: "Persistent Learning",
    color: "#2563eb",
    bgColor: "#2563eb/10",
    borderColor: "#2563eb/30",
    summary:
      "Allows the user to teach the AI explicit behavioral rules (e.g. '/learn Always accept cookies before clicking search'). These rules persist in local JSON memory and vector memory to ensure past mistakes are never repeated in future sessions.",
    keyMechanisms: [
      "Slash Command /learn: Instantly registers user directives into learned_rules.json",
      "System Prompt Injection: Automatically prepends active rules to every model inference prompt",
      "Command Management: Inspect with /learn list or wipe with /learn clear",
      "Cross-Session Persistence: Saved directly to App Data directory for global application"
    ],
    codeExample: `// User command: /learn Always click the 'Accept All' cookie button first
fs.writeFileSync(rulesFilePath, JSON.stringify([...rules, newRule]));
// Automatically injected into system prompt on next request!`,
    impactScore: 92
  },
  {
    id: "factor-5",
    title: "5. Smart Intent Routing Classifier",
    subtitle: "Preventing accidental browser commands during conversational Q&A",
    icon: Compass,
    badge: "Intent Guardrail",
    color: "#059669",
    bgColor: "#059669/10",
    borderColor: "#059669/30",
    summary:
      "Before taking any physical action on the browser window, a lightweight intent routing classifier analyzes the user's message. It separates standard conversational questions from actual web browser action requests.",
    keyMechanisms: [
      "Dual-Class Categorization: 'chat' (informational query) vs 'browse' (interactive action)",
      "Accidental Execution Prevention: Stops standard questions from inadvertently clicking page buttons",
      "Linear Macro vs Full Agent Branching: Fast-tracks simple tasks to JSON macros, routes complex tasks to multi-step reasoning",
      "Fallback Safety Net: Defaults to safe chat mode if routing classification fails"
    ],
    codeExample: `const classifiedAction = await ipcRenderer.invoke("claude-generate", {
  systemPrompt: "Classify intent as 'chat' or 'browse'. Reply ONLY with one word.",
  messages: [{ role: "user", content: text }]
});`,
    impactScore: 90
  },
  {
    id: "factor-6",
    title: "6. Multi-Modal Vision & Console Stream Diagnostics",
    subtitle: "Inspecting webview screenshots and JS error logs simultaneously",
    icon: Eye,
    badge: "Dual-Sensory Perception",
    color: "#7c3aed",
    bgColor: "#7c3aed/10",
    borderColor: "#7c3aed/30",
    summary:
      "Combines base64 screenshot feeds with real-time console log streams from active webviews. When an action fails, the AI evaluates both visual layout shifts and Javascript stack traces to isolate the root cause.",
    keyMechanisms: [
      "Base64 Screenshot Capturing: Captures live render frame before every reasoning step",
      "Console Log Capture Pipeline: Intercepts console.error and console.warn streams from webview",
      "Visual-Structural Alignment: Cross-references DOM accessibility indices with pixel positions",
      "Diagnostic Synthesis: Informs model if a button is visually obscured by a fixed modal"
    ],
    codeExample: `const consoleLogsDescription = activeTab.consoleLogs.join("\\n");
const prompt = \`Active Page Console Log Messages (to diagnose failures):
\${consoleLogsDescription}\`;`,
    impactScore: 96
  },
  {
    id: "factor-7",
    title: "7. User-Triggered One-Click Fix & Retry",
    subtitle: "Empowering users to initiate self-correction with full error context",
    icon: RotateCcw,
    badge: "User Remediation",
    color: "#4f46e5",
    bgColor: "#4f46e5/10",
    borderColor: "#4f46e5/30",
    summary:
      "When an error message or partial failure appears in the chat, a 1-click 'Fix Error & Retry' action button is exposed on the message UI. Clicking it prompts the AI to perform a root-cause diagnosis and execute an alternative strategy.",
    keyMechanisms: [
      "1-Click Trigger: Accessible right next to Copy / Read Aloud controls on assistant messages",
      "Error Context Injection: Attaches previous stack traces and failed attempts to retry prompt",
      "Optimistic UI Reset: Immediately sets typing state and initiates corrected reasoning pass",
      "History Rewind: Retains user intent while replacing flawed assistant responses"
    ],
    codeExample: `const handleFixAndRetry = (msgText) => {
  const retryPrompt = \`My previous response/action had an issue: "\${msgText}". Please analyze what went wrong and execute a corrected solution.\`;
  handleSendAssistantMessage(retryPrompt);
};`,
    impactScore: 94
  }
];

import { globalPerformanceMonitor } from "../utils/performanceMonitor";

export default function MistakeRecoveryPage() {
  const [activeFactorId, setActiveFactorId] = useState<string>("factor-1");
  const [simulatedState, setSimulatedState] = useState<"idle" | "error" | "recovering" | "resolved">("idle");
  const [simulatedLogs, setSimulatedLogs] = useState<string[]>([]);

  const metrics = globalPerformanceMonitor.getMetrics();
  const activeFactor = factors.find((f) => f.id === activeFactorId) || factors[0];

  const handleRunSimulation = () => {
    setSimulatedState("error");
    setSimulatedLogs(["[10:14:02] Action executed: Click element #submit-btn (Index 4)", "[10:14:03] ⚠️ Warning: DOM Tree diff = 0 bytes. URL unchanged."]);

    setTimeout(() => {
      setSimulatedState("recovering");
      setSimulatedLogs((prev) => [
        ...prev,
        "[10:14:04] 🧠 Self-Correction Triggered: Factor 1 (DOM State Diffing)",
        "[10:14:05] Injecting failure prompt warning to model...",
        "[10:14:06] Model decision: Scroll down to bring obscured button into view & click Index 7 instead."
      ]);
    }, 1500);

    setTimeout(() => {
      setSimulatedState("resolved");
      setSimulatedLogs((prev) => [
        ...prev,
        "[10:14:07] ✅ Action Succeeded! DOM updated. Step complete."
      ]);
    }, 3200);
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-[#f9f8f6] text-[#191919] font-sans p-6 md:p-10 max-w-7xl mx-auto selection:bg-[#c15f3c]/20">
      {/* Header */}
      <header className="mb-10 pb-8 border-b border-[#e3e0d5]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c15f3c]/10 text-[#c15f3c] text-xs font-bold uppercase tracking-wider mb-4 border border-[#c15f3c]/20">
          <Sparkles className="w-3.5 h-3.5" /> Bulletproof Architecture Architecture
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#191919] mb-3">
          AI Mistake Recovery & Self-Healing Architecture
        </h1>
        <p className="text-sm md:text-base text-[#6e6b5e] max-w-3xl leading-relaxed">
          A multi-factor, fault-tolerant design system built into our Browser AI Assistant. When automation steps fail, layout elements change, or API errors occur, these 7 core factors work in harmony to diagnose, self-correct, and recover without breaking the session.
        </p>
      </header>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white p-5 rounded-2xl border border-[#e3e0d5] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8c8877] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Health Score</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-[#191919]">{metrics.overallHealthScore} / 100</div>
          <div className="text-[11px] text-[#6e6b5e] mt-1">Live AI system health index</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e3e0d5] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8c8877] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Deduplication Memory</span>
            <Layers className="w-4 h-4 text-[#c15f3c]" />
          </div>
          <div className="text-3xl font-black text-[#191919]">{metrics.deduplicatedActionsSaved} Saved</div>
          <div className="text-[11px] text-[#6e6b5e] mt-1">Redundant search/clicks prevented</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e3e0d5] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8c8877] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Step Latency</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-[#191919]">{metrics.avgStepLatencyMs} ms</div>
          <div className="text-[11px] text-[#6e6b5e] mt-1">Average step execution time</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e3e0d5] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8c8877] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Learned Rules</span>
            <BookOpen className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-black text-[#191919]">{metrics.learnedRulesCount} Rules</div>
          <div className="text-[11px] text-[#6e6b5e] mt-1">Active user taught behavior memory</div>
        </div>
      </div>

      {/* Main Content Area: Sidebar Selector + Detail Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* Factor Selection List (Left Column) */}
        <div className="lg:col-span-4 flex flex-col gap-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#8c8877] mb-1 px-1">
            Core Self-Correction Factors
          </h2>
          {factors.map((factor) => {
            const Icon = factor.icon;
            const isActive = factor.id === activeFactorId;
            return (
              <button
                key={factor.id}
                onClick={() => setActiveFactorId(factor.id)}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  isActive
                    ? "bg-white border-[#c15f3c] shadow-md -translate-y-0.5"
                    : "bg-white/60 border-[#e3e0d5] hover:bg-white hover:border-zinc-300"
                }`}
              >
                <div
                  className="p-2 rounded-xl shrink-0 mt-0.5"
                  style={{ backgroundColor: isActive ? "#c15f3c15" : "#00000008", color: isActive ? "#c15f3c" : "#6e6b5e" }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-xs font-bold text-[#191919] truncate">{factor.title}</span>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isActive ? "text-[#c15f3c] translate-x-0.5" : "text-zinc-300"}`} />
                  </div>
                  <p className="text-[11px] text-[#6e6b5e] line-clamp-1 leading-snug">{factor.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Factor Detail Display (Right Column) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-[#e3e0d5] p-6 md:p-8 shadow-sm flex flex-col justify-between">
          <div>
            {/* Top Badge & Title */}
            <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-[#e3e0d5]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#c15f3c] bg-[#c15f3c]/10 px-2.5 py-1 rounded-md">
                  {activeFactor.badge}
                </span>
                <h3 className="text-xl font-bold text-[#191919] mt-2">{activeFactor.title}</h3>
                <p className="text-xs text-[#6e6b5e] font-medium">{activeFactor.subtitle}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-black text-[#c15f3c]">{activeFactor.impactScore}%</div>
                <div className="text-[10px] text-[#8c8877] font-bold uppercase tracking-wider">Efficiency</div>
              </div>
            </div>

            {/* Summary */}
            <p className="text-xs md:text-sm text-[#191919] leading-relaxed mb-6 bg-[#f9f8f6] p-4 rounded-xl border border-[#e3e0d5]">
              {activeFactor.summary}
            </p>

            {/* Key Mechanisms List */}
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8c8877] mb-3">
                Key Architectural Mechanisms
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {activeFactor.keyMechanisms.map((mech, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-[#191919] bg-white p-2.5 rounded-xl border border-[#e3e0d5]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{mech}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Code Implementation Snippet */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8c8877] mb-2 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#c15f3c]" /> Code Logic Implementation
              </h4>
              <pre className="bg-[#191919] text-[#e3e0d5] p-4 rounded-2xl text-[11px] font-mono overflow-x-auto leading-relaxed border border-zinc-800">
                <code>{activeFactor.codeExample}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Live Interactive Self-Healing Sandbox */}
      <section className="bg-white rounded-3xl border border-[#e3e0d5] p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#e3e0d5]">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
              <Cpu className="w-4 h-4" /> Live Interactive Sandbox
            </div>
            <h3 className="text-xl font-bold text-[#191919]">Simulate Mistake Recovery Flow</h3>
            <p className="text-xs text-[#6e6b5e]">
              Click the button below to simulate an automation mistake (0-byte layout diff) and watch the self-correction pipeline execute in real time.
            </p>
          </div>
          <button
            onClick={handleRunSimulation}
            disabled={simulatedState === "recovering"}
            className="px-5 py-2.5 rounded-2xl bg-[#c15f3c] hover:bg-[#a34b2c] text-white text-xs font-bold transition-all active:scale-95 shadow-md disabled:opacity-50 flex items-center gap-2 shrink-0"
          >
            {simulatedState === "recovering" ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Self-Healing in Progress...
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4" /> Simulate Mistake & Self-Heal
              </>
            )}
          </button>
        </div>

        {/* Live Simulation Output Box */}
        <div className="bg-[#191919] rounded-2xl p-5 border border-zinc-800 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800 text-zinc-400 text-[10px] uppercase tracking-wider font-bold">
            <span>Agent Engine Terminal Logs</span>
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${simulatedState === "idle" ? "bg-zinc-500" : simulatedState === "error" ? "bg-amber-500 animate-ping" : simulatedState === "recovering" ? "bg-blue-500 animate-spin" : "bg-emerald-500"}`} />
              State: {simulatedState.toUpperCase()}
            </span>
          </div>

          <div className="flex flex-col gap-2 min-h-[120px] max-h-[220px] overflow-y-auto">
            {simulatedLogs.length === 0 ? (
              <span className="text-zinc-600 italic">Click "Simulate Mistake & Self-Heal" above to trigger a test run...</span>
            ) : (
              simulatedLogs.map((log, index) => (
                <div
                  key={index}
                  className={`leading-relaxed ${
                    log.includes("⚠️")
                      ? "text-amber-400 font-semibold"
                      : log.includes("🧠")
                      ? "text-cyan-400 font-bold"
                      : log.includes("✅")
                      ? "text-emerald-400 font-bold"
                      : "text-zinc-300"
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
