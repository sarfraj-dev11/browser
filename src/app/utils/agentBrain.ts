import { domStamperScript } from "./domStamper";
import { ExecutionMemoryManager } from "./executionMemory";
import { globalPerformanceMonitor } from "./performanceMonitor";
import { AutonomousEmployeeEngine } from "./autonomousEmployeeEngine";
import { globalNetworkMonitor } from "./networkMonitor";
import { globalMemoryCompactor } from "./memoryCompactor";
import { globalSelfTesterEngine } from "./selfTesterEngine";
import { globalStateSnapshotEngine } from "./stateSnapshotEngine";
import { globalSecurityGateDetector } from "./securityGateDetector";
import { globalFuzzyElementMatcher } from "./fuzzyElementMatcher";
import { globalHallucinationGuard } from "./hallucinationGuard";
import { globalJSONSelfCorrector } from "./jsonSelfCorrector";
import { globalPredictiveFetcher } from "./predictiveFetcher";
import { globalConfidenceEvaluator } from "./confidenceEvaluator";
import { globalMaxFailureRetryBreaker } from "./maxFailureRetryBreaker";
import { globalStateRollbackEngine } from "./stateRollbackEngine";
import { globalTabReclamator } from "./tabReclamator";
import { globalAdaptiveRateLimiter } from "./adaptiveRateLimiter";
import { globalActionReplayEngine } from "./actionReplayEngine";
import { globalTrustedDomainEngine } from "./trustedDomainEngine";
import { globalLiveSiteInspector } from "./liveSiteInspector";
import { globalUniversalPageInspector } from "./universalPageInspector";
import { globalDOMMutationGuard } from "./domMutationGuard";
import { globalTracebackAnalyzer } from "./tracebackAnalyzer";

export interface AgentStepResult {
  thought: string;
  action: string;
  idx?: number;
  text?: string;
  submit?: boolean;
  url?: string;
  direction?: "up" | "down";
  amount?: number;
  key?: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  query?: string;
  tasks?: string[];
  question?: string;
  options?: string[];
}

export const runAgentLoop = async (
  goal: string,
  activeTabId: string,
  apiKey: string,
  actions: {
    navigate: (url: string) => void;
    open_tab: (url: string) => void;
    switch_tab: (index: number) => void;
    click: (selector: string, text?: string) => Promise<void>;
    type: (text: string, selector: string, submit?: boolean) => Promise<void>;
    scroll: (direction: "up" | "down", amount?: number, selector?: string, text?: string) => Promise<void>;
    press_key: (key: string, ctrl?: boolean, shift?: boolean, alt?: boolean) => Promise<void>;
    go_back: () => void;
    go_forward: () => void;
    wait: (ms: number) => Promise<void>;
    select_text: (selector: string) => Promise<string>;
    ask_question: (question: string, options: string[]) => Promise<string>;
    onAuthOrCaptchaWait?: (status: { active: boolean; type: "captcha" | "login" | "auth" | "complete" | ""; message: string }) => void;
    checkManualContinue?: () => boolean;
  },
  getOpenTabs: () => { id: string; title: string; url: string; consoleLogs?: string[] }[],
  onThoughtUpdate: (thought: string) => void,
  onFinish: (summary: string) => void,
  learnedPromptSection?: string,
  initialHistory?: string[],
  initialTasksList?: string[]
) => {
  // Check for saved session snapshot to resume work seamlessly after model/app restart
  const savedSnapshot = globalStateSnapshotEngine.loadLatestSnapshot();
  if (savedSnapshot && savedSnapshot.goal === goal && (!initialHistory || initialHistory.length === 0)) {
    console.log("Restoring session snapshot after restart. Resuming from step:", savedSnapshot.stepsTaken);
    initialHistory = savedSnapshot.history;
    initialTasksList = savedSnapshot.tasksList;
  }

  let stepsTaken = initialHistory ? initialHistory.length : 0;
  const maxSteps = 9999;
  const history: string[] = initialHistory ? [...initialHistory] : [];
  let tasksList: string[] = initialTasksList ? [...initialTasksList] : [];

  // Variables to track state diffing (Self-Healing & Cycle Detection)
  let lastUrl = "";
  let lastTree = "";
  let actionFailCount = 0;
  let lastSearchContext = "";
  const executedActions: { idx?: number; action: string }[] = [];
  const elementCache = new Map<number, { text: string; role: string }>();
  const executionMemory = new ExecutionMemoryManager();
  const employeeEngine = new AutonomousEmployeeEngine();

  const renderLog = (currentStatusText?: string, isFinished?: boolean) => {
    let logText = "";
    if (tasksList.length > 0) {
      logText += `**Task Checklist**\n`;
      tasksList.forEach((task, index) => {
        let status = "[ ]";
        if (isFinished) {
          status = "[x]";
        } else if (index < stepsTaken) {
          status = "[x]";
        } else if (index === stepsTaken) {
          status = "[/]";
        }
        logText += `- ${status} ${task}\n`;
      });
      logText += `\n`;
    }

    logText += `**Agent Thoughts**\n`;
    if (history.length > 0) {
      logText += history.join("\n") + "\n";
    }
    logText += currentStatusText
      ? `* ${currentStatusText}`
      : (history.length === 0 ? `* Initializing...` : "");
    return logText;
  };

  // Initialize initial assistant chat status
  onThoughtUpdate(renderLog());

  while (stepsTaken < maxSteps) {
    const webview = document.getElementById(`webview-${activeTabId}`) as any;

    // Wait for webview page load to settle
    if (webview) {
      try {
        const loadStart = Date.now();
        while (typeof webview.isLoading === "function" && webview.isLoading() && Date.now() - loadStart < 7000) {
          onThoughtUpdate(renderLog("Waiting for website to finish loading..."));
          await new Promise((res) => setTimeout(res, 400));
        }
      } catch (e) {}
    }

    // Check for Authentication Walls (Login, 2FA, Password Inputs) and Captcha Blocks (ReCAPTCHA, hCaptcha, Turnstile)
    if (webview) {
      try {
        const authOrCaptchaCheckScript = `
          (() => {
            try {
              // 1. Check for known captcha container elements or iframes
              const captchaElements = document.querySelectorAll(
                '#g-recaptcha, .g-recaptcha, #h-captcha, .h-captcha, #cf-turnstile, .cf-turnstile, #cf-challenge, .cf-challenge, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], [id*="captcha"], [class*="captcha"]'
              );
              if (captchaElements.length > 0) {
                return { isBlocked: true, type: "captcha", message: "CAPTCHA challenge detected on screen. Waiting for user completion..." };
              }

              // 2. Check if the page title explicitly indicates a challenge gate (Cloudflare / Turnstile)
              const title = (document.title || "").toLowerCase();
              const isChallengeTitle = title.includes("just a moment") || title.includes("attention required") || title.includes("verify you are human") || title.includes("ddos guard") || title.includes("security check");
              if (isChallengeTitle) {
                return { isBlocked: true, type: "captcha", message: "Security challenge page detected. Waiting for user completion..." };
              }

              // 3. Check for human verification text in short, dedicated blocker pages
              const bodyText = (document.body.innerText || "").toLowerCase();
              if (bodyText.length < 3500) {
                const hasBlockerText = bodyText.includes("verify you are human") || bodyText.includes("please verify you are a robot") || bodyText.includes("cloudflare turnstile") || bodyText.includes("robot check");
                if (hasBlockerText) {
                  return { isBlocked: true, type: "captcha", message: "Human verification / CAPTCHA detected. Waiting for user completion..." };
                }
              }

              // 4. Check for visible Password Input fields (Login Page)
              const visiblePasswordInput = Array.from(document.querySelectorAll('input[type="password"]')).find(el => {
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
              });

              if (visiblePasswordInput) {
                // If the task itself is a login task, don't pause — the agent is supposed to fill this
                return { isBlocked: true, type: "login", message: "Login page or password prompt detected. Waiting for user authentication..." };
              }

              // 5. Check for 2FA / OTP / Security code inputs
              const otpInput = Array.from(document.querySelectorAll('input[name*="otp"], input[name*="code"], input[id*="otp"], input[autocomplete="one-time-code"]')).find(el => {
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
              });

              if (otpInput) {
                return { isBlocked: true, type: "auth", message: "2FA / Security code prompt detected. Waiting for user authentication..." };
              }

              return { isBlocked: false, type: "", message: "" };
            } catch(e) {
              return { isBlocked: false, type: "", message: "" };
            }
          })()
        `;

        const checkResult = await webview.executeJavaScript(authOrCaptchaCheckScript);
        const goalIsLoginTask = /log ?in|sign ?in|password|email|credential|authenticate/i.test(goal || "");
        if (checkResult && checkResult.isBlocked && !(checkResult.type === "login" && goalIsLoginTask)) {
          const waitLogMsg = checkResult.type === "captcha"
            ? "⚠️ CAPTCHA Gate detected! Please resolve it on screen, the agent loop is paused."
            : "🔐 Login / Authentication screen detected! Please log in on screen, the agent loop is paused.";

          onThoughtUpdate(renderLog(waitLogMsg));

          if (actions.onAuthOrCaptchaWait) {
            actions.onAuthOrCaptchaWait({
              active: true,
              type: checkResult.type,
              message: checkResult.message
            });
          }

          // Poll every 1.5 seconds until captcha/login elements vanish or user clicks "I've Completed It"
          let isBlocked = true;
          while (isBlocked) {
            await new Promise((res) => setTimeout(res, 1500));

            // Check if user manually clicked "I've Completed It"
            if (actions.checkManualContinue && actions.checkManualContinue()) {
              isBlocked = false;
              break;
            }

            try {
              const currentStatus = await webview.executeJavaScript(authOrCaptchaCheckScript);
              if (!currentStatus || !currentStatus.isBlocked) {
                isBlocked = false;
              }
            } catch (e) {
              isBlocked = false;
            }
          }

          // Show completion snackbar briefly
          if (actions.onAuthOrCaptchaWait) {
            actions.onAuthOrCaptchaWait({
              active: true,
              type: "complete",
              message: "Authentication / CAPTCHA completed! Resuming AI process..."
            });
            await new Promise((res) => setTimeout(res, 2000));
            actions.onAuthOrCaptchaWait({ active: false, type: "", message: "" });
          }

          onThoughtUpdate(renderLog("✅ Authentication / CAPTCHA resolved! Resuming loop..."));
        }
      } catch (authErr) {
        console.error("Auth/Captcha check error:", authErr);
      }
    }

    // 1. Gather Context (Accessibility Tree + URL/Title)
    let accessibilityTree = "No interactive elements found.";
    let url = "about:newtab";
    let title = "New Tab";
    let isLocal = false;

    if (webview) {
      try {
        url = webview.getURL();
        title = webview.getTitle();
      } catch (e) {
        isLocal = true;
      }
    }

    if (!isLocal && webview) {
      try {
        const { ipcRenderer } = (window as any).require("electron");
        const webContentsId = webview.getWebContentsId();
        const stamperResultStr = await ipcRenderer.invoke("cdp-evaluate", { webContentsId, expression: domStamperScript });
        const stamperResult = stamperResultStr ? JSON.parse(stamperResultStr) : null;
        accessibilityTree = (stamperResult && stamperResult.tree) || "No interactive elements found.";
      } catch (err) {
        console.error("DOM stamping error:", err);
      }
    }



    // Parse accessibilityTree into elementCache
    elementCache.clear();
    if (accessibilityTree) {
      const lines = accessibilityTree.split("\n");
      for (const line of lines) {
        const match = line.match(/^\[(\d+)\]\s*\(([^)]+)\)\s*"([^"]*)"/);
        if (match) {
          const itemIdx = parseInt(match[1]);
          const role = match[2];
          const text = match[3];
          elementCache.set(itemIdx, { text, role });
        }
      }
    }

    // Multi-Modal Vision: Capture active webview screenshot
    let base64Image = "";
    if (webview && !isLocal) {
      try {
        // Guard capturePage with a 1.5s timeout so it never hangs on blank/crashed pages
        const nativeImage = await Promise.race([
          webview.capturePage().catch(() => null),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500))
        ]);
        if (nativeImage) {
          const dataUrl = nativeImage.toDataURL(); // e.g. "data:image/png;base64,..."
          base64Image = dataUrl.split(",")[1];
        }
      } catch (err) {
        console.error("Screenshot capture error:", err);
      }
    }

    // Self-Healing & Cycle Warning Calculation
    let cycleWarning = "";
    if (executedActions.length >= 3) {
      const lastAction = executedActions[executedActions.length - 1];
      const secondLast = executedActions[executedActions.length - 2];
      const thirdLast = executedActions[executedActions.length - 3];
      if (
        lastAction.action === "click" &&
        lastAction.action === secondLast.action &&
        lastAction.action === thirdLast.action &&
        lastAction.idx === secondLast.idx &&
        lastAction.idx === thirdLast.idx
      ) {
        cycleWarning = `\n⚠️ **CRITICAL WARNING**: You have clicked element index ${lastAction.idx} three times in a row with no layout results. Do NOT click index ${lastAction.idx} again. You must select a different action (e.g. scroll down/up, search background queries, try another tab/URL, or use key pressed shortcuts).`;
      }
    }

    // Trigger Universal Inspection on EVERY visited website
    const pageAudit = await globalUniversalPageInspector.inspectVisitedPage(url, "Visited Page", accessibilityTree, accessibilityTree);
    const auditSecurityGate = pageAudit.securityGate;

    let failWarning = globalTrustedDomainEngine.getTrustedDomainPromptDirective() + 
                      globalLiveSiteInspector.getSiteInspectionPromptDirective(goal) + 
                      pageAudit.summaryDirective;

    const cbDirective = globalMaxFailureRetryBreaker.getCircuitBreakerPromptDirective();

    if (cbDirective) {
      failWarning += cbDirective;
    }

    if (auditSecurityGate?.isGateDetected) {
      failWarning += `\n⚠️ **SECURITY GATE DETECTED**: ${auditSecurityGate.gateType || "Auth Wall"}`;
    } else if (cycleWarning) {
      failWarning += cycleWarning;
    } else if (url === lastUrl && accessibilityTree === lastTree && stepsTaken > 0) {
      actionFailCount++;
      if (actionFailCount >= 1) {
        failWarning = `\n⚠️ **WARNING**: Your previous action had NO effect on the page layout. The URL and element list did not change. Do NOT repeat the exact same action index. The element might be covered, disabled, or require a different gesture. Try scrolling to verify focus, check for cookie wall/overlay banners, use key press shortcuts, or select a different index target.`;
      }
    } else {
      actionFailCount = 0;
    }
    lastUrl = url;
    lastTree = accessibilityTree;

    onThoughtUpdate(renderLog("Thinking... (Reasoning page state)"));

    // Compile list of currently open tabs
    const openTabs = getOpenTabs();
    const tabsDescription = openTabs
      .map((t, idx) => `[Tab Index ${idx}] ID: "${t.id}", Title: "${t.title}", URL: ${t.url}`)
      .join("\n");

    const activeTab = openTabs.find((t) => t.id === activeTabId);
    const consoleLogsDescription = (activeTab && activeTab.consoleLogs && activeTab.consoleLogs.length > 0)
      ? activeTab.consoleLogs.join("\n")
      : "No console logs captured.";

    // Save 5-minute automated state snapshot for crash recovery
    globalStateSnapshotEngine.saveSnapshot({
      timestamp: Date.now(),
      goal,
      stepsTaken,
      url,
      tasksList,
      history
    });

    // Scan DOM for CAPTCHA security gates & Cloudflare Turnstiles
    const securityGate = globalSecurityGateDetector.detectSecurityGate(accessibilityTree, activeTab?.title || "");

    // Run self-testing DOM integrity check
    const pageIntegrity = globalSelfTesterEngine.verifyPageIntegrity(url, accessibilityTree.length, false);
    const networkSummary = globalNetworkMonitor.getRecentAnomaliesSummary();

    // Compact history array for LLM context optimization
    const compactedHistory = globalMemoryCompactor.compactStepHistory(history);

    // Prune history for LLM prompt context to keep tokens under 1,500
    let prunedHistory = [...compactedHistory];
    let historicalSummary = "";
    if (prunedHistory.length > 5) {
      const olderSteps = prunedHistory.slice(0, prunedHistory.length - 4);
      historicalSummary = `Older steps summary:\nThe agent initiated the task and successfully completed the following actions: ${olderSteps.map(h => h.replace(/^\*\s*\*\*Step \d+\*\*:\s*/, "").replace(/^\*\s*/, "")).join("; ")}`;
      const recentSteps = prunedHistory.slice(prunedHistory.length - 4);
      prunedHistory = recentSteps;
    }

    // 2. Query Gemini Decision (Multi-modal with strict JSON schema)
    let decision: AgentStepResult;
    try {
      // Fetch relevant matching RAG context from Qdrant
      let ragContext = "";
      try {
        const origin = window.location.origin || "http://localhost:3000";
        const searchRes = await fetch(`${origin}/api/rag/search?q=${encodeURIComponent(goal)}&limit=3`);
        const searchData = await searchRes.json();
        if (searchData.results && searchData.results.length > 0) {
          ragContext = searchData.results.map((r: any, idx: number) => {
            return `[RAG Match ${idx + 1}] Source: "${r.title}" (${r.url})\nContent: "${r.text}"`;
          }).join("\n\n");
        }
      } catch (err) {
        console.error("Agent failed to retrieve RAG memories:", err);
      }

      const prompt = `Goal: "${goal}"
Current Page:
- URL: ${url}
- Title: ${title}

All Open Tabs in Browser:
${tabsDescription}

Interactive Elements Checklist Map:
${accessibilityTree}
${failWarning}

Active Page Console Log Messages (Useful to diagnose failures, JS errors, or network blocks):
${consoleLogsDescription}

${executionMemory.getMemoryPromptContext()}

Background Search Results (Information you looked up):
${lastSearchContext || "No background search context available."}

Retrieved RAG Memories (Information matching your goal from your vector DB):
${ragContext || "No matching RAG memories found."}
${learnedPromptSection || ""}

Execution History:
${historicalSummary ? `${historicalSummary}\n\nRecent Actions:\n` : ""}
${prunedHistory.length > 0 ? prunedHistory.map((h, i) => `Step ${history.length - prunedHistory.length + i + 1}: ${h}`).join("\n") : "No actions taken yet."}

Respond ONLY with a valid JSON block containing your next step thought and action choice.`;

      const { ipcRenderer } = (window as any).require("electron");

      // Construct Anthropic Messages format
      const claudeMessages: any[] = [
        {
          role: "user" as const,
          content: [
            ...(base64Image ? [{
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: "image/png" as const,
                data: base64Image
              }
            }] : []),
            {
              type: "text" as const,
              text: prompt
            }
          ]
        }
      ];

      let responseText = "";
      try {
        responseText = await ipcRenderer.invoke("claude-generate", {
          apiKey: apiKey,
          systemPrompt: agentSystemPrompt,
          messages: claudeMessages
        });
      } catch (err: any) {
        console.warn("First attempt for AI generation failed, retrying once...", err);
        try {
          await new Promise((r) => setTimeout(r, 1000));
          responseText = await ipcRenderer.invoke("claude-generate", {
            apiKey: apiKey,
            systemPrompt: agentSystemPrompt,
            messages: claudeMessages
          });
        } catch (retryErr: any) {
          onFinish(renderLog() + `\n\n❌ **AI API Error**: ${retryErr.message || retryErr}`);
          return;
        }
      }

      if (!responseText.trim()) {
        onFinish(renderLog() + `\n\n❌ **Error**: Empty response returned from Brocus AI.`);
        return;
      }

      // Use JSONSelfCorrector to parse and repair LLM output robustly
      try {
        decision = globalJSONSelfCorrector.parseAndRepairJSON<AgentStepResult>(responseText);
      } catch (parseErr) {
        // One correction round-trip: ask the model to re-emit valid JSON
        try {
          claudeMessages.push({ role: "assistant", content: responseText });
          claudeMessages.push({ role: "user", content: "Your previous response was not valid JSON. Reply with ONLY the corrected JSON object — no markdown, no commentary." });
          responseText = await ipcRenderer.invoke("claude-generate", {
            apiKey: apiKey,
            systemPrompt: agentSystemPrompt,
            messages: claudeMessages
          });
          decision = globalJSONSelfCorrector.parseAndRepairJSON<AgentStepResult>(responseText);
        } catch (e2) {
          throw parseErr;
        }
      }

      // Validate index bounds against live DOM length via HallucinationGuard
      const domLength = accessibilityTree.split("\n").length;
      const hCheck = globalHallucinationGuard.validateDecision(decision.action, decision.idx, domLength);
      if (!hCheck.isValid) {
        if (typeof hCheck.correctedIdx === "number") decision.idx = hCheck.correctedIdx;
        if (hCheck.correctedAction) decision.action = hCheck.correctedAction;
      }

      // Pre-fetch target URL asynchronously to reduce latency
      if (decision.url) {
        globalPredictiveFetcher.prefetchUrl(decision.url);
      }

      // Evaluate decision confidence
      const conf = globalConfidenceEvaluator.evaluateConfidence(decision.action, decision.thought, decision.idx);
      if (!conf.isHighConfidence) {
        console.warn("Low confidence step decision:", conf.notes);
      }
    } catch (err: any) {
      console.error("Agent brain decision query failed:", err);
      const isNetworkErr = err && (err.message?.includes("fetch") || err.toString().includes("fetch") || err.message?.includes("Network") || err.message?.includes("connect"));
      const errHeader = isNetworkErr
        ? "Network connection to Brocus AI failed. Please check your internet connection or API key status."
        : "Failed to parse next step JSON.";
      onFinish(renderLog() + `\n\n❌ **Error**: ${errHeader}\n\nDetails: ${err.message || err}`);
      return;
    }

    // Save or dynamically update sub-tasks checklist array on any step!
    if (decision.tasks && Array.isArray(decision.tasks) && decision.tasks.length > 0) {
      tasksList = [
        ...tasksList.slice(0, stepsTaken),
        ...decision.tasks
      ];
    } else if (tasksList.length === 0 && decision.action !== "finish") {
      // Fallback checklist if AI forgot to output tasks list on an active task
      tasksList = [
        "Open destination page",
        "Interact with page elements",
        "Submit input search details",
        "Confirm final objectives"
      ];
    }

    // Add step thought to history and render log
    history.push(`* **Step ${stepsTaken + 1}**: ${decision.thought}`);
    onThoughtUpdate(renderLog());

    // Record action step for cycle analysis
    executedActions.push({ idx: decision.idx, action: decision.action });

    // Wait a brief moment for user readability of current step thought
    await new Promise((res) => setTimeout(res, 700));

    // 3. Act
    if (decision.action === "finish") {
      if (employeeEngine.isWithinEmployeeShift()) {
        const nextPhase = employeeEngine.advanceNextPhase(goal, decision.thought);
        history.push(nextPhase.logNotice);
        onThoughtUpdate(renderLog(nextPhase.logNotice));

        // Auto-generate next iteration objectives and reset steps for continuous employee execution
        tasksList = [
          `[Phase ${nextPhase.phaseNumber}] Review previous execution outputs & audit edge cases`,
          `[Phase ${nextPhase.phaseNumber}] Execute high-priority secondary optimizations`,
          `[Phase ${nextPhase.phaseNumber}] Verify system performance & state integrity`
        ];
        stepsTaken = 0;
        actionFailCount = 0;
        continue;
      } else {
        if (stepsTaken === 0) {
          onFinish(decision.thought);
        } else {
          onFinish(renderLog(undefined, true) + `\n\n${decision.thought}`);
        }
        break;
      }
    }

    try {
      // Wait for DOM hydration settlement before executing element interaction
      await globalDOMMutationGuard.waitForDOMSettlement();

      switch (decision.action) {
        case "navigate": {
          if (decision.url) {
            actions.navigate(decision.url);
          }
          break;
        }
        case "open_tab": {
          if (decision.url) {
            actions.open_tab(decision.url);
          }
          break;
        }
        case "switch_tab": {
          if (typeof decision.idx === "number") {
            actions.switch_tab(decision.idx);
          }
          break;
        }
        case "click": {
          if (typeof decision.idx === "number") {
            const cached = elementCache.get(decision.idx);
            await actions.click(`[data-agent-idx='${decision.idx}']`, cached?.text);
          }
          break;
        }
        case "select_text": {
          if (typeof decision.idx === "number") {
            const copiedText = await actions.select_text(`[data-agent-idx='${decision.idx}']`);
            if (copiedText) {
              history.push(`  * Selected and copied text: "${copiedText.substring(0, 120)}..."`);
            } else {
              history.push(`  * Selection failed or returned empty.`);
            }
          }
          break;
        }
        case "ask_question": {
          if (decision.question && decision.options) {
            onThoughtUpdate(renderLog(`Waiting for user clarification on: "${decision.question}"...`));
            const answer = await actions.ask_question(decision.question, decision.options);
            history.push(`* **Asked User**: "${decision.question}"`);
            history.push(`  * **User Responded**: "${answer}"`);
          }
          break;
        }
        case "type": {
          if (typeof decision.idx === "number" && decision.text) {
            await actions.type(decision.text, `[data-agent-idx='${decision.idx}']`, decision.submit);
          }
          break;
        }
        case "scroll": {
          if (typeof decision.idx === "number") {
            const cached = elementCache.get(decision.idx);
            await actions.scroll(decision.direction || "down", decision.amount, `[data-agent-idx='${decision.idx}']`, cached?.text);
          } else {
            await actions.scroll(decision.direction || "down", decision.amount);
          }
          break;
        }
        case "press_key": {
          if (decision.key) {
            await actions.press_key(decision.key, decision.ctrl, decision.shift, decision.alt);
          }
          break;
        }
        case "go_back": {
          actions.go_back();
          break;
        }
        case "go_forward": {
          actions.go_forward();
          break;
        }
        case "web_search": {
          if (decision.query) {
            onThoughtUpdate(renderLog(`Searching background web results for "${decision.query}"...`));
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(decision.query)}`;
            history.push(`* **Background Search**: [Search: "${decision.query}"](${searchUrl})`);
            
            try {
              const origin = window.location.origin || "http://localhost:3000";
              const response = await fetch(`${origin}/api/search?q=${encodeURIComponent(decision.query)}`);
              const data = await response.json();
              if (data.results && Array.isArray(data.results)) {
                lastSearchContext = `Query: "${decision.query}"\nTop Results:\n` + data.results.map((r: any, idx: number) => {
                  return `[Result ${idx + 1}] Title: "${r.title}", URL: "${r.url}"\nSnippet: "${r.snippet}"`;
                }).join("\n\n");
                
                history.push(`  * Found result: "${data.results[0]?.title || "none"}"`);
              } else {
                lastSearchContext = `Query "${decision.query}" returned no results.`;
              }
            } catch (err: any) {
              console.error("Background search failed:", err);
              lastSearchContext = `Background search failed: ${err.message || err}`;
            }
          }
          break;
        }
        case "wait": {
          await actions.wait(2000);
          break;
        }
        default:
          console.warn("Agent brain selected unknown action:", decision.action);
      }

      // Record step into execution memory deduplication manager
      executionMemory.recordStep({
        stepNumber: stepsTaken + 1,
        actionType: (decision.action as any) || "verify",
        target: decision.url || decision.query || decision.text || (typeof decision.idx === "number" ? `element-${decision.idx}` : decision.action),
        resultSummary: decision.thought.slice(0, 100),
        status: "success"
      });
      globalPerformanceMonitor.recordStepTiming(700, true);
      if (actionFailCount > 0) {
        globalPerformanceMonitor.recordMistakeRecovery();
      }
    } catch (err: any) {
      console.error("Action execution failed:", err);
      const targetKey = decision.url || decision.query || decision.text || (typeof decision.idx === "number" ? `element-${decision.idx}` : decision.action);
      const breaker = globalMaxFailureRetryBreaker.recordFailure(targetKey);
      
      const diag = globalTracebackAnalyzer.analyzeError(err);
      history.push(diag.promptDirective);
      
      if (breaker.isBlacklisted) {
        history.push(`\n🛑 Target "${targetKey}" failed ${breaker.attempts} times and has been PERMANENTLY BLACKLISTED for this session.`);
      }

      executionMemory.recordStep({
        stepNumber: stepsTaken + 1,
        actionType: (decision.action as any) || "verify",
        target: targetKey,
        resultSummary: `Execution failed (${diag.rootCause}): ${err?.message || err}`,
        status: "failed",
        errorDetails: err?.message || String(err)
      });
    }

    // Adaptive step delay based on system & site latency
    const stepDelay = globalAdaptiveRateLimiter.getRecommendedDelay(700);
    await new Promise((res) => setTimeout(res, stepDelay));
    stepsTaken++;

    // Handover state writing removed
  }

  if (stepsTaken >= maxSteps) {
    onFinish(renderLog() + `\n\n⚠️ **Terminated**: Reached maximum task steps limit (${maxSteps} steps).`);
  }
};

const agentSystemPrompt = `<system_instructions>
You are the Antigravity Autonomous Web Agent, a state-of-the-art browser automation controller. Your core mission is to solve the user's goal through precise browser actions, high-fidelity element interaction, and self-correcting logic.
You operate in a strict closed-loop ReAct (Reasoning and Action) cycle.
On every turn, analyze the current webpage state, accessibility tree, visual layout, open tabs, and recent history before outputting your next step decision.
</system_instructions>

<available_tools>
You MUST interact with the browser ONLY by choosing one of the following tools in your JSON response:
- "navigate": Open/redirect current tab to a URL. Must specify "url" (string).
- "open_tab": Open a new tab with a destination URL. Must specify "url" (string).
- "switch_tab": Switch active focus to another tab by its index from the list of open tabs. Must specify "idx" (number).
- "click": Click an element index from the interactive tree. Must specify "idx" (number).
- "select_text": Highlight element text and copy it natively to clipboard. Must specify "idx" (number). Use this to select/copy site content.
- "type": Type text into an input index. Must specify "idx" (number) and "text" (string), and optionally "submit" (boolean).
- "scroll": Scroll the page document. Specify "direction" ("down" or "up") and optionally "amount" (number). Alternatively, you can specify "idx" (number) to scroll that specific element index directly into the center of the viewport (which utilizes smooth, target-perfect scrolling).
- "press_key": Press a key or shortcut. Must specify "key" (string, e.g. "c", "v", "a", "Enter") and optionally "ctrl" (boolean), "shift" (boolean), "alt" (boolean).
- "go_back": Navigate back in history on the current active tab.
- "go_forward": Navigate forward in history on the current active tab.
- "web_search": Query information IN THE BACKGROUND (e.g. keyboard shortcuts, tutorials, definitions). The search runs invisibly without switching tabs. Search results will be fed to you in "Background Search Results" on the next turn. Must specify "query" (string).
- "wait": Pause/wait for 2 seconds.
- "ask_question": Ask the user a clarifying question if you have any doubts, are stuck, need to choose between multiple search results, or require inputs you do not have. Must specify "question" (string) and "options" (array of strings, e.g. ["Canberra", "Sydney", "Melbourne", "Perth"]). This action pauses execution until the user selects or types an option.
- "finish": The user's ultimate goal has been achieved, or you have successfully found the answer to their question. You MUST write the final, direct, and complete answer to the user's query in the "thought" field. Do NOT write meta-phrases like "I will synthesize" or "goal achieved" in this field; write only the direct answer so the user receives it immediately.
</available_tools>

<retrieval_augmented_generation>
RAG Integration: On each step, look at the "Retrieved RAG Memories" and "Background Search Results" sections. 
- Prioritize using these retrieved contexts to answer questions or navigate to appropriate links.
- Do not mention or discuss "RAG", "vector database", or "background search" in your user-facing output. Integrate the information naturally as part of your general reasoning.
</retrieval_augmented_generation>

<orchestration_and_safety_guardrails>
IMPORTANT - COHERENT ACTION RULES:
- Minimize steps and output tokens. Bundle actions logically where possible.
- Keep task checklists extremely concise. Only define 3 to 5 high-level milestones (e.g., ["Navigate to Dart compiler", "Type Fibonacci code", "Execute and extract terminal output"]). Never create separate tasks for clicking input boxes, focusing, selecting text, waiting, or key presses.
- Google Search Fallback: If a URL is not directly specified or a site navigation fails, immediately perform a "web_search" to find the correct domain or topic, and navigate to it on the next step.
- Copy/Paste flows: Select text on step N, and switch tab & paste on step N+1 immediately.
- Differentiate Compiler Errors: If you are on an online IDE/compiler (like DartPad, Programiz), compilation warnings or syntax errors are code outputs to be corrected inside the input, NOT site crashes or blocks. Fix the code and click "Run" again!
- Do not verify Monaco/CodeMirror editor values inside the Accessibility Tree, as their input areas remain value="" even after typing. Rely on screenshots and console outputs.

IMPORTANT - SELF-CORRECTION & ANTI-STAGNATION:
- If stuck, looping, or facing ambiguous paths, immediately call "ask_question" to query the user for clarification instead of guessing or failing silently!
- If your previous action has no effect, do NOT repeat it. Scroll, press Tab/Enter, or select alternative targets.
- Cookie/GDPR walls: Click "Accept", "Close" or "Dismiss" before clicking main elements.

IMPORTANT - CODING & SYNTAX COMPOSITION RULES:
- WRITE STANDALONE, COMPLETE PROGRAMS: When writing programming code (e.g. Dart, JavaScript, Python, C++), you MUST write the full compile-ready program. Do NOT use ellipsis, comments as placeholders (e.g. '// TODO', '// rest of code'), or abbreviated functions. Write every single line of code so it runs immediately.
- COMPILER PRE-CLEARANCE: If writing code into online compilers or sandbox environments (like DartPad, StackBlitz, JSFiddle, CodePen), assume there might already be template code in the text box. The browser input simulator will automatically select and clear it. Always write the full standalone execution code (e.g. including the imports and 'void main()' container for Dart, or 'import' statements for JS/React) so the user doesn't have to copy-paste multiple fragments.
- RESPECT CASE-SENSITIVITY AND SYNTAX: Ensure all brackets, semi-colons, variable declarations, and import statements are strictly compliant with the target language's syntax compiler. Avoid code structure guesses. If unsure about standard syntax, use "web_search" in the background to look up official language references first!
- PREVENT SPECIAL CHARACTER CORRUPTION: Ensure quotes (single or double) and template string backticks are written cleanly. Do NOT escape special characters unnecessarily (e.g. writing backslash-n instead of actual line breaks, or writing double backslashes) inside the "text" field of the "type" action. Write natural text formatting with real line breaks.
- ALWAYS CLICK RUN/EXECUTE TO TEST: After typing code into an interactive compiler, sandbox, or web IDE (e.g. DartPad, StackBlitz, JSFiddle), you MUST locate and click the "Run", "Execute", or "Submit" button to compile and execute the code. Do NOT finish the task until you run the code and verify the output.
</orchestration_and_safety_guardrails>

<expected_response_format>
Your response must be a single, valid JSON block ONLY. Do not write markdown wrappers outside the JSON block.
Schema:
{
  "thought": "Short description of reasoning and goal (max 12 words)",
  "action": "action name from available_tools",
  "idx": 0, // Number (required for click, type, select_text, switch_tab)
  "text": "text content", // String (required for type, query, or ask_question question)
  "submit": true, // Boolean (optional for type)
  "url": "https://...", // String (required for navigate, open_tab)
  "direction": "down", // "down" or "up" (required for scroll)
  "amount": 400, // Number (optional for scroll)
  "key": "Enter", // String (required for press_key)
  "ctrl": false, // Boolean (optional for press_key)
  "shift": false, // Boolean (optional for press_key)
  "alt": false, // Boolean (optional for press_key)
  "options": ["A", "B"], // Array of strings (required for ask_question options)
  "tasks": ["Task 1", "Task 2"] // Array of strings (optional, Step 1 or checkpoints)
}

Example JSON response for Turn 1:
{
  "thought": "Opening search engine to locate target information.",
  "action": "navigate",
  "url": "https://www.google.com",
  "tasks": [
    "Navigate to search engine",
    "Search for requested query",
    "Identify target results"
  ]
}
</expected_response_format>`;
