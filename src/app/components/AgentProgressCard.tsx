// @ts-nocheck
import React from "react";
import { ChatMarkdown } from "./ChatMarkdown";

export function AgentProgressCard({ text, active, onLinkClick }) {

    const [isExpanded, setIsExpanded] = React.useState(true);
    React.useEffect({
        "AgentProgressCard.useEffect": {
            "AgentProgressCard.useEffect": () => {
                if (active) {
                    setIsExpanded(true);
                } else {
                    setIsExpanded(false);
                }
            }
        }["AgentProgressCard.useEffect"]
    }["AgentProgressCard.useEffect"], [
        active
    ]);
    const checklistItems = [];
    const steps = [];
    let currentThought = "";
    const lines = text.split("\n");
    let section = "other";
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.includes("Task Checklist")) {
            section = "checklist";
            continue;
        } else if (trimmed.includes("Agent Thoughts")) {
            section = "thoughts";
            continue;
        }
        if (section === "checklist") {
            const match = trimmed.match(/^-\s*\[([x/\s])\]\s*(.*)$/);
            if (match) {
                const symbol = match[1].trim();
                const task = match[2];
                const status = symbol === "x" ? "completed" : symbol === "/" ? "loading" : "pending";
                checklistItems.push({
                    task,
                    status
                });
            }
        } else if (section === "thoughts") {
            const match = trimmed.match(/^\*\s*\*\*Step\s*(\d+)\*\*:\s*(.*)$/i) || trimmed.match(/^-\s*Step\s*(\d+):\s*(.*)$/i);
            if (match) {
                steps.push(match[2]);
            } else if (trimmed.length > 0 && !trimmed.startsWith("**") && !trimmed.startsWith("###")) {
                currentThought = currentThought ? currentThought + "\n" + trimmed : trimmed;
            }
        }
    }
    if (checklistItems.length === 0 && steps.length === 0) {
        return /*#__PURE__*/ (0, React.createElement)(ChatMarkdown, {
            text: text,
            onLinkClick: onLinkClick
        });
    }
    return /*#__PURE__*/ (0, React.createElement)("div", {
        className: "flex flex-col gap-2.5 font-sans text-xs w-full select-text rounded-2xl border border-[#e3e0d5] bg-white/60 p-3.5 shadow-sm",
        children: [
            /*#__PURE__*/ (0, React.createElement)("button", {
            key: "k132_0_0",
            type: "button",
            onClick: () => setIsExpanded(!isExpanded),
            className: "flex items-center gap-1.5 text-[11px] text-[#8c8877] hover:text-[#c15f3c] font-semibold transition-colors select-none py-1 w-fit",
            children: [
                    /*#__PURE__*/ (0, React.createElement)("svg", {
                key: "k135_0_3",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2.5",
                className: `w-3 h-3 text-[#8c8877] transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`,
                children: /*#__PURE__*/ (0, React.createElement)("path", {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    d: "M8.25 4.5l7.5 7.5-7.5 7.5"
                })
            }),
                "Thought process"
            ]
        }),
            isExpanded && /*#__PURE__*/ (0, React.createElement)("div", {
                key: "k132_1_1",
                className: "flex flex-col gap-4 pl-3 border-l border-[#e3e0d5] mt-1 mb-3 transition-all duration-300",
                children: [
                    checklistItems.length > 0 && /*#__PURE__*/ (0, React.createElement)("div", {
                        key: "k155_0_4",
                        className: "flex flex-col gap-2",
                        children: [
                            /*#__PURE__*/ (0, React.createElement)("div", {
                            key: "k158_0_6",
                            className: "text-[10px] text-[#8c8877] font-bold uppercase tracking-wider select-none border-b border-[#e3e0d5] pb-1.5 mb-1",
                            children: "Checklist"
                        }),
                            /*#__PURE__*/ (0, React.createElement)("div", {
                            key: "k158_1_7",
                            className: "flex flex-col gap-2",
                            children: checklistItems.map((item, idx) =>/*#__PURE__*/(0, React.createElement)("div", {
                                key: `chk-${idx}`,
                                className: "flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-[#f9f8f6] border border-[#efede4]",
                                children: [
                                    item.status === "completed" ? /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: "k167_0_t_8",
                                        className: "w-4 h-4 rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0",
                                        children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                            viewBox: "0 0 20 20",
                                            fill: "currentColor",
                                            className: "w-2.5 h-2.5",
                                            children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                fillRule: "evenodd",
                                                d: "M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z",
                                                clipRule: "evenodd"
                                            })
                                        })
                                    }) : item.status === "loading" ? /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: "k167_0_f_t_9",
                                        className: "w-4 h-4 rounded-full border border-amber-500/30 bg-amber-500/10 flex items-center justify-center shrink-0",
                                        children: /*#__PURE__*/ (0, React.createElement)("div", {
                                            className: "w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"
                                        })
                                    }) : /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: "k167_0_f_f_10",
                                        className: "w-4 h-4 rounded-full border border-[#e3e0d5] bg-white shrink-0"
                                    }),
                                            /*#__PURE__*/ (0, React.createElement)("span", {
                                        key: "k167_1_11",
                                        className: `text-[#191919] font-medium leading-snug ${item.status === "completed" ? "line-through text-[#8c8877] opacity-60" : ""}`,
                                        children: item.task
                                    })
                                ]
                            }))
                        })
                        ]
                    }),
                    steps.length > 0 && /*#__PURE__*/ (0, React.createElement)("div", {
                        key: "k155_1_5",
                        className: "flex flex-col gap-2.5 mt-2",
                        children: [
                            /*#__PURE__*/ (0, React.createElement)("div", {
                            key: "k200_0_12",
                            className: "text-[10px] text-[#8c8877] font-bold uppercase tracking-wider select-none border-b border-[#e3e0d5] pb-1.5 mb-1",
                            children: "Activity Logs"
                        }),
                            /*#__PURE__*/ (0, React.createElement)("div", {
                            key: "k200_1_13",
                            className: "flex flex-col pl-2 border-l border-[#e3e0d5] gap-3.5 relative",
                            children: steps.map((step, idx) =>/*#__PURE__*/(0, React.createElement)("div", {
                                key: `step-${idx}`,
                                className: "relative pl-4 flex flex-col gap-0.5",
                                children: [
                                            /*#__PURE__*/ (0, React.createElement)("div", {
                                    key: "k209_0_14",
                                    className: `absolute -left-[13.5px] top-1.5 w-2.5 h-2.5 rounded-full border ${idx === steps.length - 1 && !currentThought ? "bg-[#c15f3c] border-[#c15f3c]/50 animate-pulse scale-110" : "bg-[#f9f8f6] border-[#e3e0d5]"}`
                                }),
                                            /*#__PURE__*/ (0, React.createElement)("div", {
                                    key: "k209_1_15",
                                    className: "text-[10px] text-[#8c8877] font-bold uppercase tracking-wider select-none",
                                    children: [
                                        "Step ",
                                        idx + 1
                                    ]
                                }),
                                            /*#__PURE__*/ (0, React.createElement)("div", {
                                    key: "k209_2_16",
                                    className: "text-[#191919] font-sans leading-relaxed",
                                    children: step
                                })
                                ]
                            }))
                        })
                        ]
                    })
                ]
            }),
            currentThought && /*#__PURE__*/ (0, React.createElement)("div", {
                key: "k132_2_2",
                className: "text-[#191919] font-sans leading-relaxed text-xs",
                children: /*#__PURE__*/ (0, React.createElement)(ChatMarkdown, {
                    text: currentThought,
                    onLinkClick: onLinkClick
                })
            })
        ]
    });
}