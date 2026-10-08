export const exportVerificationReport = (
  goal: string,
  history: string[],
  tasks: string[],
  base64Image?: string
) => {
  const dateStr = new Date().toLocaleString();
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agent Verification Report</title>
  <style>
    :root {
      --bg: #141413;
      --card: #1b1a18;
      --border: #2e2b24;
      --primary: #c15f3c;
      --text: #e3e0d5;
      --muted: #8c8877;
    }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 40px 20px;
      line-height: 1.6;
    }
    .container {
      max-w: 800px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    header {
      border-bottom: 2px solid var(--border);
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    h1 {
      color: var(--primary);
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 800;
    }
    .meta {
      font-size: 11px;
      color: var(--muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .card {
      background-color: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
    }
    h2 {
      margin-top: 0;
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--primary);
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
      margin-bottom: 16px;
    }
    .task-item {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      font-size: 13px;
    }
    .task-checkbox {
      width: 14px;
      height: 14px;
      border: 2px solid var(--primary);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .task-checkbox.checked {
      background-color: var(--primary);
    }
    .task-checkbox.checked::after {
      content: "✔";
      color: white;
      font-size: 10px;
      font-weight: bold;
    }
    .task-checkbox.in-progress {
      border-color: #f59e0b;
      background-color: #f59e0b/20;
    }
    .step-log {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .step-item {
      border-left: 2.5px solid var(--primary);
      padding-left: 16px;
      margin-left: 8px;
      font-size: 13px;
    }
    .step-title {
      font-weight: 700;
      color: #white;
      margin-bottom: 4px;
    }
    .screenshot-img {
      max-width: 100%;
      border-radius: 8px;
      border: 1px solid var(--border);
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      margin-top: 8px;
    }
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: var(--primary);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      transition: all 0.2s;
    }
    .print-btn:hover {
      background-color: #d66b44;
    }
    @media print {
      .print-btn {
        display: none;
      }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Save PDF / Print</button>
  <div class="container">
    <header>
      <h1>Agent Verification Log</h1>
      <div class="meta">Goal: "${goal.replace(/"/g, '&quot;')}" &bull; Compiled: ${dateStr}</div>
    </header>

    <div class="card">
      <h2>Task Progress Checklist</h2>
      ${tasks.map(task => {
        const isChecked = task.includes("[x]");
        const isInProgress = task.includes("[/]");
        const label = task.replace(/^-\s*\[[x\s/]*\]\s*/, "");
        return `
          <div class="task-item">
            <div class="task-checkbox ${isChecked ? "checked" : ""} ${isInProgress ? "in-progress" : ""}"></div>
            <span style="${isChecked ? "text-decoration: line-through; opacity: 0.6;" : ""}">${label}</span>
          </div>
        `;
      }).join("")}
    </div>

    <div class="card">
      <h2>Execution Steps Timeline</h2>
      <div class="step-log">
        ${history.map((step, idx) => `
          <div class="step-item">
            <div class="step-title">Step ${idx + 1}</div>
            <div>${step.replace(/^\*\s*\*\*Step\s*\d+\*\*:\s*/, "")}</div>
          </div>
        `).join("")}
      </div>
    </div>

    ${base64Image ? `
    <div class="card">
      <h2>Verification Screenshot</h2>
      <img src="data:image/png;base64,${base64Image}" class="screenshot-img" alt="Page validation frame" />
    </div>
    ` : ""}
  </div>
</body>
</html>
  `;

  const blob = new Blob([htmlContent], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `agent-verification-report-${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
