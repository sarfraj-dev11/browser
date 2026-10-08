// @ts-nocheck
import React from "react";

export const renderIncognitoIcon = (className: string) => {
    return /*#__PURE__*/ React.createElement("svg", {
        key: "incognito-icon",
        viewBox: "0 0 16 16",
        fill: "currentColor",
        className: className,
        children: /*#__PURE__*/ React.createElement("path", {
            fillRule: "evenodd",
            d: "m4.736 1.968-.892 3.269-.014.058C2.113 5.568 1 6.006 1 6.5 1 7.328 4.134 8 8 8s7-.672 7-1.5c0-.494-1.113-.932-2.83-1.205l-.014-.058-.892-3.27c-.146-.533-.698-.849-1.239-.734C9.411 1.363 8.62 1.5 8 1.5s-1.411-.136-2.025-.267c-.541-.115-1.093.2-1.239.735m.015 3.867a.25.25 0 0 1 .274-.224c.9.092 1.91.143 2.975.143a30 30 0 0 0 2.975-.143.25.25 0 0 1 .05.498c-.918.093-1.944.145-3.025.145s-2.107-.052-3.025-.145a.25.25 0 0 1-.224-.274M3.5 10h2a.5.5 0 0 1 .5.5v1a1.5 1.5 0 0 1-3 0v-1a.5.5 0 0 1 .5-.5m-1.5.5q.001-.264.085-.5H2a.5.5 0 0 1 0-1h3.5a1.5 1.5 0 0 1 1.488 1.312 3.5 3.5 0 0 1 2.024 0A1.5 1.5 0 0 1 10.5 9H14a.5.5 0 0 1 0 1h-.085q.084.236.085.5v1a2.5 2.5 0 0 1-5 0v-.14l-.21-.07a2.5 2.5 0 0 0-1.58 0l-.21.07v.14a2.5 2.5 0 0 1-5 0zm8.5-.5h2a.5.5 0 0 1 .5.5v1a1.5 1.5 0 0 1-3 0v-1a.5.5 0 0 1 .5-.5"
        })
    });
};

export function sanitizeJsonString(jsonStr: string) {
    let inString = false;
    let escaped = false;
    let result = "";
    for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        if (char === '"' && !escaped) {
            inString = !inString;
            result += char;
        } else if (inString) {
            if (char === '\n') {
                result += '\\n';
            } else if (char === '\r') {
                result += '\\r';
            } else if (char === '\t') {
                result += '\\t';
            } else {
                result += char;
            }
        } else {
            result += char;
        }
        if (char === '\\' && !escaped) {
            escaped = true;
        } else {
            escaped = false;
        }
    }
    return result;
}

export const getAiLogoPath = (modelName?: string) => {
    if (!modelName || typeof modelName !== "string") return "/ai-logo/perplexity.png";
    const name = modelName.toLowerCase();
    if (name.includes("perplexity") || name.includes("sonar") || name.includes("pplx")) return "/ai-logo/perplexity.png";
    if (name.includes("claude") || name.includes("anthropic")) return "/ai-logo/claude.png";
    if (name.includes("gpt") || name.includes("chatgpt") || name.includes("openai")) return "/ai-logo/chatgpt.png";
    if (name.includes("gemini") || name.includes("google")) return "/ai-logo/gemini.png";
    if (name.includes("deepseek")) return "/ai-logo/deepseek.png";
    if (name.includes("grok") || name.includes("xai")) return "/ai-logo/grok.png";
    if (name.includes("copilot") || name.includes("microsoft")) return "/ai-logo/copilot.webp";
    if (name.includes("meta") || name.includes("llama")) return "/ai-logo/meta ai.png";
    return "/ai-logo/perplexity.png";
};