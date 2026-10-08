// @ts-nocheck
"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Tab, AutofillProfile, MacroStep } from "./types";
import { getFaviconUrl } from "./utils/favicon";
import { useClickSimulator } from "./hooks/useClickSimulator";
import { VisualPointerHand } from "./components/VisualPointerHand";
import { MacroBuilder } from "./components/MacroBuilder";
import { getAutofillScript } from "./utils/formAutofill";
import { cookieAnnihilatorScript } from "./utils/cookieAnnihilator";
import { translationOverlayScript } from "./utils/translationOverlay";
import { runAgentLoop } from "./utils/agentBrain";
import { executeBackgroundTool } from "./utils/backgroundToolsRunner";
import { AgentStatusOverlay } from "./components/AgentStatusOverlay";
import PerplexityLoginCard from "./PerplexityLoginCard";
import { ChatMarkdown } from "./components/ChatMarkdown";
import { useMacroRecorder } from "./hooks/useMacroRecorder";
import { exportVerificationReport } from "./utils/reportExporter";
import { AuthCaptchaSnackbar, AuthSnackbarState } from "./components/AuthCaptchaSnackbar";
import { ToolsPanel } from "./components/tools/ToolsPanel";
import { extractDroppedUrl } from "./utils/dragDrop";
import { ActiveQuestionModal } from "./components/ActiveQuestionModal";
import { PlusContextMenu } from "./components/PlusContextMenu";
import { generateDeepArchitecturalPlan } from "./utils/deepPlanEngine";
import { Sparkles, Search, Shield, Zap, Info, ChevronRight, Terminal, Heart, Users, Globe, Cpu, Play, Download, ExternalLink, FolderOpen, Trash2, FileText, Image, Archive, Folder, Plus, Key, Clock, Star, LayoutGrid, Puzzle, Printer, ScanSearch, Share2, Briefcase, HelpCircle, Settings, LogOut, Minus, Maximize2, User, Lock, Square, X, CheckCircle2, Pause, RefreshCw, Phone, Mail, MapPin, Scale, Landmark, GraduationCap, AtSign } from "lucide-react";
import { AUTOCOMPLETE_DOMAINS } from "./utils/constants";

import { BrocusAvatar } from "./components/BrocusAvatar";
import { AgentProgressCard } from "./components/AgentProgressCard";
import { UpdateBanner } from "./components/UpdateBanner";
import { getAiLogoPath, renderIncognitoIcon, sanitizeJsonString } from "./utils/helpers";

const PHONE_LOOKUP_TABS = [
    { id: "overview", label: "Overview", match: null as RegExp | null },
    { id: "phone", label: "Phone & Email", match: /contact|phone|email/i },
    { id: "address", label: "All Addresses", match: /location|address/i },
    { id: "family", label: "Family", match: /family|relative/i },
    { id: "social", label: "Social", match: /social/i },
    { id: "court", label: "Court", match: /court|criminal/i },
    { id: "personal", label: "Personal", match: /personal|interest|language|fitness|birth|marriage|additional|detail|historical/i },
    { id: "wealth", label: "Wealth", match: /wealth|lifestyle|propert|income|asset|invest/i },
    { id: "work", label: "Work & Education", match: /work|education/i },
];

const decodePhoneLookupLine = (t: string): string | null => {
    let m: RegExpMatchArray | null;
    if ((m = t.match(/^address\|[^|]*\|([^|]+)\|([^|]+)/i))) return `${m[2]} ${m[1]}`.trim();
    if ((m = t.match(/^phone\|(\d{10})/i))) return `(${m[1].slice(0, 3)}) ${m[1].slice(3, 6)}-${m[1].slice(6)}`;
    if ((m = t.match(/^social\|(https?:\/\/\S+)/i))) return m[1];
    if ((m = t.match(/^education\|([^|]+)/i))) return m[1].replace(/\b\w/g, (c) => c.toUpperCase());
    if (/^[a-z_.]+\|/i.test(t)) return null;
    if (/^section\.[\w-]+$/i.test(t)) return null;
    if (/move left|move right|move up|move down|zoom in|zoom out|jump left|jump right|jump up|jump down|metric and imperial|map data ©|toggle between/i.test(t)) return null;
    if (/special offer|claim now|see more|see less|view property|view profile|view on |view details|unlock|sign up|subscribe|download|learn more|get started|^pdf$|^share$|^more$|^cookies$|^copyright|^spokeo$/i.test(t)) return null;
    if (/opens in a new window|opens an external/i.test(t)) return null;
    if (/^(get help|ai search|my spokeo|account|about|careers|blog|privacy|terms|contact|contact us|activate|get background\+? report|block all calls|get updates|back to overview.*)$/i.test(t)) return null;
    if (/^\(?\d+\)?$/.test(t)) return null;
    if (/\(\d+\)\s*$/.test(t) && t.length < 80) return null;
    if (/^(age\s+\d+|phone|email|all address(es)?|social profiles?|family|relatives?|court(s)?|personal|wealth|work and education|education|owned propert(y|ies)|propert(y|ies)|profile|overview|spokeo)\s*(\(\d+\))?$/i.test(t)) return null;
    if (t.length < 2) return null;
    return t;
};

const buildPhoneLookupTabs = (sections: { heading: string; lines: string[] }[] | null) => {
    if (!sections) return [] as { id: string; label: string; groups: { heading: string; lines: string[] }[] }[];
    const tabMap = new Map<string, { heading: string; lines: string[] }[]>();
    const cleaned = sections
        .filter((s) => !/data sources/i.test(s.heading))
        .map((s) => ({ heading: s.heading, lines: s.lines.map(decodePhoneLookupLine).filter((l): l is string => !!l) }))
        .filter((s) => s.lines.length > 0);
    cleaned.forEach((s, i) => {
        const tab = i === 0 ? PHONE_LOOKUP_TABS[0] : (PHONE_LOOKUP_TABS.find((t) => t.match && t.match.test(s.heading)) || PHONE_LOOKUP_TABS[0]);
        const arr = tabMap.get(tab.id) || [];
        arr.push(s);
        tabMap.set(tab.id, arr);
    });
    return PHONE_LOOKUP_TABS.filter((t) => tabMap.has(t.id)).map((t) => ({ id: t.id, label: t.label, groups: tabMap.get(t.id)! }));
};

function Home() {
    const [mounted, setMounted] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [tabs, setTabs] = useState([
        {
            id: "tab-initial",
            url: "about:newtab",
            initialUrl: "about:newtab",
            title: "New Tab",
            isLoading: false,
            canGoBack: false,
            canGoForward: false
        }
    ]);
    const [activeTabId, setActiveTabId] = useState("tab-initial");
    const [inputUrl, setInputUrl] = useState("");
    const [searchText, setSearchText] = useState("");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAssistantOpen, setIsAssistantOpen] = useState(true);
    const [closedTabsStack, setClosedTabsStack] = useState([]);
    const [downloads, setDownloads] = useState([]);
    const [isDownloadsOpen, setIsDownloadsOpen] = useState(false);
    const [draggedTabId, setDraggedTabId] = useState(null);
    const draggedTabIdRef = useRef(null);

    const handleTabDragStart = (e, tabId) => {
        if (e.dataTransfer) {
            e.dataTransfer.setData("text/tab-id", tabId);
            e.dataTransfer.effectAllowed = "move";
            try {
                const blankImg = new Image();
                blankImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                if (typeof e.dataTransfer.setDragImage === "function") {
                    e.dataTransfer.setDragImage(blankImg, 0, 0);
                }
            } catch (err) {}
        }
        setDraggedTabId(tabId);
        draggedTabIdRef.current = tabId;
    };

    const handleTabDragEnd = () => {
        setDraggedTabId(null);
        draggedTabIdRef.current = null;
    };

    const handleTabDragOver = (e, targetTabId) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = "move";
        }
        const sourceTabId = draggedTabIdRef.current;
        if (!sourceTabId || sourceTabId === targetTabId) return;

        setTabs((prevTabs) => {
            const sourceIndex = prevTabs.findIndex((t) => t.id === sourceTabId);
            const targetIndex = prevTabs.findIndex((t) => t.id === targetTabId);
            if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
                return prevTabs;
            }
            const updatedTabs = [...prevTabs];
            const [movedTab] = updatedTabs.splice(sourceIndex, 1);
            updatedTabs.splice(targetIndex, 0, movedTab);
            return updatedTabs;
        });
    };

    const handleTabDrop = (e, targetTabId) => {
        e.preventDefault();
        e.stopPropagation();
        const sourceTabId = e.dataTransfer?.getData("text/tab-id") || draggedTabIdRef.current;
        if (sourceTabId) {
            if (sourceTabId !== targetTabId) {
                setTabs((prevTabs) => {
                    const sourceIndex = prevTabs.findIndex((t) => t.id === sourceTabId);
                    const targetIndex = prevTabs.findIndex((t) => t.id === targetTabId);
                    if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
                        return prevTabs;
                    }
                    const updatedTabs = [...prevTabs];
                    const [movedTab] = updatedTabs.splice(sourceIndex, 1);
                    updatedTabs.splice(targetIndex, 0, movedTab);
                    return updatedTabs;
                });
            }
            setDraggedTabId(null);
            draggedTabIdRef.current = null;
            return;
        }

        const dropped = extractDroppedUrl(e);
        if (dropped) {
            setActiveTabId(targetTabId);
            updateTabProperties(targetTabId, { url: dropped, initialUrl: dropped, title: dropped });
            if (targetTabId === activeTabId) {
                setInputUrl(dropped);
            }
        }
    };

    const [webviewPreloadUrl, setWebviewPreloadUrl] = useState("");
    useEffect(() => {
        try {
            if (typeof window !== "undefined" && window.require) {
                const { ipcRenderer } = window.require("electron");
                ipcRenderer.invoke("get-preload-url").then((u) => setWebviewPreloadUrl(u || "")).catch(() => { });
            }
        } catch (e) { }
    }, []);

    useEffect(() => {
        try {
            if (typeof window !== "undefined" && window.require) {
                const { ipcRenderer } = window.require("electron");
                const handleDownloadEvent = (event, data) => {
                    if (!data || !data.item) return;
                    const { type, item } = data;
                    setDownloads((prev) => {
                        const existingIdx = prev.findIndex((d) => d.id === item.id);
                        if (existingIdx >= 0) {
                            const next = [...prev];
                            next[existingIdx] = { ...next[existingIdx], ...item };
                            return next;
                        } else {
                            return [item, ...prev];
                        }
                    });

                    if (type === "download-starting") {
                        setIsDownloadsOpen(true);
                    }
                };

                ipcRenderer.on("download-event", handleDownloadEvent);
                return () => {
                    try {
                        ipcRenderer.removeListener("download-event", handleDownloadEvent);
                    } catch (e) { }
                };
            }
        } catch (e) { }
    }, []);

    const activeDownloadsList = downloads.filter((d) => d.state !== "completed" && d.state !== "cancelled");
    const hasStarting = activeDownloadsList.some((d) => d.state === "starting");
    const hasDownloading = activeDownloadsList.some((d) => d.state === "downloading");
    const hasPaused = activeDownloadsList.some((d) => d.state === "paused");

    let currentDownloadPhase = "idle";
    if (hasStarting) {
        currentDownloadPhase = "starting";
    } else if (hasDownloading) {
        currentDownloadPhase = "downloading";
    } else if (hasPaused) {
        currentDownloadPhase = "paused";
    } else if (downloads.length > 0 && downloads.some((d) => d.state === "completed")) {
        currentDownloadPhase = "completed";
    }

    const totalBytesActive = activeDownloadsList.reduce((acc, d) => acc + (d.totalBytes || 0), 0);
    const receivedBytesActive = activeDownloadsList.reduce((acc, d) => acc + (d.receivedBytes || 0), 0);
    const activePercent = totalBytesActive > 0 ? Math.round((receivedBytesActive / totalBytesActive) * 100) : 0;

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    const renderDownloadIcon = () => {
        if (currentDownloadPhase === "starting") {
            return (
                <div className="relative flex items-center justify-center w-6 h-6">
                    <span className="absolute inset-0 rounded-full border-2 border-sky-400 opacity-75 animate-ping" />
                    <svg className="w-5 h-5 text-sky-500 transition-all duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                        <path className="animate-bounce" strokeLinecap="round" strokeLinejoin="round" d="M12 7v7m0 0l-3-3m3 3l3-3" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8" />
                    </svg>
                </div>
            );
        }

        if (currentDownloadPhase === "downloading") {
            const radius = 9;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (activePercent / 100) * circumference;

            return (
                <div className="relative flex items-center justify-center w-6 h-6" title={`Downloading (${activePercent}%)`}>
                    <svg className="w-6 h-6 transform -rotate-90" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r={radius} className="text-blue-100" strokeWidth="2.2" stroke="currentColor" fill="none" />
                        <circle
                            cx="12"
                            cy="12"
                            r={radius}
                            className="text-blue-600 transition-all duration-300"
                            strokeWidth="2.2"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                        />
                    </svg>
                    <svg className="absolute w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v9m0 0l-3-3m3 3l3-3" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 18h8" />
                    </svg>
                </div>
            );
        }

        if (currentDownloadPhase === "paused") {
            return (
                <div className="relative flex items-center justify-center w-6 h-6" title="Download Paused">
                    <svg className="w-5 h-5 text-amber-500 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3 3" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 8v5M14 8v5" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8" />
                    </svg>
                </div>
            );
        }

        if (currentDownloadPhase === "completed") {
            return (
                <div className="relative flex items-center justify-center w-6 h-6 scale-105 transition-transform duration-300" title="Download Complete">
                    <svg className="w-5 h-5 text-emerald-600 animate-in zoom-in-75 duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 11.5l2.5 2.5L16 8" strokeWidth="2.5" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8" strokeWidth="2" />
                    </svg>
                </div>
            );
        }

        return (
            <svg className="w-5 h-5 text-[#6e6b5e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v7m0 0l-3-3m3 3l3-3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8" />
            </svg>
        );
    };
    const altSpacePressedRef = useRef(false);
    const altFPressedRef = useRef(false);
    const f6CountRef = useRef(0);
    // Resizable assistant sidebar states
    const [assistantWidth, setAssistantWidth] = useState(360);
    const isResizingRef = useRef(false);
    const startResizing = useCallback({
        "Home.useCallback[startResizing]": {
            "Home.useCallback[startResizing]": (mouseDownEvent) => {
                mouseDownEvent.preventDefault();
                isResizingRef.current = true;
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                const handleMouseMove = {
                    "Home.useCallback[startResizing].handleMouseMove": {
                        "Home.useCallback[startResizing]": (e) => {
                            if (!isResizingRef.current) return;
                            const computedWidth = window.innerWidth - e.clientX;
                            // Allow resizing between 280px and 600px
                            const constrainedWidth = Math.max(280, Math.min(600, computedWidth));
                            setAssistantWidth(constrainedWidth);
                        }
                    }["Home.useCallback[startResizing]"]
                }["Home.useCallback[startResizing].handleMouseMove"];
                const handleMouseUp = {
                    "Home.useCallback[startResizing].handleMouseUp": {
                        "Home.useCallback[startResizing]": () => {
                            isResizingRef.current = false;
                            document.body.style.cursor = '';
                            document.body.style.userSelect = '';
                            window.removeEventListener('mousemove', handleMouseMove);
                            window.removeEventListener('mouseup', handleMouseUp);
                        }
                    }["Home.useCallback[startResizing]"]
                }["Home.useCallback[startResizing].handleMouseUp"];
                window.addEventListener('mousemove', handleMouseMove);
                window.addEventListener('mouseup', handleMouseUp);
            }
        }["Home.useCallback[startResizing]"]
    }["Home.useCallback[startResizing]"], []);
    const [assistantInput, setAssistantInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [attachedImage, setAttachedImage] = useState(null);
    const fileInputRef = useRef(null);
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAttachedImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };
    const [isTyping, setIsTyping] = useState(false);
    const [assistantTab, setAssistantTab] = useState("chat");
    const [cookieBlockingEnabled, setCookieBlockingEnabled] = useState(false);
    // Human-in-the-loop interactive question state
    const [activeQuestion, setActiveQuestion] = useState(null);
    const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
    // Profile management states
    const [profiles, setProfiles] = useState({
        "Home.useState": {
            "Home.useState": () => {
                try {
                    const saved = localStorage.getItem("antigravity_profiles");
                    if (saved) return JSON.parse(saved);
                } catch (e) { }
                return [
                    {
                        id: "Default",
                        name: "Default",
                        color: "#3399ff"
                    }
                ];
            }
        }["Home.useState"]
    }["Home.useState"]);
    const [activeProfileId, setActiveProfileId] = useState({
        "Home.useState": {
            "Home.useState": () => {
                try {
                    return localStorage.getItem("antigravity_active_profile_id") || "Default";
                } catch (e) { }
                return "Default";
            }
        }["Home.useState"]
    }["Home.useState"]);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isProfileSubmenuOpen, setIsProfileSubmenuOpen] = useState(false);
    const [chromeBookmarks, setChromeBookmarks] = useState([
        { name: "Phone LookUp", url: "https://www.spokeo.com/reverse-phone-lookup", type: "url", panel: "phoneLookup", children: [] }
    ]);
    const [openBookmarkFolder, setOpenBookmarkFolder] = useState(null);
    const [isPhonePanelOpen, setIsPhonePanelOpen] = useState(false);
    const [phoneLookupInput, setPhoneLookupInput] = useState("");
    const [phoneLookupInstructions, setPhoneLookupInstructions] = useState("");
    const [phoneLookupResult, setPhoneLookupResult] = useState<{ heading: string; lines: string[] }[] | null>(null);
    const [phoneLookupProfiles, setPhoneLookupProfiles] = useState<{ name: string; age: string; bestMatch: boolean; livesAt: string; livedIn: string; aka: string; relatedTo: string; includes: string; btnIndex: number }[]>([]);
    const [phoneLookupTab, setPhoneLookupTab] = useState("overview");
    const [isPhoneReportFullscreen, setIsPhoneReportFullscreen] = useState(false);
    const [isPhoneDetailView, setIsPhoneDetailView] = useState(false);
    const [selectedPhoneProfile, setSelectedPhoneProfile] = useState<{ name: string; age: string; bestMatch: boolean; livesAt: string; livedIn: string; aka: string; relatedTo: string; includes: string; btnIndex: number } | null>(null);
    useEffect(() => {
        if (!isPhoneReportFullscreen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsPhoneReportFullscreen(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isPhoneReportFullscreen]);
    const [userEmail, setUserEmail] = useState<string | null>(() => {
        try {
            return localStorage.getItem("antigravity_user_email") || null;
        } catch (e) {
            return null;
        }
    });
    const [zoomLevel, setZoomLevel] = useState<number>(100);
    const activeProfileIdRef = useRef(activeProfileId);
    useEffect({
        "Home.useEffect": {
            "Home.useEffect": () => {
                activeProfileIdRef.current = activeProfileId;
            }
        }["Home.useEffect"]
    }["Home.useEffect"], [
        activeProfileId
    ]);
    // Autocomplete and Suggestions Dropdown states
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [apiSuggestions, setApiSuggestions] = useState([]);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
    const [originalQuery, setOriginalQuery] = useState("");
    const [historyList, setHistoryList] = useState([]);
    const isDeletingRef = useRef(false);
    const [isDraggingOverUrl, setIsDraggingOverUrl] = useState(false);
    const inputRef = useRef(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    // Load history from localStorage on client-side mount
    useEffect({
        "Home.useEffect": {
            "Home.useEffect": () => {
                try {
                    const historyStr = localStorage.getItem("browser-history-v1") || "[]";
                    setHistoryList(JSON.parse(historyStr));
                } catch (e) {
                    console.error("Failed to load history list:", e);
                }
            }
        }["Home.useEffect"]
    }["Home.useEffect"], []);
    // Fetch real-time suggestions from /api/suggest
    useEffect({
        "Home.useEffect": {
            "Home.useEffect": () => {
                const trimmed = inputUrl.trim();
                if (!trimmed) {
                    setApiSuggestions([]);
                    return;
                }
                const handler = setTimeout({
                    "Home.useEffect.handler": {
                        "Home.useEffect.handler": async () => {
                            try {
                                const res = await fetch(`/api/suggest?q=${encodeURIComponent(trimmed)}`);
                                if (res.ok) {
                                    const suggestions = await res.json();
                                    setApiSuggestions(suggestions);
                                }
                            } catch (err) {
                                console.debug("Failed to load suggestions from API:", err);
                            }
                        }
                    }["Home.useEffect.handler"]
                }["Home.useEffect.handler"], 150);
                return ({
                    "Home.useEffect": ({
                        "Home.useEffect": () => clearTimeout(handler)
                    })["Home.useEffect"]
                })["Home.useEffect"];
            }
        }["Home.useEffect"]
    }["Home.useEffect"], [
        inputUrl
    ]);
    // Save a search query or URL into the browser history
    const addToHistory = (urlOrQuery, title) => {
        try {
            const historyStr = localStorage.getItem("browser-history-v1") || "[]";
            let list = JSON.parse(historyStr);
            const isUrl = /^https?:\/\//i.test(urlOrQuery) || !urlOrQuery.includes(" ") && urlOrQuery.includes(".");
            if (isUrl) {
                let cleanUrl = urlOrQuery.trim();
                if (!/^https?:\/\//i.test(cleanUrl)) {
                    cleanUrl = "https://" + cleanUrl;
                }
                list = list.filter((item) => item.type !== "url" || item.url !== cleanUrl);
                list.unshift({
                    type: "url",
                    url: cleanUrl,
                    title: title || cleanUrl.replace(/^https?:\/\/(www\.)?/, ""),
                    timestamp: Date.now()
                });
            } else {
                const query = urlOrQuery.trim();
                if (!query) return;
                list = list.filter((item) => item.type !== "search" || item.query !== query);
                list.unshift({
                    type: "search",
                    query: query,
                    timestamp: Date.now()
                });
            }
            list = list.slice(0, 100);
            localStorage.setItem("browser-history-v1", JSON.stringify(list));
            setHistoryList(list);
        } catch (e) {
            console.error("Failed to add browser history item:", e);
        }
    };
    // Perform inline text completion in the address bar
    const handleAutocomplete = (value, inputElement) => {
        if (isDeletingRef.current) return;
        if (!value) return;
        // Search common domains for a match
        let match = AUTOCOMPLETE_DOMAINS.find((domain) => domain.toLowerCase().startsWith(value.toLowerCase()));
        // If no common domain matched, search matching URLs from user history
        if (!match) {
            const historyMatch = historyList.find((item) => item.type === "url" && item.url.replace(/^https?:\/\/(www\.)?/, "").toLowerCase().startsWith(value.toLowerCase()));
            if (historyMatch) {
                match = historyMatch.url.replace(/^https?:\/\/(www\.)?/, "");
            }
        }
        if (match && match.toLowerCase() !== value.toLowerCase()) {
            const selectionStart = value.length;
            setInputUrl(match);
            setTimeout(() => {
                if (inputElement) {
                    inputElement.setSelectionRange(selectionStart, match.length);
                }
            }, 0);
        }
    };
    // Merged suggestions list for dropdown display (max 8 items)
    const displaySuggestions = useMemo({
        "Home.useMemo[displaySuggestions]": {
            "Home.useMemo[displaySuggestions]": () => {
                const list = [];
                const query = inputUrl.trim();
                if (!query) return list;
                // 1. Default Google Search option
                list.push({
                    key: `default-search-${query}`,
                    type: "default-search",
                    text: query
                });
                // 2. Matching history searches
                const matchingHistorySearches = historyList.filter({
                    "Home.useMemo[displaySuggestions].matchingHistorySearches": {
                        "Home.useMemo[displaySuggestions].matchingHistorySearches": (item) => item.type === "search" && item.query.toLowerCase().includes(query.toLowerCase()) && item.query.toLowerCase() !== query.toLowerCase()
                    }["Home.useMemo[displaySuggestions].matchingHistorySearches"]
                }["Home.useMemo[displaySuggestions].matchingHistorySearches"]);
                matchingHistorySearches.forEach({
                    "Home.useMemo[displaySuggestions]": {
                        "Home.useMemo[displaySuggestions]": (item) => {
                            list.push({
                                key: `history-search-${item.query}`,
                                type: "history-search",
                                text: item.query
                            });
                        }
                    }["Home.useMemo[displaySuggestions]"]
                }["Home.useMemo[displaySuggestions]"]);
                // 3. API live search recommendations
                apiSuggestions.forEach({
                    "Home.useMemo[displaySuggestions]": {
                        "Home.useMemo[displaySuggestions]": (s) => {
                            if (s.toLowerCase() !== query.toLowerCase() && !list.some({
                                "Home.useMemo[displaySuggestions]": {
                                    "Home.useMemo[displaySuggestions]": (item) => item.type === "history-search" && item.text.toLowerCase() === s.toLowerCase()
                                }["Home.useMemo[displaySuggestions]"]
                            }["Home.useMemo[displaySuggestions]"])) {
                                list.push({
                                    key: `api-search-${s}`,
                                    type: "search-query",
                                    text: s
                                });
                            }
                        }
                    }["Home.useMemo[displaySuggestions]"]
                }["Home.useMemo[displaySuggestions]"]);
                // 4. Matching URL history records
                const matchingUrls = historyList.filter({
                    "Home.useMemo[displaySuggestions].matchingUrls": {
                        "Home.useMemo[displaySuggestions].matchingUrls": (item) => item.type === "url" && (item.url.toLowerCase().includes(query.toLowerCase()) || item.title.toLowerCase().includes(query.toLowerCase()))
                    }["Home.useMemo[displaySuggestions].matchingUrls"]
                }["Home.useMemo[displaySuggestions].matchingUrls"]);
                matchingUrls.forEach({
                    "Home.useMemo[displaySuggestions]": {
                        "Home.useMemo[displaySuggestions]": (item) => {
                            list.push({
                                key: `history-url-${item.url}`,
                                type: "history-url",
                                title: item.title,
                                url: item.url,
                                favicon: item.favicon
                            });
                        }
                    }["Home.useMemo[displaySuggestions]"]
                }["Home.useMemo[displaySuggestions]"]);
                return list.slice(0, 8);
            }
        }["Home.useMemo[displaySuggestions]"]
    }["Home.useMemo[displaySuggestions]"], [
        inputUrl,
        apiSuggestions,
        historyList
    ]);
    // Handle selected suggestion execution
    const handleSelectSuggestion = (item) => {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        setOriginalQuery("");
        if (item.type === "history-url" && item.url) {
            setInputUrl(item.url);
            navigateTab(item.url);
            addToHistory(item.url, item.title);
        } else if (item.text) {
            setInputUrl(item.text);
            navigateTab(item.text);
            addToHistory(item.text);
        }
    };
    // New Tab Autocomplete and Suggestions Dropdown states
    const [showNewTabSuggestions, setShowNewTabSuggestions] = useState(false);
    const [apiNewTabSuggestions, setApiNewTabSuggestions] = useState([]);
    const [selectedNewTabSuggestionIndex, setSelectedNewTabSuggestionIndex] = useState(-1);
    const [originalNewTabQuery, setOriginalNewTabQuery] = useState("");
    const isNewTabDeletingRef = useRef(false);
    const newTabInputRef = useRef(null);
    // Fetch real-time suggestions for New Tab search from /api/suggest
    useEffect({
        "Home.useEffect": {
            "Home.useEffect": () => {
                const trimmed = searchText.trim();
                if (!trimmed) {
                    setApiNewTabSuggestions([]);
                    return;
                }
                const handler = setTimeout({
                    "Home.useEffect.handler": {
                        "Home.useEffect.handler": async () => {
                            try {
                                const res = await fetch(`/api/suggest?q=${encodeURIComponent(trimmed)}`);
                                if (res.ok) {
                                    const suggestions = await res.json();
                                    setApiNewTabSuggestions(suggestions);
                                }
                            } catch (err) {
                                console.debug("Failed to load suggestions from API:", err);
                            }
                        }
                    }["Home.useEffect.handler"]
                }["Home.useEffect.handler"], 150);
                return ({
                    "Home.useEffect": ({
                        "Home.useEffect": () => clearTimeout(handler)
                    })["Home.useEffect"]
                })["Home.useEffect"];
            }
        }["Home.useEffect"]
    }["Home.useEffect"], [
        searchText
    ]);
    // Perform inline text completion in the New Tab search bar
    const handleNewTabAutocomplete = (value, inputElement) => {
        if (isNewTabDeletingRef.current) return;
        if (!value) return;
        // Search common domains for a match
        let match = AUTOCOMPLETE_DOMAINS.find((domain) => domain.toLowerCase().startsWith(value.toLowerCase()));
        // If no common domain matched, search matching URLs from user history
        if (!match) {
            const historyMatch = historyList.find((item) => item.type === "url" && item.url.replace(/^https?:\/\/(www\.)?/, "").toLowerCase().startsWith(value.toLowerCase()));
            if (historyMatch) {
                match = historyMatch.url.replace(/^https?:\/\/(www\.)?/, "");
            }
        }
        if (match && match.toLowerCase() !== value.toLowerCase()) {
            const selectionStart = value.length;
            setSearchText(match);
            setTimeout(() => {
                if (inputElement) {
                    inputElement.setSelectionRange(selectionStart, match.length);
                }
            }, 0);
        }
    };
    // Merged suggestions list for New Tab dropdown display (max 8 items)
    const displayNewTabSuggestions = useMemo({
        "Home.useMemo[displayNewTabSuggestions]": {
            "Home.useMemo[displayNewTabSuggestions]": () => {
                const list = [];
                const query = searchText.trim();
                if (!query) return list;
                // 1. Default Google Search option
                list.push({
                    key: `newtab-default-search-${query}`,
                    type: "default-search",
                    text: query
                });
                // 2. Matching history searches
                const matchingHistorySearches = historyList.filter({
                    "Home.useMemo[displayNewTabSuggestions].matchingHistorySearches": {
                        "Home.useMemo[displayNewTabSuggestions].matchingHistorySearches": (item) => item.type === "search" && item.query.toLowerCase().includes(query.toLowerCase()) && item.query.toLowerCase() !== query.toLowerCase()
                    }["Home.useMemo[displayNewTabSuggestions].matchingHistorySearches"]
                }["Home.useMemo[displayNewTabSuggestions].matchingHistorySearches"]);
                matchingHistorySearches.forEach({
                    "Home.useMemo[displayNewTabSuggestions]": {
                        "Home.useMemo[displayNewTabSuggestions]": (item) => {
                            list.push({
                                key: `newtab-history-search-${item.query}`,
                                type: "history-search",
                                text: item.query
                            });
                        }
                    }["Home.useMemo[displayNewTabSuggestions]"]
                }["Home.useMemo[displayNewTabSuggestions]"]);
                // 3. API live search recommendations
                apiNewTabSuggestions.forEach({
                    "Home.useMemo[displayNewTabSuggestions]": {
                        "Home.useMemo[displayNewTabSuggestions]": (s) => {
                            if (s.toLowerCase() !== query.toLowerCase() && !list.some({
                                "Home.useMemo[displayNewTabSuggestions]": {
                                    "Home.useMemo[displayNewTabSuggestions]": (item) => item.type === "history-search" && item.text.toLowerCase() === s.toLowerCase()
                                }["Home.useMemo[displayNewTabSuggestions]"]
                            }["Home.useMemo[displayNewTabSuggestions]"])) {
                                list.push({
                                    key: `newtab-api-search-${s}`,
                                    type: "search-query",
                                    text: s
                                });
                            }
                        }
                    }["Home.useMemo[displayNewTabSuggestions]"]
                }["Home.useMemo[displayNewTabSuggestions]"]);
                // 4. Matching URL history records
                const matchingUrls = historyList.filter({
                    "Home.useMemo[displayNewTabSuggestions].matchingUrls": {
                        "Home.useMemo[displayNewTabSuggestions].matchingUrls": (item) => item.type === "url" && (item.url.toLowerCase().includes(query.toLowerCase()) || item.title.toLowerCase().includes(query.toLowerCase()))
                    }["Home.useMemo[displayNewTabSuggestions].matchingUrls"]
                }["Home.useMemo[displayNewTabSuggestions].matchingUrls"]);
                matchingUrls.forEach({
                    "Home.useMemo[displayNewTabSuggestions]": {
                        "Home.useMemo[displayNewTabSuggestions]": (item) => {
                            list.push({
                                key: `newtab-history-url-${item.url}`,
                                type: "history-url",
                                title: item.title,
                                url: item.url,
                                favicon: item.favicon
                            });
                        }
                    }["Home.useMemo[displayNewTabSuggestions]"]
                }["Home.useMemo[displayNewTabSuggestions]"]);
                return list.slice(0, 8);
            }
        }["Home.useMemo[displayNewTabSuggestions]"]
    }["Home.useMemo[displayNewTabSuggestions]"], [
        searchText,
        apiNewTabSuggestions,
        historyList
    ]);
    // Handle selected suggestion execution for New Tab
    const handleSelectNewTabSuggestion = (item) => {
        setShowNewTabSuggestions(false);
        setSelectedNewTabSuggestionIndex(-1);
        setOriginalNewTabQuery("");
        if (item.type === "history-url" && item.url) {
            setSearchText(item.url);
            navigateTab(item.url);
            addToHistory(item.url, item.title);
        } else if (item.text) {
            setSearchText(item.text);
            navigateTab(item.text);
            addToHistory(item.text);
        }
    };
    // Fetch real Chrome profiles on mount
    useEffect({
        "Home.useEffect": {
            "Home.useEffect": () => {
                const fetchChromeProfiles = {
                    "Home.useEffect.fetchChromeProfiles": {
                        "Home.useEffect": async () => {
                            try {
                                const api = (window as any).electronAPI || (typeof (window as any).require === 'function' ? (window as any).require('electron') : null);
                                if (api) {
                                    const list = await (api.ipcRenderer ? api.ipcRenderer.invoke("get-chrome-profiles") : api.invoke("get-chrome-profiles"));
                                    if (list && list.length > 0) {
                                        setProfiles(list);
                                        localStorage.setItem("antigravity_profiles", JSON.stringify(list));
                                    }
                                }
                            } catch (err) {
                                console.warn("Failed to retrieve native Chrome profiles:", err);
                            }
                        }
                    }["Home.useEffect"]
                }["Home.useEffect.fetchChromeProfiles"];
                fetchChromeProfiles();
            }
        }["Home.useEffect"]
    }["Home.useEffect"], []);
    // RAG and Qdrant states
    const [assistantMode, setAssistantMode] = useState("chat");
    const [ragSearchQuery, setRagSearchQuery] = useState("");
    const [ragResults, setRagResults] = useState([]);
    const [isRagSearching, setIsRagSearching] = useState(false);
    const [searchError, setSearchError] = useState("");
    const [indexStatus, setIndexStatus] = useState({
        status: "idle"
    });
    const handleIndexCurrentPage = async () => {
        const webview = document.getElementById(`webview-${activeTabIdRef.current}`);
        if (!webview || activeTab.url === "about:newtab" || activeTab.url === "about:blank") {
            setIndexStatus({
                status: "error",
                message: "Cannot index an empty or new tab."
            });
            return;
        }
        if (typeof webview.isLoading === "function" && webview.isLoading()) {
            setIndexStatus({
                status: "error",
                message: "Page is still loading. Please wait for the load to finish."
            });
            return;
        }
        setIndexStatus({
            status: "indexing",
            message: "Extracting and indexing page text content..."
        });
        try {
            const url = webview.getURL();
            const title = webview.getTitle();
            const pageText = await webview.executeJavaScript(`
        (() => {
          try {
            if (!document || !document.body) return "";
            const clone = document.body.cloneNode(true);
            const scrapSelectors = ['script', 'style', 'noscript', 'iframe', 'svg', 'header', 'footer', 'nav', '.cookie', '.footer', '.header', '#cookie', '[class*="cookie"]', '[id*="cookie"]'];
            scrapSelectors.forEach(sel => {
              clone.querySelectorAll(sel).forEach(subEl => subEl.remove());
            });
            return clone.innerText || clone.textContent || "";
          } catch (e) {
            return (document && document.body) ? (document.body.innerText || "") : "";
          }
        })()
      `);
            if (!pageText || pageText.trim().length < 50) {
                setIndexStatus({
                    status: "error",
                    message: "Page text content is too short to index."
                });
                return;
            }
            const res = await fetch("/api/rag/index-page", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    url,
                    title,
                    text: pageText
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setIndexStatus({
                    status: "success",
                    message: `Indexed ${data.chunksIndexed} chunks successfully!`
                });
            } else {
                setIndexStatus({
                    status: "error",
                    message: data.error || "Indexing failed."
                });
            }
        } catch (err) {
            setIndexStatus({
                status: "error",
                message: err.message || "An unexpected error occurred."
            });
        }
    };
    const handleRagSearch = async (e) => {
        if (e) e.preventDefault();
        const query = ragSearchQuery.trim();
        if (!query) return;
        setIsRagSearching(true);
        setSearchError("");
        try {
            const res = await fetch(`/api/rag/search?q=${encodeURIComponent(query)}&limit=5`);
            const data = await res.json();
            if (!res.ok) {
                setSearchError(data.error || `Search failed with status ${res.status}`);
                setRagResults([]);
            } else {
                setRagResults(data.results || []);
            }
        } catch (err) {
            console.error("RAG UI Search error:", err);
            setSearchError(err.message || "Network connection refused.");
            setRagResults([]);
        } finally {
            setIsRagSearching(false);
        }
    };
    // Tab actions menu & features states
    const [isTabMenuOpen, setIsTabMenuOpen] = useState(false);
    const [isSplitView, setIsSplitView] = useState(false);
    const [splitTabId, setSplitTabId] = useState(null);
    const [isSearchTabsOpen, setIsSearchTabsOpen] = useState(false);
    const [tabSearchQuery, setTabSearchQuery] = useState("");

    // Autonomous Agent states
    const [isAgentActive, setIsAgentActive] = useState(false);
    const [agentThought, setAgentThought] = useState("");
    const [isPerplexityModalOpen, setIsPerplexityModalOpen] = useState(true);
    const [activeModel, setActiveModel] = useState("Gemini 1.5 Pro");
    const [agentModeEnabled, setAgentModeEnabled] = useState(true);
    const agentCancelledRef = useRef(false);
    const [authSnackbar, setAuthSnackbar] = useState(null);
    const manualAuthContinueRef = useRef(false);
    const handleCancelAgent = () => {
        agentCancelledRef.current = true;
        manualAuthContinueRef.current = false;
        setAuthSnackbar(null);
        setIsAgentActive(false);
        setAgentThought("Agent cancelled.");
        const webview = document.getElementById(`webview-${activeTabIdRef.current}`);
        if (webview) {
            webview.executeJavaScript(`
        const wrapper = document.getElementById("__agent_badge_wrapper__");
        if (wrapper) wrapper.remove();
      `).catch(() => { });
        }
    };
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isAgentActive, isTyping]);
    // Hooks and helpers are imported from modular sub-files
    // Set mounted state
    useEffect({
        "Home.useEffect": {
            "Home.useEffect": () => {
                setMounted(true);
            }
        }["Home.useEffect"]
    }["Home.useEffect"], []);
    // Sync active tab state
    const activeTab = useMemo({
        "Home.useMemo[activeTab]": {
            "Home.useMemo[activeTab]": () => {
                return tabs.find({
                    "Home.useMemo[activeTab]": {
                        "Home.useMemo[activeTab]": (t) => t.id === activeTabId
                    }["Home.useMemo[activeTab]"]
                }["Home.useMemo[activeTab]"]) || tabs[0];
            }
        }["Home.useMemo[activeTab]"]
    }["Home.useMemo[activeTab]"], [
        tabs,
        activeTabId
    ]);
    const activeTabIdRef = useRef(activeTabId);
    const { handPosition, simulateHandClick, simulateTyping, simulateKeyPress, simulateScroll, waitForElement, waitForNetworkIdle, cdpFocusTab, simulateSelectText } = (0, useClickSimulator)(activeTabIdRef);
    useEffect({
        "Home.useEffect": {
            "Home.useEffect": () => {
                activeTabIdRef.current = activeTabId;
                if (cdpFocusTab) {
                    cdpFocusTab().catch({
                        "Home.useEffect": {
                            "Home.useEffect": () => { }
                        }["Home.useEffect"]
                    }["Home.useEffect"]);
                }
            }
        }["Home.useEffect"]
    }["Home.useEffect"], [
        activeTabId,
        cdpFocusTab
    ]);
    const switchProfile = async (targetProfileId) => {
        if (targetProfileId === "__guest__") {
            handleNewIncognitoTab();
            setIsProfileDropdownOpen(false);
            setIsToolsOpen(false);
            return;
        }
        const webview = document.getElementById(`webview-${activeTabIdRef.current}`);
        if (webview) {
            try {
                const { ipcRenderer } = window.require("electron");
                const success = await ipcRenderer.invoke("switch-chrome-profile", {
                    folderName: targetProfileId
                });
                if (success) {
                    setActiveProfileId(targetProfileId);
                    activeProfileIdRef.current = targetProfileId;
                    localStorage.setItem("antigravity_active_profile_id", targetProfileId);
                    alert(`Switched to Chrome profile '${targetProfileId}' successfully! The application will now restart to apply the changes.`);
                    await ipcRenderer.invoke("relaunch-app").catch(() => { });
                }
            } catch (err) {
                console.error("Failed to switch Chrome profile cookies:", err);
            }
        }
        setIsProfileDropdownOpen(false);
    };
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const { isRecording, recordedSteps, startRecording, stopRecording, addRecordedStep, setRecordedSteps } = (0, useMacroRecorder)(activeTabIdRef);
    const isRecordingRef = useRef(isRecording);
    const addRecordedStepRef = useRef(addRecordedStep);
    useEffect({
        "Home.useEffect": {
            "Home.useEffect": () => {
                isRecordingRef.current = isRecording;
                addRecordedStepRef.current = addRecordedStep;
            }
        }["Home.useEffect"]
    }["Home.useEffect"], [
        isRecording,
        addRecordedStep
    ]);
    const handleSaveRecordedMacro = (name, steps) => {
        try {
            const stored = localStorage.getItem("browser_macros");
            const currentMacros = stored ? JSON.parse(stored) : [];
            const newMacro = {
                id: `macro-${Date.now()}`,
                name,
                steps
            };
            const updated = [
                ...currentMacros,
                newMacro
            ];
            localStorage.setItem("browser_macros", JSON.stringify(updated));
            window.dispatchEvent(new Event("storage"));
        } catch (err) {
            console.error("Failed to save recorded macro:", err);
        }
    };
    const handleRunMacro = async (steps) => {
        const delay = (ms) => new Promise((res) => setTimeout(res, ms));
        for (const step of steps) {
            try {
                switch (step.action) {
                    case "open_tab":
                        if (step.url) openNewTabWithUrl(step.url);
                        await delay(1200);
                        break;
                    case "click_element":
                        if (step.selector) {
                            await simulateHandClick(step.selector);
                        } else if (step.text) {
                            await simulateHandClick(undefined, step.text);
                        }
                        await delay(1800);
                        break;
                    case "type_text":
                        if (step.text) {
                            await simulateTyping(step.text, step.selector, step.submit);
                        }
                        await delay(1800);
                        break;
                    case "press_key":
                        if (step.key) {
                            await simulateKeyPress(step.key, step.ctrl, step.shift, step.alt);
                        }
                        await delay(800);
                        break;
                    case "navigate_tab":
                        if (step.url) navigateTab(step.url);
                        await delay(1200);
                        break;
                    case "reload_tab":
                        handleReload();
                        await delay(1000);
                        break;
                    case "close_tab":
                        handleCloseTab(activeTabId);
                        await delay(1000);
                        break;
                }
            } catch (err) {
                console.error("Macro step failed:", step, err);
            }
        }
    };
    useEffect({
        "Home.useEffect": {
            "Home.useEffect": () => {
                if (activeTab) {
                    setInputUrl(activeTab.url === "about:newtab" ? "" : activeTab.url);
                }
            }
        }["Home.useEffect"]
    }["Home.useEffect"], [
        activeTabId,
        activeTab?.url
    ]);
    useEffect({
        "Home.useEffect": {
            "Home.useEffect": () => {
                if (("TURBOPACK compile-time value", "object") !== "undefined" && window.require) {
                    try {
                        const { ipcRenderer } = window.require("electron");
                        ipcRenderer.invoke("claude-get-active-model").then({
                            "Home.useEffect": {
                                "Home.useEffect": (model) => {
                                    setActiveModel(model);
                                }
                            }["Home.useEffect"]
                        }["Home.useEffect"]);
                    } catch (err) { }
                }
            }
        }["Home.useEffect"]
    }["Home.useEffect"], []);
    // IPC Event listener for F5 / Ctrl+R Reloads and Webview Console Streams
    useEffect({
        "Home.useEffect": {
            "Home.useEffect": () => {
                if (("TURBOPACK compile-time value", "object") !== "undefined" && window.require) {
                    try {
                        const { ipcRenderer } = window.require("electron");
                        const handleReloadIPC = {
                            "Home.useEffect.handleReloadIPC": {
                                "Home.useEffect": () => {
                                    const webview = document.getElementById(`webview-${activeTabId}`);
                                    if (webview && typeof webview.reload === "function") {
                                        webview.reload();
                                    }
                                }
                            }["Home.useEffect"]
                        }["Home.useEffect.handleReloadIPC"];
                        const handleConsoleMessageIPC = {
                            "Home.useEffect.handleConsoleMessageIPC": {
                                "Home.useEffect": (evt, { message }) => {
                                    if (message.startsWith("__macro_event__:")) {
                                        try {
                                            const event = JSON.parse(message.replace("__macro_event__:", ""));
                                            if (isRecordingRef.current) {
                                                addRecordedStepRef.current(event);
                                            }
                                        } catch (err) {
                                            console.error("Failed to parse macro event IPC log:", err);
                                        }
                                    }
                                }
                            }["Home.useEffect"]
                        }["Home.useEffect.handleConsoleMessageIPC"];
                        ipcRenderer.on("reload-active-tab", handleReloadIPC);
                        ipcRenderer.on("webview-console-message", handleConsoleMessageIPC);
                        return ({
                            "Home.useEffect": ({
                                "Home.useEffect": () => {
                                    ipcRenderer.removeListener("reload-active-tab", handleReloadIPC);
                                    ipcRenderer.removeListener("webview-console-message", handleConsoleMessageIPC);
                                }
                            })["Home.useEffect"]
                        })["Home.useEffect"];
                    } catch (err) {
                        console.error("Failed to register IPC handler:", err);
                    }
                }
            }
        }["Home.useEffect"]
    }["Home.useEffect"], [
        activeTabId
    ]);
    // Tab Managers
    const updateTabProperties = (tabId, updates) => {
        setTabs((prev) => prev.map((t) => t.id === tabId ? {
            ...t,
            ...updates
        } : t));
    };
    const handleNewTab = () => {
        const newId = `tab-${Date.now()}`;
        const newTab = {
            id: newId,
            url: "about:newtab",
            initialUrl: "about:newtab",
            title: "New Tab",
            isLoading: false,
            canGoBack: false,
            canGoForward: false
        };
        setTabs((prev) => [
            ...prev,
            newTab
        ]);
        setActiveTabId(newId);
        setSearchText("");
    };
    const handleNewIncognitoTab = () => {
        const newId = `tab-${Date.now()}`;
        const newTab = {
            id: newId,
            url: "about:newtab",
            initialUrl: "about:newtab",
            title: "Incognito Tab",
            isLoading: false,
            canGoBack: false,
            canGoForward: false,
            isIncognito: true
        };
        setTabs((prev) => [
            ...prev,
            newTab
        ]);
        setActiveTabId(newId);
        setSearchText("");
    };
    useEffect(() => {
        const handleKeyDown = (e) => {
            let ipcRenderer: any = null;
            try {
                ipcRenderer = window.require("electron")?.ipcRenderer;
            } catch (err) { }

            // Open a new window: Ctrl + n
            if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "n") {
                e.preventDefault();
                if (ipcRenderer) {
                    ipcRenderer.send("create-new-window");
                }
            }

            // Open a new window in Incognito mode: Ctrl + Shift + n
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "n") {
                e.preventDefault();
                handleNewIncognitoTab();
            }

            // Open a new tab, and jump to it: Ctrl + t
            if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "t") {
                e.preventDefault();
                handleNewTab();
            }

            // Reopen previously closed tabs in the order they were closed: Ctrl + Shift + t
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "t") {
                e.preventDefault();
                setClosedTabsStack((prev) => {
                    if (prev.length === 0) return prev;
                    const lastClosed = prev[prev.length - 1];
                    const nextClosedStack = prev.slice(0, -1);
                    const newId = `tab-${Date.now()}`;
                    const newTab = {
                        id: newId,
                        url: lastClosed.url || "about:newtab",
                        initialUrl: lastClosed.url || "about:newtab",
                        title: lastClosed.title || "New Tab",
                        isIncognito: lastClosed.isIncognito || false,
                        isLoading: false,
                        canGoBack: false,
                        canGoForward: false
                    };
                    setTabs((oldTabs) => [...oldTabs, newTab]);
                    setActiveTabId(newId);
                    return nextClosedStack;
                });
            }

            // Jump to the next open tab: Ctrl + Tab or Ctrl + PgDn
            // Jump to the previous open tab: Ctrl + Shift + Tab or Ctrl + PgUp
            if (e.ctrlKey && (e.key === "Tab" || e.key === "PageDown" || e.key === "PageUp")) {
                const isPageUp = e.key === "PageUp";
                const isShiftTab = e.key === "Tab" && e.shiftKey;
                const isPrev = isPageUp || isShiftTab;
                // Only handle if not shift key on PgDn/PgUp (since that is move tab)
                if (!e.shiftKey || e.key === "Tab") {
                    e.preventDefault();
                    const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
                    if (currentIndex !== -1 && tabs.length > 1) {
                        const step = isPrev ? -1 : 1;
                        const nextIndex = (currentIndex + step + tabs.length) % tabs.length;
                        setActiveTabId(tabs[nextIndex].id);
                    }
                }
            }

            // Jump to a specific tab: Ctrl + 1 through Ctrl + 8
            // Jump to the rightmost tab: Ctrl + 9
            if (e.ctrlKey && !e.shiftKey && e.key >= "1" && e.key <= "9") {
                e.preventDefault();
                const num = parseInt(e.key);
                if (num === 9) {
                    if (tabs.length > 0) {
                        setActiveTabId(tabs[tabs.length - 1].id);
                    }
                } else {
                    const idx = num - 1;
                    if (tabs[idx]) {
                        setActiveTabId(tabs[idx].id);
                    }
                }
            }

            // Open your home page in the current tab: Alt + Home
            if (e.altKey && e.key === "Home") {
                e.preventDefault();
                handleGoHome();
            }

            // Open the previous page from your browsing history: Alt + Left arrow
            if (e.altKey && e.key === "ArrowLeft") {
                e.preventDefault();
                handleGoBack();
            }

            // Open the next page from your browsing history: Alt + Right arrow
            if (e.altKey && e.key === "ArrowRight") {
                e.preventDefault();
                handleGoForward();
            }

            // Close the current tab: Ctrl + w or Ctrl + F4
            if ((e.ctrlKey && e.key.toLowerCase() === "w") || (e.ctrlKey && e.key === "F4")) {
                e.preventDefault();
                handleCloseTab(activeTabId);
            }

            // Close the current window: Ctrl + Shift + w or Alt + F4
            if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "w") || (e.altKey && e.key === "F4")) {
                e.preventDefault();
                if (ipcRenderer) {
                    ipcRenderer.send("close-current-window");
                }
            }

            // Minimize the current window: Alt + Space then n
            // Maximize the current window: Alt + Space then x
            if (e.altKey && e.key === " ") {
                e.preventDefault();
                altSpacePressedRef.current = true;
                return;
            }
            if (altSpacePressedRef.current) {
                altSpacePressedRef.current = false;
                if (e.key.toLowerCase() === "n") {
                    e.preventDefault();
                    if (ipcRenderer) ipcRenderer.send("minimize-window");
                } else if (e.key.toLowerCase() === "x") {
                    e.preventDefault();
                    if (ipcRenderer) ipcRenderer.send("maximize-window");
                }
            }

            // Quit Google Chrome: Alt + f then x
            if (e.altKey && e.key.toLowerCase() === "f") {
                e.preventDefault();
                altFPressedRef.current = true;
                return;
            }
            if (altFPressedRef.current) {
                altFPressedRef.current = false;
                if (e.key.toLowerCase() === "x") {
                    e.preventDefault();
                    if (ipcRenderer) ipcRenderer.send("quit-app");
                }
            }

            // Move tabs right or left: Ctrl + Shift + PgUp or Ctrl + Shift + PgDn
            if (e.ctrlKey && e.shiftKey && (e.key === "PageUp" || e.key === "PageDown")) {
                e.preventDefault();
                const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
                if (currentIndex !== -1 && tabs.length > 1) {
                    const step = e.key === "PageUp" ? -1 : 1;
                    const targetIndex = currentIndex + step;
                    if (targetIndex >= 0 && targetIndex < tabs.length) {
                        const newTabs = [...tabs];
                        const temp = newTabs[currentIndex];
                        newTabs[currentIndex] = newTabs[targetIndex];
                        newTabs[targetIndex] = temp;
                        setTabs(newTabs);
                    }
                }
            }

            // Turn on/off full-screen mode: F11
            if (e.key === "F11") {
                e.preventDefault();
                if (ipcRenderer) {
                    ipcRenderer.send("toggle-fullscreen");
                }
            }

            // DevTools toggle: F12 or Ctrl+Shift+I
            if (e.key === "F12" || (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i"))) {
                e.preventDefault();
                updateTabProperties(activeTabId, { showDevTools: !activeTab.showDevTools });
            }

            // Turn off full-screen mode: press and hold Esc
            if (e.key === "Escape") {
                if (ipcRenderer) {
                    ipcRenderer.send("exit-fullscreen");
                }
            }

            // Select multiple tabs: F6 twice then Shift + Ctrl + h
            if (e.key === "F6") {
                e.preventDefault();
                f6CountRef.current = (f6CountRef.current + 1);
                setTimeout(() => {
                    f6CountRef.current = 0;
                }, 2000);
                return;
            }
            if (f6CountRef.current >= 2 && e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "h") {
                e.preventDefault();
                f6CountRef.current = 0;
                alert("Accessibility: Tab selection mode enabled.");
            }
        };
        window.addEventListener("keydown", handleKeyDown);

        let ipcRenderer: any = null;
        try {
            ipcRenderer = window.require("electron")?.ipcRenderer;
        } catch (err) { }

        const handleShortcutIPC = (event, data) => {
            handleKeyDown({
                key: data.key,
                ctrlKey: data.ctrlKey,
                shiftKey: data.shiftKey,
                altKey: data.altKey,
                preventDefault: () => { }
            });
        };

        const handleOpenNewTabIPC = (event, data) => {
            if (data && data.url) {
                openNewTabWithUrl(data.url);
            }
        };

        const handleAskGeminiIPC = (event, data) => {
            if (data && data.text) {
                setIsAssistantOpen(true);
                setAssistantTab("chat");
                setAssistantInput(`Explain this text to me: "${data.text}"`);
            }
        };

        const handleOpenDevToolsIPC = (event: any, data: any) => {
            const targetTabId = (data && data.webContentsId)
                ? (tabs.find((t) => t.webContentsId === data.webContentsId)?.id || activeTabId)
                : activeTabId;

            try {
                const webview = document.getElementById(`webview-${targetTabId}`) as any;
                if (webview) {
                    if (typeof webview.isDevToolsOpened === "function" && webview.isDevToolsOpened()) {
                        webview.closeDevTools();
                    } else if (typeof webview.openDevTools === "function") {
                        webview.openDevTools({ mode: "right" });
                    }
                }
            } catch (e) { }
        };

        if (ipcRenderer) {
            ipcRenderer.on("keyboard-shortcut", handleShortcutIPC);
            ipcRenderer.on("open-new-tab-from-webview", handleOpenNewTabIPC);
            ipcRenderer.on("ask-gemini-about-text", handleAskGeminiIPC);
            ipcRenderer.on("open-devtools-panel", handleOpenDevToolsIPC);
        }

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            if (ipcRenderer) {
                ipcRenderer.removeListener("keyboard-shortcut", handleShortcutIPC);
                ipcRenderer.removeListener("open-new-tab-from-webview", handleOpenNewTabIPC);
                ipcRenderer.removeListener("ask-gemini-about-text", handleAskGeminiIPC);
                ipcRenderer.removeListener("open-devtools-panel", handleOpenDevToolsIPC);
            }
        };
    }, [tabs, activeTabId, closedTabsStack]);
    useEffect(() => {
        const activeTab = tabs.find((t) => t.id === activeTabId);
        if (activeTab && activeTab.isIncognito) {
            setIsAssistantOpen(false);
        }
    }, [activeTabId, tabs]);
    useEffect(() => {
        const activeTab = tabs.find((t) => t.id === activeTabId);
        if (activeTab && activeTab.url === "about:newtab") {
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.select();
                }
            }, 80);
        }
    }, [activeTabId, tabs.length]);
    function openNewTabWithUrl(targetUrl) {
        const newId = `tab-${Date.now()}`;
        let url = targetUrl.trim();
        if (url && url !== "about:newtab") {
            const lower = url.toLowerCase();
            if (lower === "about:history" || lower === "chrome://history" || lower === "history" || lower === "localhistory" || lower === "/localhistory") {
                const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "http://localhost:3000";
                url = `${origin}/localhistory`;
            } else {
                const isUrlPattern = /^https?:\/\//i.test(url) || /^file:\/\//i.test(url) || /^about:/i.test(url) || (!url.includes(" ") && url.includes("."));
                if (isUrlPattern) {
                    if (!/^https?:\/\//i.test(url) && !/^file:\/\//i.test(url) && !/^about:/i.test(url)) {
                        url = "https://" + url;
                    }
                } else {
                    url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
                }
            }
        } else {
            url = "about:newtab";
        }
        const newTab = {
            id: newId,
            url,
            initialUrl: url,
            title: url.includes("/localhistory") ? "Local History" : (url === "about:newtab" ? "New Tab" : url),
            isLoading: false,
            canGoBack: false,
            canGoForward: false
        };
        setTabs((prev) => [
            ...prev,
            newTab
        ]);
        setActiveTabId(newId);
        setSearchText("");
    };
    const handleCloseTab = (id, e) => {
        if (e) e.stopPropagation();
        if (tabs.length === 1) {
            const tabToClose = tabs[0];
            const newId = `tab-${Date.now()}`;
            setTabs([
                {
                    id: newId,
                    url: "about:newtab",
                    initialUrl: "about:newtab",
                    title: "New Tab",
                    isLoading: false,
                    canGoBack: false,
                    canGoForward: false,
                    isIncognito: tabToClose ? tabToClose.isIncognito : false
                }
            ]);
            setActiveTabId(newId);
            setSearchText("");
            return;
        }
        const tabToClose = tabs.find((t) => t.id === id);
        if (tabToClose) {
            setClosedTabsStack((prev) => [...prev, {
                url: tabToClose.url,
                title: tabToClose.title,
                isIncognito: tabToClose.isIncognito
            }]);
        }
        // 1. Mark target tab as closing in state to trigger width/opacity shrink animation
        setTabs((prevTabs) => prevTabs.map((t) => t.id === id ? {
            ...t,
            isClosing: true
        } : t));
        const closedIndex = tabs.findIndex((t) => t.id === id);
        const newTabs = tabs.filter((t) => t.id !== id);
        // If active tab is closed, switch focus immediately to make the transition look smooth
        if (activeTabId === id) {
            const nextActiveIndex = Math.max(0, closedIndex - 1);
            setActiveTabId(newTabs[nextActiveIndex].id);
        }
        // 2. Remove from state array after the transition completes (200ms)
        setTimeout(() => {
            setTabs((prevTabs) => prevTabs.filter((t) => t.id !== id));
        }, 200);
    };
    // Navigations
    const navigateTab = (targetUrl) => {
        let url = targetUrl.trim();
        if (!url) return;

        const lower = url.toLowerCase();
        if (lower === "about:history" || lower === "chrome://history" || lower === "history" || lower === "localhistory" || lower === "/localhistory") {
            const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "http://localhost:3000";
            url = `${origin}/localhistory`;
        } else {
            addToHistory(url);
            const isUrlPattern = /^https?:\/\//i.test(url) || /^file:\/\//i.test(url) || /^about:/i.test(url) || (!url.includes(" ") && url.includes("."));
            if (isUrlPattern) {
                if (!/^https?:\/\//i.test(url) && !/^file:\/\//i.test(url) && !/^about:/i.test(url)) {
                    url = "https://" + url;
                }
            } else {
                url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
            }
        }

        const webview = document.getElementById(`webview-${activeTabId}`);
        const displayTitle = url.includes("/localhistory") ? "Local History" : url;
        if (webview) {
            try {
                if (typeof webview.loadURL === "function") {
                    webview.loadURL(url).catch((err) => {
                        const errMsg = String(err.message || err || "");
                        if (!errMsg.includes("ERR_ABORTED") && !errMsg.includes("-3")) {
                            console.error("Navigation loadURL error:", err);
                        }
                    });
                } else {
                    webview.src = url;
                }
            } catch (err) {
                console.error("Navigation error:", err);
            }
            updateTabProperties(activeTabId, {
                url,
                title: displayTitle
            });
        } else {
            updateTabProperties(activeTabId, {
                url,
                initialUrl: url,
                title: displayTitle
            });
        }
    };
    const handleGoBack = () => {
        const webview = document.getElementById(`webview-${activeTabId}`);
        if (webview && typeof webview.canGoBack === "function" && webview.canGoBack()) {
            if (typeof webview.goBack === "function") webview.goBack();
        }
    };
    const handleGoForward = () => {
        const webview = document.getElementById(`webview-${activeTabId}`);
        if (webview && typeof webview.canGoForward === "function" && webview.canGoForward()) {
            if (typeof webview.goForward === "function") webview.goForward();
        }
    };
    const handleReload = () => {
        const webview = document.getElementById(`webview-${activeTabId}`);
        if (webview) {
            if (activeTab.isLoading) {
                if (typeof webview.stop === "function") {
                    webview.stop();
                }
            } else {
                if (typeof webview.reload === "function") {
                    webview.reload();
                }
            }
        }
    };
    const handleGoHome = () => {
        updateTabProperties(activeTabId, {
            url: "about:newtab",
            initialUrl: "about:newtab",
            title: "New Tab",
            isLoading: false,
            canGoBack: false,
            canGoForward: false
        });
        setSearchText("");
    };
    const executeBrowserCommand = async (cmd) => {
        if (!cmd || !cmd.action) return;
        switch (cmd.action) {
            case "open_tab":
                {
                    const newId = `tab-${Date.now()}`;
                    const targetUrl = cmd.url || "about:newtab";
                    const newTab = {
                        id: newId,
                        url: targetUrl,
                        initialUrl: targetUrl,
                        title: "New Tab",
                        isLoading: false,
                        canGoBack: false,
                        canGoForward: false
                    };
                    setTabs((prev) => [
                        ...prev,
                        newTab
                    ]);
                    setActiveTabId(newId);
                    activeTabIdRef.current = newId;
                    break;
                }
            case "switch_tab":
                {
                    if (typeof cmd.index === "number") {
                        const targetIndex = cmd.index;
                        if (targetIndex >= 0 && targetIndex < tabs.length) {
                            const targetId = tabs[targetIndex].id;
                            setActiveTabId(targetId);
                            activeTabIdRef.current = targetId;
                        }
                    } else if (cmd.keyword) {
                        const kw = cmd.keyword.toLowerCase();
                        const targetTab = tabs.find((t) => t.title.toLowerCase().includes(kw) || t.url.toLowerCase().includes(kw));
                        if (targetTab) {
                            setActiveTabId(targetTab.id);
                            activeTabIdRef.current = targetTab.id;
                        }
                    }
                    break;
                }
            case "close_tab":
                {
                    handleCloseTab(activeTabId);
                    break;
                }
            case "navigate_tab":
                {
                    if (cmd.url) {
                        navigateTab(cmd.url);
                    }
                    break;
                }
            case "reload_tab":
                {
                    handleReload();
                    break;
                }
            case "click_element":
                {
                    if (cmd.selector || cmd.text) {
                        await simulateHandClick(cmd.selector, cmd.text);
                    }
                    break;
                }
            case "type_text":
                {
                    if (cmd.text) {
                        await simulateTyping(cmd.text, cmd.selector, cmd.submit);
                    }
                    break;
                }
            case "press_key":
                {
                    if (cmd.key) {
                        await simulateKeyPress(cmd.key, cmd.ctrl, cmd.shift, cmd.alt);
                    }
                    break;
                }
            case "scroll":
                {
                    await simulateScroll(cmd.direction || "down", cmd.amount || 400, cmd.selector, cmd.text);
                    break;
                }
            default:
                console.warn("Unknown browser command action:", cmd.action);
        }
    };
    const updateLatestAssistantMessage = (newText) => {
        setMessages((prev) => {
            const lastAssistantIdx = [
                ...prev
            ].reverse().findIndex((m) => m.role === "assistant");
            if (lastAssistantIdx !== -1) {
                const actualIdx = prev.length - 1 - lastAssistantIdx;
                return prev.map((m, idx) => idx === actualIdx ? {
                    ...m,
                    text: newText
                } : m);
            }
            return prev;
        });
    };
    const runSequentialCommands = async (cmds, replyText) => {
        let currentText = replyText;
        const replaceNthOccurrence = (str, search, replace, n) => {
            let count = 0;
            return str.replace(new RegExp(search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), (match) => {
                count++;
                return count === n ? replace : match;
            });
        };
        let stepIndex = 1;
        for (const cmd of cmds) {
            // Mark current step as active/in-progress [/]
            currentText = replaceNthOccurrence(currentText, "[ ]", "[/]", 1);
            updateLatestAssistantMessage(currentText);
            // Prior to click or type action, verify/wait for element presence
            if (cmd.action === "click_element" || cmd.action === "type_text") {
                await waitForElement(cmd.selector, cmd.text, 4000);
            }
            await executeBrowserCommand(cmd);
            if (cmd.action === "open_tab" || cmd.action === "navigate_tab") {
                await new Promise((res) => setTimeout(res, 2200));
            } else if (cmd.action === "click_element") {
                await new Promise((res) => setTimeout(res, 1500));
            } else if (cmd.action === "type_text") {
                const textLen = cmd.text ? cmd.text.length : 10;
                await new Promise((res) => setTimeout(res, textLen * 40 + 600));
            } else {
                await new Promise((res) => setTimeout(res, 800));
            }
            // Mark current step as completed [x]
            currentText = replaceNthOccurrence(currentText, "[/]", "[x]", 1);
            updateLatestAssistantMessage(currentText);
            stepIndex++;
        }
    };
    const handleAutofill = (profile) => {
        const webview = document.getElementById(`webview-${activeTabIdRef.current}`);
        if (webview) {
            webview.executeJavaScript((0, getAutofillScript)(profile)).catch((err) => {
                console.error("Failed to run autofill script:", err);
            });
        }
    };
    const handleAnnihilateCookies = () => {
        const webview = document.getElementById(`webview-${activeTabIdRef.current}`);
        if (webview) {
            webview.executeJavaScript(cookieAnnihilatorScript).catch((err) => {
                console.error("Failed to run cookie annihilator:", err);
            });
        }
    };
    const triggerAgentFeedbackResponse = async (feedbackText: string) => {
        setIsTyping(true);

        let currentMessages = [];
        setMessages((prev) => {
            const next = [
                ...prev,
                {
                    role: "user",
                    text: feedbackText
                }
            ];
            currentMessages = next;
            return next;
        });

        await new Promise(r => setTimeout(r, 100));

        const claudeApiKey = "";
        const { ipcRenderer } = window.require("electron");

        const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0] || { title: "New Tab", url: "about:newtab" };
        const systemPromptText = `You are the Antigravity AI Assistant, a helpful assistant built directly into the user's web browser.
The user is currently viewing the following tab:
- Title: ${activeTab.title || "New Tab"}
- URL: ${activeTab.url || "about:newtab"}

All open tabs in the browser:
${tabs.map((t, idx) => `[Tab Index ${idx}] ID: ${t.id}, Title: "${t.title}", URL: ${t.url}`).join("\n")}

You can control the browser tabs directly by appending a special JSON block at the very end of your response inside a \`\`\`browser-command\`\`\` block.
You can perform MULTIPLE actions in sequence by outputting a JSON array of command objects.

If you need to analyze or audit the website's performance, layout, rankings, meta tags, authority trust, sitemap, spelling, redirects, or image assets, you can run one of these 9 diagnostics background tools automatically:
- "analyze_website" (Deep performance, SEO, security)
- "visual_analyze" (UI, heatmaps, typography, layout style)
- "rank_tracker" (DuckDuckGo SERP keyword rankings positions)
- "on_page_seo" (Anchors, headers count, robots/canonical meta tags)
- "authority" (Domain & Page Trust authority DNS checks)
- "crawler" (Robots.txt, Sitemap.xml content source code crawler)
- "spelling" (Text spelling checks and Flesch readability math analysis)
- "redirect_tracer" (URL redirect hop chain and SSL secure connection tests)
- "image_auditor" (Modern next-gen formats WebP coverage check, Alt descriptions)

To execute a tool in the background, append a \`\`\`tool-command\`\`\` JSON block at the very end of your response:
\`\`\`tool-command
{ "tool": "authority", "url": "growcitable.com" }
\`\`\`
Only output the tool-command block when you genuinely need to gather live, correct audit results to reply to the user. The app will fetch the real-time background results and feedback the output directly to you. Keep your responses concise, clean, and helpful.`;

        const cleanMessagesForClaude = currentMessages.map((c) => {
            const role = c.role === "assistant" ? "assistant" : "user";
            return {
                role,
                content: c.text || ""
            };
        });

        setMessages((prev) => [
            ...prev,
            {
                role: "assistant",
                text: ""
            }
        ]);

        let reply = "";
        let accumulatedText = "";
        const handleChunk = (event, data) => {
            accumulatedText += data.content;
            setMessages((prev) => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.role === "assistant") {
                    lastMsg.text = accumulatedText;
                }
                return updated;
            });
        };

        ipcRenderer.on("claude-generate-chunk", handleChunk);
        try {
            reply = await ipcRenderer.invoke("claude-generate", {
                apiKey: claudeApiKey,
                systemPrompt: systemPromptText,
                messages: cleanMessagesForClaude,
                stream: true
            });
        } catch (err) {
            console.error("Gemini API feedback loop error:", err);
        } finally {
            ipcRenderer.removeListener("claude-generate-chunk", handleChunk);
            setIsTyping(false);
        }

        const commandRegex = /```browser-command\s*([\s\S]*?)\s*```/;
        const match = reply.match(commandRegex);
        const toolCommandRegex = /```tool-command\s*([\s\S]*?)\s*```/;
        const toolMatch = reply.match(toolCommandRegex);
        const cleanReplyText = reply.replace(toolCommandRegex, "").replace(commandRegex, "").trim();

        setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg && lastMsg.role === "assistant") {
                lastMsg.text = cleanReplyText;
            }
            return updated;
        });

        if (toolMatch) {
            try {
                const toolCmd = JSON.parse(sanitizeJsonString(toolMatch[1].trim()));
                if (toolCmd && toolCmd.tool && toolCmd.url) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "assistant",
                            text: `⚙️ **Background Diagnostic Tool**: Running \`${toolCmd.tool}\` on *${toolCmd.url}*...`
                        }
                    ]);
                    const toolResult = await executeBackgroundTool(toolCmd.tool, toolCmd.url);
                    const feedbackPrompt = `[System Diagnostic Tool Notification: The background tool '${toolCmd.tool}' executed successfully. Live results:\n${JSON.stringify(toolResult, null, 2)}\n\nAnalyze these results and output your final expert report to the user.]`;
                    setTimeout(() => {
                        triggerAgentFeedbackResponse(feedbackPrompt);
                    }, 500);
                }
            } catch (jsonErr) {
                console.error("Failed to parse nested tool command:", jsonErr);
            }
        }

        if (match) {
            try {
                const cmd = JSON.parse(sanitizeJsonString(match[1].trim()));
                if (Array.isArray(cmd)) {
                    runSequentialCommands(cmd, cleanReplyText);
                } else {
                    runSequentialCommands([cmd], cleanReplyText);
                }
            } catch (jsonErr) {
                console.error("Failed to parse browser command:", jsonErr);
            }
        }
    };
    const handleSendAssistantMessage = async (overrideText?: string) => {
        const text = (typeof overrideText === "string" ? overrideText : assistantInput).trim();
        if (!text && !attachedImage) return;
        // Handle teaching command /learn
        if (text.startsWith("/learn")) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "user",
                    text
                }
            ]);
            setAssistantInput("");
            try {
                const fs = window.require("fs");
                const path = window.require("path");
                const os = window.require("os");
                const dirPath = path.join(os.homedir(), ".gemini", "antigravity-ide");
                const rulesFilePath = path.join(dirPath, "learned_rules.json");
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, {
                        recursive: true
                    });
                }
                let rules = [];
                if (fs.existsSync(rulesFilePath)) {
                    try {
                        rules = JSON.parse(fs.readFileSync(rulesFilePath, "utf8"));
                        if (!Array.isArray(rules)) rules = [];
                    } catch (e) { }
                }
                const commandArg = text.substring(6).trim();
                if (commandArg === "clear") {
                    fs.writeFileSync(rulesFilePath, JSON.stringify([], null, 2), "utf8");
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "assistant",
                            text: "🗑️ All learned rules have been cleared successfully."
                        }
                    ]);
                    return;
                }
                if (commandArg === "list" || commandArg === "") {
                    if (rules.length === 0) {
                        setMessages((prev) => [
                            ...prev,
                            {
                                role: "assistant",
                                text: "🔍 No learned rules found. Teach me something with `/learn [instruction]`."
                            }
                        ]);
                    } else {
                        const ruleList = rules.map((r, i) => `${i + 1}. ${r}`).join("\n");
                        setMessages((prev) => [
                            ...prev,
                            {
                                role: "assistant",
                                text: `📚 **Taught Rules List**:\n${ruleList}`
                            }
                        ]);
                    }
                    return;
                }
                if (!rules.includes(commandArg)) {
                    rules.push(commandArg);
                    fs.writeFileSync(rulesFilePath, JSON.stringify(rules, null, 2), "utf8");
                }
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        text: `✅ Learned successfully! I will follow this behavior in all future sessions:\n*"${commandArg}"*`
                    }
                ]);
            } catch (err) {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        text: `❌ Failed to save rule: ${err.message}`
                    }
                ]);
            }
            return;
        }
        // Handle plan generation command /plan
        if (text.startsWith("/plan")) {
            const planTopic = text.substring(5).trim();
            setMessages((prev) => [
                ...prev,
                {
                    role: "user",
                    text
                },
                {
                    role: "assistant",
                    text: `🏛️ **Initiating Deep Architectural Plan Generation**...\n* Performing multi-stage Serper API web research across documentation & best practices...`
                }
            ]);
            setAssistantInput("");
            setIsTyping(true);

            generateDeepArchitecturalPlan(planTopic, (status) => {
                setAgentThought(status);
            }).then((planResult) => {
                setIsTyping(false);
                setMessages((prev) => [
                    ...prev.slice(0, -1),
                    {
                        role: "assistant",
                        text: planResult.markdown
                    }
                ]);
                openNewTabWithUrl((window.location.origin || "http://localhost:3000") + "/plan-architecture");
            }).catch((err) => {
                setIsTyping(false);
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        text: `❌ **Plan Generation Error**: ${err?.message || err}`
                    }
                ]);
            });
            return;
        }
        // Capture attached image base64 state before reset
        const currentImage = attachedImage;
        // Optimistically push user message to UI immediately
        setMessages((prev) => [
            ...prev,
            {
                role: "user",
                text: text || "Uploaded an image",
                imageUrl: currentImage || undefined
            }
        ]);
        setAssistantInput("");
        setAttachedImage(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setIsTyping(true);
        const apiKey = "";
        const { ipcRenderer } = window.require("electron");
        // Smart Intent Routing Classifier
        let classifiedAction = "chat";
        try {
            const recentContext = messages.slice(-4).map((m) => `${m.role}: ${(m.text || "").slice(0, 200)}`).join("\n");
            const classifyInput = recentContext
                ? `Recent conversation:\n${recentContext}\n\nCurrent message: "${text}"`
                : text;
            const classificationResponse = await ipcRenderer.invoke("claude-generate", {
                apiKey,
                systemPrompt: "You are an intent routing classifier. Your task is to determine whether the user is asking a question (chat mode) or commanding you to perform physical actions on the browser window (browse mode).\n\nRespond with exactly one of these two words:\n- 'chat': The user is asking a question, requesting information, explanation, or chatting. (e.g. 'tell me about X', 'what is Y', 'who is CEO of Z', 'explain this code').\n- 'browse': The user is instructing you to perform actions on the browser page, navigate tabs, click buttons, fill out inputs, or search on specific sites. (e.g. 'open google', 'go to youtube', 'search for hotels on booking.com', 'click the pricing tab', 'login to my github'). IMPORTANT: 'continue', 'resume', 'keep going' in response to a previous browser task are 'browse' commands.\n\nOnly reply with the word 'chat' or 'browse'. Do not add any punctuation, intro, or other text.",
                messages: [
                    {
                        role: "user",
                        content: classifyInput
                    }
                ]
            });
            classifiedAction = classificationResponse.trim().toLowerCase();
        } catch (classifyErr) {
            console.warn("Intent classification failed, falling back to chat:", classifyErr);
        }
        if (classifiedAction.includes("browse")) {
            let macroCommands = null;
            try {
                const parsePrompt = `You are a browser macro command generator. Translate the user's browser instruction into a JSON array of sequential browser actions.
If the instruction requires dynamic decision-making (e.g. checking page state, verifying details to decide next step, loops, or complex login logic), reply with exactly the word "agent".
Only output a JSON array of commands if it is a simple, straightforward linear instruction.

Available action formats in your JSON array:
- { "action": "open_tab", "url": "https://..." }
- { "action": "navigate_tab", "url": "https://..." }
- { "action": "click_element", "selector": "CSS_SELECTOR (optional)", "text": "exact text on button/link to click" }
- { "action": "type_text", "text": "text to type", "selector": "CSS_SELECTOR (optional)", "submit": true }
- { "action": "scroll", "direction": "down" | "up", "text": "target section/heading text to scroll into view" }
- { "action": "press_key", "key": "key name", "ctrl": boolean }

Example output for "go to wikipedia.org, search for 'India', and scroll down to the history section":
\`\`\`json
[
  { "action": "navigate_tab", "url": "https://wikipedia.org" },
  { "action": "type_text", "text": "India", "selector": "input[type='search']", "submit": true },
  { "action": "scroll", "direction": "down", "text": "History" }
]
\`\`\`

Example output for "check if the weather in Delhi is rainy":
"agent" (since it requires reading page text dynamic value)

User instruction: "${text}"`;
                const parseResponse = await ipcRenderer.invoke("claude-generate", {
                    apiKey,
                    systemPrompt: "You parse simple user browser commands into static sequential JSON macros or return 'agent'. Respond ONLY with the JSON block or the word 'agent'. No other text.",
                    messages: [
                        {
                            role: "user",
                            content: parsePrompt
                        }
                    ]
                });
                const cleanResp = parseResponse.trim();
                if (!cleanResp.includes("agent")) {
                    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
                    const match = cleanResp.match(jsonRegex);
                    const cleanJson = match ? match[1].trim() : cleanResp;
                    macroCommands = JSON.parse(sanitizeJsonString(cleanJson));
                }
            } catch (err) {
                console.warn("Failed to parse macro, falling back to agent:", err);
            }
            if (macroCommands && Array.isArray(macroCommands) && macroCommands.length > 0) {
                const stepsSummary = macroCommands.map((cmd) => {
                    if (cmd.action === "navigate_tab" || cmd.action === "open_tab") return `[ ] Navigate to ${cmd.url}`;
                    if (cmd.action === "type_text") {
                        const target = `${cmd.selector || ""} ${cmd.description || ""}`;
                        const isSecret = /pass/i.test(target);
                        const field = /email/i.test(target) ? "the email field" : isSecret ? "the password field" : "the input field";
                        return `[ ] Type '${isSecret ? "••••••••" : cmd.text}' into ${field}`;
                    }
                    if (cmd.action === "click_element") return `[ ] Click '${cmd.text || cmd.selector}'`;
                    if (cmd.action === "scroll") return `[ ] Scroll to the '${cmd.text}' section`;
                    return `[ ] Execute ${cmd.action}`;
                }).join("\n");
                const initialMessageText = `**Task Checklist**\n${stepsSummary}\n\n**Activity Logs**\n* Running macro sequence...`;
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        text: initialMessageText
                    }
                ]);
                setIsTyping(false);
                setTimeout(() => {
                    runSequentialCommands(macroCommands, initialMessageText);
                }, 50);
                return;
            }
            // Read learned rules to pass to the agent
            let learnedPromptSection = "";
            try {
                const fs = window.require("fs");
                const path = window.require("path");
                const os = window.require("os");
                const rulesFilePath = path.join(os.homedir(), ".gemini", "antigravity-ide", "learned_rules.json");
                if (fs.existsSync(rulesFilePath)) {
                    const rules = JSON.parse(fs.readFileSync(rulesFilePath, "utf8"));
                    if (Array.isArray(rules) && rules.length > 0) {
                        learnedPromptSection = "\n\nIMPORTANT - USER TAUGHT BEHAVIORS:\n" + rules.map((r, idx) => `- ${r}`).join("\n");
                    }
                }
            } catch (e) {
                console.error("Failed to read learned rules:", e);
            }

            const isContinueCommand = (val: string): boolean => {
                const clean = val.trim().toLowerCase();
                return (
                    clean === "continue" ||
                    clean === "resume" ||
                    clean === "keep going" ||
                    clean === "go on" ||
                    clean === "continue task" ||
                    clean === "continue the task" ||
                    clean.startsWith("continue ") ||
                    clean.startsWith("resume ")
                );
            };

            let initialHistory: string[] = [];
            let initialTasksList: string[] = [];
            let actualGoal = text;

            if (isContinueCommand(text)) {
                for (let i = messages.length - 1; i >= 0; i--) {
                    const msg = messages[i];
                    if (msg.role === "assistant" && msg.text && (msg.text.includes("**Agent Thoughts**") || msg.text.includes("**Task Checklist**"))) {
                        const checklistMatch = msg.text.match(/\*\*Task Checklist\*\*([\s\S]*?)(?:\n\n\*\*Agent Thoughts\*\*|\n\n❌|\n\n$)/);
                        if (checklistMatch) {
                            const lines = checklistMatch[1].split("\n");
                            initialTasksList = lines
                                .map((line) => line.replace(/^-\s*\[[x/ ]\]\s*/, "").trim())
                                .filter(Boolean);
                        }

                        const thoughtsMatch = msg.text.split("**Agent Thoughts**\n");
                        if (thoughtsMatch.length > 1) {
                            const lines = thoughtsMatch[1].split("\n");
                            initialHistory = lines
                                .map((line) => line.trim())
                                .filter((line) => line.startsWith("*") || line.startsWith("-"));
                        }

                        for (let j = i - 1; j >= 0; j--) {
                            if (messages[j].role === "user" && messages[j].text && !isContinueCommand(messages[j].text)) {
                                actualGoal = messages[j].text;
                                break;
                            }
                        }
                        break;
                    }
                }
            }

            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    text: initialHistory.length > 0 ? "Resuming Agent..." : "Initializing Agent..."
                }
            ]);
            setIsAgentActive(true);
            setIsTyping(false);
            setAgentThought(initialHistory.length > 0 ? "Resuming Agent..." : "Initializing Agent...");
            agentCancelledRef.current = false;
            (0, runAgentLoop)(actualGoal, activeTabIdRef.current, apiKey, {
                navigate: (url) => navigateTab(url),
                open_tab: (url) => {
                    openNewTabWithUrl(url);
                },
                switch_tab: (index) => {
                    if (tabs[index]) {
                        setActiveTabId(tabs[index].id);
                    }
                },
                click: async (selector, text) => {
                    if (agentCancelledRef.current) return;
                    await simulateHandClick(selector, text);
                    await waitForNetworkIdle(800);
                },
                type: async (val, selector, submit) => {
                    if (agentCancelledRef.current) return;
                    await simulateTyping(val, selector, submit);
                    await waitForNetworkIdle(800);
                },
                scroll: async (direction, amount, selector, text) => {
                    if (agentCancelledRef.current) return;
                    await simulateScroll(direction, amount, selector, text);
                    await waitForNetworkIdle(400);
                },
                press_key: async (key, ctrl, shift, alt) => {
                    if (agentCancelledRef.current) return;
                    simulateKeyPress(key, ctrl, shift, alt);
                    await waitForNetworkIdle(400);
                },
                go_back: () => {
                    handleGoBack();
                },
                go_forward: () => {
                    handleGoForward();
                },
                wait: async (ms) => {
                    await new Promise((res) => setTimeout(res, ms));
                },
                select_text: async (selector) => {
                    if (agentCancelledRef.current) return "";
                    const copied = await simulateSelectText(selector);
                    await waitForNetworkIdle(400);
                    return copied || "";
                },
                ask_question: async (question, options) => {
                    if (agentCancelledRef.current) return "Skipped";
                    return new Promise((resolve) => {
                        setActiveQuestion({
                            question,
                            options,
                            resolve
                        });
                    });
                },
                onAuthOrCaptchaWait: (status) => {
                    setAuthSnackbar(status);
                },
                checkManualContinue: () => {
                    if (manualAuthContinueRef.current) {
                        manualAuthContinueRef.current = false;
                        return true;
                    }
                    return false;
                }
            }, () => tabs.map((t) => ({
                id: t.id,
                title: t.title || "New Tab",
                url: t.url,
                consoleLogs: t.consoleLogs || []
            })), (thought) => {
                if (!agentCancelledRef.current) {
                    setAgentThought(thought);
                    updateLatestAssistantMessage(thought);
                }
            }, (summary) => {
                setIsAgentActive(false);
                updateLatestAssistantMessage(summary);
                const webview = document.getElementById(`webview-${activeTabIdRef.current}`);
                if (webview) {
                    webview.executeJavaScript(`
                const wrapper = document.getElementById("__agent_badge_wrapper__");
                if (wrapper) wrapper.remove();
              `).catch(() => { });
                }
            }, learnedPromptSection, initialHistory, initialTasksList);
            return;
        }
        // Extract text content of all open tabs in parallel, preferring pre-cached page content
        const openTabsContents = await Promise.all(tabs.map(async (t) => {
            if (t.url === "about:newtab" || t.url === "about:blank") return null;
            // 1. Return cached content if available (instant 0ms response)
            if (t.content && t.content.trim()) {
                return {
                    title: t.title || "Untitled",
                    url: t.url,
                    content: t.content.slice(0, 30000)
                };
            }
            // 2. Fallback to live extraction if not cached
            const webview = document.getElementById(`webview-${t.id}`);
            if (!webview) return null;
            try {
                const content = await Promise.race([
                    webview.executeJavaScript("document.body.innerText"),
                    new Promise((resolve) => setTimeout(() => resolve(""), 800))
                ]);
                if (content && content.trim()) {
                    return {
                        title: t.title || "Untitled",
                        url: t.url,
                        content: content.slice(0, 30000)
                    };
                }
            } catch (err) {
                console.warn(`Failed to extract text from tab ${t.id}:`, err);
            }
            return null;
        }));
        const validTabsContents = openTabsContents.filter((c) => c !== null);
        try {
            const apiKey = "";
            const systemPrompt = `You are the Antigravity AI Assistant, a helpful assistant built directly into the user's web browser.
The user is currently viewing the following tab:
- Title: ${activeTab.title || "New Tab"}
- URL: ${activeTab.url || "about:newtab"}

All open tabs in the browser:
${tabs.map((t, idx) => `[Tab Index ${idx}] ID: ${t.id}, Title: "${t.title}", URL: ${t.url}`).join("\n")}

You can control the browser tabs directly by appending a special JSON block at the very end of your response inside a \`\`\`browser-command\`\`\` block.
You can perform MULTIPLE actions in sequence by outputting a JSON array of command objects. For example: "open youtube, click searchbar, and search" -> output an array of 3 actions.

Available actions:
1. Open a new tab:
\`\`\`browser-command
{ "action": "open_tab", "url": "https://www.google.com" }
\`\`\`
2. Switch tabs (by index 0-based, or by title/URL keyword):
\`\`\`browser-command
{ "action": "switch_tab", "index": 0 }
or
{ "action": "switch_tab", "keyword": "google" }
\`\`\`
3. Close the current active tab:
\`\`\`browser-command
{ "action": "close_tab" }
\`\`\`
4. Navigate current tab to a URL:
\`\`\`browser-command
{ "action": "navigate_tab", "url": "https://github.com" }
\`\`\`
5. Reload current tab:
\`\`\`browser-command
{ "action": "reload_tab" }
\`\`\`
6. Click an element on the active page (using a CSS selector OR the exact visible text of the button/link):
\`\`\`browser-command
{ "action": "click_element", "selector": "input[placeholder*='Search Google']" }
or
{ "action": "click_element", "text": "Shorts" }
\`\`\`
7. Type text into the focused input element (optionally specifying a CSS selector and auto-submitting the form to search):
\`\`\`browser-command
{ "action": "type_text", "text": "lofi beats", "submit": true }
or
{ "action": "type_text", "selector": "input", "text": "wikipedia", "submit": false }
\`\`\`
8. Send a keyboard keypress or shortcut (e.g. Select All: ctrl: true, key: "a"; Copy: ctrl: true, key: "c"; Paste: ctrl: true, key: "v"; or Enter key):
\`\`\`browser-command
{ "action": "press_key", "key": "a", "ctrl": true }
or
{ "action": "press_key", "key": "Enter" }
\`\`\`
9. Scroll the page document up or down (direction: "down" or "up"):
\`\`\`browser-command
{ "action": "scroll", "direction": "down", "amount": 400 }
or
{ "action": "scroll", "direction": "up" }
\`\`\`

If you are outputting a sequence of browser commands, you MUST list each step as a markdown checkbox before the command block using the exact format:
- [ ] [Brief description of step 1]
- [ ] [Brief description of step 2]
The host page will dynamically tick off these checkboxes as they execute in real-time.

If the user asks you to click on something (e.g. "click on history", "click shorts", "click searchbar"), you MUST output the click_element command. If they ask you to search, enter text, or type something, you MUST output the type_text command. If they ask you to select all, copy, paste, or undo, you MUST output the press_key command with the appropriate modifiers. If they ask you to scroll page, you MUST output the scroll command. If they ask you to do multiple things, you MUST output a JSON array containing all corresponding commands. Only append this block if the user explicitly asks you to control the browser. For regular conversation, do NOT append a browser-command block.

If you need to analyze or audit the website's performance, layout, rankings, meta tags, authority trust, sitemap, spelling, redirects, or image assets, you can run one of these 9 diagnostics background tools automatically:
- "analyze_website" (Deep performance, SEO, security)
- "visual_analyze" (UI, heatmaps, typography, layout style)
- "rank_tracker" (DuckDuckGo SERP keyword rankings positions)
- "on_page_seo" (Anchors, headers count, robots/canonical meta tags)
- "authority" (Domain & Page Trust authority DNS checks)
- "crawler" (Robots.txt, Sitemap.xml content source code crawler)
- "spelling" (Text spelling checks and Flesch readability math analysis)
- "redirect_tracer" (URL redirect hop chain and SSL secure connection tests)
- "image_auditor" (Modern next-gen formats WebP coverage check, Alt descriptions)

To execute a tool in the background, append a \`\`\`tool-command\`\`\` JSON block at the very end of your response:
\`\`\`tool-command
{ "tool": "authority", "url": "growcitable.com" }
\`\`\`
Only output the tool-command block when you genuinely need to gather live, correct audit results to reply to the user. The app will fetch the real-time background results and feedback the output directly to you. Keep your responses concise, clean, and helpful.`;
            // Keep the recent conversation so the model has context ("continue", follow-ups, etc.)
            // Cap at the last 20 turns and trim very long messages to bound token usage.
            const HISTORY_LIMIT = 20;
            const HISTORY_CHAR_CAP = 4000;
            const cleanHistory = messages.slice(-HISTORY_LIMIT).map((msg) => {
                const text = (msg.text || "").length > HISTORY_CHAR_CAP
                    ? msg.text.slice(0, HISTORY_CHAR_CAP) + "\n...[truncated]"
                    : (msg.text || "");
                return {
                    role: msg.role === "assistant" ? "model" : "user",
                    parts: [{ text }]
                };
            });
            const apiContents = [
                {
                    role: "user",
                    parts: [
                        {
                            text: `INSTRUCTIONS: ${systemPrompt}`
                        }
                    ]
                },
                {
                    role: "model",
                    parts: [
                        {
                            text: "Understood. I will help you browse and use browser-commands to control the page when you ask me to."
                        }
                    ]
                },
                // Few-shot click example 1
                {
                    role: "user",
                    parts: [
                        {
                            text: "click on Shorts"
                        }
                    ]
                },
                {
                    role: "model",
                    parts: [
                        {
                            text: `Clicking the Shorts button now.
\`\`\`browser-command
{ "action": "click_element", "text": "Shorts" }
\`\`\``
                        }
                    ]
                },
                // Few-shot click example 2
                {
                    role: "user",
                    parts: [
                        {
                            text: "click on searchbar"
                        }
                    ]
                },
                {
                    role: "model",
                    parts: [
                        {
                            text: `Clicking the search input field.
\`\`\`browser-command
{ "action": "click_element", "selector": "input" }
\`\`\``
                        }
                    ]
                },
                // Few-shot click example 3
                {
                    role: "user",
                    parts: [
                        {
                            text: "search for lofi beats"
                        }
                    ]
                },
                {
                    role: "model",
                    parts: [
                        {
                            text: `Typing "lofi beats" into the search bar and submitting.
- [ ] Search for lofi beats
\`\`\`browser-command
{ "action": "type_text", "selector": "input", "text": "lofi beats", "submit": true }
\`\`\``
                        }
                    ]
                },
                // Few-shot multi-step array example 4
                {
                    role: "user",
                    parts: [
                        {
                            text: "open youtube clik on search serach claude code in it and search"
                        }
                    ]
                },
                {
                    role: "model",
                    parts: [
                        {
                            text: `I will open YouTube, locate the search bar, type "claude code", and run the search query.
- [ ] Navigate to YouTube
- [ ] Click the search bar
- [ ] Type "claude code" and search
\`\`\`browser-command
[
  { "action": "open_tab", "url": "https://www.youtube.com" },
  { "action": "click_element", "selector": "input#search, input[name='search_query']" },
  { "action": "type_text", "text": "claude code", "submit": true }
]
\`\`\``
                        }
                    ]
                },
                // Few-shot copy/paste example 5
                {
                    role: "user",
                    parts: [
                        {
                            text: "copy the selected text, open google, and paste it in search"
                        }
                    ]
                },
                {
                    role: "model",
                    parts: [
                        {
                            text: `I will copy your current selection, open Google in a new tab, select the search field, and paste the copied text.
- [ ] Copy selected text to clipboard
- [ ] Open Google in new tab
- [ ] Focus search input
- [ ] Paste copied text
\`\`\`browser-command
[
  { "action": "press_key", "key": "c", "ctrl": true },
  { "action": "open_tab", "url": "https://www.google.com" },
  { "action": "click_element", "selector": "input" },
  { "action": "press_key", "key": "v", "ctrl": true }
]
\`\`\``
                        }
                    ]
                },
                // Cleaned user message history
                ...cleanHistory,
                {
                    role: "user",
                    parts: [
                        {
                            text
                        }
                    ]
                }
            ];
            const { ipcRenderer } = window.require("electron");
            const claudeApiKey = "";
            // Query Qdrant for RAG memories matching the user's query
            let ragContext = "";
            try {
                const origin = window.location.origin || "http://localhost:3000";
                const searchRes = await fetch(`${origin}/api/rag/search?q=${encodeURIComponent(text)}&limit=3`);
                const searchData = await searchRes.json();
                if (searchData.results && searchData.results.length > 0) {
                    ragContext = searchData.results.map((r, idx) => {
                        return `[Private Page Memory ${idx + 1}] Title: "${r.title}", URL: "${r.url}"\nContent: "${r.text}"`;
                    }).join("\n\n");
                }
            } catch (err) {
                console.error("Standard chat failed to fetch RAG memories:", err);
            }
            const systemMessage = apiContents.find((c) => c.parts[0]?.text?.includes("INSTRUCTIONS:"));
            let systemPromptText = systemMessage ? systemMessage.parts[0].text : systemPrompt;
            if (ragContext) {
                systemPromptText = `${systemPromptText}\n\nYou have access to the following private RAG memories retrieved from the user's indexed web pages matching their message. Answer their query DIRECTLY and fluently using this context if it is relevant. Do NOT discuss or mention the term "RAG" or "vector DB" or "private memories" in your response; just answer the question naturally as if you already know the information:\n${ragContext}`;
            }
            if (validTabsContents.length > 0) {
                const tabsContext = validTabsContents.map((ot, idx) => {
                    return `[Currently Open Tab ${idx + 1}] Title: "${ot.title}", URL: "${ot.url}"\nContent:\n${ot.content}`;
                }).join("\n\n---\n\n");
                systemPromptText = `${systemPromptText}\n\nYou also have access to the actual live text contents of the user's currently open web tabs. If the user asks a question, requests a summary, or refers to any page/tab currently open, use this live content to answer them directly, accurately, and comprehensively. Do NOT reference how you read it; just answer naturally:\n\n${tabsContext}`;
            }
            const cleanMessagesForClaude = apiContents
                .filter((c, idx) => {
                    // Filter out the system instructions user message (idx 0) and the understood model response (idx 1)
                    // so the API message history starts with a user message and alternates roles correctly.
                    if (idx === 0 && c.role === "user" && c.parts[0]?.text?.includes("INSTRUCTIONS:")) {
                        return false;
                    }
                    if (idx === 1 && c.role === "model" && c.parts[0]?.text?.includes("Understood")) {
                        return false;
                    }
                    return true;
                })
                .map((c, idx, arr) => {
                    const role = c.role === "model" ? "assistant" : "user";
                    // If this is the last user message, check if we captured a currentImage
                    if (idx === arr.length - 1 && role === "user" && currentImage) {
                        const base64Data = currentImage.split(",")[1];
                        return {
                            role,
                            content: [
                                {
                                    type: "text",
                                    text: text || "Uploaded an image"
                                },
                                {
                                    type: "image",
                                    source: {
                                        type: "base64",
                                        media_type: "image/png",
                                        data: base64Data
                                    }
                                }
                            ]
                        };
                    }
                    return {
                        role,
                        content: c.parts[0]?.text || ""
                    };
                });
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    text: ""
                }
            ]);
            let reply = "";
            let accumulatedText = "";
            const handleChunk = (event, data) => {
                accumulatedText += data.content;
                setMessages((prev) => {
                    const updated = [
                        ...prev
                    ];
                    const lastMsg = updated[updated.length - 1];
                    if (lastMsg && lastMsg.role === "assistant") {
                        lastMsg.text = accumulatedText;
                    }
                    return updated;
                });
            };
            ipcRenderer.on("claude-generate-chunk", handleChunk);
            try {
                reply = await ipcRenderer.invoke("claude-generate", {
                    apiKey: claudeApiKey,
                    systemPrompt: systemPromptText,
                    messages: cleanMessagesForClaude,
                    stream: true
                });
            } finally {
                ipcRenderer.removeListener("claude-generate-chunk", handleChunk);
            }
            // Parse browser and tool commands from response
            const commandRegex = /```browser-command\s*([\s\S]*?)\s*```/;
            const toolCommandRegex = /```tool-command\s*([\s\S]*?)\s*```/;
            const match = reply.match(commandRegex);
            const toolMatch = reply.match(toolCommandRegex);
            const cleanReplyText = reply.replace(toolCommandRegex, "").replace(commandRegex, "").trim();
            let tokens = null;
            try {
                tokens = await ipcRenderer.invoke("claude-get-last-token-count");
            } catch (tokenErr) { }
            setMessages((prev) => {
                const updated = [
                    ...prev
                ];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.role === "assistant") {
                    lastMsg.text = cleanReplyText;
                    if (tokens && tokens.totalTokens > 0) {
                        lastMsg.tokens = tokens;
                    }
                }
                return updated;
            });
            if (toolMatch) {
                try {
                    const toolCmd = JSON.parse(sanitizeJsonString(toolMatch[1].trim()));
                    if (toolCmd && toolCmd.tool && toolCmd.url) {
                        setMessages((prev) => [
                            ...prev,
                            {
                                role: "assistant",
                                text: `⚙️ **Background Diagnostic Tool**: Running \`${toolCmd.tool}\` on *${toolCmd.url}*...`
                            }
                        ]);
                        const toolResult = await executeBackgroundTool(toolCmd.tool, toolCmd.url);
                        const feedbackPrompt = `[System Diagnostic Tool Notification: The background tool '${toolCmd.tool}' executed successfully for ${toolCmd.url}. Live results:\n${JSON.stringify(toolResult, null, 2)}\n\nAnalyze these results and output your final expert report to the user.]`;
                        setTimeout(() => {
                            triggerAgentFeedbackResponse(feedbackPrompt);
                        }, 500);
                    }
                } catch (jsonErr) {
                    console.error("Failed to parse tool command:", jsonErr);
                }
            }
            if (match) {
                try {
                    const cmd = JSON.parse(sanitizeJsonString(match[1].trim()));
                    if (Array.isArray(cmd)) {
                        runSequentialCommands(cmd, cleanReplyText);
                    } else {
                        runSequentialCommands([
                            cmd
                        ], cleanReplyText);
                    }
                } catch (jsonErr) {
                    console.error("Failed to parse browser command:", jsonErr);
                }
            }
        } catch (err) {
            console.error("Gemini API error:", err);
            setMessages((prev) => {
                const updated = [
                    ...prev
                ];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.role === "assistant" && !lastMsg.text) {
                    lastMsg.text = `Error: Failed to connect to local AI. ${err.message || err}`;
                }
                return updated;
            });
        } finally {
            setIsTyping(false);
        }
    };
    // Wire event handlers to custom webview element
    const setupWebview = (el, tabId) => {
        if (!el || el.__eventsAttached) return;
        el.__eventsAttached = true;
        const onStartLoading = () => {
            updateTabProperties(tabId, {
                isLoading: true,
                certError: null
            });
        };
        const onStopLoading = () => {
            try {
                const url = el.getURL();
                updateTabProperties(tabId, {
                    isLoading: false,
                    url,
                    canGoBack: el.canGoBack(),
                    canGoForward: el.canGoForward()
                });
                // Cache page text content dynamically
                el.executeJavaScript("document.body.innerText").then((text) => {
                    if (text && text.trim()) {
                        updateTabProperties(tabId, {
                            content: text
                        });
                    }
                }).catch(() => { });
            } catch (err) {
                console.error("Error retrieving webview URLs:", err);
            }
        };
        const onTitleUpdated = (e) => {
            updateTabProperties(tabId, {
                title: e.title
            });
            try {
                const currentUrl = el.getURL();
                if (currentUrl && !currentUrl.startsWith("about:")) {
                    addToHistory(currentUrl, e.title);
                }
            } catch (err) { }
        };
        const onDidNavigate = (e) => {
            updateTabProperties(tabId, {
                url: e.url,
                certError: null
            });
            if (e.url && !e.url.startsWith("about:")) {
                addToHistory(e.url);
            }
        };
        const onDidFailLoad = (e) => {
            if (e.errorCode === -3) {
                updateTabProperties(tabId, {
                    isLoading: false
                });
                return;
            }
            // Chromium certificate/SSL errors live in the -200..-299 range
            if (e.errorCode <= -200 && e.errorCode >= -299 && e.isMainFrame !== false) {
                let host = "";
                try { host = new URL(e.validatedURL || "").hostname; } catch (err) { }
                updateTabProperties(tabId, {
                    isLoading: false,
                    title: `Privacy error: ${host || "Page"}`,
                    certError: {
                        url: e.validatedURL || "",
                        host,
                        code: e.errorCode,
                        error: e.errorDescription || "Certificate error"
                    }
                });
                return;
            }
            updateTabProperties(tabId, {
                isLoading: false,
                title: `Failed to load: ${e.validatedURL || "Page"}`,
                certError: null
            });
        };
        const onCrashed = () => {
            updateTabProperties(tabId, {
                isLoading: false,
                title: "Tab Crashed"
            });
        };
        const onDomReady = () => {
            try {
                if (typeof el.getWebContentsId === "function") {
                    const wcId = el.getWebContentsId();
                    updateTabProperties(tabId, { webContentsId: wcId });
                }
            } catch (err) { }
            try {
                if (cookieBlockingEnabled) {
                    el.executeJavaScript(cookieAnnihilatorScript).catch(() => { });
                }
            } catch (err) {
                console.error("Overlay script injection failure:", err);
            }
            // Early text content caching on DOM ready
            setTimeout(() => {
                el.executeJavaScript("document.body.innerText").then((text) => {
                    if (text && text.trim()) {
                        updateTabProperties(tabId, {
                            content: text
                        });
                    }
                }).catch(() => { });
            }, 500);
            const target = el.getAttribute("src");
            if (!target || target === "about:newtab") return;
            try {
                const current = el.getURL();
                if (!current || current === "about:blank" || current === "about:newtab") {
                    console.log(`Forcing self-healing load on dom-ready for tab ${tabId} target: ${target}`);
                    if (typeof el.loadURL === "function") {
                        el.loadURL(target).catch(() => { });
                    }
                }
            } catch (err) {
                if (typeof el.loadURL === "function") {
                    el.loadURL(target).catch(() => { });
                }
            }
        };
        const onFaviconUpdated = (e) => {
            if (e.favicons && e.favicons.length > 0) {
                updateTabProperties(tabId, {
                    favicon: e.favicons[0]
                });
            }
        };
        const onConsoleMessage = async (e) => {
            const msg = String(e.message || "");
            if (msg.startsWith("__macro_event__:")) {
                try {
                    const event = JSON.parse(msg.replace("__macro_event__:", ""));
                    if (isRecordingRef.current) {
                        addRecordedStepRef.current(event);
                    }
                } catch (err) {
                    console.error("Failed to parse macro event console log:", err);
                }
            }
            if (msg.startsWith("TRANSLATE_REQUEST:")) {
                const textToTranslate = msg.replace("TRANSLATE_REQUEST:", "");
                try {
                    const { ipcRenderer } = window.require("electron");
                    const claudeApiKey = "";
                    const translatePrompt = `Translate this foreign text into clear, fluent English. Keep only the translation, do NOT write any intro/outro explanations.
Text: "${textToTranslate}"`;
                    const translation = await ipcRenderer.invoke("claude-generate", {
                        apiKey: claudeApiKey,
                        systemPrompt: "You are a professional, accurate translator.",
                        messages: [
                            {
                                role: "user",
                                content: translatePrompt
                            }
                        ]
                    });
                    el.executeJavaScript(`window.showTranslationTooltip(${JSON.stringify(translation.trim())})`).catch(() => { });
                } catch (err) {
                    console.error("AI translation error:", err);
                }
            }
            // Collect console logs for agent debugging (keep last 15)
            const level = e.level === 0 ? "info" : e.level === 1 ? "warning" : "error";
            const logLine = `[Level: ${level}] ${msg}`;
            setTabs((prev) => prev.map((t) => {
                if (t.id === tabId) {
                    const logs = t.consoleLogs || [];
                    return {
                        ...t,
                        consoleLogs: [
                            ...logs.slice(-15),
                            logLine
                        ]
                    };
                }
                return t;
            }));
        };
        const onNewWindow = (e) => {
            e.preventDefault();
            if (e.url) {
                openNewTabWithUrl(e.url);
            }
        };
        el.addEventListener("did-start-loading", onStartLoading);
        el.addEventListener("did-stop-loading", onStopLoading);
        el.addEventListener("page-title-updated", onTitleUpdated);
        el.addEventListener("did-navigate", onDidNavigate);
        el.addEventListener("did-navigate-in-page", onDidNavigate);
        el.addEventListener("did-fail-load", onDidFailLoad);
        el.addEventListener("crashed", onCrashed);
        el.addEventListener("dom-ready", onDomReady);
        el.addEventListener("page-favicon-updated", onFaviconUpdated);
        el.addEventListener("console-message", onConsoleMessage);
        el.addEventListener("new-window", onNewWindow);
    };
    const setupDevToolsWebview = (devtoolsEl: any, tabId: string) => {
        if (!devtoolsEl) return;

        const attemptAttach = () => {
            try {
                const mainEl = document.getElementById(`webview-${tabId}`) as any;
                if (mainEl && devtoolsEl) {
                    const mainId = typeof mainEl.getWebContentsId === "function" ? mainEl.getWebContentsId() : null;
                    const devtoolsId = typeof devtoolsEl.getWebContentsId === "function" ? devtoolsEl.getWebContentsId() : null;

                    if (mainId && devtoolsId) {
                        let ipcRenderer: any = null;
                        try {
                            ipcRenderer = window.require("electron")?.ipcRenderer;
                        } catch (err) { }

                        if (ipcRenderer) {
                            ipcRenderer.send("attach-devtools", { mainId, devtoolsId });
                            setTimeout(() => {
                                try {
                                    if (typeof mainEl.inspectElement === "function") {
                                        mainEl.inspectElement(0, 0);
                                    }
                                } catch (e) { }
                            }, 250);
                            return true;
                        }
                    }
                }
            } catch (err) { }
            return false;
        };

        if (attemptAttach()) return;

        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            if (attemptAttach() || attempts > 25) {
                clearInterval(interval);
            }
        }, 100);

        try {
            devtoolsEl.addEventListener("dom-ready", () => {
                attemptAttach();
            });
        } catch (e) { }
    };
    if (!mounted) {
        return /*#__PURE__*/ (0, React.createElement)("div", {
            className: "flex h-screen w-screen items-center justify-center bg-[#f9f8f6] text-[#191919]",
            children: /*#__PURE__*/ (0, React.createElement)("div", {
                className: "h-8 w-8 animate-spin rounded-full border-2 border-[#fc4b01] border-t-transparent"
            })
        });
    }
    const startPhoneLookupExtraction = (instructions: string, formatted: string) => {
        const webview = document.getElementById(`webview-${activeTabIdRef.current}`) as any;
        if (webview) {
            const injectScript = `
                new Promise((resolve) => {
                    if (window.__phoneLookupExtracted || window.__phoneLookupRunning) { resolve(null); return; }
                    window.__phoneLookupRunning = true;
                    let extractedProfiles = [];
                    const extractProfiles = () => {
                        const cards = [...document.querySelectorAll('a, button')].filter(b => /view\\s*details/i.test(b.textContent || '')).map((btn, fi) => {
                            let card = btn.parentElement;
                            for (let i = 0; i < 10 && card; i++) {
                                if (/age\\s*\\d+/i.test(card.innerText || '') && (card.innerText || '').length < 2000) break;
                                card = card.parentElement;
                            }
                            return { card, fi };
                        }).filter(x => x.card);
                        extractedProfiles = cards.map(({ card, fi }) => {
                            const cardText = card.innerText || '';
                            const lines = cardText.split('\\n').map(l => l.trim()).filter(Boolean);
                            const get = (prefix) => { const l = lines.find(x => x.toLowerCase().startsWith(prefix)); return l ? l.slice(prefix.length).trim() : ''; };
                            const nameLine = lines.find(l => /,?\\s*age\\s*\\d+/i.test(l)) || '';
                            const nm = nameLine.match(/^(.*?),?\\s*age\\s*(\\d+)/i);
                            const incMatch = cardText.match(/includes([\\s\\S]*)$/i);
                            const tokens = incMatch ? [...new Set([...incMatch[1].matchAll(/(profile|address|phone|email)(\\s*\\(\\d+\\))?/gi)].map(m => m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() + ((m[2] || '').replace(/\\s/g, ''))))] : [];
                            if (/social profiles/i.test(cardText)) tokens.splice(Math.min(1, tokens.length), 0, 'Social');
                            return {
                                name: nm ? nm[1].trim() : nameLine,
                                age: nm ? nm[2] : '',
                                bestMatch: /best match/i.test(cardText),
                                livesAt: get('lives at'),
                                livedIn: get('lived in'),
                                aka: get('also known as'),
                                relatedTo: get('related to'),
                                includes: tokens.join('  '),
                                btnIndex: fi
                            };
                        }).filter(p => p.name).filter((p, i, arr) => arr.findIndex(x => x.name === p.name && x.age === p.age) === i);
                    };
                    const SKIP_SEL = 'nav, aside, header, footer, [role="navigation"], [role="banner"], [role="contentinfo"], script, style, noscript';
                    const KNOWN_HEADING = /^(contact( information)?|phone(&| and)?\\s*e-?mail|phone numbers?|email addresses?|location history|all addresses|current address|family|relatives?|social(\\s*profiles?|\\s*media|\\s*networks?)?|court(s)?(\\s*records)?|criminal records?|personal(&\\s*historical records)?|personal details?|wealth|owned propert(y|ies)|propert(y|ies)|work(\\s*(and|&)\\s*)?education|education|employment|neighbors?|demographics?|overview|historical records|photos?|videos?)$/i;
                    const hasTextChildren = (el) => [...el.children].some(c => (c.innerText || '').trim().length > 0);
                    const headingLike = (el) => {
                        if (el.closest(SKIP_SEL)) return false;
                        const t = (el.textContent || '').trim();
                        if (!t || t.length > 80) return false;
                        if (/^H[1-6]$/.test(el.tagName)) return true;
                        return KNOWN_HEADING.test(t) && !hasTextChildren(el);
                    };
                    const getRoot = () => document.querySelector('main, [role="main"], #__next, body') || document.body;
                    const collected = new Map();
                    const collectVisible = () => {
                        const r = getRoot();
                        const docs = [r];
                        r.querySelectorAll('iframe').forEach((f) => {
                            try { if (f.contentDocument && f.contentDocument.body) docs.push(f.contentDocument.body); } catch (e) { }
                        });
                        docs.forEach((doc, di) => {
                            let cur = null;
                            doc.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,tr,dt,dd,td,th,span,div,a,button').forEach((el) => {
                                if (el.closest(SKIP_SEL)) return;
                                if (headingLike(el)) { cur = (el.textContent || '').trim().replace(/\\s+/g, ' '); return; }
                                if (di === 0) {
                                    const rect = el.getBoundingClientRect();
                                    if (rect.top > innerHeight + 900 || rect.bottom < -900) return;
                                }
                                if (cur === null || hasTextChildren(el)) return;
                                const t = (el.innerText || '').trim().replace(/\\s+/g, ' ');
                                if (!t || t.length > 500 || /^[.\\u2026]+$/.test(t)) return;
                                const prev = collected.get(cur) || [];
                                if (!prev.includes(t)) collected.set(cur, [...prev, t]);
                            });
                        });
                    };
                    const buildResult = () => {
                        const r = getRoot();
                        const heads = [...r.querySelectorAll('h1,h2,h3,h4,h5,h6,div,span')].filter(headingLike);
                        const sections = [...collected.entries()].map(([heading, lines]) => ({ heading, lines })).filter(s => s.lines.length);
                        if (heads.length) {
                            const full = r.innerText || '';
                            const firstT = (heads[0].innerText || '').trim();
                            const cutIdx = full.indexOf(firstT);
                            const preLines = [...new Set((cutIdx > 0 ? full.slice(0, cutIdx) : '').split('\\n').map(s => s.trim()).filter(Boolean))].filter(l => l.length < 300);
                            if (preLines.length) sections.unshift({ heading: (document.title || 'Result').split('|')[0].trim(), lines: preLines });
                        }
                        const allPhones = [...new Set((r.innerText || '').match(/\\(\\d{3}\\)\\s*\\d{3}-\\d{4}/g) || [])];
                        if (allPhones.length) {
                            const phoneSec = sections.find(s => /contact|phone/i.test(s.heading));
                            if (phoneSec) allPhones.forEach((pn) => { if (!phoneSec.lines.some(l => l.indexOf(pn) >= 0)) phoneSec.lines.push(pn); });
                        }
                        return { url: location.href, sections, profiles: extractedProfiles };
                    };
                    const scrollAndExtract = (done) => {
                        const sc = [...document.querySelectorAll('div,main,section')].filter(el => el.scrollHeight > el.clientHeight + 400 && el.clientHeight > 300).sort((a, b) => b.scrollHeight - a.scrollHeight)[0] || null;
                        const scrollTo = (y) => { if (sc) sc.scrollTop = y; else window.scrollTo(0, y); };
                        const maxY = () => (sc ? sc.scrollHeight : document.body.scrollHeight);
                        let passes = 3;
                        const runPass = () => {
                            let y = 0;
                            const step = () => {
                                scrollTo(y);
                                collectVisible();
                                y += 800;
                                if (y < maxY() + 1500) setTimeout(step, 320);
                                else {
                                    scrollTo(0);
                                    setTimeout(() => { if (--passes > 0) runPass(); else { collectVisible(); done(buildResult()); } }, 1500);
                                }
                            };
                            step();
                        };
                        runPass();
                    };
                    let attempts = 0;
                    const poll = setInterval(() => {
                        const isResultsPage = /\\/\\d{3}-\\d{3}-\\d{4}/.test(location.pathname);
                        const hasResults = [...document.querySelectorAll('a, button')].some(b => /view\\s*details/i.test(b.textContent || ''));
                        const sectionHits = [...document.querySelectorAll('h1,h2,h3,h4,div,span')].filter(h => {
                            const ht = (h.innerText || '').trim();
                            return !h.closest('nav, aside, header, footer') && ht.length < 60 && ![...h.children].some(c => (c.innerText || '').trim().length > 0) && /^(contact( information)?|phone(&| and)?\\s*e-?mail|phone numbers?|email addresses?|location history|all addresses|family|relatives?|social(\\s*profiles?|\\s*media|\\s*networks?)?|court(s)?(\\s*records)?|criminal records?|personal(&\\s*historical records)?|personal details?|wealth|owned propert(y|ies)|work(\\s*(and|&)\\s*)?education|education|employment|overview|photos?|videos?)$/i.test(ht);
                        }).length;
                        if (document.body.innerText.length > 4000 && !document.querySelector('input[placeholder*="digit" i]') && ![...document.querySelectorAll('button')].some(b => /search\\s*now/i.test(b.textContent || '')) && ((hasResults && isResultsPage) || sectionHits >= 2 || attempts > 20)) {
                            clearInterval(poll);
                            extractProfiles();
                            window.__phoneLookupExtracted = true;
                            scrollAndExtract(resolve);
                        } else if (++attempts > 90) {
                            clearInterval(poll);
                            resolve(null);
                        }
                    }, 500);
                })
            `;
            const profileScript = `
                new Promise((resolve) => {
                    if (window.__plProfilesDone) { resolve(null); return; }
                    if (!/\\/\\d{3}-\\d{3}-\\d{4}/.test(location.pathname)) { resolve(null); return; }
                    let a = 0;
                    const iv = setInterval(() => {
                        const hasCards = [...document.querySelectorAll('a, button')].some(b => /view\\s*details/i.test(b.textContent || ''));
                        if (hasCards) {
                            clearInterval(iv);
                            setTimeout(() => {
                                window.__plProfilesDone = true;
                                const cards = [...document.querySelectorAll('a, button')].filter(b => /view\\s*details/i.test(b.textContent || '')).map((btn, fi) => {
                                    let card = btn.parentElement;
                                    for (let i = 0; i < 10 && card; i++) {
                                        if (/age\\s*\\d+/i.test(card.innerText || '') && (card.innerText || '').length < 2000) break;
                                        card = card.parentElement;
                                    }
                                    return { card, fi };
                                }).filter(x => x.card);
                                resolve(cards.map(({ card, fi }) => {
                                    const cardText = card.innerText || '';
                                    const lines = cardText.split('\\n').map(l => l.trim()).filter(Boolean);
                                    const get = (prefix) => { const l = lines.find(x => x.toLowerCase().startsWith(prefix)); return l ? l.slice(prefix.length).trim() : ''; };
                                    const nameLine = lines.find(l => /,?\\s*age\\s*\\d+/i.test(l)) || '';
                                    const nm = nameLine.match(/^(.*?),?\\s*age\\s*(\\d+)/i);
                                    const incMatch = cardText.match(/includes([\\s\\S]*)$/i);
                                    const tokens = incMatch ? [...new Set([...incMatch[1].matchAll(/(profile|address|phone|email)(\\s*\\(\\d+\\))?/gi)].map(m => m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() + ((m[2] || '').replace(/\\s/g, ''))))] : [];
                                    if (/social profiles/i.test(cardText)) tokens.splice(Math.min(1, tokens.length), 0, 'Social');
                                    return {
                                        name: nm ? nm[1].trim() : nameLine,
                                        age: nm ? nm[2] : '',
                                        bestMatch: /best match/i.test(cardText),
                                        livesAt: get('lives at'),
                                        livedIn: get('lived in'),
                                        aka: get('also known as'),
                                        relatedTo: get('related to'),
                                        includes: tokens.join('  '),
                                        btnIndex: fi
                                    };
                                }).filter(p => p.name).filter((p, i, arr) => arr.findIndex(x => x.name === p.name && x.age === p.age) === i));
                            }, 1500);
                        } else if (++a > 40) { clearInterval(iv); resolve(null); }
                    }, 500);
                })
            `;
            let injectAttempts = 0;
            let captured = false;
            let profilesData: any[] = [];
            const injectPoll = setInterval(async () => {
                injectAttempts++;
                webview.executeJavaScript(profileScript).then((d: any) => {
                    if (d && d.length) {
                        profilesData = d;
                        setPhoneLookupProfiles(d);
                        if (formatted) {
                            const best = d.find((p: any) => p.bestMatch);
                            if (best) openPhoneLookupProfile(best);
                        }
                    }
                }).catch(() => { });
                try {
                    const data = await webview.executeJavaScript(injectScript);
                    if (data && data.sections) {
                        const isResultsUrl = /spokeo\.com\/\d{3}-\d{3}-\d{4}/.test(data.url || "");
                        if (isResultsUrl && (profilesData.length > 0 || !formatted)) return;
                        captured = true;
                        clearInterval(injectPoll);
                        setPhoneLookupResult(data.sections);
                        if (data.profiles && data.profiles.length && /\/\d{3}-\d{3}-\d{4}/.test(data.url || "")) setPhoneLookupProfiles(data.profiles);
                        if (instructions) {
                            setIsAssistantOpen(true);
                            const dataText = data.sections.map((s: any) => `${s.heading}:\n${s.lines.join("\n")}`).join("\n\n");
                            handleSendAssistantMessage(`Here is the extracted data from the phone lookup report for ${formatted}:\n\n${dataText.slice(0, 6000)}\n\nBased on this data, ${instructions}`);
                        }
                    }
                } catch { }
                if (injectAttempts > 60 && !captured) {
                    clearInterval(injectPoll);
                    if (instructions) {
                        setIsAssistantOpen(true);
                        handleSendAssistantMessage(`On the current phone lookup profile page, ${instructions}. Never ask the user questions; decide and act on your own.`);
                    }
                }
            }, 1000);
        }
    };
    const runPhoneLookup = () => {
        const digits = phoneLookupInput.replace(/\D/g, "");
        if (digits.length < 7) return;
        const instructions = phoneLookupInstructions.trim();
        const formatted = digits.length === 10 ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}` : digits;
        navigateTab(`https://www.spokeo.com/${formatted}`);
        setPhoneLookupResult(null);
        setPhoneLookupProfiles([]);
        setIsPhoneDetailView(false);
        setSelectedPhoneProfile(null);
        startPhoneLookupExtraction(instructions, formatted);
    };
    const openPhoneLookupProfile = async (profile: any) => {
        const webview = document.getElementById(`webview-${activeTabIdRef.current}`) as any;
        if (!webview) return;
        const index = profile?.btnIndex ?? 0;
        setIsPhoneDetailView(true);
        setPhoneLookupResult(null);
        setSelectedPhoneProfile(profile || null);
        try {
            const digits = phoneLookupInput.replace(/\D/g, "");
            const formatted = digits.length === 10 ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}` : digits;
            if (!/spokeo\.com\/\d{3}-\d{3}-\d{4}/.test(webview.getURL() || "")) {
                navigateTab(`https://www.spokeo.com/${formatted}`);
                await new Promise((r) => setTimeout(r, 2500));
            }
            for (let clickTry = 0; clickTry < 20; clickTry++) {
                const clicked = await webview.executeJavaScript(`
                    window.__phoneLookupExtracted = false;
                    window.__phoneLookupRunning = false;
                    (() => {
                        const b = [...document.querySelectorAll('a, button')].filter(x => /view\\s*details/i.test(x.textContent || ''))[${index}];
                        if (!b) return false;
                        const href = b.href || (b.closest && b.closest('a') ? b.closest('a').href : '');
                        if (href) { location.href = href.replace(/\\/p(\\d+)([/?#]|$)/, '/t$1$2'); return true; }
                        b.click();
                        return true;
                    })()
                `).catch(() => false);
                if (clicked) break;
                await new Promise((r) => setTimeout(r, 700));
            }
        } catch { }
        startPhoneLookupExtraction("", "");
    };
    const renderPhoneLookupReport = (full: boolean) => {
        if (!phoneLookupResult) return null;
        const tabs = buildPhoneLookupTabs(phoneLookupResult);
        const groupsById = new Map(tabs.map((t) => [t.id, t.groups]));
        const visibleTabs = PHONE_LOOKUP_TABS.filter((t) => t.id !== "overview" && t.id !== "court");
        const activeReportTab = visibleTabs.find((t) => t.id === phoneLookupTab) || visibleTabs[0];
        const activeGroups = activeReportTab ? groupsById.get(activeReportTab.id) || [] : [];
        const p = selectedPhoneProfile;
        const initials = (p?.name || "?").split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
        const overviewLines = (tabs.find((t) => t.id === "overview")?.groups || []).flatMap((g) => g.lines);
        const bioLine = overviewLines.find((l) => /born|lives in|known as|is\s+\d+\s+years/i.test(l));
        const subtitle = bioLine || [p?.aka && `Also known as ${p.aka}`, p?.livesAt && `Lives at ${p.livesAt}`].filter(Boolean).join(". ");
        const lineIcon = (line: string) => {
            if (/\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/.test(line)) return <Phone size={15} className="text-[#ff8a55] shrink-0 mt-0.5" />;
            if (/@/.test(line)) return <Mail size={15} className="text-[#ff8a55] shrink-0 mt-0.5" />;
            if (/\d+\s+[A-Za-z0-9. ]+\b(st|ave|avenue|rd|road|dr|drive|ln|lane|blvd|ct|court|way|pl|place|cir|circle|hwy|trl|ter|terrace|pkwy)\b/i.test(line)) return <MapPin size={15} className="text-[#ff8a55] shrink-0 mt-0.5" />;
            return null;
        };
        const socialIcon = (line: string) => {
            const brand = (d: string, color: string) => (
                <svg viewBox="0 0 24 24" width="15" height="15" fill={color} className="shrink-0 mt-0.5"><path d={d} /></svg>
            );
            const PATHS = {
                facebook: "M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z",
                instagram: "M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z",
                x: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
                linkedin: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z",
                youtube: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
                tiktok: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
                snapchat: "M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.419.839-1.003 1.168-.089.061-.211.148-.284.21-.479.405-1.057 1.11-.719 2.067.691 1.978 2.485 3.135 4.962 3.49.135.016.262.09.361.196.119.135.163.305.135.479-.029.405-.404.719-.957.84-.569.135-1.273.240-2.085.33-.018.031-.05.21-.074.359-.027.178-.06.42-.105.629-.029.151-.135.271-.271.32h-.074c-.646-.014-1.188-.1-1.647-.239-.36-.105-.765-.165-1.162-.165-.18 0-.36.014-.539.045-.645.104-1.228.434-1.736.839-.853.691-1.822 1.05-2.833 1.05h-.059c-1.011 0-1.98-.359-2.818-1.05-.51-.405-1.092-.734-1.737-.838-.254-.045-.508-.061-.717-.061-.36 0-.718.045-1.046.164-.42.134-.93.21-1.558.225-.27-.015-.494-.18-.553-.465-.029-.135-.06-.36-.09-.555s-.074-.404-.104-.494c-.869-.104-1.563-.209-2.104-.346-.435-.104-.763-.345-.928-.703-.061-.18-.015-.406.09-.538.09-.119.225-.195.389-.225 2.52-.404 4.271-1.527 4.977-3.551.342-.974-.239-1.692-.726-2.104-.046-.047-.135-.104-.242-.18-.854-.492-1.487-.855-1.487-1.557 0-.375.314-.689.749-.839.15-.045.328-.075.51-.075.254 0 .494.06.673.165.42.207.852.316 1.177.316.211 0 .355-.047.475-.104l.029-.015c-.018-.375-.029-.736-.041-1.09l-.002-.032c-.103-1.638-.236-3.662.279-4.861C7.727 1.063 11.009.793 12.206.793z",
                pinterest: "M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.62 0 12.017 0z",
                reddit: "M24 11.779c0-1.459-1.192-2.645-2.657-2.645-.715 0-1.363.286-1.84.746-1.81-1.191-4.259-1.949-6.971-2.046l1.483-4.669 4.016.941-.006.058c0 1.193.975 2.163 2.174 2.163 1.198 0 2.172-.97 2.172-2.163s-.975-2.164-2.172-2.164c-.92 0-1.704.568-2.027 1.375l-4.497-1.052c-.167-.041-.34-.013-.501.07-.161.083-.285.23-.34.415l-1.654 5.207c-2.835.034-5.414.817-7.285 2.046-.479-.465-1.125-.751-1.845-.751C1.204 9.134.003 10.32.003 11.779c0 .92.471 1.726 1.186 2.199-.045.16-.068.331-.068.508 0 3.426 4.126 6.204 9.214 6.204 5.088 0 9.213-2.778 9.213-6.204 0-.178-.024-.35-.07-.513.715-.464 1.522-1.276 1.522-2.194z",
            };
            if (/facebook|fb\.com/i.test(line)) return brand(PATHS.facebook, "#5b8ff0");
            if (/instagram|insta\.|ig\.com/i.test(line)) return brand(PATHS.instagram, "#e06fa3");
            if (/twitter|x\.com|tweet|\btwitter\b/i.test(line)) return brand(PATHS.x, "#e7e9ea");
            if (/linkedin/i.test(line)) return brand(PATHS.linkedin, "#4a9fd8");
            if (/youtube|youtu\.be/i.test(line)) return brand(PATHS.youtube, "#f06060");
            if (/tiktok/i.test(line)) return brand(PATHS.tiktok, "#69c9d0");
            if (/snapchat/i.test(line)) return brand(PATHS.snapchat, "#f0e14a");
            if (/pinterest/i.test(line)) return brand(PATHS.pinterest, "#e0575f");
            if (/reddit/i.test(line)) return brand(PATHS.reddit, "#f0714a");
            if (/threads|mastodon|discord|telegram|whatsapp|spotify|github|twitch|tumblr|flickr|medium|quora/i.test(line)) return <AtSign size={15} className="text-[#ff8a55] shrink-0 mt-0.5" />;
            return null;
        };
        return (
            <div className={`flex flex-col ${full ? "gap-5" : "gap-4"}`}>
                {(p || subtitle) && (
                    <div className="flex items-center gap-4 pb-5 border-b border-[#e3e0d5]">
                        <div className={`${full ? "w-16 h-16" : "w-12 h-12"} rounded-full bg-[#eae4d4] flex items-center justify-center text-[#8a8570] shrink-0`}>
                            {p?.name ? <span className={`${full ? "text-2xl" : "text-lg"} font-medium font-sans`}>{initials}</span> : <User size={full ? 30 : 22} strokeWidth={1.6} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className={`${full ? "text-[22px]" : "text-lg"} font-medium text-[#3d3a2e] font-sans truncate`}>
                                {p?.name || "Report"}{p?.age ? `, Age ${p.age}` : ""}
                            </div>
                            {subtitle && <div className="text-[12.5px] text-[#8c8877] font-sans mt-0.5 leading-relaxed">{subtitle}</div>}
                        </div>
                        <div className="flex flex-col items-end gap-2.5 shrink-0">
                            <span className="px-2.5 py-1 rounded-md border border-[#d5d0bf] text-[11px] font-medium text-[#55534a] font-sans flex items-center gap-1">
                                Verified <CheckCircle2 size={11} className="text-[#2e8b57]" />
                            </span>
                            <div className="flex items-center gap-4">
                                <button type="button" onClick={() => window.print()} className="text-[11px] font-semibold tracking-wider text-[#55534a] hover:text-[#191919] font-sans flex items-center gap-1">
                                    PDF <Download size={11} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { try { const wv = document.getElementById(`webview-${activeTabIdRef.current}`) as any; navigator.clipboard.writeText(wv?.getURL?.() || ""); } catch (e) { } }}
                                    className="text-[11px] font-semibold tracking-wider text-[#55534a] hover:text-[#191919] font-sans flex items-center gap-1"
                                >
                                    SHARE <Share2 size={11} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <div className={full ? "columns-1 md:columns-2 xl:columns-3 gap-4" : "flex flex-col gap-3"}>
                    {(() => {
                        const rawSections = phoneLookupResult
                            .filter((s) => !/data sources/i.test(s.heading) && !/court|criminal|family|relative/i.test(s.heading))
                            .map((s, idx) => ({
                                heading: idx === 0 ? "Overview" : s.heading,
                                lines: s.lines.map(decodePhoneLookupLine).filter((l): l is string => !!l)
                            }))
                            .filter((s) => s.lines.length > 0 && s.heading !== "Overview");
                        const isDataEntryHeading = (h: string) => /\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/.test(h) || /@/.test(h) || /\d+\s+[A-Za-z0-9. ]+\b(st|ave|avenue|rd|road|dr|drive|ln|lane|blvd|ct|court|way|pl|place|cir|circle|hwy|trl|ter|terrace|pkwy)\b/i.test(h);
                        const sections: { heading: string; lines: string[] }[] = [];
                        rawSections.forEach((s) => {
                            if (sections.length > 0 && (isDataEntryHeading(s.heading) || /possible contact/i.test(s.heading))) {
                                const prev = sections[sections.length - 1];
                                s.lines.forEach((l) => { if (!prev.lines.includes(l)) prev.lines.push(l); });
                            } else {
                                sections.push({ heading: s.heading, lines: [...s.lines] });
                            }
                        });
                        const iconFor = (h: string) => {
                            if (/contact|phone|email/i.test(h)) return Phone;
                            if (/location|address/i.test(h)) return MapPin;
                            if (/family|relative/i.test(h)) return Users;
                            if (/social/i.test(h)) return Share2;
                            if (/court|criminal/i.test(h)) return Scale;
                            if (/wealth|propert|income|asset|invest/i.test(h)) return Landmark;
                            if (/work|education|employment/i.test(h)) return GraduationCap;
                            if (/personal|additional|detail|historical/i.test(h)) return User;
                            return Info;
                        };
                        if (sections.length === 0) {
                            return <div className="py-8 text-center text-[13px] text-[#8c8877] font-sans">No data found for this person.</div>;
                        }
                        return sections.map((section, i) => {
                            const Icon = iconFor(section.heading);
                            const isEntry = (l: string) => /\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/.test(l) || /@/.test(l) || /\d+\s+[A-Za-z0-9. ]+\b(st|ave|avenue|rd|road|dr|drive|ln|lane|blvd|ct|court|way|pl|place|cir|circle|hwy|trl|ter|terrace|pkwy)\b/i.test(l);
                            const entries: string[][] = [];
                            section.lines.forEach((l) => {
                                if (isEntry(l) || entries.length === 0) entries.push([l]);
                                else entries[entries.length - 1].push(l);
                            });
                            return (
                                <div
                                    key={`sec-${i}`}
                                    className={`relative rounded-2xl overflow-hidden text-white ${full ? "p-6 mb-4 break-inside-avoid inline-block w-full" : "p-4"} transition-transform duration-150 hover:-translate-y-0.5`}
                                    style={{ background: "linear-gradient(165deg, #2a2a2a 0%, #101010 100%)", boxShadow: "0 8px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                                >
                                    <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
                                    <div className="relative flex items-center gap-3 pb-3 border-b border-white/10">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #fc4b01 0%, #c43e01 100%)", boxShadow: "0 4px 12px rgba(193,95,60,0.4)" }}>
                                            <Icon size={17} className="text-white" />
                                        </div>
                                        <div className="text-[15px] font-semibold font-sans tracking-wide truncate">{section.heading}</div>
                                        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-white/35 shrink-0">{section.lines.length} items</span>
                                    </div>
                                    <div className={`relative ${full ? "mt-4 flex flex-wrap gap-x-10 gap-y-4" : "mt-3 flex flex-col gap-3"}`}>
                                        {entries.map((group, j) => (
                                            <div key={j} className="flex items-start gap-2 text-[13px] font-sans leading-relaxed min-w-0">
                                                {/social/i.test(section.heading)
                                                    ? socialIcon(group.join(" ")) || <Share2 size={15} className="text-[#ff8a55] shrink-0 mt-0.5" />
                                                    : lineIcon(group[0])}
                                                <div className="flex flex-col gap-0.5 min-w-0">
                                                    <span className="text-white/85">{group[0]}</span>
                                                    {group.slice(1).map((sub, k) => {
                                                        const isStatus = /^(best phone|best email|active|inactive|landline|wireless|voip|mobile)\b/i.test(sub.trim());
                                                        return <span key={k} className={isStatus ? "text-[11px] text-emerald-400 font-medium" : "text-[11.5px] text-white/40"}>{sub}</span>;
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>
        );
    };
    return /*#__PURE__*/ (0, React.createElement)("div", {
        className: `h-screen w-screen flex flex-col overflow-hidden transition-colors duration-150 ${activeTab.isIncognito ? "bg-[#202221] text-zinc-100" : "bg-[#f9f8f6] text-[#191919]"}`,
        children: [
            /*#__PURE__*/ (0, React.createElement)("div", {
            key: "k2970_0_17",
            className: `h-[120px] w-full flex flex-col px-2 pt-3 pb-2 relative z-50 shrink-0 transition-colors duration-150 ${activeTab.isIncognito ? "bg-[#18191a]" : "bg-[#eae5d8]"}`,
            children: [
                    /*#__PURE__*/ (0, React.createElement)("div", {
                key: "k2973_0_24",
                className: "flex items-end gap-2 overflow-x-auto pl-3.5 pr-[140px] scrollbar-none h-[38px] select-none relative z-20",
                onDragOver: (e: any) => {
                    e.preventDefault();
                    if (draggedTabIdRef.current) {
                        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
                    } else if (e.dataTransfer) {
                        e.dataTransfer.dropEffect = "copy";
                    }
                },
                onDrop: (e: any) => {
                    const sourceTabId = e.dataTransfer?.getData("text/tab-id") || draggedTabIdRef.current;
                    if (sourceTabId) {
                        e.preventDefault();
                        e.stopPropagation();
                        setTabs((prevTabs) => {
                            const sourceIndex = prevTabs.findIndex((t) => t.id === sourceTabId);
                            if (sourceIndex === -1 || sourceIndex === prevTabs.length - 1) return prevTabs;
                            const updatedTabs = [...prevTabs];
                            const [movedTab] = updatedTabs.splice(sourceIndex, 1);
                            updatedTabs.push(movedTab);
                            return updatedTabs;
                        });
                        setDraggedTabId(null);
                        draggedTabIdRef.current = null;
                        return;
                    }
                    const dropped = extractDroppedUrl(e);
                    if (dropped) {
                        openNewTabWithUrl(dropped);
                    }
                },
                style: {
                    WebkitAppRegion: "drag"
                },
                children: /*#__PURE__*/ (0, React.createElement)("div", {
                    className: "flex-1 flex items-end gap-1.5 max-w-[calc(100vw-180px)]",
                    style: {
                        WebkitAppRegion: "no-drag"
                    },
                    children: [
                        tabs.map((tab, idx) => {
                            const isActive = tab.id === activeTabId;
                            return /*#__PURE__*/ (0, React.createElement)(React.Fragment, {
                                key: tab.id,
                                children: [
                                    idx > 0 && /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: `sep-${tab.id}`,
                                        className: "w-[1px] h-4 bg-[#c1ada1] shrink-0 self-center mx-1",
                                        style: {
                                            WebkitAppRegion: "no-drag"
                                        }
                                    }),
                                            /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: `tab-${tab.id}`,
                                        draggable: true,
                                        onClick: () => setActiveTabId(tab.id),
                                        onDragStart: (e: any) => handleTabDragStart(e, tab.id),
                                        onDragEnd: handleTabDragEnd,
                                        onDragOver: (e: any) => handleTabDragOver(e, tab.id),
                                        onDrop: (e: any) => handleTabDrop(e, tab.id),
                                        className: `group relative flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-t-xl text-xs font-semibold cursor-pointer transition-all border border-b-0 flex-1 overflow-hidden tab-container ${tab.isClosing ? "animate-tab-bounce-exit" : "animate-tab-bounce-entry"} ${tab.isIncognito
                                            ? (isActive
                                                ? "bg-[#202221] text-[#fc4b01] border-zinc-800 border-t-2 border-t-[#fc4b01] shadow-md font-bold"
                                                : "bg-black/20 text-zinc-400 border-transparent hover:bg-black/10 hover:text-zinc-200")
                                            : (isActive
                                                ? "bg-[#f9f8f6] text-[#191919] border-[#e3e0d5] border-t-2 border-t-[#fc4b01] tab-active-glow font-bold"
                                                : "bg-transparent text-[#6e6b5e] border-transparent hover:bg-black/5 hover:text-[#191919]")
                                            }`,
                                        style: {
                                            minWidth: tab.isClosing ? "0px" : "40px",
                                            maxWidth: tab.isClosing ? "0px" : "180px",
                                            opacity: tab.isClosing ? 0 : 1,
                                            paddingLeft: tab.isClosing ? "0px" : undefined,
                                            paddingRight: tab.isClosing ? "0px" : undefined,
                                            borderWidth: tab.isClosing ? "0px" : undefined,
                                            transform: undefined,
                                            transformOrigin: "left",
                                            marginBottom: "-1px",
                                            WebkitAppRegion: "no-drag",
                                            transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)"
                                        },
                                        children: [
                                                    /*#__PURE__*/ (0, React.createElement)("div", {
                                            key: "k2999_0_31",
                                            className: "tab-compact-close-container flex-1 items-center justify-center relative",
                                            children: tab.isLoading ? /*#__PURE__*/ (0, React.createElement)("span", {
                                                className: "h-3.5 w-3.5 shrink-0 rounded-full border border-[#fc4b01] border-t-transparent animate-spin"
                                            }) : /*#__PURE__*/ (0, React.createElement)(React["Fragment"], {
                                                children: [
                                                                /*#__PURE__*/ (0, React.createElement)("div", {
                                                    key: "k3029_0_33",
                                                    className: "group-hover:hidden transition-all duration-75 flex items-center justify-center",
                                                    children: tab.isIncognito
                                                        ? renderIncognitoIcon("w-3.5 h-3.5 text-[#fc4b01] shrink-0")
                                                        : /*#__PURE__*/ (0, React.createElement)("img", {
                                                            src: (0, getFaviconUrl)(tab),
                                                            alt: "",
                                                            className: "w-3.5 h-3.5 object-contain rounded-sm",
                                                            onError: (e) => {
                                                                e.target.src = "/logo/brocus-logo.webp";
                                                            }
                                                        })
                                                }),
                                                        /*#__PURE__*/ (0, React.createElement)("button", {
                                                    key: "k3029_1_34",
                                                    onClick: (e) => {
                                                        e.stopPropagation();
                                                        handleCloseTab(tab.id, e);
                                                    },
                                                    className: "hidden group-hover:flex w-[22px] h-[22px] rounded-md items-center justify-center hover:bg-black/10 text-[#6e6b5e] hover:text-[#191919] transition-all absolute inset-0 m-auto",
                                                    children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                                        xmlns: "http://www.w3.org/2000/svg",
                                                        fill: "none",
                                                        viewBox: "0 0 24 24",
                                                        strokeWidth: 3,
                                                        stroke: "currentColor",
                                                        className: "w-3.5 h-3.5",
                                                        children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                            strokeLinecap: "round",
                                                            strokeLinejoin: "round",
                                                            d: "M6 18L18 6M6 6l12 12"
                                                        })
                                                    })
                                                })
                                                ]
                                            })
                                        }),
                                                    /*#__PURE__*/ (0, React.createElement)("div", {
                                            key: "k2999_1_32",
                                            className: "tab-standard-layout flex-1 items-center justify-between gap-1.5 w-full min-w-0",
                                            children: [
                                                tab.isLoading ? /*#__PURE__*/ (0, React.createElement)("span", {
                                                    key: "k3067_0_t_35",
                                                    className: "h-3.5 w-3.5 shrink-0 rounded-full border border-[#fc4b01] border-t-transparent animate-spin"
                                                }) : (tab.isIncognito
                                                    ? renderIncognitoIcon("w-3.5 h-3.5 text-[#fc4b01] shrink-0 mr-0.5")
                                                    : /*#__PURE__*/ (0, React.createElement)("img", {
                                                        key: "k3067_0_f_f_36",
                                                        src: (0, getFaviconUrl)(tab),
                                                        alt: "",
                                                        className: "w-3.5 h-3.5 object-contain shrink-0 rounded-sm",
                                                        onError: (e) => {
                                                            e.target.src = "/logo/brocus-logo.webp";
                                                        }
                                                    })),
                                                            /*#__PURE__*/ (0, React.createElement)("span", {
                                                        key: "k3067_1_37",
                                                        className: "truncate text-left pl-1.5 flex-1 font-sans text-xs min-w-0 tab-title-text",
                                                        children: tab.title || "New Tab"
                                                    }),
                                                /*#__PURE__*/ (0, React.createElement)("button", {
                                                        key: "k3067_2_t_38",
                                                        onClick: (e) => {
                                                            e.stopPropagation();
                                                            handleCloseTab(tab.id, e);
                                                        },
                                                        className: `tab-standard-close w-[22px] h-[22px] rounded-md flex items-center justify-center ${isActive ? "opacity-70 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100"} hover:bg-black/10 text-[#6e6b5e] hover:text-[#191919] transition-all shrink-0`,
                                                        children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                                            xmlns: "http://www.w3.org/2000/svg",
                                                            fill: "none",
                                                            viewBox: "0 0 24 24",
                                                            strokeWidth: 2.5,
                                                            stroke: "currentColor",
                                                            className: "w-3.5 h-3.5",
                                                            children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                                strokeLinecap: "round",
                                                                strokeLinejoin: "round",
                                                                d: "M6 18L18 6M6 6l12 12"
                                                            })
                                                        })
                                                    })
                                            ]
                                        })
                                        ]
                                    })
                                ]
                            });
                        }),
                            /*#__PURE__*/ (0, React.createElement)("div", {
                            key: "k2981_1_28",
                            className: "relative flex items-center mb-1 ml-2 shrink-0",
                            style: {
                                WebkitAppRegion: "no-drag"
                            },
                            children: [
                                    /*#__PURE__*/ (0, React.createElement)("button", {
                                key: "k3115_0_40",
                                onClick: handleNewTab,
                                className: `p-2 rounded-lg transition-all active:scale-95 ${activeTab.isIncognito ? "text-zinc-400 hover:bg-white/10 hover:text-zinc-200" : "text-[#6e6b5e] hover:text-[#191919] hover:bg-black/5"}`,
                                title: "New Tab (Ctrl+T)",
                                children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "currentColor",
                                    strokeWidth: "2.8",
                                    className: "w-3.5 h-3.5",
                                    children: /*#__PURE__*/ (0, React.createElement)("path", {
                                        strokeLinecap: "round",
                                        strokeLinejoin: "round",
                                        d: "M12 4.5v15m7.5-7.5h-15"
                                    })
                                })
                            }),
                                    /*#__PURE__*/ (0, React.createElement)("button", {
                                key: "k3115_1_41",
                                onClick: () => setIsTabMenuOpen(!isTabMenuOpen),
                                className: `p-1 rounded-lg transition-all active:scale-95 ml-0.5 ${activeTab.isIncognito ? "text-zinc-400 hover:bg-white/10 hover:text-zinc-200" : "text-[#6e6b5e] hover:text-[#191919] hover:bg-black/5"}`,
                                title: "Tab Actions Menu",
                                children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "currentColor",
                                    strokeWidth: "2.5",
                                    className: "w-3.5 h-3.5",
                                    children: /*#__PURE__*/ (0, React.createElement)("path", {
                                        strokeLinecap: "round",
                                        strokeLinejoin: "round",
                                        d: "M19.5 8.25l-7.5 7.5-7.5-7.5"
                                    })
                                })
                            }),
                                isTabMenuOpen && /*#__PURE__*/ (0, React.createElement)(React.Fragment, {
                                    key: "k3115_2_42",
                                    children: [
                                            /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: "k3155_0_43",
                                        className: "fixed inset-0 z-[998]",
                                        onClick: () => setIsTabMenuOpen(false)
                                    }),
                                            /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: "k3155_1_44",
                                        className: "absolute left-0 top-full mt-1.5 w-60 bg-[#202221] border border-zinc-800 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-[999] py-1.5 flex flex-col font-sans text-[13px] text-zinc-300 animate-in fade-in slide-in-from-top-2 duration-150 select-none",
                                        children: [
                                                    // New Tab
                                                    /*#__PURE__*/ (0, React.createElement)("button", {
                                            key: "k3161_0_45",
                                            onClick: () => {
                                                handleNewTab();
                                                setIsTabMenuOpen(false);
                                            },
                                            className: "px-3.5 py-2 hover:bg-zinc-800 text-left text-zinc-200 transition-colors flex items-center justify-between",
                                            children: [
                                                            /*#__PURE__*/ (0, React.createElement)("span", {
                                                key: "k3165_0_53",
                                                className: "flex items-center gap-2.5 font-medium",
                                                children: [
                                                                    /*#__PURE__*/ (0, React.createElement)("svg", {
                                                    key: "k3172_0_55",
                                                    viewBox: "0 0 24 24",
                                                    fill: "none",
                                                    stroke: "currentColor",
                                                    strokeWidth: "2.2",
                                                    className: "w-4 h-4 text-zinc-400",
                                                    children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        d: "M12 4.5v15m7.5-7.5h-15"
                                                    })
                                                }),
                                                    "New tab"
                                                ]
                                            }),
                                                            /*#__PURE__*/ (0, React.createElement)("span", {
                                                key: "k3165_1_54",
                                                className: "text-[11px] text-zinc-500 font-medium",
                                                children: "Ctrl+T"
                                            })
                                            ]
                                        }),
                                                    // New Window
                                                    /*#__PURE__*/ (0, React.createElement)("button", {
                                            key: "k3161_1_46",
                                            onClick: () => {
                                                handleNewTab(); // fallback
                                                setIsTabMenuOpen(false);
                                                try {
                                                    const { ipcRenderer } = window.require("electron");
                                                    ipcRenderer.send("create-new-window");
                                                } catch (e) { }
                                            },
                                            className: "px-3.5 py-2 hover:bg-zinc-800 text-left text-zinc-200 transition-colors flex items-center justify-between",
                                            children: [
                                                            /*#__PURE__*/ (0, React.createElement)("span", {
                                                key: "k3197_0_56",
                                                className: "flex items-center gap-2.5 font-medium",
                                                children: [
                                                                    /*#__PURE__*/ (0, React.createElement)("svg", {
                                                    key: "k3208_0_58",
                                                    viewBox: "0 0 24 24",
                                                    fill: "none",
                                                    stroke: "currentColor",
                                                    strokeWidth: "2",
                                                    className: "w-4 h-4 text-zinc-400",
                                                    children: [
                                                                            /*#__PURE__*/ (0, React.createElement)("rect", {
                                                        key: "k3211_0_59",
                                                        x: "3",
                                                        y: "3",
                                                        width: "18",
                                                        height: "18",
                                                        rx: "2"
                                                    }),
                                                                            /*#__PURE__*/ (0, React.createElement)("path", {
                                                        key: "k3211_1_60",
                                                        d: "M9 3v18M3 9h18"
                                                    })
                                                    ]
                                                }),
                                                    "New window"
                                                ]
                                            }),
                                                            /*#__PURE__*/ (0, React.createElement)("span", {
                                                key: "k3197_1_57",
                                                className: "text-[11px] text-zinc-500 font-medium",
                                                children: "Ctrl+N"
                                            })
                                            ]
                                        }),
                                                    // New Incognito window
                                                    /*#__PURE__*/ (0, React.createElement)("button", {
                                            key: "k3161_2_47",
                                            onClick: () => {
                                                handleNewIncognitoTab();
                                                setIsTabMenuOpen(false);
                                            },
                                            className: "px-3.5 py-2 hover:bg-zinc-800 text-left text-zinc-200 transition-colors flex items-center justify-between",
                                            children: [
                                                            /*#__PURE__*/ (0, React.createElement)("span", {
                                                key: "k3240_0_61",
                                                className: "flex items-center gap-2.5 font-medium",
                                                children: [
                                                    renderIncognitoIcon("w-4 h-4 text-[#fc4b01]"),
                                                    "New incognito window"
                                                ]
                                            }),
                                                            /*#__PURE__*/ (0, React.createElement)("span", {
                                                key: "k3240_1_62",
                                                className: "text-[11px] text-zinc-500 font-medium",
                                                children: "Ctrl+Shift+N"
                                            })
                                            ]
                                        }),
                                                    // Add split view
                                                    /*#__PURE__*/ (0, React.createElement)("button", {
                                            key: "k3161_3_48",
                                            onClick: () => {
                                                if (!isSplitView) {
                                                    if (tabs.length === 1) {
                                                        const newId = `tab-${Date.now()}`;
                                                        const newTab = {
                                                            id: newId,
                                                            url: "https://www.google.com",
                                                            initialUrl: "https://www.google.com",
                                                            title: "Google",
                                                            isLoading: false,
                                                            canGoBack: false,
                                                            canGoForward: false
                                                        };
                                                        setTabs((prev) => [
                                                            ...prev,
                                                            newTab
                                                        ]);
                                                        setSplitTabId(newId);
                                                    } else {
                                                        const otherTab = tabs.find(t => t.id !== activeTabId);
                                                        if (otherTab) setSplitTabId(otherTab.id);
                                                    }
                                                }
                                                setIsSplitView(!isSplitView);
                                                setIsTabMenuOpen(false);
                                            },
                                            className: "px-3.5 py-2 hover:bg-zinc-800 text-left text-zinc-200 transition-colors flex items-center justify-between",
                                            children: /*#__PURE__*/ (0, React.createElement)("span", {
                                                className: "flex items-center gap-2.5 font-medium",
                                                children: [
                                                                /*#__PURE__*/ (0, React.createElement)("svg", {
                                                    key: "k3289_0_63",
                                                    viewBox: "0 0 24 24",
                                                    fill: "none",
                                                    stroke: "currentColor",
                                                    strokeWidth: "2.2",
                                                    className: "w-4 h-4 text-zinc-400",
                                                    children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        d: "M9 4.5v15m6-15v15M3 9h18"
                                                    })
                                                }),
                                                    isSplitView ? "Remove split view" : "Add split view"
                                                ]
                                            })
                                        }),
                                                    /*#__PURE__*/ (0, React.createElement)("hr", {
                                            key: "k3161_4_49",
                                            className: "border-zinc-800 my-1.5"
                                        }),
                                                    // Search tabs
                                                    /*#__PURE__*/ (0, React.createElement)("button", {
                                            key: "k3161_5_50",
                                            onClick: () => {
                                                setIsSearchTabsOpen(true);
                                                setIsTabMenuOpen(false);
                                                setTabSearchQuery("");
                                            },
                                            className: "px-3.5 py-2 hover:bg-zinc-800 text-left text-zinc-200 transition-colors flex items-center justify-between",
                                            children: [
                                                            /*#__PURE__*/ (0, React.createElement)("span", {
                                                key: "k3312_0_64",
                                                className: "flex items-center gap-2.5 font-medium",
                                                children: [
                                                                    /*#__PURE__*/ (0, React.createElement)("svg", {
                                                    key: "k3320_0_66",
                                                    viewBox: "0 0 24 24",
                                                    fill: "none",
                                                    stroke: "currentColor",
                                                    strokeWidth: "2.2",
                                                    className: "w-4 h-4 text-zinc-400",
                                                    children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        d: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                                                    })
                                                }),
                                                    "Search tabs"
                                                ]
                                            }),
                                                            /*#__PURE__*/ (0, React.createElement)("span", {
                                                key: "k3312_1_65",
                                                className: "text-[11px] text-zinc-500 font-medium",
                                                children: "Ctrl+Shift+A"
                                            })
                                            ]
                                        }),
                                                    /*#__PURE__*/ (0, React.createElement)("hr", {
                                            key: "k3161_6_51",
                                            className: "border-zinc-800 my-1.5"
                                        }),
                                                    // Tab groups
                                                    /*#__PURE__*/ (0, React.createElement)("button", {
                                            key: "k3161_7_52",
                                            onClick: () => {
                                                setIsTabMenuOpen(false);
                                            },
                                            className: "px-3.5 py-2 hover:bg-zinc-800 text-left text-zinc-200 transition-colors flex items-center justify-between group",
                                            children: [
                                                            /*#__PURE__*/ (0, React.createElement)("span", {
                                                key: "k3348_0_67",
                                                className: "flex items-center gap-2.5 font-medium",
                                                children: [
                                                                    /*#__PURE__*/ (0, React.createElement)("svg", {
                                                    key: "k3354_0_69",
                                                    viewBox: "0 0 24 24",
                                                    fill: "none",
                                                    stroke: "currentColor",
                                                    strokeWidth: "2",
                                                    className: "w-4 h-4 text-zinc-400",
                                                    children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        d: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                                                    })
                                                }),
                                                    "Tab groups"
                                                ]
                                            }),
                                                            /*#__PURE__*/ (0, React.createElement)("svg", {
                                                key: "k3348_1_68",
                                                viewBox: "0 0 24 24",
                                                fill: "none",
                                                stroke: "currentColor",
                                                strokeWidth: "2.5",
                                                className: "w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition-colors",
                                                children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    d: "M8.25 4.5l7.5 7.5-7.5 7.5"
                                                })
                                            })
                                            ]
                                        })
                                        ]
                                    })
                                    ]
                                })
                            ]
                        })
                    ]
                })
            }),
                    /*#__PURE__*/ (0, React.createElement)("div", {
                key: "k2973_1_25",
                className: `flex items-center gap-3 h-[44px] -mx-2 -mb-2 px-2.5 relative z-10 transition-colors duration-150 ${activeTab.isIncognito ? "bg-[#18191a]" : "bg-[#f9f8f6]"}`,
                style: {
                    WebkitAppRegion: "no-drag"
                },
                children: [
                            /*#__PURE__*/ (0, React.createElement)("div", {
                    key: "k3395_0_70",
                    className: "flex items-center gap-1.5 shrink-0",
                    children: [
                                    /*#__PURE__*/ (0, React.createElement)("button", {
                        key: "k3401_0_73",
                        disabled: !activeTab.canGoBack,
                        onClick: handleGoBack,
                        className: `p-1.5 rounded-lg nav-btn-hover transition-colors ${activeTab.canGoBack ? (activeTab.isIncognito ? "text-zinc-200 hover:bg-white/10" : "text-[#191919]") : (activeTab.isIncognito ? "text-zinc-700/40 cursor-not-allowed opacity-30" : "text-[#b1ada1] cursor-not-allowed opacity-50")}`,
                        children: /*#__PURE__*/ (0, React.createElement)("svg", {
                            xmlns: "http://www.w3.org/2000/svg",
                            fill: "none",
                            viewBox: "0 0 24 24",
                            strokeWidth: 2.5,
                            stroke: "currentColor",
                            className: "w-4 h-4",
                            children: /*#__PURE__*/ (0, React.createElement)("path", {
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                d: "M15.75 19.5L8.25 12l7.5-7.5"
                            })
                        })
                    }),
                                    /*#__PURE__*/ (0, React.createElement)("button", {
                        key: "k3401_1_74",
                        disabled: !activeTab.canGoForward,
                        onClick: handleGoForward,
                        className: `p-1.5 rounded-lg nav-btn-hover transition-colors ${activeTab.canGoForward ? (activeTab.isIncognito ? "text-zinc-200 hover:bg-white/10" : "text-[#191919]") : (activeTab.isIncognito ? "text-zinc-700/40 cursor-not-allowed opacity-30" : "text-[#b1ada1] cursor-not-allowed opacity-50")}`,
                        children: /*#__PURE__*/ (0, React.createElement)("svg", {
                            xmlns: "http://www.w3.org/2000/svg",
                            fill: "none",
                            viewBox: "0 0 24 24",
                            strokeWidth: 2.5,
                            stroke: "currentColor",
                            className: "w-4 h-4",
                            children: /*#__PURE__*/ (0, React.createElement)("path", {
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                d: "M8.25 4.5l7.5 7.5-7.5 7.5"
                            })
                        })
                    }),
                                    /*#__PURE__*/ (0, React.createElement)("button", {
                        key: "k3401_2_75",
                        onClick: handleReload,
                        className: `p-1.5 rounded-lg nav-btn-hover transition-colors ${activeTab.isIncognito ? "text-zinc-200 hover:bg-white/10" : "text-[#191919]"}`,
                        children: activeTab.isLoading ? /*#__PURE__*/ (0, React.createElement)("svg", {
                            xmlns: "http://www.w3.org/2000/svg",
                            fill: "none",
                            viewBox: "0 0 24 24",
                            strokeWidth: 2.5,
                            stroke: "currentColor",
                            className: "w-4 h-4 text-[#fc4b01] animate-spin",
                            children: /*#__PURE__*/ (0, React.createElement)("path", {
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                d: "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                            })
                        }) : /*#__PURE__*/ (0, React.createElement)("svg", {
                            xmlns: "http://www.w3.org/2000/svg",
                            fill: "none",
                            viewBox: "0 0 24 24",
                            strokeWidth: 2.5,
                            stroke: "currentColor",
                            className: "w-4 h-4",
                            children: /*#__PURE__*/ (0, React.createElement)("path", {
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                d: "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                            })
                        })
                    }),
                                    /*#__PURE__*/ (0, React.createElement)("button", {
                        key: "k3401_3_76",
                        onClick: handleGoHome,
                        className: `p-1.5 rounded-lg nav-btn-hover transition-colors ${activeTab.isIncognito ? "text-zinc-200 hover:bg-white/10" : "text-[#191919]"}`,
                        children: /*#__PURE__*/ (0, React.createElement)("svg", {
                            xmlns: "http://www.w3.org/2000/svg",
                            fill: "none",
                            viewBox: "0 0 24 24",
                            strokeWidth: 2,
                            stroke: "currentColor",
                            className: "w-4 h-4",
                            children: /*#__PURE__*/ (0, React.createElement)("path", {
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                d: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                            })
                        })
                    })
                    ]
                }),
                            /*#__PURE__*/ (0, React.createElement)("form", {
                    key: "k3395_1_71",
                    onSubmit: (e) => {
                        e.preventDefault();
                        navigateTab(inputUrl);
                        addToHistory(inputUrl);
                        setShowSuggestions(false);
                    },
                    onDragEnter: (e: any) => {
                        e.preventDefault();
                        setIsDraggingOverUrl(true);
                    },
                    onDragOver: (e: any) => {
                        e.preventDefault();
                        setIsDraggingOverUrl(true);
                        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
                    },
                    onDragLeave: (e: any) => {
                        e.preventDefault();
                        if (e.currentTarget && !e.currentTarget.contains(e.relatedTarget)) {
                            setIsDraggingOverUrl(false);
                        }
                    },
                    onDrop: (e: any) => {
                        e.preventDefault();
                        setIsDraggingOverUrl(false);
                        const dropped = extractDroppedUrl(e);
                        if (dropped) {
                            setInputUrl(dropped);
                            navigateTab(dropped);
                            addToHistory(dropped);
                            setShowSuggestions(false);
                        }
                    },
                    className: `relative flex-1 flex items-center transition-all duration-150 gap-2 border rounded-full px-3 py-1.5 ${activeTab.isIncognito
                        ? "bg-[#121314]/85 hover:bg-[#121314] border-zinc-800 focus-within:border-[#fc4b01] focus-within:bg-[#121314]"
                        : "bg-white/90 hover:bg-white border-[#e3e0d5] focus-within:border-[#fc4b01] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#fc4b01]/20 claude-shadow-input"
                        }`,
                    children: [
                        activeTab.isIncognito ? renderIncognitoIcon("w-3.5 h-3.5 text-[#fc4b01] shrink-0") : (inputUrl.startsWith("https://") ? /*#__PURE__*/ (0, React.createElement)("svg", {
                            key: "k3488_0_f_t_77",
                            xmlns: "http://www.w3.org/2000/svg",
                            viewBox: "0 0 24 24",
                            fill: "currentColor",
                            className: "w-3.5 h-3.5 text-emerald-600",
                            children: /*#__PURE__*/ (0, React.createElement)("path", {
                                fillRule: "evenodd",
                                d: "M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z",
                                clipRule: "evenodd"
                            })
                        }) : /*#__PURE__*/ (0, React.createElement)("div", {
                            key: "k3488_0_f_f_78",
                            className: "w-[26px] h-[26px] rounded-full border border-[#e3e0d5]/80 flex items-center justify-center overflow-hidden shrink-0",
                            children: /*#__PURE__*/ (0, React.createElement)("img", {
                                src: "/google.png",
                                alt: "Google",
                                className: "w-[18px] h-[18px] object-contain"
                            })
                        })),
                                    /*#__PURE__*/ (0, React.createElement)("input", {
                            key: "k3488_1_79",
                            type: "text",
                            ref: inputRef,
                            value: inputUrl,
                            className: `bg-transparent flex-1 outline-none text-xs font-sans transition-all ${activeTab.isIncognito ? "text-zinc-100 placeholder-zinc-500" : "text-[#191919] placeholder-[#8c8877]"
                                }`,
                            onFocus: () => {
                                setShowSuggestions(true);
                                setSelectedSuggestionIndex(-1);
                                setOriginalQuery("");
                            },
                            onBlur: () => {
                                setTimeout(() => setShowSuggestions(false), 200);
                            },
                            onKeyDown: (e) => {
                                const isDelete = e.key === "Backspace" || e.key === "Delete";
                                isDeletingRef.current = isDelete;
                                if (displaySuggestions.length === 0) return;
                                if (e.key === "ArrowDown") {
                                    e.preventDefault();
                                    setShowSuggestions(true);
                                    let nextIndex = selectedSuggestionIndex + 1;
                                    if (nextIndex >= displaySuggestions.length) {
                                        nextIndex = -1;
                                    }
                                    setSelectedSuggestionIndex(nextIndex);
                                    if (nextIndex === -1) {
                                        setInputUrl(originalQuery || inputUrl);
                                    } else {
                                        if (selectedSuggestionIndex === -1) {
                                            setOriginalQuery(inputUrl);
                                        }
                                        const item = displaySuggestions[nextIndex];
                                        setInputUrl(item.type === "history-url" ? item.url || "" : item.text || "");
                                    }
                                } else if (e.key === "ArrowUp") {
                                    e.preventDefault();
                                    setShowSuggestions(true);
                                    let nextIndex = selectedSuggestionIndex - 1;
                                    if (nextIndex < -1) {
                                        nextIndex = displaySuggestions.length - 1;
                                    }
                                    setSelectedSuggestionIndex(nextIndex);
                                    if (nextIndex === -1) {
                                        setInputUrl(originalQuery || inputUrl);
                                    } else {
                                        if (selectedSuggestionIndex === -1) {
                                            setOriginalQuery(inputUrl);
                                        }
                                        const item = displaySuggestions[nextIndex];
                                        setInputUrl(item.type === "history-url" ? item.url || "" : item.text || "");
                                    }
                                } else if (e.key === "Escape") {
                                    setShowSuggestions(false);
                                    setSelectedSuggestionIndex(-1);
                                    if (originalQuery) {
                                        setInputUrl(originalQuery);
                                        setOriginalQuery("");
                                    }
                                }
                            },
                            onChange: (e) => {
                                const val = e.target.value;
                                setInputUrl(val);
                                setSelectedSuggestionIndex(-1);
                                setOriginalQuery("");
                                handleAutocomplete(val, e.target);
                            },
                            placeholder: "Search Google or type a web address",
                            className: "flex-1 bg-transparent text-xs text-[#191919] outline-none border-none placeholder:text-zinc-400 font-sans"
                        }),
                        showSuggestions && displaySuggestions.length > 0 && /*#__PURE__*/ (0, React.createElement)("div", {
                            key: "k3488_2_80",
                            className: `absolute left-0 right-0 top-full mt-2 border rounded-2xl shadow-xl z-[999] overflow-hidden py-1.5 flex flex-col font-sans text-xs animate-in fade-in slide-in-from-top-1 duration-150 ${activeTab.isIncognito ? "bg-[#202221] border-zinc-800 text-zinc-300" : "bg-[#f9f8f6] border-[#e3e0d5] text-[#191919]"}`,
                            children: displaySuggestions.map((item, index) => {
                                const isSelected = selectedSuggestionIndex === index;
                                return /*#__PURE__*/ (0, React.createElement)("div", {
                                    key: item.key || `sug-${index}`,
                                    onClick: () => handleSelectSuggestion(item),
                                    onMouseEnter: () => setSelectedSuggestionIndex(index),
                                    className: `px-4 py-2 flex items-center gap-3 cursor-pointer transition-colors ${isSelected ? (activeTab.isIncognito ? "bg-white/10 text-white" : "bg-black/5") : (activeTab.isIncognito ? "hover:bg-white/10 hover:text-white" : "hover:bg-black/5")}`,
                                    children: [
                                                    /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: "k3595_0_81",
                                        className: "shrink-0 flex items-center justify-center w-5 h-5 text-[#6e6b5e]",
                                        children: [
                                            item.type === "default-search" && (() => {
                                                const trimmed = item.text.trim();
                                                const isUrlPattern = /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(trimmed) && !trimmed.includes(" ");
                                                if (isUrlPattern) {
                                                    const domain = trimmed.replace(/^https?:\/\//i, "").split("/")[0];
                                                    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                                                    return /*#__PURE__*/ (0, React.createElement)("img", {
                                                        key: "favicon-img-" + domain,
                                                        src: faviconUrl,
                                                        alt: "",
                                                        className: "w-4 h-4 rounded-sm object-contain",
                                                        onError: (e) => {
                                                            e.target.style.display = "none";
                                                        }
                                                    });
                                                }
                                                return /*#__PURE__*/ (0, React.createElement)("svg", {
                                                    key: "search-icon",
                                                    xmlns: "http://www.w3.org/2000/svg",
                                                    viewBox: "0 0 24 24",
                                                    fill: "currentColor",
                                                    className: "w-4 h-4 text-[#fc4b01]",
                                                    children: [
                                                                        /*#__PURE__*/ (0, React.createElement)("path", {
                                                        key: "k3619_0_87",
                                                        d: "M8.25 10.875a2.625 2.625 0 115.25 0 2.625 2.625 0 01-5.25 0z"
                                                    }),
                                                                        /*#__PURE__*/ (0, React.createElement)("path", {
                                                        key: "k3619_1_88",
                                                        fillRule: "evenodd",
                                                        d: "M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.125 4.5a4.125 4.125 0 102.25 0v2.73a5.61 5.61 0 00-2.25 0V6.75zM12 18.75a6.717 6.717 0 01-4.717-1.933A.75.75 0 017.8 15.75c1.233.917 2.766 1.5 4.2 1.5s2.967-.583 4.2-1.5a.75.75 0 01.517 1.067A6.717 6.717 0 0112 18.75z",
                                                        clipRule: "evenodd"
                                                    })
                                                    ]
                                                });
                                            })(),
                                            item.type === "search-query" && /*#__PURE__*/ (0, React.createElement)("svg", {
                                                key: "k3601_1_83",
                                                xmlns: "http://www.w3.org/2000/svg",
                                                fill: "none",
                                                viewBox: "0 0 24 24",
                                                strokeWidth: 2.2,
                                                stroke: "currentColor",
                                                className: "w-4 h-4",
                                                children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    d: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                                                })
                                            }),
                                            item.type === "history-search" && /*#__PURE__*/ (0, React.createElement)("svg", {
                                                key: "k3601_2_84",
                                                xmlns: "http://www.w3.org/2000/svg",
                                                fill: "none",
                                                viewBox: "0 0 24 24",
                                                strokeWidth: 2.2,
                                                stroke: "currentColor",
                                                className: "w-4 h-4",
                                                children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    d: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                                                })
                                            }),
                                            item.type === "history-url" && (item.favicon ? /*#__PURE__*/ (0, React.createElement)("img", {
                                                key: "k3601_3_t_85",
                                                src: item.favicon,
                                                alt: "",
                                                className: "w-3.5 h-3.5 rounded-sm object-contain",
                                                onError: (e) => {
                                                    e.target.style.display = 'none';
                                                }
                                            }) : /*#__PURE__*/ (0, React.createElement)("svg", {
                                                key: "k3601_3_f_86",
                                                xmlns: "http://www.w3.org/2000/svg",
                                                fill: "none",
                                                viewBox: "0 0 24 24",
                                                strokeWidth: 2,
                                                stroke: "currentColor",
                                                className: "w-4 h-4",
                                                children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    d: "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253"
                                                })
                                            }))
                                        ]
                                    }),
                                                    /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: "k3595_1_82",
                                        className: "flex-1 min-w-0 text-left truncate",
                                        children: [
                                            item.type === "default-search" && (() => {
                                                const trimmed = item.text.trim();
                                                const isUrlPattern = /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(trimmed) && !trimmed.includes(" ");
                                                if (isUrlPattern) {
                                                    return /*#__PURE__*/ (0, React.createElement)("span", {
                                                        key: "k3696_0_url",
                                                        className: `font-medium ${activeTab.isIncognito ? "text-zinc-200" : "text-[#191919]"}`,
                                                        children: item.text
                                                    });
                                                }
                                                return /*#__PURE__*/ (0, React.createElement)("span", {
                                                    key: "k3696_0_search",
                                                    className: `font-medium ${activeTab.isIncognito ? "text-zinc-200" : "text-[#191919]"}`,
                                                    children: [
                                                        item.text,
                                                        " ",
                                                                        /*#__PURE__*/ (0, React.createElement)("span", {
                                                            key: "k3696_2_91",
                                                            className: `font-normal ${activeTab.isIncognito ? "text-zinc-500" : "text-[#8c8877]"}`,
                                                            children: "— Google Search"
                                                        })
                                                    ]
                                                });
                                            })(),
                                            (item.type === "search-query" || item.type === "history-search") && /*#__PURE__*/ (0, React.createElement)("span", {
                                                key: "k3684_1_89",
                                                className: `font-medium ${activeTab.isIncognito ? "text-zinc-200" : "text-[#191919]"}`,
                                                children: item.text
                                            }),
                                            item.type === "history-url" && /*#__PURE__*/ (0, React.createElement)("span", {
                                                key: "k3684_2_90",
                                                className: `font-medium ${activeTab.isIncognito ? "text-zinc-200" : "text-[#191919]"}`,
                                                children: [
                                                    item.title,
                                                    " ",
                                                                    /*#__PURE__*/ (0, React.createElement)("span", {
                                                        key: "k3712_2_92",
                                                        className: `font-normal ${activeTab.isIncognito ? "text-zinc-500" : "text-[#8c8877]"}`,
                                                        children: [
                                                            "— ",
                                                            item.url
                                                        ]
                                                    })
                                                ]
                                            })
                                        ]
                                    })
                                    ]
                                });
                            })
                        })
                    ]
                }),
                            /*#__PURE__*/ (0, React.createElement)("div", {
                    key: "k3395_2_72",
                    className: "flex items-center gap-0.5 shrink-0",
                    children: [
                        activeTab.isIncognito && /*#__PURE__*/ (0, React.createElement)("div", {
                            key: "incognito-pill",
                            className: "flex items-center gap-1.5 px-3 py-1 bg-[#fc4b01]/15 border border-[#fc4b01]/30 rounded-full text-[10px] text-[#fc4b01] font-bold tracking-wide mr-2 select-none",
                            children: [
                                renderIncognitoIcon("w-3 h-3 text-[#fc4b01]"),
                                `Incognito (${tabs.filter(t => t.isIncognito).length})`
                            ]
                        }),
                        !activeTab.isIncognito && /*#__PURE__*/ (0, React.createElement)("button", {
                            key: "k3734_1_94",
                            onClick: () => setIsAssistantOpen(!isAssistantOpen),
                            className: `w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${isAssistantOpen ? "bg-[#fc4b01]/15 text-[#fc4b01]" : "text-[#6e6b5e] hover:bg-black/5 hover:text-[#191919]"
                                }`,
                            title: "Toggle Assistant",
                            children: /*#__PURE__*/ (0, React.createElement)("img", {
                                src: "/logo/brocus-logo.webp",
                                alt: "Brocus",
                                className: `w-4 h-4 object-contain select-none shrink-0 transition-all ${isAssistantOpen ? "" : "grayscale opacity-85"}`
                            })
                        }),
                                    /*#__PURE__*/ (0, React.createElement)("button", {
                            key: "k3734_2_95",
                            onClick: () => setIsToolsOpen(!isToolsOpen),
                            className: `w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${isToolsOpen
                                ? "bg-[#fc4b01]/15 text-[#fc4b01]"
                                : activeTab.isIncognito
                                    ? "text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                                    : "text-[#6e6b5e] hover:bg-black/5 hover:text-[#191919]"
                                }`,
                            title: "Toggle Macros & Autofills Panel",
                            children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                xmlns: "http://www.w3.org/2000/svg",
                                fill: "none",
                                viewBox: "0 0 24 24",
                                strokeWidth: 2,
                                stroke: "currentColor",
                                className: "w-5 h-5",
                                children: /*#__PURE__*/ (0, React.createElement)("path", {
                                    strokeLinecap: "round",
                                    strokeLinejoin: "round",
                                    d: "M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
                                })
                            })
                        }),
                            <button
                                key="k3734_3_96"
                                onClick={() => setIsDownloadsOpen(!isDownloadsOpen)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${isDownloadsOpen
                                    ? "bg-[#fc4b01]/15 text-[#fc4b01]"
                                    : currentDownloadPhase === "downloading"
                                        ? "bg-blue-500/15 text-blue-600"
                                        : currentDownloadPhase === "starting"
                                            ? "bg-sky-500/15 text-sky-600"
                                            : currentDownloadPhase === "paused"
                                                ? "bg-amber-500/15 text-amber-600"
                                                : currentDownloadPhase === "completed"
                                                    ? "bg-emerald-500/15 text-emerald-600"
                                                    : activeTab.isIncognito
                                                        ? "text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                                                        : "text-[#6e6b5e] hover:bg-black/5 hover:text-[#191919]"
                                    }`}
                                title={`Downloads (${currentDownloadPhase.toUpperCase()}) - Files save automatically to Downloads`}
                            >
                                {renderDownloadIcon()}
                            </button>,
                                    /*#__PURE__*/ (0, React.createElement)("button", {
                            key: "k3734_4_97",
                            onClick: () => setIsMenuOpen(!isMenuOpen),
                            className: `w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${isMenuOpen
                                ? activeTab.isIncognito
                                    ? "bg-white/10 text-zinc-200"
                                    : "bg-black/5 text-[#191919]"
                                : activeTab.isIncognito
                                    ? "text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                                    : "text-[#6e6b5e] hover:bg-black/5 hover:text-[#191919]"
                                }`,
                            children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                xmlns: "http://www.w3.org/2000/svg",
                                fill: "none",
                                viewBox: "0 0 24 24",
                                strokeWidth: 2.5,
                                stroke: "currentColor",
                                className: "w-5 h-5",
                                children: /*#__PURE__*/ (0, React.createElement)("path", {
                                    strokeLinecap: "round",
                                    strokeLinejoin: "round",
                                    d: "M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
                                })
                            })
                        })
                    ]
                })
                ]
            }),
                isProfileDropdownOpen && (
                    <React.Fragment key="chrome-profile-menu">
                        <div className="fixed inset-0 z-[998]" onClick={() => setIsProfileDropdownOpen(false)} />
                        <div className="absolute right-[46px] top-[74px] w-72 bg-[#f9f8f6]/95 backdrop-blur-md border border-[#e3e0d5] rounded-2xl shadow-xl z-[999] p-2 flex flex-col font-sans text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                            {(() => {
                                const AVATAR_COLORS = ["#fc4b01", "#4f6fd8", "#3d8b5f", "#8a5fbf", "#b8860b", "#357a8c"];
                                const colorFor = (s: string) =>
                                    AVATAR_COLORS[[...(s || "?")].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
                                const PAvatar = ({ p, cls }: { p: any; cls: string }) =>
                                    p?.avatar
                                        ? <img src={p.avatar} alt={p.name} className={`${cls} rounded-full shrink-0 object-cover`} />
                                        : <div className={`${cls} rounded-full shrink-0 flex items-center justify-center text-white font-bold`} style={{ backgroundColor: colorFor(p?.name || "?") }}>
                                            {(p?.name || "?").trim().charAt(0).toUpperCase()}
                                        </div>;
                                const MenuRow = ({ icon, label, onClick, sub }: { icon: React.ReactNode; label: string; onClick?: () => void; sub?: boolean }) => (
                                    <button
                                        onClick={onClick}
                                        disabled={!onClick}
                                        className={`w-full px-3.5 py-2.5 rounded-lg text-left text-[13px] font-medium flex items-center gap-3.5 transition-colors ${onClick ? "hover:bg-black/5 text-[#191919]" : "text-[#6e6b5e] cursor-default"}`}
                                    >
                                        <span className="w-4 h-4 flex items-center justify-center shrink-0 text-[#6e6b5e]">{icon}</span>
                                        <span className="truncate flex-1">{label}</span>
                                        {sub && <ChevronRight className={`w-3.5 h-3.5 text-[#8c8877] shrink-0 transition-transform ${isProfileSubmenuOpen ? "rotate-90" : ""}`} />}
                                    </button>
                                );
                                const launchChrome = (args?: string[]) => {
                                    try {
                                        const { ipcRenderer } = window.require("electron");
                                        ipcRenderer.invoke("launch-desktop-chrome", { args }).catch(() => { });
                                    } catch (e) { }
                                    setIsProfileDropdownOpen(false);
                                };

                                const active = profiles.find((p: any) => p.id === activeProfileId) || profiles[0];
                                const others = profiles.filter((p: any) => p.id !== active?.id);

                                return (<>
                                    {/* Hero card — active profile, Edge-style dark block */}
                                    {active && (
                                        <div className="relative rounded-xl bg-[#2b2b3a] px-4 py-5 mb-1.5 select-none overflow-hidden">
                                            {active.email && (
                                                <span className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[9px] font-medium text-zinc-300">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                                    Managed account
                                                </span>
                                            )}
                                            <div className="flex flex-col items-center pt-3">
                                                <PAvatar p={active} cls="w-16 h-16 text-2xl" />
                                                <span className="text-[15px] font-semibold text-white mt-2.5 truncate max-w-full">{active.name}</span>
                                                <span className="text-[11px] text-zinc-300 truncate max-w-full mt-0.5">{active.email || "Local profile"}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Account actions */}
                                    <MenuRow
                                        icon={<Key className="w-4 h-4" />}
                                        label="Passwords and autofill"
                                        onClick={() => { openNewTabWithUrl("https://passwords.google.com"); setIsProfileDropdownOpen(false); }}
                                    />
                                    <MenuRow
                                        icon={<User className="w-4 h-4" />}
                                        label="Profile settings"
                                        onClick={() => { setIsToolsOpen(true); setIsProfileDropdownOpen(false); }}
                                    />
                                    <MenuRow
                                        icon={<RefreshCw className="w-4 h-4" />}
                                        label="Sync is on"
                                    />

                                    <hr className="my-1.5 border-[#e3e0d5]" />

                                    {/* Expandable profile switcher */}
                                    <MenuRow
                                        icon={<Users className="w-4 h-4" />}
                                        label="Set up a new profile"
                                        onClick={() => setIsProfileSubmenuOpen(!isProfileSubmenuOpen)}
                                        sub
                                    />
                                    {isProfileSubmenuOpen && (
                                        <div className="mx-2 mb-1 rounded-lg bg-black/[0.03] border border-[#e3e0d5] py-1">
                                            {others.length > 0 ? others.map((p: any) => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => switchProfile(p.id)}
                                                    className="w-full px-3 py-1.5 rounded-lg text-left text-xs font-medium flex items-center gap-2.5 hover:bg-black/5 text-[#191919] transition-colors"
                                                >
                                                    <PAvatar p={p} cls="w-5 h-5 text-[9px]" />
                                                    <span className="truncate flex-1">{p.name}</span>
                                                    {p.email && <span className="text-[9px] text-[#8c8877] truncate max-w-[90px]">{p.email}</span>}
                                                </button>
                                            )) : (
                                                <div className="px-3 py-1.5 text-[10px] text-[#8c8877] italic">No other Chrome profiles</div>
                                            )}
                                            <button
                                                onClick={() => launchChrome()}
                                                className="w-full px-3 py-1.5 rounded-lg text-left text-xs font-medium flex items-center gap-2.5 hover:bg-black/5 text-[#6e6b5e] transition-colors"
                                            >
                                                <Plus className="w-4 h-4 shrink-0" />
                                                <span className="truncate">Add Chrome profile</span>
                                            </button>
                                        </div>
                                    )}
                                    <MenuRow
                                        icon={<Globe className="w-4 h-4" />}
                                        label="Browse as guest"
                                        onClick={() => { handleNewIncognitoTab(); setIsProfileDropdownOpen(false); }}
                                    />
                                </>);
                            })()}
                        </div>
                    </React.Fragment>
                ),
                isDownloadsOpen && (
                    <React.Fragment key="chrome-downloads-fragment">
                        <div
                            key="chrome-downloads-backdrop"
                            className="fixed inset-0 z-[998]"
                            onClick={() => setIsDownloadsOpen(false)}
                        />
                        <div
                            key="chrome-downloads-dropdown"
                            className="absolute right-12 top-[74px] w-[370px] max-h-[85vh] overflow-y-auto bg-[#f9f8f6]/95 backdrop-blur-md border border-[#e3e0d5] rounded-2xl shadow-2xl z-[999] p-4 flex flex-col font-sans text-xs select-none animate-in fade-in slide-in-from-top-2 duration-150"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-[#e3e0d5]">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-xl bg-[#fc4b01]/10 text-[#fc4b01] flex items-center justify-center font-bold">
                                        <Download className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[#191919] text-sm leading-none">Downloads</h3>
                                        <span className="text-[10px] text-[#8c8877]">
                                            Saved automatically to Downloads folder
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={async () => {
                                            try {
                                                const { ipcRenderer } = window.require("electron");
                                                await ipcRenderer.invoke("trigger-test-download");
                                            } catch (e) {
                                                const testItem = {
                                                    id: 'test_' + Date.now(),
                                                    filename: 'sample-archive.zip',
                                                    savePath: 'C:\\Users\\Downloads\\sample-archive.zip',
                                                    totalBytes: 15400000,
                                                    receivedBytes: 6200000,
                                                    startTime: Date.now(),
                                                    state: 'downloading',
                                                    speed: 2400000
                                                };
                                                setDownloads((prev) => [testItem, ...prev]);
                                            }
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg bg-[#fc4b01]/10 hover:bg-[#fc4b01]/20 text-[#fc4b01] text-[11px] font-semibold transition-all flex items-center gap-1"
                                        title="Simulate a test download to test phase animations"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" /> Test DL
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                const { ipcRenderer } = window.require("electron");
                                                await ipcRenderer.invoke("open-downloads-folder");
                                            } catch (e) { }
                                        }}
                                        className="p-1.5 rounded-lg text-[#6e6b5e] hover:bg-black/5 hover:text-[#191919] transition-all"
                                        title="Open Downloads Folder"
                                    >
                                        <Folder className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* List of Downloads */}
                            <div className="py-2 space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                                {downloads.length === 0 ? (
                                    <div className="py-8 text-center text-[#8c8877]">
                                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                        <p className="text-xs font-medium">No downloads yet</p>
                                        <p className="text-[10px] opacity-75 mt-0.5">Files download automatically to your Downloads folder</p>
                                    </div>
                                ) : (
                                    downloads.map((item) => {
                                        const percent = item.totalBytes > 0 ? Math.min(100, Math.round((item.receivedBytes / item.totalBytes) * 100)) : 0;
                                        const isDone = item.state === 'completed';
                                        const isPaused = item.state === 'paused';
                                        const isStarting = item.state === 'starting';

                                        return (
                                            <div key={item.id} className="p-3 bg-[#f0ede4] rounded-xl border border-[#e3e0d5] space-y-2 transition-all">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${isDone ? "bg-emerald-500/15 text-emerald-600" : isPaused ? "bg-amber-500/15 text-amber-600" : isStarting ? "bg-sky-500/15 text-sky-600" : "bg-blue-500/15 text-blue-600"}`}>
                                                            {isDone ? <CheckCircle2 className="w-4 h-4" /> : isPaused ? <Pause className="w-4 h-4" /> : isStarting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-semibold text-[#191919] truncate" title={item.filename}>
                                                                {item.filename}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-[10px] text-[#8c8877]">
                                                                <span>{formatBytes(item.receivedBytes)} / {formatBytes(item.totalBytes)}</span>
                                                                {item.speed ? <span>• {(item.speed / (1024 * 1024)).toFixed(1)} MB/s</span> : null}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {isDone ? (
                                                            <>
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            const { ipcRenderer } = window.require("electron");
                                                                            await ipcRenderer.invoke("open-download-item", item.savePath);
                                                                        } catch (e) { }
                                                                    }}
                                                                    className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-md hover:bg-emerald-700 transition-all"
                                                                >
                                                                    Open
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            const { ipcRenderer } = window.require("electron");
                                                                            await ipcRenderer.invoke("show-download-in-folder", item.savePath);
                                                                        } catch (e) { }
                                                                    }}
                                                                    className="p-1 text-[#6e6b5e] hover:bg-black/5 rounded-md"
                                                                    title="Show in Folder"
                                                                >
                                                                    <Folder className="w-3.5 h-3.5" />
                                                                </button>
                                                            </>
                                                        ) : isPaused ? (
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        const { ipcRenderer } = window.require("electron");
                                                                        await ipcRenderer.invoke("resume-download", item.id);
                                                                    } catch (e) {
                                                                        setDownloads((prev) => prev.map((d) => d.id === item.id ? { ...d, state: 'downloading', isPaused: false } : d));
                                                                    }
                                                                }}
                                                                className="p-1.5 bg-amber-500/15 text-amber-700 rounded-md hover:bg-amber-500/25 transition-all"
                                                                title="Resume Download"
                                                            >
                                                                <Play className="w-3.5 h-3.5" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        const { ipcRenderer } = window.require("electron");
                                                                        await ipcRenderer.invoke("pause-download", item.id);
                                                                    } catch (e) {
                                                                        setDownloads((prev) => prev.map((d) => d.id === item.id ? { ...d, state: 'paused', isPaused: true } : d));
                                                                    }
                                                                }}
                                                                className="p-1.5 bg-black/5 text-[#6e6b5e] rounded-md hover:bg-black/10 transition-all"
                                                                title="Pause Download"
                                                            >
                                                                <Pause className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Progress Bar */}
                                                {!isDone && (
                                                    <div className="w-full bg-black/10 h-1.5 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-300 ${isPaused ? "bg-amber-500" : isStarting ? "bg-sky-400 animate-pulse" : "bg-blue-600"}`}
                                                            style={{ width: `${percent}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Footer */}
                            {downloads.length > 0 && (
                                <div className="pt-2 border-t border-[#e3e0d5] flex items-center justify-between text-[11px]">
                                    <button
                                        onClick={() => setDownloads([])}
                                        className="text-[#8c8877] hover:text-[#191919] font-medium transition-colors"
                                    >
                                        Clear List
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                const { ipcRenderer } = window.require("electron");
                                                await ipcRenderer.invoke("open-downloads-folder");
                                            } catch (e) { }
                                        }}
                                        className="text-[#fc4b01] hover:underline font-bold"
                                    >
                                        Open Downloads Folder →
                                    </button>
                                </div>
                            )}
                        </div>
                    </React.Fragment>
                ),
                isMenuOpen && (
                    <React.Fragment key="chrome-app-menu-fragment">
                        <div
                            key="chrome-menu-backdrop"
                            className="fixed inset-0 z-[998]"
                            onClick={() => setIsMenuOpen(false)}
                        />
                        <div
                            key="chrome-menu-dropdown"
                            className="absolute right-2 top-[74px] w-[290px] max-h-[85vh] overflow-y-auto bg-[#f9f8f6] border border-[#e3e0d5] rounded-2xl shadow-2xl z-[999] py-2 flex flex-col font-sans text-xs select-none"
                        >
                            {/* SECTION 1: TABS & WINDOWS */}
                            <button
                                key="m-new-tab"
                                onClick={() => { handleNewTab(); setIsMenuOpen(false); }}
                                className="px-3.5 py-2 hover:bg-black/5 text-left text-[#191919] font-medium transition-colors flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2.5">
                                    <Plus className="w-4 h-4 text-zinc-600 shrink-0" />
                                    New tab
                                </span>
                                <span className="text-[10px] text-[#8c8877] font-sans">Ctrl+T</span>
                            </button>

                            <button
                                key="m-new-window"
                                onClick={() => { handleNewTab(); setIsMenuOpen(false); }}
                                className="px-3.5 py-2 hover:bg-black/5 text-left text-[#191919] font-medium transition-colors flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2.5">
                                    <Maximize2 className="w-4 h-4 text-zinc-600 shrink-0" />
                                    New window
                                </span>
                                <span className="text-[10px] text-[#8c8877] font-sans">Ctrl+N</span>
                            </button>

                            <button
                                key="m-new-incognito"
                                onClick={() => { handleNewIncognitoTab(); setIsMenuOpen(false); }}
                                className="px-3.5 py-2 hover:bg-black/5 text-left text-[#191919] font-medium transition-colors flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2.5">
                                    {renderIncognitoIcon("w-4 h-4 text-[#fc4b01] shrink-0")}
                                    New Incognito window
                                </span>
                                <span className="text-[10px] text-[#8c8877] font-sans">Ctrl+Shift+N</span>
                            </button>

                            <hr key="m-hr-1" className="my-1.5 border-[#e3e0d5]" />

                            {/* SECTION 2: PROFILE CARD */}
                            {(() => {
                                const activeProfile = profiles.find((p: any) => p.id === activeProfileId) || profiles[0] || { name: "Developer", color: "#3399ff" };
                                return (
                                    <div
                                        key="m-profile-card"
                                        onClick={() => {
                                            setIsProfileDropdownOpen(!isProfileDropdownOpen);
                                            setIsMenuOpen(false);
                                        }}
                                        className="mx-2 my-1 px-3 py-2 bg-[#eae7df] hover:bg-[#e2decb] rounded-xl flex items-center justify-between cursor-pointer transition-all border border-[#d8d4c5]"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            {activeProfile.avatar ? (
                                                <img
                                                    src={activeProfile.avatar}
                                                    alt={activeProfile.name}
                                                    className="w-7 h-7 rounded-full shrink-0 object-cover shadow-xs"
                                                />
                                            ) : (
                                                <div
                                                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs"
                                                    style={{ backgroundColor: activeProfile.color || "#fc4b01" }}
                                                >
                                                    {activeProfile.name ? activeProfile.name.charAt(0).toUpperCase() : "D"}
                                                </div>
                                            )}
                                            <span className="text-xs font-bold text-[#191919] truncate max-w-[90px]">
                                                {activeProfile.name || "Developer"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {userEmail ? (
                                                <span className="px-2.5 py-0.5 rounded-full bg-[#fce8e6] text-[#fc4b01] text-[10px] font-bold border border-[#fc4b01]/20 flex items-center gap-1 truncate max-w-[100px]" title={userEmail}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                    {userEmail}
                                                </span>
                                            ) : (
                                                <button
                                                    key="m-login-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const email = prompt("Enter your email address to sign in:");
                                                        if (email && email.trim()) {
                                                            setUserEmail(email.trim());
                                                            try { localStorage.setItem("antigravity_user_email", email.trim()); } catch (err) { }
                                                        }
                                                    }}
                                                    className="px-2.5 py-1 rounded-full bg-[#fc4b01] hover:bg-[#a34b2c] text-white text-[10px] font-bold shadow-xs transition-all active:scale-95"
                                                >
                                                    Login
                                                </button>
                                            )}
                                            <ChevronRight className="w-3.5 h-3.5 text-[#8c8877] shrink-0" />
                                        </div>
                                    </div>
                                );
                            })()}

                            <hr key="m-hr-2" className="my-1.5 border-[#e3e0d5]" />

                            {/* SECTION 3: PASSWORDS, HISTORY, DOWNLOADS, BOOKMARKS, ETC. */}
                            <button
                                key="m-autofill"
                                onClick={() => { setIsToolsOpen(true); setIsMenuOpen(false); }}
                                className="px-3.5 py-2 hover:bg-black/5 text-left text-[#191919] font-medium transition-colors flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2.5">
                                    <Key className="w-4 h-4 text-zinc-600 shrink-0" />
                                    Passwords and autofill
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-[#8c8877]" />
                            </button>

                            <button
                                key="m-history"
                                onClick={() => { navigateTab("about:history"); setIsMenuOpen(false); }}
                                className="px-3.5 py-2 hover:bg-black/5 text-left text-[#191919] font-medium transition-colors flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2.5">
                                    <Clock className="w-4 h-4 text-zinc-600 shrink-0" />
                                    History
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-[#8c8877]" />
                            </button>

                            <button
                                key="m-downloads"
                                onClick={() => { setIsToolsOpen(true); setIsMenuOpen(false); }}
                                className="px-3.5 py-2 hover:bg-black/5 text-left text-[#191919] font-medium transition-colors flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2.5">
                                    <Download className="w-4 h-4 text-zinc-600 shrink-0" />
                                    Downloads
                                </span>
                                <span className="text-[10px] text-[#8c8877] font-sans">Ctrl+J</span>
                            </button>

                            <button
                                key="m-bookmarks"
                                onClick={() => { setIsMenuOpen(false); }}
                                className="px-3.5 py-2 hover:bg-black/5 text-left text-[#191919] font-medium transition-colors flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2.5">
                                    <Star className="w-4 h-4 text-zinc-600 shrink-0" />
                                    Bookmarks and lists
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-[#8c8877]" />
                            </button>

                            <button
                                key="m-tab-groups"
                                onClick={() => { setIsMenuOpen(false); }}
                                className="px-3.5 py-2 hover:bg-black/5 text-left text-[#191919] font-medium transition-colors flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2.5">
                                    <LayoutGrid className="w-4 h-4 text-zinc-600 shrink-0" />
                                    Tab groups
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-[#8c8877]" />
                            </button>

                            <button
                                key="m-extensions"
                                onClick={() => { setIsToolsOpen(true); setIsMenuOpen(false); }}
                                className="px-3.5 py-2 hover:bg-black/5 text-left text-[#191919] font-medium transition-colors flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2.5">
                                    <Puzzle className="w-4 h-4 text-zinc-600 shrink-0" />
                                    Extensions
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-[#8c8877]" />
                            </button>

                            <button
                                key="m-delete-data"
                                onClick={() => { handleClearSession(); setIsMenuOpen(false); }}
                                className="px-3.5 py-2 hover:bg-black/5 text-left text-[#191919] font-medium transition-colors flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2.5">
                                    <Trash2 className="w-4 h-4 text-zinc-600 shrink-0" />
                                    Delete browsing data...
                                </span>
                                <span className="text-[10px] text-[#8c8877] font-sans">Ctrl+Shift+Del</span>
                            </button>

                            <hr key="m-hr-3" className="my-1.5 border-[#e3e0d5]" />

                            {/* SECTION 4: ZOOM CONTROLS */}
                            <div key="m-zoom-row" className="px-3.5 py-1.5 flex items-center justify-between text-xs text-[#191919]">
                                <span className="flex items-center gap-2.5 font-medium">
                                    <Search className="w-4 h-4 text-zinc-600 shrink-0" />
                                    Zoom
                                </span>
                                <div className="flex items-center gap-1 bg-[#eae7df] border border-[#d8d4c5] rounded-full px-1 py-0.5">
                                    <button
                                        key="m-zoom-out"
                                        onClick={() => {
                                            const next = Math.max(50, zoomLevel - 10);
                                            setZoomLevel(next);
                                            try {
                                                const webview = document.getElementById(`webview-${activeTabId}`) as any;
                                                if (webview && typeof webview.setZoomFactor === 'function') {
                                                    webview.setZoomFactor(next / 100);
                                                }
                                            } catch (e) { }
                                        }}
                                        className="w-6 h-6 rounded-full hover:bg-black/10 flex items-center justify-center text-zinc-700 font-bold transition-colors"
                                        title="Zoom out"
                                    >
                                        -
                                    </button>
                                    <span className="px-2 text-[11px] font-bold text-zinc-800 min-w-[36px] text-center">
                                        {zoomLevel}%
                                    </span>
                                    <button
                                        key="m-zoom-in"
                                        onClick={() => {
                                            const next = Math.min(200, zoomLevel + 10);
                                            setZoomLevel(next);
                                            try {
                                                const webview = document.getElementById(`webview-${activeTabId}`) as any;
                                                if (webview && typeof webview.setZoomFactor === 'function') {
                                                    webview.setZoomFactor(next / 100);
                                                }
                                            } catch (e) { }
                                        }}
                                        className="w-6 h-6 rounded-full hover:bg-black/10 flex items-center justify-center text-zinc-700 font-bold transition-colors"
                                        title="Zoom in"
                                    >
                                        +
                                    </button>
                                    <div className="w-[1px] h-3.5 bg-[#c1ada1] mx-0.5" />
                                    <button
                                        key="m-fullscreen"
                                        onClick={() => {
                                            if (!document.fullscreenElement) {
                                                document.documentElement.requestFullscreen().catch(() => { });
                                            } else {
                                                document.exitFullscreen().catch(() => { });
                                            }
                                        }}
                                        className="w-6 h-6 rounded-full hover:bg-black/10 flex items-center justify-center text-zinc-700 transition-colors"
                                        title="Toggle Fullscreen"
                                    >
                                        <Maximize2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>

                            <hr key="m-hr-4" className="my-1.5 border-[#e3e0d5]" />

                            {/* SECTION 5: PRINT, GEMINI, LENS, TRANSLATE, ETC. */}
                            <button
                                key="m-print"
                                onClick={() => {
                                    try {
                                        const webview = document.getElementById(`webview-${activeTabId}`) as any;
                                        if (webview && typeof webview.print === 'function') {
                                            webview.print();
                                        }
                                    } catch (e) { }
                                    setIsMenuOpen(false);
                                }}
                                className="px-3.5 py-2 hover:bg-black/5 text-left text-[#191919] font-medium transition-colors flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2.5">
                                    <Printer className="w-4 h-4 text-zinc-600 shrink-0" />
                                    Print...
                                </span>
                                <span className="text-[10px] text-[#8c8877] font-sans">Ctrl+P</span>
                            </button>

                            <button
                                key="m-gemini"
                                onClick={() => { setIsAssistantOpen(true); setIsMenuOpen(false); }}
                                className="px-3.5 py-2 hover:bg-black/5 text-left text-[#191919] font-medium transition-colors flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2.5">
                                    <Sparkles className="w-4 h-4 text-[#fc4b01] shrink-0" />
                                    Open Gemini in Chrome
                                </span>
                            </button>

                            <button
                                key="m-lens"
                                onClick={() => { setIsAssistantOpen(true); setIsMenuOpen(false); }}
                                className="px-3.5 py-2 hover:bg-black/5 text-left text-[#191919] font-medium transition-colors flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2.5">
                                    <ScanSearch className="w-4 h-4 text-zinc-600 shrink-0" />
                                    Search this tab with Google Lens
                                </span>
                            </button>

                            <button
                                key="m-translate"
                                onClick={() => {
                                    try {
                                        const webview = document.getElementById(`webview-${activeTabId}`) as any;
                                        if (webview) {
                                            webview.executeJavaScript(translationOverlayScript).catch(() => { });
                                        }
                                    } catch (e) { }
                                    setIsMenuOpen(false);
                                }}
                                className="px-3.5 py-2 hover:bg-black/5 text-left text-[#191919] font-medium transition-colors flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2.5">
                                    <Globe className="w-4 h-4 text-zinc-600 shrink-0" />
                                    Translate...
                                </span>
                            </button>

                            <button
                                key="m-find"
                                onClick={() => { setIsMenuOpen(false); }}
                                className="px-3.5 py-2 hover:bg-black/5 text-left text-[#191919] font-medium transition-colors flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2.5">
                                    <Search className="w-4 h-4 text-zinc-600 shrink-0" />
                                    Find and edit
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-[#8c8877]" />
                            </button>

                            <button
                                key="m-share"
                                onClick={() => { setIsMenuOpen(false); }}
                                className="px-3.5 py-2 hover:bg-black/5 text-left text-[#191919] font-medium transition-colors flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2.5">
                                    <Share2 className="w-4 h-4 text-zinc-600 shrink-0" />
                                    Cast, save, and share
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-[#8c8877]" />
                            </button>

                            <button
                                key="m-more-tools"
                                onClick={() => { setIsToolsOpen(true); setIsMenuOpen(false); }}
                                className="px-3.5 py-2 hover:bg-black/5 text-left text-[#191919] font-medium transition-colors flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2.5">
                                    <Briefcase className="w-4 h-4 text-zinc-600 shrink-0" />
                                    More tools
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-[#8c8877]" />
                            </button>

                            <button
                                key="m-devtools"
                                onClick={() => {
                                    updateTabProperties(activeTabId, { showDevTools: !activeTab.showDevTools });
                                    setIsMenuOpen(false);
                                }}
                                className="px-3.5 py-2 hover:bg-black/5 text-left text-[#191919] font-medium transition-colors flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2.5">
                                    <Terminal className="w-4 h-4 text-zinc-600 shrink-0" />
                                    Developer Tools (Inspect)
                                </span>
                                <span className="text-[10px] text-[#8c8877] font-sans">F12</span>
                            </button>

                            <hr key="m-hr-5" className="my-1.5 border-[#e3e0d5]" />

                            {/* SECTION 6: HELP, SETTINGS, EXIT */}
                            <button
                                key="m-help"
                                onClick={() => { setIsMenuOpen(false); }}
                                className="px-3.5 py-2 hover:bg-black/5 text-left text-[#191919] font-medium transition-colors flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2.5">
                                    <HelpCircle className="w-4 h-4 text-zinc-600 shrink-0" />
                                    Help
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-[#8c8877]" />
                            </button>

                            <button
                                key="m-settings"
                                onClick={() => { setIsProfileDropdownOpen(true); setIsMenuOpen(false); }}
                                className="px-3.5 py-2 hover:bg-black/5 text-left text-[#191919] font-medium transition-colors flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2.5">
                                    <Settings className="w-4 h-4 text-zinc-600 shrink-0" />
                                    Settings
                                </span>
                            </button>

                            <button
                                key="m-exit"
                                onClick={() => {
                                    try {
                                        const { ipcRenderer } = window.require("electron");
                                        ipcRenderer.invoke("relaunch-app").catch(() => { });
                                    } catch (e) { }
                                    setIsMenuOpen(false);
                                }}
                                className="px-3.5 py-2 hover:bg-black/5 text-left text-red-600 font-medium transition-colors flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2.5">
                                    <LogOut className="w-4 h-4 text-red-500 shrink-0" />
                                    Exit
                                </span>
                            </button>
                        </div>
                    </React.Fragment>
                )
            ]
        }),
            /*#__PURE__*/ (0, React.createElement)("div", {
            key: "k2970_1_18",
            className: `h-[calc(100vh-94px)] w-full flex p-1.5 transition-colors duration-150 ${activeTab.isIncognito ? "bg-[#18191a]" : "bg-[#eae5d8]"}`,
            children: [
                    /*#__PURE__*/ (0, React.createElement)("div", {
                key: "k4097_0_135",
                className: `flex-1 min-w-0 h-full relative overflow-hidden flex gap-1.5 ${isSplitView ? "flex flex-row divide-x divide-[#e3e0d5]" : ""}`,
                children: [
                    chromeBookmarks.length > 0 && /*#__PURE__*/ (0, React.createElement)("div", {
                        key: "bookmarks-bar",
                        className: "absolute top-0 left-0 h-[34px] flex items-center gap-0.5 rounded-none bg-[#f4f3ee] border-b border-[#e3e0d5] overflow-x-auto overflow-y-hidden select-none z-40",
                        style: { right: `${(isAssistantOpen ? assistantWidth : 0) + (isPhonePanelOpen ? 380 : 0)}px`, scrollbarWidth: "none" },
                        children: chromeBookmarks.map((bm) => bm.type === "folder"
                            ? /*#__PURE__*/ (0, React.createElement)("div", {
                                key: `bmf-${bm.name}-${bm.children?.length}`,
                                className: "relative shrink-0",
                                children: [
                                        /*#__PURE__*/ (0, React.createElement)("button", {
                                        key: "btn",
                                        onClick: () => setOpenBookmarkFolder(openBookmarkFolder === bm.name ? null : bm.name),
                                        className: "flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-black/5 text-[11px] font-medium text-[#191919] transition-colors whitespace-nowrap",
                                        children: [
                                            /*#__PURE__*/ (0, React.createElement)("svg", { key: "bmf-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: "w-3.5 h-3.5 text-[#8c8877]", children: /*#__PURE__*/ (0, React.createElement)("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" }) }),
                                            /*#__PURE__*/ (0, React.createElement)("span", { key: "bmf-label", className: "truncate", children: bm.name })
                                        ]
                                    }),
                                        openBookmarkFolder === bm.name && /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: "dropdown",
                                        className: "absolute top-full left-0 mt-1 min-w-[200px] max-h-[320px] overflow-y-auto bg-white border border-[#e3e0d5] rounded-xl shadow-2xl py-1 z-[1000]",
                                        children: (bm.children || []).filter(c => c.type === "url").map((c, i) =>
                                            /*#__PURE__*/ (0, React.createElement)("button", {
                                                key: `bmc-${i}`,
                                                onClick: () => { navigateTab(c.url); setOpenBookmarkFolder(null); },
                                                className: "w-full px-3 py-1.5 text-left text-[11px] text-[#191919] hover:bg-black/5 flex items-center gap-2 truncate",
                                                children: [
                                                    /*#__PURE__*/ (0, React.createElement)("img", { src: `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(c.url || "")}`, className: "w-3.5 h-3.5 rounded-sm shrink-0", onError: (e) => { e.target.style.display = "none"; } }),
                                                    /*#__PURE__*/ (0, React.createElement)("span", { className: "truncate", children: c.name || c.url })
                                                ]
                                            })
                                        )
                                    })
                                ]
                            })
                            : /*#__PURE__*/ (0, React.createElement)("button", {
                                key: `bm-${bm.name}-${bm.url}`,
                                onClick: () => {
                                    navigateTab(bm.url);
                                    if (bm.panel === "phoneLookup") setIsPhonePanelOpen(true);
                                },
                                title: bm.url,
                                className: "flex items-center gap-1.5 ml-4 px-3 py-1 rounded-full border border-[#cfcaba] hover:border-[#b3ad9c] hover:bg-black/5 text-[11px] font-medium text-[#191919] transition-colors whitespace-nowrap shrink-0",
                                children: [
                                    /*#__PURE__*/ (0, React.createElement)("img", { key: "bm-icon", src: `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(bm.url || "")}`, className: "w-3.5 h-3.5 rounded-sm shrink-0", onError: (e) => { e.target.style.display = "none"; } }),
                                    /*#__PURE__*/ (0, React.createElement)("span", { key: "bm-label", className: "truncate", children: bm.name || bm.url })
                                ]
                            })
                        )
                    }),
                    activeTab.isLoading && /*#__PURE__*/ (0, React.createElement)("div", {
                        key: "k4100_0_138",
                        className: "absolute top-0 left-0 right-0 h-[3px] animate-progress-bar z-50 pointer-events-none rounded-t-xl overflow-hidden"
                    }),
                            /*#__PURE__*/ (0, React.createElement)("div", {
                        key: "k4100_1_139",
                        className: `motion-blue-glow transition-all duration-500 ease-in-out ${isAgentActive ? "opacity-100 scale-100" : "opacity-0 scale-[1.01] pointer-events-none"}`
                    }),
                    tabs.map((tab) => {
                        if (tab.url === "about:newtab") return null;
                        const isActive = tab.id === activeTabId;
                        const isSplit = tab.id === splitTabId;
                        const isTabVisible = isSplitView ? (isActive || isSplit) : isActive;

                        const getWebviewSrc = (rawUrl?: string): string => {
                            if (!rawUrl || typeof rawUrl !== "string") return "about:blank";
                            const trimmed = rawUrl.trim();
                            if (!trimmed || trimmed === "about:newtab" || trimmed === "about:blank") return "about:blank";

                            if (trimmed.startsWith("/")) {
                                const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "http://localhost:3000";
                                return `${origin}${trimmed}`;
                            }

                            try {
                                const parsed = new URL(trimmed);
                                return parsed.href;
                            } catch {
                                if (trimmed === "localhistory" || trimmed === "mistake-recovery" || trimmed === "plan-architecture") {
                                    const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "http://localhost:3000";
                                    return `${origin}/${trimmed}`;
                                }
                                if (trimmed.includes(".") && !trimmed.includes(" ")) {
                                    return `https://${trimmed}`;
                                }
                                return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
                            }
                        };

                        return (
                            <div
                                key={tab.id}
                                className={`${isTabVisible ? "flex flex-row" : "hidden"} flex-1 h-full gap-1.5 overflow-hidden ${chromeBookmarks.length > 0 ? "pt-[38px]" : ""}`}
                                style={{ width: isSplitView ? "50%" : "100%" }}
                            >
                                <div className="flex-1 h-full rounded-xl overflow-hidden shadow-md border border-[#d8d4c5] bg-white relative">
                                    <webview
                                        id={`webview-${tab.id}`}
                                        src={getWebviewSrc(tab.initialUrl || tab.url)}
                                        partition={tab.isIncognito ? `incognito-${tab.id}` : `persist:chrome-${activeProfileId || "Default"}`}
                                        preload={webviewPreloadUrl || "file:///c:/Users/raj.tiwari/Documents/browser/preload.js"}
                                        className="w-full h-full border-none bg-white"
                                        allowpopups="true"
                                        ref={(el) => {
                                            if (el) setupWebview(el, tab.id);
                                        }}
                                    />
                                    {tab.certError && (
                                        <div className="absolute inset-0 z-30 bg-[#f3f3f3] flex flex-col items-center justify-center gap-4 font-sans text-[#5f6368] px-8">
                                            <Shield size={56} className="text-[#d93025]" strokeWidth={1.5} />
                                            <div className="flex flex-col items-center gap-1.5 max-w-[520px] text-center">
                                                <div className="text-[#202124] text-xl font-medium">Your connection is not private</div>
                                                <div className="text-[13px] leading-relaxed">
                                                    Attackers might be trying to steal your information from <span className="font-semibold text-[#202124]">{tab.certError.host || "this site"}</span> (for example, passwords, messages, or credit cards).
                                                </div>
                                                <div className="text-[12px] text-[#d93025] font-mono mt-1">{tab.certError.error}</div>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2">
                                                <button
                                                    className="text-[13px] text-[#1a73e8] hover:underline font-medium"
                                                    onClick={() => {
                                                        const wv = document.getElementById(`webview-${tab.id}`) as any;
                                                        updateTabProperties(tab.id, { certError: null });
                                                        try {
                                                            if (wv && wv.canGoBack && wv.canGoBack()) {
                                                                wv.goBack();
                                                            } else {
                                                                navigateTab("about:newtab");
                                                            }
                                                        } catch (err) { }
                                                    }}
                                                >
                                                    Back to safety
                                                </button>
                                                <button
                                                    className="px-4 py-2 rounded-[4px] bg-[#1a73e8] text-white text-[13px] font-medium hover:bg-[#1765cc]"
                                                    onClick={async () => {
                                                        const wv = document.getElementById(`webview-${tab.id}`) as any;
                                                        try {
                                                            const { ipcRenderer } = window.require("electron");
                                                            await ipcRenderer.invoke("allow-insecure-host", tab.certError.host);
                                                            updateTabProperties(tab.id, { certError: null });
                                                            if (wv && tab.certError.url) {
                                                                wv.loadURL(tab.certError.url).catch(() => { });
                                                            }
                                                        } catch (err) { }
                                                    }}
                                                >
                                                    Proceed to {tab.certError.host || "site"} (unsafe)
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    }),
                    activeTab.url === "about:newtab" && (activeTab.isIncognito
                        ? /*#__PURE__*/ (0, React.createElement)("div", {
                            key: "incognito-newtab",
                            className: "absolute inset-0 bg-[#202221] flex items-center justify-center p-8 overflow-y-auto font-sans text-zinc-300",
                            children: /*#__PURE__*/ (0, React.createElement)("div", {
                                className: "w-full max-w-4xl flex flex-row items-center justify-center gap-12",
                                children: [
                                    // Hand Graphic (left)
                                    /*#__PURE__*/ (0, React.createElement)("div", {
                                    key: "incognito-left",
                                    className: "flex-1 hidden md:flex items-center justify-end pr-10 border-r border-zinc-800/60 max-w-[700px]",
                                    children: /*#__PURE__*/ (0, React.createElement)("img", {
                                        src: "/hand-logo.png",
                                        alt: "Incognito",
                                        className: "w-[600px] h-[600px] object-contain opacity-95 select-none"
                                    })
                                }),
                                    // Details (right)
                                    /*#__PURE__*/ (0, React.createElement)("div", {
                                    key: "incognito-right",
                                    className: "flex-1 flex flex-col gap-4 text-left max-w-[460px]",
                                    children: [
                                            /*#__PURE__*/ (0, React.createElement)("h2", {
                                        key: "title",
                                        className: "text-2xl font-semibold tracking-tight text-white font-sans",
                                        children: "You've gone Incognito"
                                    }),
                                            /*#__PURE__*/ (0, React.createElement)("p", {
                                        key: "sub",
                                        className: "text-[13px] text-zinc-400 font-sans leading-relaxed",
                                        children: "On this device, Brocus Lookup Engine won't save your browsing history, cookies, or site data from this session."
                                    }),
                                            /*#__PURE__*/ (0, React.createElement)("p", {
                                        key: "explanation",
                                        className: "text-[11px] text-zinc-500 font-sans leading-relaxed",
                                        children: "Incognito doesn't make you invisible to the sites you visit, your network, or trackers that don't rely on cookies. Your privacy and ad-blocking settings still apply."
                                    }),
                                            // Bullet lists
                                            /*#__PURE__*/ (0, React.createElement)("ul", {
                                        key: "bullet-list-1",
                                        className: "list-disc pl-4 text-[11.5px] text-zinc-400 font-sans flex flex-col gap-2",
                                        children: [
                                                    /*#__PURE__*/ (0, React.createElement)("li", {
                                            key: "b1",
                                            children: "The Assistant is turned off — you won't see the Assistant button and won't be able to ask contextual questions about pages."
                                        }),
                                                    /*#__PURE__*/ (0, React.createElement)("li", {
                                            key: "b2",
                                            children: "Brocus Lookup Engine's Personal Search is disabled — it won't access your history or perform any actions for you."
                                        })
                                        ]
                                    }),
                                            /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: "wont-save-title",
                                        className: "text-[11.5px] font-bold text-zinc-300 font-sans mt-1",
                                        children: "Brocus Lookup Engine won't save:"
                                    }),
                                            /*#__PURE__*/ (0, React.createElement)("ul", {
                                        key: "bullet-list-2",
                                        className: "list-disc pl-4 text-[11.5px] text-zinc-400 font-sans flex flex-col gap-1.5",
                                        children: [
                                                    /*#__PURE__*/ (0, React.createElement)("li", {
                                            key: "s1",
                                            children: "Your browsing history"
                                        }),
                                                    /*#__PURE__*/ (0, React.createElement)("li", {
                                            key: "s2",
                                            children: "Cookies and site data"
                                        }),
                                                    /*#__PURE__*/ (0, React.createElement)("li", {
                                            key: "s3",
                                            children: "Information entered in forms"
                                        })
                                        ]
                                    }),
                                            // Box at the bottom
                                            /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: "cookie-warning-box",
                                        className: "mt-3 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex gap-3 text-[11px] leading-relaxed max-w-[460px] text-zinc-400",
                                        children: [
                                                    // Eye strike icon
                                                    /*#__PURE__*/ (0, React.createElement)("div", {
                                            key: "eye-icon",
                                            className: "shrink-0 mt-0.5 text-zinc-500",
                                            children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                                viewBox: "0 0 24 24",
                                                fill: "none",
                                                stroke: "currentColor",
                                                strokeWidth: "2",
                                                className: "w-4 h-4",
                                                children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    d: "M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                                                })
                                            })
                                        }),
                                                    /*#__PURE__*/ (0, React.createElement)("div", {
                                            key: "box-txt",
                                            className: "flex flex-col gap-1",
                                            children: [
                                                            /*#__PURE__*/ (0, React.createElement)("span", {
                                                key: "box-head",
                                                className: "font-semibold text-zinc-200",
                                                children: "Third-party cookies are blocked"
                                            }),
                                                            /*#__PURE__*/ (0, React.createElement)("span", {
                                                key: "box-body",
                                                children: "When you're in Incognito mode, sites can't use third-party cookies. If a site that relies on these cookies isn't working, you can try giving that site temporary access to third-party cookies."
                                            })
                                            ]
                                        })
                                        ]
                                    })
                                    ]
                                })
                                ]
                            })
                        })
                        : /*#__PURE__*/ (0, React.createElement)("div", {
                            key: "k4100_3_f_141",
                            className: "absolute inset-0 bg-[#f9f8f6] flex flex-col items-center justify-center p-8 overflow-y-auto",
                            children: /*#__PURE__*/ (0, React.createElement)("div", {
                                className: "w-full max-w-3xl text-center flex flex-col items-center gap-9 relative z-10 pb-48",
                                children: [
                                        /*#__PURE__*/ (0, React.createElement)("div", {
                                    key: "k4281_0_160",
                                    className: "flex flex-col items-center gap-3.5 mb-4",
                                    children: [
                                                /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: "k4284_0_162",
                                        className: "flex items-center justify-center overflow-hidden",
                                        children: /*#__PURE__*/ (0, React.createElement)("img", {
                                            src: "/logo/brocus-logo.webp",
                                            alt: "Brocus Lookup Engine",
                                            className: "w-24 h-24 object-contain"
                                        })
                                    }),
                                                /*#__PURE__*/ (0, React.createElement)("h2", {
                                        key: "k4284_1_163",
                                        className: "text-3xl font-medium tracking-tight font-serif text-[#191919]",
                                        children: "Brocus Lookup Engine"
                                    }),
                                                /*#__PURE__*/ (0, React.createElement)("p", {
                                        key: "k4284_2_164",
                                        className: "text-sm font-medium text-[#6e6b5e] font-sans max-w-sm leading-relaxed",
                                        children: "A desktop web workspace utilizing a light, high-readability design system."
                                    })
                                    ]
                                }),
                                        /*#__PURE__*/ (0, React.createElement)("form", {
                                    key: "k4281_1_161",
                                    onSubmit: (e) => {
                                        e.preventDefault();
                                        navigateTab(searchText);
                                        addToHistory(searchText);
                                        setShowNewTabSuggestions(false);
                                    },
                                    className: "relative w-full max-w-2xl flex items-center bg-white border border-[#e3e0d5] rounded-full pl-6 pr-3 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.04)] focus-within:border-[#fc4b01] focus-within:ring-1 focus-within:ring-[#fc4b01]/20 transition-all gap-4 mt-2",
                                    children: [
                                                /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: "k4305_0_165",
                                        className: "text-[#8c8877] shrink-0",
                                        children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                            xmlns: "http://www.w3.org/2000/svg",
                                            fill: "none",
                                            viewBox: "0 0 24 24",
                                            strokeWidth: 2.5,
                                            stroke: "currentColor",
                                            className: "w-4 h-4",
                                            children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                strokeLinecap: "round",
                                                strokeLinejoin: "round",
                                                d: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z"
                                            })
                                        })
                                    }),
                                                /*#__PURE__*/ (0, React.createElement)("input", {
                                        key: "k4305_1_166",
                                        type: "text",
                                        ref: newTabInputRef,
                                        value: searchText,
                                        onFocus: () => {
                                            setShowNewTabSuggestions(true);
                                            setSelectedNewTabSuggestionIndex(-1);
                                            setOriginalNewTabQuery("");
                                        },
                                        onBlur: () => {
                                            setTimeout(() => setShowNewTabSuggestions(false), 200);
                                        },
                                        onKeyDown: (e) => {
                                            const isDelete = e.key === "Backspace" || e.key === "Delete";
                                            isNewTabDeletingRef.current = isDelete;
                                            if (displayNewTabSuggestions.length === 0) return;
                                            if (e.key === "ArrowDown") {
                                                e.preventDefault();
                                                setShowNewTabSuggestions(true);
                                                let nextIndex = selectedNewTabSuggestionIndex + 1;
                                                if (nextIndex >= displayNewTabSuggestions.length) {
                                                    nextIndex = -1;
                                                }
                                                setSelectedNewTabSuggestionIndex(nextIndex);
                                                if (nextIndex === -1) {
                                                    setSearchText(originalNewTabQuery || searchText);
                                                } else {
                                                    if (selectedNewTabSuggestionIndex === -1) {
                                                        setOriginalNewTabQuery(searchText);
                                                    }
                                                    const item = displayNewTabSuggestions[nextIndex];
                                                    setSearchText(item.type === "history-url" ? item.url || "" : item.text || "");
                                                }
                                            } else if (e.key === "ArrowUp") {
                                                e.preventDefault();
                                                setShowNewTabSuggestions(true);
                                                let nextIndex = selectedNewTabSuggestionIndex - 1;
                                                if (nextIndex < -1) {
                                                    nextIndex = displayNewTabSuggestions.length - 1;
                                                }
                                                setSelectedNewTabSuggestionIndex(nextIndex);
                                                if (nextIndex === -1) {
                                                    setSearchText(originalNewTabQuery || searchText);
                                                } else {
                                                    if (selectedNewTabSuggestionIndex === -1) {
                                                        setOriginalNewTabQuery(searchText);
                                                    }
                                                    const item = displayNewTabSuggestions[nextIndex];
                                                    setSearchText(item.type === "history-url" ? item.url || "" : item.text || "");
                                                }
                                            } else if (e.key === "Escape") {
                                                setShowNewTabSuggestions(false);
                                                setSelectedNewTabSuggestionIndex(-1);
                                                if (originalNewTabQuery) {
                                                    setSearchText(originalNewTabQuery);
                                                    setOriginalNewTabQuery("");
                                                }
                                            }
                                        },
                                        onChange: (e) => {
                                            const val = e.target.value;
                                            setSearchText(val);
                                            setSelectedNewTabSuggestionIndex(-1);
                                            setOriginalNewTabQuery("");
                                            handleNewTabAutocomplete(val, e.target);
                                        },
                                        placeholder: "Search Google or type a URL",
                                        className: "flex-1 bg-transparent text-sm text-[#191919] outline-none border-none placeholder:text-[#8c8877]/60 font-sans"
                                    }),
                                                /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: "k4305_2_167",
                                        className: "flex items-center gap-1 shrink-0 select-none",
                                        children: [
                                                        /*#__PURE__*/ (0, React.createElement)("button", {
                                            key: "k4399_0_169",
                                            type: "button",
                                            className: "p-2 rounded-full hover:bg-black/5 text-[#8c8877] hover:text-[#191919] transition-all",
                                            title: "Voice Search",
                                            children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                                xmlns: "http://www.w3.org/2000/svg",
                                                fill: "none",
                                                viewBox: "0 0 24 24",
                                                strokeWidth: 2.5,
                                                stroke: "currentColor",
                                                className: "w-4 h-4",
                                                children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    d: "M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3z"
                                                })
                                            })
                                        }),
                                                        /*#__PURE__*/ (0, React.createElement)("button", {
                                            key: "k4399_1_170",
                                            type: "button",
                                            className: "p-2 rounded-full hover:bg-black/5 text-[#8c8877] hover:text-[#191919] transition-all mr-1.5",
                                            title: "Search by image (Lens)",
                                            children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                                xmlns: "http://www.w3.org/2000/svg",
                                                fill: "none",
                                                viewBox: "0 0 24 24",
                                                strokeWidth: 2.5,
                                                stroke: "currentColor",
                                                className: "w-4 h-4",
                                                children: [
                                                                    /*#__PURE__*/ (0, React.createElement)("path", {
                                                    key: "k4424_0_172",
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    d: "M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316z"
                                                }),
                                                                    /*#__PURE__*/ (0, React.createElement)("path", {
                                                    key: "k4424_1_173",
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    d: "M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0zM18.75 10.5h.008v.008h-.008V10.5z"
                                                })
                                                ]
                                            })
                                        }),
                                                        /*#__PURE__*/ (0, React.createElement)("button", {
                                            key: "k4399_2_171",
                                            type: "button",
                                            onClick: () => setAgentModeEnabled(!agentModeEnabled),
                                            className: `px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 border cursor-pointer ${agentModeEnabled ? "bg-[#fc4b01]/10 text-[#fc4b01] border-[#fc4b01]/20 hover:bg-[#fc4b01]/20" : "bg-black/5 text-[#6e6b5e] border-transparent hover:bg-black/10 hover:text-[#191919]"}`,
                                            title: "Toggle AI Browser Agent Mode",
                                            children: [
                                                                /*#__PURE__*/ (0, React.createElement)("svg", {
                                                key: "k4445_0_174",
                                                xmlns: "http://www.w3.org/2000/svg",
                                                fill: "none",
                                                viewBox: "0 0 24 24",
                                                strokeWidth: 2.5,
                                                stroke: "currentColor",
                                                className: "w-3.5 h-3.5",
                                                children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    d: "M9.813 15.904L9 21l-.813-5.096L3 15l5.187-.813L9 9l.813 5.187L15 15l-5.187.813zM18 10.5l-.5-3.5-3.5-.5.5-3.5 3.5.5.5 3.5 3.5.5-.5 3.5-3.5-.5zm-6-7l-.25-1.75-1.75-.25.25-1.75 1.75.25.25 1.75 1.75.25-.25 1.75-1.75-.25z"
                                                })
                                            }),
                                                agentModeEnabled ? "AI Mode" : "Normal Mode"
                                            ]
                                        })
                                        ]
                                    }),
                                        showNewTabSuggestions && displayNewTabSuggestions.length > 0 && /*#__PURE__*/ (0, React.createElement)("div", {
                                            key: "k4305_3_168",
                                            className: "absolute left-0 right-0 top-full mt-2 bg-[#f9f8f6] border border-[#e3e0d5] rounded-2xl shadow-xl z-[999] overflow-hidden py-1.5 flex flex-col font-sans text-xs animate-in fade-in slide-in-from-top-1 duration-150",
                                            children: displayNewTabSuggestions.map((item, index) => {
                                                const isSelected = selectedNewTabSuggestionIndex === index;
                                                return /*#__PURE__*/ (0, React.createElement)("div", {
                                                    key: item.key || `ntsug-${index}`,
                                                    onClick: () => handleSelectNewTabSuggestion(item),
                                                    onMouseEnter: () => setSelectedNewTabSuggestionIndex(index),
                                                    className: `px-4 py-2 flex items-center gap-3 cursor-pointer transition-colors ${isSelected ? "bg-black/5" : "hover:bg-black/5"}`,
                                                    children: [
                                                                /*#__PURE__*/ (0, React.createElement)("div", {
                                                        key: "k4473_0_175",
                                                        className: "shrink-0 flex items-center justify-center w-5 h-5 text-[#6e6b5e]",
                                                        children: [
                                                            item.type === "default-search" && (() => {
                                                                const trimmed = item.text.trim();
                                                                const isUrlPattern = /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(trimmed) && !trimmed.includes(" ");
                                                                if (isUrlPattern) {
                                                                    const domain = trimmed.replace(/^https?:\/\//i, "").split("/")[0];
                                                                    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                                                                    return /*#__PURE__*/ (0, React.createElement)("img", {
                                                                        key: "favicon-img-" + domain,
                                                                        src: faviconUrl,
                                                                        alt: "",
                                                                        className: "w-4 h-4 rounded-sm object-contain",
                                                                        onError: (e) => {
                                                                            e.target.style.display = "none";
                                                                        }
                                                                    });
                                                                }
                                                                return /*#__PURE__*/ (0, React.createElement)("svg", {
                                                                    key: "search-icon",
                                                                    xmlns: "http://www.w3.org/2000/svg",
                                                                    viewBox: "0 0 24 24",
                                                                    fill: "currentColor",
                                                                    className: "w-4 h-4 text-[#fc4b01]",
                                                                    children: [
                                                                                    /*#__PURE__*/ (0, React.createElement)("path", {
                                                                        key: "k4497_0_181",
                                                                        d: "M8.25 10.875a2.625 2.625 0 115.25 0 2.625 2.625 0 01-5.25 0z"
                                                                    }),
                                                                                    /*#__PURE__*/ (0, React.createElement)("path", {
                                                                        key: "k4497_1_182",
                                                                        fillRule: "evenodd",
                                                                        d: "M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.125 4.5a4.125 4.125 0 102.25 0v2.73a5.61 5.61 0 00-2.25 0V6.75zM12 18.75a6.717 6.717 0 01-4.717-1.933A.75.75 0 017.8 15.75c1.233.917 2.766 1.5 4.2 1.5s2.967-.583 4.2-1.5a.75.75 0 01.517 1.067A6.717 6.717 0 0112 18.75z",
                                                                        clipRule: "evenodd"
                                                                    })
                                                                    ]
                                                                });
                                                            })(),
                                                            item.type === "search-query" && /*#__PURE__*/ (0, React.createElement)("svg", {
                                                                key: "k4479_1_177",
                                                                xmlns: "http://www.w3.org/2000/svg",
                                                                fill: "none",
                                                                viewBox: "0 0 24 24",
                                                                strokeWidth: 2.2,
                                                                stroke: "currentColor",
                                                                className: "w-4 h-4",
                                                                children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                                    strokeLinecap: "round",
                                                                    strokeLinejoin: "round",
                                                                    d: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                                                                })
                                                            }),
                                                            item.type === "history-search" && /*#__PURE__*/ (0, React.createElement)("svg", {
                                                                key: "k4479_2_178",
                                                                xmlns: "http://www.w3.org/2000/svg",
                                                                fill: "none",
                                                                viewBox: "0 0 24 24",
                                                                strokeWidth: 2.2,
                                                                stroke: "currentColor",
                                                                className: "w-4 h-4",
                                                                children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                                    strokeLinecap: "round",
                                                                    strokeLinejoin: "round",
                                                                    d: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                })
                                                            }),
                                                            item.type === "history-url" && (item.favicon ? /*#__PURE__*/ (0, React.createElement)("img", {
                                                                key: "k4479_3_t_179",
                                                                src: item.favicon,
                                                                alt: "",
                                                                className: "w-3.5 h-3.5 rounded-sm object-contain",
                                                                onError: (e) => {
                                                                    e.target.style.display = 'none';
                                                                }
                                                            }) : /*#__PURE__*/ (0, React.createElement)("svg", {
                                                                key: "k4479_3_f_180",
                                                                xmlns: "http://www.w3.org/2000/svg",
                                                                fill: "none",
                                                                viewBox: "0 0 24 24",
                                                                strokeWidth: 2,
                                                                stroke: "currentColor",
                                                                className: "w-4 h-4",
                                                                children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                                    strokeLinecap: "round",
                                                                    strokeLinejoin: "round",
                                                                    d: "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253"
                                                                })
                                                            }))
                                                        ]
                                                    }),
                                                                /*#__PURE__*/ (0, React.createElement)("div", {
                                                        key: "k4473_1_176",
                                                        className: "flex-1 min-w-0 text-left truncate",
                                                        children: [
                                                            item.type === "default-search" && (() => {
                                                                const trimmed = item.text.trim();
                                                                const isUrlPattern = /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(trimmed) && !trimmed.includes(" ");
                                                                if (isUrlPattern) {
                                                                    return /*#__PURE__*/ (0, React.createElement)("span", {
                                                                        className: `font-medium ${activeTab.isIncognito ? "text-zinc-200" : "text-[#191919]"}`,
                                                                        children: item.text
                                                                    });
                                                                }
                                                                return /*#__PURE__*/ (0, React.createElement)("span", {
                                                                    className: `font-medium ${activeTab.isIncognito ? "text-zinc-200" : "text-[#191919]"}`,
                                                                    children: [
                                                                        item.text,
                                                                        " ",
                                                                                    /*#__PURE__*/ (0, React.createElement)("span", {
                                                                            key: "k4574_2_185",
                                                                            className: `font-normal ${activeTab.isIncognito ? "text-zinc-500" : "text-[#8c8877]"}`,
                                                                            children: "— Google Search"
                                                                        })
                                                                    ]
                                                                });
                                                            })(),
                                                            (item.type === "search-query" || item.type === "history-search") && /*#__PURE__*/ (0, React.createElement)("span", {
                                                                key: "k4562_1_183",
                                                                className: `font-medium ${activeTab.isIncognito ? "text-zinc-200" : "text-[#191919]"}`,
                                                                children: item.text
                                                            }),
                                                            item.type === "history-url" && /*#__PURE__*/ (0, React.createElement)("span", {
                                                                key: "k4562_2_184",
                                                                className: `font-medium ${activeTab.isIncognito ? "text-zinc-200" : "text-[#191919]"}`,
                                                                children: [
                                                                    item.title,
                                                                    " ",
                                                                                /*#__PURE__*/ (0, React.createElement)("span", {
                                                                        key: "k4590_2_186",
                                                                        className: `font-normal ${activeTab.isIncognito ? "text-zinc-500" : "text-[#8c8877]"}`,
                                                                        children: [
                                                                            "— ",
                                                                            item.url
                                                                        ]
                                                                    })
                                                                ]
                                                            })
                                                        ]
                                                    })
                                                    ]
                                                });
                                            })
                                        })
                                    ]
                                })
                                ]
                            })
                        })
                    ),
                ]
            }),
                isPhonePanelOpen && /*#__PURE__*/ (0, React.createElement)("div", {
                    key: "phone-lookup-panel",
                    className: "w-[380px] h-full bg-[#f4f3ee] border-l border-[#e3e0d5] flex flex-col shrink-0 z-40 text-[#191919]",
                    children: [
                            /*#__PURE__*/ (0, React.createElement)("div", {
                        key: "plp-header",
                        className: "h-[44px] px-3.5 flex items-center justify-between border-b border-[#e3e0d5]",
                        children: [
                                    /*#__PURE__*/ (0, React.createElement)("span", {
                                key: "plp-title",
                                className: "text-[10px] font-bold text-[#8c8877] uppercase tracking-wider select-none",
                                children: "Phone LookUp"
                            }),
                                    /*#__PURE__*/ (0, React.createElement)("div", {
                                key: "plp-actions",
                                className: "flex items-center gap-1",
                                children: [
                                            /*#__PURE__*/ (0, React.createElement)("button", {
                                        key: "plp-fs",
                                        onClick: () => setIsPhoneReportFullscreen(true),
                                        title: "Open fullscreen",
                                        className: "p-1 rounded text-[#8c8877] hover:text-[#191919] hover:bg-black/5 transition-all",
                                        children: /*#__PURE__*/ (0, React.createElement)(Maximize2, { size: 14 })
                                    }),
                                            /*#__PURE__*/ (0, React.createElement)("button", {
                                        key: "plp-close",
                                        onClick: () => setIsPhonePanelOpen(false),
                                        className: "p-1 rounded text-[#8c8877] hover:text-[#191919] hover:bg-black/5 transition-all",
                                        children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                            viewBox: "0 0 24 24",
                                            fill: "none",
                                            stroke: "currentColor",
                                            strokeWidth: "2.5",
                                            className: "w-4 h-4",
                                            children: /*#__PURE__*/ (0, React.createElement)("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 18L18 6M6 6l12 12" })
                                        })
                                    })
                                ]
                            })
                        ]
                    }),
                            /*#__PURE__*/ (0, React.createElement)("form", {
                        key: "plp-form",
                        onSubmit: (e) => {
                            e.preventDefault();
                            runPhoneLookup();
                        },
                        className: "flex-1 overflow-y-auto p-4 flex flex-col gap-3",
                        children: [
                                    /*#__PURE__*/ (0, React.createElement)("label", {
                                key: "plp-label",
                                className: "text-[10px] font-bold text-[#8c8877] uppercase tracking-wider select-none",
                                children: "Phone Number"
                            }),
                                    /*#__PURE__*/ (0, React.createElement)("input", {
                                key: "plp-input",
                                type: "tel",
                                value: phoneLookupInput,
                                onChange: (e) => setPhoneLookupInput(e.target.value),
                                placeholder: "(555) 123-4567",
                                className: "w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e3e0d5] text-sm text-[#191919] outline-none focus:border-[#fc4b01] focus:ring-1 focus:ring-[#fc4b01]/20 transition-all font-sans placeholder:text-[#8c8877]/60"
                            }),
                                    /*#__PURE__*/ (0, React.createElement)("label", {
                                key: "plp-label2",
                                className: "text-[10px] font-bold text-[#8c8877] uppercase tracking-wider select-none",
                                children: "What to do with it (optional)"
                            }),
                                    /*#__PURE__*/ (0, React.createElement)("textarea", {
                                key: "plp-instructions",
                                value: phoneLookupInstructions,
                                onChange: (e) => setPhoneLookupInstructions(e.target.value),
                                placeholder: "e.g. find the owner's name and address, then summarize the results",
                                rows: 3,
                                className: "w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e3e0d5] text-sm text-[#191919] outline-none focus:border-[#fc4b01] focus:ring-1 focus:ring-[#fc4b01]/20 transition-all font-sans placeholder:text-[#8c8877]/60 resize-none"
                            }),
                                    /*#__PURE__*/ (0, React.createElement)("button", {
                                key: "plp-search",
                                type: "submit",
                                className: "w-full py-2.5 rounded-xl bg-[#fc4b01] hover:bg-[#a34b2c] text-white text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98]",
                                children: "Look Up"
                            }),
                                    /*#__PURE__*/ (0, React.createElement)("p", {
                                key: "plp-hint",
                                className: "text-[10px] text-[#8c8877] font-sans leading-relaxed",
                                children: "Leave instructions empty for a direct search, or describe a task and the assistant will do it on the site."
                            }),
                                    phoneLookupResult && (isPhoneDetailView || phoneLookupProfiles.length === 0) && /*#__PURE__*/ (0, React.createElement)("div", {
                                key: "plp-result",
                                className: "mt-2 flex flex-col gap-3 border-t border-[#e3e0d5] pt-3",
                                children: [
                                            /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: "plp-result-head",
                                        className: "flex items-center justify-between",
                                        children: [
                                                        /*#__PURE__*/ (0, React.createElement)("span", {
                                                key: "plp-result-title",
                                                className: "text-[10px] font-bold text-[#8c8877] uppercase tracking-wider select-none",
                                                children: "Extracted Report"
                                            }),
                                                        /*#__PURE__*/ (0, React.createElement)("button", {
                                                key: "plp-expand",
                                                type: "button",
                                                onClick: () => setIsPhoneReportFullscreen(true),
                                                title: "Open fullscreen",
                                                className: "p-1 rounded text-[#8c8877] hover:text-[#191919] hover:bg-black/5 transition-all",
                                                children: /*#__PURE__*/ (0, React.createElement)(Maximize2, { size: 13 })
                                            })
                                        ]
                                    }),
                                            /*#__PURE__*/ (0, React.createElement)(React.Fragment, {
                                        key: "plp-report",
                                        children: renderPhoneLookupReport(false)
                                    })
                                ]
                            })
                        ]
                    })
                ]
            }),
                isToolsOpen && /*#__PURE__*/ (0, React.createElement)(React["Fragment"], {
                    key: "tools-panel-fragment",
                    children: [
                            /*#__PURE__*/ (0, React.createElement)("div", {
                        key: "tools-panel-backdrop",
                        className: "fixed inset-0 z-[998]",
                        onClick: () => setIsToolsOpen(false)
                    }),
                            /*#__PURE__*/ (0, React.createElement)("div", {
                        key: "k4097_1_136",
                        className: "fixed right-32 top-[104px] w-[340px] max-h-[80vh] bg-[#22222f] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-[999] text-zinc-100 animate-in fade-in slide-in-from-top-2 duration-150",
                        children: [
                            /*#__PURE__*/ (0, React.createElement)("div", {
                        key: "k4618_0_187",
                        className: "h-[44px] px-3.5 flex items-center justify-between border-b border-white/10",
                        style: { fontFamily: "'Lexend', system-ui, sans-serif" },
                        children: [
                                    /*#__PURE__*/ (0, React.createElement)("span", {
                            key: "k4621_0_189",
                            className: "text-[10px] font-light text-zinc-400 uppercase tracking-wider select-none",
                            children: "Profiles"
                        }),
                                    /*#__PURE__*/ (0, React.createElement)("button", {
                            key: "k4621_1_190",
                            onClick: () => setIsToolsOpen(false),
                            className: "p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-all",
                            children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "2.5",
                                className: "w-4 h-4",
                                children: /*#__PURE__*/ (0, React.createElement)("path", {
                                    strokeLinecap: "round",
                                    strokeLinejoin: "round",
                                    d: "M6 18L18 6M6 6l12 12"
                                })
                            })
                        })
                        ]
                    }),
                            /*#__PURE__*/ (0, React.createElement)("div", {
                        key: "k4618_1_188",
                        className: "flex-1 overflow-hidden",
                        children: /*#__PURE__*/ (0, React.createElement)(MacroBuilder, {
                            onRunMacro: handleRunMacro,
                            onAutofill: handleAutofill,
                            onAnnihilateCookies: handleAnnihilateCookies,
                            cookieBlockingEnabled: cookieBlockingEnabled,
                            setCookieBlockingEnabled: setCookieBlockingEnabled,
                            isRecording: isRecording,
                            recordedSteps: recordedSteps,
                            startRecording: startRecording,
                            stopRecording: stopRecording,
                            onSaveRecordedMacro: handleSaveRecordedMacro,
                            activeProfileId: activeProfileId,
                            profiles: profiles,
                            onSwitchProfile: switchProfile
                        })
                    })
                    ]
                    })
                    ]
                }),
                isAssistantOpen && /*#__PURE__*/ (0, React.createElement)("div", {
                    key: "k4097_2_137",
                    style: {
                        width: `${assistantWidth}px`
                    },
                    className: "h-full bg-[#f4f3ee] border-l border-[#e3e0d5] flex flex-col shrink-0 relative z-40 text-[#191919] font-sans",
                    children: [
                            /*#__PURE__*/ (0, React.createElement)("div", {
                        key: "k4669_0_191",
                        onMouseDown: startResizing,
                        className: "absolute left-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-[#fc4b01]/35 transition-all z-50 -ml-[3px]",
                        title: "Drag to resize Brocus Assistant"
                    }),
                            /*#__PURE__*/ (0, React.createElement)("div", {
                        key: "k4669_1_192",
                        className: "h-[44px] px-3.5 flex items-center justify-between border-b border-[#e3e0d5]",
                        children: [
                                    /*#__PURE__*/ (0, React.createElement)("div", {
                            key: "k4680_0_196",
                            className: "flex items-center gap-2",
                            children: [
                                            /*#__PURE__*/ (0, React.createElement)("span", {
                                key: "k4683_0_198",
                                className: "text-[10px] font-bold text-[#8c8877] uppercase tracking-wider select-none",
                                children: "Brocus Assistant"
                            }),
                                            /*#__PURE__*/ (0, React.createElement)("img", {
                                key: "k4683_1_199",
                                src: getAiLogoPath(activeModel),
                                alt: activeModel,
                                className: "w-4 h-4 object-contain shrink-0 rounded-sm select-none",
                                title: `Active AI: ${activeModel}`
                            })
                            ]
                        }),
                                    /*#__PURE__*/ (0, React.createElement)("div", {
                            key: "k4680_1_197",
                            className: "flex items-center gap-1.5",
                            children: [
                                            /*#__PURE__*/ (0, React.createElement)("button", {
                                key: "k4698_0_200",
                                onClick: () => {
                                    handleCancelAgent();
                                    setMessages([]);
                                },
                                className: "p-1 rounded text-[#8c8877] hover:text-[#191919] hover:bg-black/5 transition-all active:scale-95 flex items-center justify-center",
                                title: "Start New Conversation",
                                children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "currentColor",
                                    strokeWidth: "2.2",
                                    className: "w-4 h-4 text-[#fc4b01]",
                                    children: /*#__PURE__*/ (0, React.createElement)("path", {
                                        strokeLinecap: "round",
                                        strokeLinejoin: "round",
                                        d: "M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                                    })
                                })
                            }),
                                            /*#__PURE__*/ (0, React.createElement)("button", {
                                key: "k4698_1_201",
                                onClick: () => setIsAssistantOpen(false),
                                className: "p-1 rounded text-[#8c8877] hover:text-[#191919] hover:bg-black/5 transition-all",
                                children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "currentColor",
                                    strokeWidth: "2.5",
                                    className: "w-4 h-4",
                                    children: /*#__PURE__*/ (0, React.createElement)("path", {
                                        strokeLinecap: "round",
                                        strokeLinejoin: "round",
                                        d: "M6 18L18 6M6 6l12 12"
                                    })
                                })
                            })
                            ]
                        })
                        ]
                    }),
                            /*#__PURE__*/ (0, React.createElement)("div", {
                        key: "k4669_2_193",
                        onWheel: (e) => {
                          if (e.currentTarget) {
                            e.currentTarget.scrollLeft += e.deltaY;
                          }
                        },
                        className: "h-[34px] px-3.5 flex items-center gap-4 bg-[#e9e6dc] border-b border-[#e3e0d5] select-none text-[10px] font-bold uppercase tracking-wider shrink-0 overflow-x-auto w-full min-w-0 scrollbar-none whitespace-nowrap cursor-grab active:cursor-grabbing",
                        children: [
                                    /*#__PURE__*/ (0, React.createElement)("button", {
                            key: "k4741_0_202",
                            onClick: () => setAssistantMode("chat"),
                            className: `pb-1 border-b-2 transition-all shrink-0 whitespace-nowrap ${assistantMode === "chat" ? "border-[#fc4b01] text-[#191919]" : "border-transparent text-[#8c8877] hover:text-[#fc4b01]"}`,
                            children: "Agent Chat"
                        }),
                                    /*#__PURE__*/ (0, React.createElement)("button", {
                            key: "k4741_1_203",
                            onClick: () => setAssistantMode("rag"),
                            className: `pb-1 border-b-2 transition-all shrink-0 whitespace-nowrap ${assistantMode === "rag" ? "border-[#fc4b01] text-[#191919]" : "border-transparent text-[#8c8877] hover:text-[#fc4b01]"}`,
                            children: "RAG Memories"
                        }),
                                    /*#__PURE__*/ (0, React.createElement)("button", {
                            key: "k4741_2_204",
                            onClick: () => setAssistantMode("tools"),
                            className: `pb-1 border-b-2 transition-all shrink-0 whitespace-nowrap ${assistantMode === "tools" ? "border-[#fc4b01] text-[#191919]" : "border-transparent text-[#8c8877] hover:text-[#fc4b01]"}`,
                            children: "Tools"
                        }),
                                    /*#__PURE__*/ (0, React.createElement)("button", {
                            key: "k4741_4_206",
                            onClick: () => openNewTabWithUrl((window.location.origin || "http://localhost:3000") + "/plan-architecture"),
                            className: "pb-1 border-b-2 border-transparent text-[#8c8877] hover:text-[#fc4b01] transition-all flex items-center gap-1 font-bold text-[#fc4b01] shrink-0 whitespace-nowrap",
                            title: "Open Interactive Master Plan & Architecture Hub",
                            children: "Planning"
                        })
                        ]
                    }),
                            /*#__PURE__*/ (0, React.createElement)("div", {
                        key: "k4669_3_194",
                        ref: chatContainerRef,
                        className: "flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-none",
                        children: assistantMode === "tools" ? /*#__PURE__*/ React.createElement(ToolsPanel, {
                            activeUrl: (tabs.find((t) => t.id === activeTabId) || tabs[0])?.url
                        }) : assistantMode === "chat" ? /*#__PURE__*/ (0, React.createElement)("div", {
                            className: "flex flex-col gap-3 min-h-full",
                            children: [
                                messages.length === 0 ? /*#__PURE__*/ (0, React.createElement)("div", {
                                    key: "empty-state-wrapper",
                                    className: "flex-1 flex flex-col items-center justify-center text-center select-none py-12",
                                    children: [
                                                /*#__PURE__*/ (0, React.createElement)("img", {
                                        key: "k4766_0_205",
                                        src: "/logo/brocus-logo.webp",
                                        alt: "Brocus Logo",
                                        className: "w-16 h-16 object-contain mb-4"
                                    }),
                                                /*#__PURE__*/ (0, React.createElement)("h2", {
                                        key: "k4766_1_206",
                                        className: "text-sm font-semibold text-[#191919]",
                                        children: "Brocus Assistant"
                                    }),
                                                /*#__PURE__*/ (0, React.createElement)("p", {
                                        key: "k4766_2_207",
                                        className: "text-[10px] text-[#8c8877] max-w-[200px] mt-1.5 leading-relaxed",
                                        children: "Ask me anything about your current session, general questions, or coding tasks."
                                    })
                                    ]
                                }) : messages.map((msg, idx) =>/*#__PURE__*/(0, React.createElement)("div", {
                                    key: msg.id || `msg-${idx}`,
                                    className: `flex flex-col text-xs gap-1.5 ${msg.role === 'user' ? 'bg-[#fc4b01] text-white self-end rounded-2xl rounded-tr-sm px-3.5 py-2.5 max-w-[85%] font-sans' : 'text-[#191919] self-start w-full py-2 px-1 max-w-full'}`,
                                    children: msg.role === 'user' ? /*#__PURE__*/ (0, React.createElement)("div", {
                                        className: "flex flex-col gap-1.5",
                                        children: [
                                            msg.imageUrl && /*#__PURE__*/ (0, React.createElement)("img", {
                                                key: "k4789_0_209",
                                                src: msg.imageUrl,
                                                className: "max-w-full max-h-[160px] object-cover rounded-lg border border-white/20 select-none shadow-xs",
                                                alt: "Uploaded content"
                                            }),
                                                        /*#__PURE__*/ (0, React.createElement)("span", {
                                                key: "k4789_1_210",
                                                className: "leading-relaxed font-sans",
                                                children: msg.text
                                            })
                                        ]
                                    }) : /*#__PURE__*/ (0, React.createElement)(React["Fragment"], {
                                        children: [
                                            msg.text.includes("Task Checklist") || msg.text.includes("Agent Thoughts") ? /*#__PURE__*/ (0, React.createElement)(AgentProgressCard, {
                                                key: "k4802_0_t_211",
                                                text: msg.text,
                                                active: idx === messages.length - 1 && isAgentActive,
                                                onLinkClick: (url) => openNewTabWithUrl(url)
                                            }) : /*#__PURE__*/ (0, React.createElement)(ChatMarkdown, {
                                                key: "k4802_0_f_212",
                                                text: msg.text,
                                                onLinkClick: (url) => openNewTabWithUrl(url)
                                            }),
                                            msg.role === 'assistant' && !(idx === messages.length - 1 && (isAgentActive || isTyping)) && /*#__PURE__*/ (0, React.createElement)("div", {
                                                key: "k4802_1_213",
                                                className: "flex items-center gap-3 mt-1.5 text-[#8c8877] select-none",
                                                children: [
                                                                /*#__PURE__*/ (0, React.createElement)("button", {
                                                    key: "k4812_0_214",
                                                    onClick: () => {
                                                        const cleanTxt = msg.text.replace(/\*\*Task Checklist\*\*[\s\S]*?\n\n/g, "").replace(/\*\*Agent Thoughts\*\*[\s\S]*?\n\n/g, "");
                                                        navigator.clipboard.writeText(cleanTxt);
                                                        setCopiedIndex(idx);
                                                        setTimeout(() => {
                                                            setCopiedIndex((prev) => prev === idx ? null : prev);
                                                        }, 1500);
                                                    },
                                                    className: "hover:text-[#191919] transition-colors p-0.5",
                                                    title: "Copy",
                                                    children: copiedIndex === idx ? /*#__PURE__*/ (0, React.createElement)("svg", {
                                                        viewBox: "0 0 24 24",
                                                        fill: "none",
                                                        stroke: "currentColor",
                                                        strokeWidth: "3",
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        className: "w-3.5 h-3.5 text-emerald-500",
                                                        children: /*#__PURE__*/ (0, React.createElement)("polyline", {
                                                            points: "20 6 9 17 4 12"
                                                        })
                                                    }) : /*#__PURE__*/ (0, React.createElement)("svg", {
                                                        viewBox: "0 0 24 24",
                                                        fill: "none",
                                                        stroke: "currentColor",
                                                        strokeWidth: "2.2",
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        className: "w-3.5 h-3.5",
                                                        children: [
                                                                            /*#__PURE__*/ (0, React.createElement)("rect", {
                                                            key: "k4837_0_220",
                                                            x: "9",
                                                            y: "9",
                                                            width: "13",
                                                            height: "13",
                                                            rx: "2",
                                                            ry: "2"
                                                        }),
                                                                            /*#__PURE__*/ (0, React.createElement)("path", {
                                                            key: "k4837_1_221",
                                                            d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                                                        })
                                                        ]
                                                    })
                                                }),
                                                                /*#__PURE__*/ (0, React.createElement)("button", {
                                                    key: "k4812_1_215",
                                                    onClick: () => {
                                                        const cleanSpeechText = msg.text.replace(/\*\*Task Checklist\*\*[\s\S]*?\n\n/g, "").replace(/\*\*Agent Thoughts\*\*[\s\S]*?\n\n/g, "");
                                                        const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
                                                        window.speechSynthesis.speak(utterance);
                                                    },
                                                    className: "hover:text-[#191919] transition-colors p-0.5",
                                                    title: "Read aloud",
                                                    children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                                        viewBox: "0 0 24 24",
                                                        fill: "none",
                                                        stroke: "currentColor",
                                                        strokeWidth: "2.2",
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        className: "w-3.5 h-3.5",
                                                        children: [
                                                                            /*#__PURE__*/ (0, React.createElement)("polygon", {
                                                            key: "k4868_0_222",
                                                            points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5"
                                                        }),
                                                                            /*#__PURE__*/ (0, React.createElement)("path", {
                                                            key: "k4868_1_223",
                                                            d: "M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"
                                                        })
                                                        ]
                                                    })
                                                }),
                                                                /*#__PURE__*/ (0, React.createElement)("button", {
                                                    key: "k4812_2_216",
                                                    className: "hover:text-[#191919] transition-colors p-0.5",
                                                    title: "Thumbs up",
                                                    children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                                        viewBox: "0 0 24 24",
                                                        fill: "none",
                                                        stroke: "currentColor",
                                                        strokeWidth: "2.2",
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        className: "w-3.5 h-3.5",
                                                        children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                            d: "M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
                                                        })
                                                    })
                                                }),
                                                                /*#__PURE__*/ (0, React.createElement)("button", {
                                                    key: "k4812_3_217",
                                                    className: "hover:text-[#191919] transition-colors p-0.5",
                                                    title: "Thumbs down",
                                                    children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                                        viewBox: "0 0 24 24",
                                                        fill: "none",
                                                        stroke: "currentColor",
                                                        strokeWidth: "2.2",
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        className: "w-3.5 h-3.5",
                                                        children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                            d: "M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm12-3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"
                                                        })
                                                    })
                                                }),
                                                                /*#__PURE__*/ (0, React.createElement)("button", {
                                                    key: "k4812_4_218",
                                                    onClick: () => {
                                                        const userMsgs = messages.filter((m) => m.role === 'user');
                                                        if (userMsgs.length > 0) {
                                                            const lastText = userMsgs[userMsgs.length - 1].text;
                                                            setAssistantInput(lastText);
                                                            handleSendAssistantMessage();
                                                        }
                                                    },
                                                    className: "hover:text-[#191919] transition-colors p-0.5",
                                                    title: "Retry",
                                                    children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                                        viewBox: "0 0 24 24",
                                                        fill: "none",
                                                        stroke: "currentColor",
                                                        strokeWidth: "2.2",
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        className: "w-3.5 h-3.5",
                                                        children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                            d: "M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"
                                                        })
                                                    })
                                                }),
                                                    msg.tokens && msg.tokens.totalTokens > 0 && /*#__PURE__*/ (0, React.createElement)("span", {
                                                        key: "k4812_5_219",
                                                        className: "text-[10px] text-[#6e6b5e] font-sans ml-2 shrink-0 select-none cursor-default",
                                                        title: `Input: ${msg.tokens.promptTokens} | Output: ${msg.tokens.completionTokens}`,
                                                        children: [
                                                            "(",
                                                            msg.tokens.totalTokens,
                                                            " tokens)"
                                                        ]
                                                    })
                                                ]
                                            })
                                        ]
                                    })
                                })),
                                isTyping && /*#__PURE__*/ (0, React.createElement)("div", {
                                    key: "k4783_1_208",
                                    className: "py-2.5 px-1.5 flex flex-col gap-1.5 self-start w-full font-sans",
                                    children: [
                                                /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: "k4956_0_224",
                                        className: "flex items-center gap-3",
                                        children: [
                                                        /*#__PURE__*/ (0, React.createElement)(BrocusAvatar, { key: "k4959_0_226", }),
                                                        /*#__PURE__*/ (0, React.createElement)("div", {
                                            key: "k4959_1_227",
                                            className: "flex items-center gap-1.5 text-[#6e6b5e]",
                                            children: [
                                                                /*#__PURE__*/ (0, React.createElement)("span", {
                                                key: "k4963_0_228",
                                                className: "w-1.5 h-1.5 rounded-full bg-[#8c8877] animate-bounce",
                                                style: {
                                                    animationDelay: '0ms'
                                                }
                                            }),
                                                                /*#__PURE__*/ (0, React.createElement)("span", {
                                                key: "k4963_1_229",
                                                className: "w-1.5 h-1.5 rounded-full bg-[#8c8877] animate-bounce",
                                                style: {
                                                    animationDelay: '150ms'
                                                }
                                            }),
                                                                /*#__PURE__*/ (0, React.createElement)("span", {
                                                key: "k4963_2_230",
                                                className: "w-1.5 h-1.5 rounded-full bg-[#8c8877] animate-bounce",
                                                style: {
                                                    animationDelay: '300ms'
                                                }
                                            })
                                            ]
                                        })
                                        ]
                                    })
                                    ]
                                })
                            ]
                        }) : /*#__PURE__*/ (0, React.createElement)("div", {
                            className: "flex flex-col gap-4 h-full",
                            children: [
                                        /*#__PURE__*/ (0, React.createElement)("div", {
                                key: "k5033_0_237",
                                className: "bg-[#f9f8f6] border border-[#e3e0d5] rounded-xl p-3 flex flex-col gap-2",
                                children: [
                                                /*#__PURE__*/ (0, React.createElement)("div", {
                                    key: "k5036_0_240",
                                    className: "flex items-center justify-between",
                                    children: [
                                                        /*#__PURE__*/ (0, React.createElement)("span", {
                                        key: "k5039_0_242",
                                        className: "text-[10px] text-[#8c8877] font-bold uppercase tracking-wider",
                                        children: "Active Tab indexing"
                                    }),
                                                        /*#__PURE__*/ (0, React.createElement)("button", {
                                        key: "k5039_1_243",
                                        onClick: handleIndexCurrentPage,
                                        disabled: indexStatus.status === "indexing" || activeTab.url === "about:newtab" || activeTab.url === "about:blank",
                                        className: "px-2.5 py-1 rounded bg-[#fc4b01] hover:bg-[#a34b2c] disabled:opacity-50 text-white font-bold text-[9px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1",
                                        children: indexStatus.status === "indexing" ? "Indexing..." : "Index Page"
                                    })
                                    ]
                                }),
                                    indexStatus.status !== "idle" && /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: "k5036_1_241",
                                        className: `text-[10px] p-2 rounded flex items-center justify-between font-sans border ${indexStatus.status === "indexing" ? "bg-amber-500/10 text-amber-800 border-amber-500/25" : indexStatus.status === "success" ? "bg-emerald-500/10 text-emerald-800 border-emerald-500/25" : "bg-rose-500/10 text-rose-800 border-rose-500/25"}`,
                                        children: [
                                                        /*#__PURE__*/ (0, React.createElement)("span", {
                                            key: "k5054_0_244",
                                            className: "truncate max-w-[200px]",
                                            children: indexStatus.message || "Processing..."
                                        }),
                                                        /*#__PURE__*/ (0, React.createElement)("button", {
                                            key: "k5054_1_245",
                                            onClick: () => setIndexStatus({
                                                status: "idle"
                                            }),
                                            className: "text-[9px] hover:text-[#191919] ml-2",
                                            children: "✕"
                                        })
                                        ]
                                    })
                                ]
                            }),
                                        /*#__PURE__*/ (0, React.createElement)("form", {
                                key: "k5033_1_238",
                                onSubmit: handleRagSearch,
                                className: "flex gap-2",
                                children: [
                                                /*#__PURE__*/ (0, React.createElement)("input", {
                                    key: "k5072_0_246",
                                    type: "text",
                                    value: ragSearchQuery,
                                    onChange: (e) => setRagSearchQuery(e.target.value),
                                    placeholder: "Search indexed pages semantically...",
                                    className: "flex-1 bg-[#f9f8f6] border border-[#e3e0d5] rounded-xl px-3 py-2 text-xs text-[#191919] placeholder-[#8c8877] focus:border-[#fc4b01] outline-none transition-all font-sans"
                                }),
                                                /*#__PURE__*/ (0, React.createElement)("button", {
                                    key: "k5072_1_247",
                                    type: "submit",
                                    disabled: isRagSearching,
                                    className: "px-3.5 py-2 rounded-xl bg-[#fc4b01] hover:bg-[#a34b2c] text-white text-xs font-bold transition-colors disabled:opacity-50",
                                    children: isRagSearching ? "..." : "Search"
                                })
                                ]
                            }),
                                        /*#__PURE__*/ (0, React.createElement)("div", {
                                key: "k5033_2_239",
                                className: "flex-1 overflow-y-auto flex flex-col gap-3 pr-1 pb-4",
                                children: searchError ? /*#__PURE__*/ (0, React.createElement)("div", {
                                    className: "text-center py-12 text-red-500 text-xs px-4",
                                    children: [
                                        "⚠️ ",
                                        searchError
                                    ]
                                }) : ragResults.length === 0 ? /*#__PURE__*/ (0, React.createElement)("div", {
                                    className: "text-center py-12 text-[#8c8877] text-[10px]",
                                    children: ragSearchQuery ? "No matching memories found." : "Search to retrieve webpage chunks from Qdrant."
                                }) : ragResults.map((res, idx) =>/*#__PURE__*/(0, React.createElement)("div", {
                                    key: res.id || `rag-${idx}`,
                                    className: "bg-[#f9f8f6] border border-[#e3e0d5] rounded-xl p-3.5 flex flex-col gap-2 text-xs",
                                    children: [
                                                        /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: "k5102_0_248",
                                        className: "flex items-center justify-between gap-2",
                                        children: [
                                                                /*#__PURE__*/ (0, React.createElement)("span", {
                                            key: "k5106_0_251",
                                            onClick: () => openNewTabWithUrl(res.url),
                                            className: "font-bold text-[#fc4b01] hover:text-[#a34b2c] hover:underline cursor-pointer truncate max-w-[190px]",
                                            title: res.url,
                                            children: res.title || "Untitled Page"
                                        }),
                                                                /*#__PURE__*/ (0, React.createElement)("span", {
                                            key: "k5106_1_252",
                                            className: "text-[9px] text-[#8c8877] font-semibold bg-black/5 px-1.5 py-0.5 rounded",
                                            children: [
                                                (res.score * 100).toFixed(1),
                                                "% Match"
                                            ]
                                        })
                                        ]
                                    }),
                                                        /*#__PURE__*/ (0, React.createElement)("p", {
                                        key: "k5102_1_249",
                                        className: "text-[11px] text-[#6e6b5e] leading-relaxed italic bg-black/5 p-2 rounded border border-[#e3e0d5] font-sans",
                                        children: [
                                            '"...',
                                            res.text,
                                            '..."'
                                        ]
                                    }),
                                                        /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: "k5102_2_250",
                                        className: "flex items-center justify-between text-[9px] text-[#8c8877] font-semibold",
                                        children: [
                                                                /*#__PURE__*/ (0, React.createElement)("span", {
                                            key: "k5132_0_253",
                                            className: "truncate max-w-[120px]",
                                            children: new URL(res.url).hostname
                                        }),
                                                                /*#__PURE__*/ (0, React.createElement)("span", {
                                            key: "k5132_1_254",
                                            children: [
                                                "Chunk ",
                                                res.chunkIndex + 1,
                                                "/",
                                                res.totalChunks
                                            ]
                                        })
                                        ]
                                    })
                                    ]
                                }))
                            })
                            ]
                        })
                    }),
                        assistantMode === "chat" && /*#__PURE__*/ (0, React.createElement)("div", {
                            key: "k4669_4_195",
                            className: "p-4 flex flex-col gap-2.5 border-t border-[#e3e0d5]",
                            children: activeQuestion ? /*#__PURE__*/ (0, React.createElement)(ActiveQuestionModal, {
                                key: "active_question_inline",
                                activeQuestion: activeQuestion,
                                onClose: () => setActiveQuestion(null)
                            }) : [

                                    /*#__PURE__*/ (0, React.createElement)("input", {
                                key: "k5155_1_256",
                                type: "file",
                                ref: fileInputRef,
                                onChange: handleFileChange,
                                accept: "image/*",
                                className: "hidden"
                            }),
                                    /*#__PURE__*/ (0, React.createElement)("form", {
                                key: "k5155_2_257",
                                onSubmit: (e) => {
                                    e.preventDefault();
                                    handleSendAssistantMessage();
                                },
                                className: "flex flex-col gap-2 bg-white border border-[#e3e0d5] rounded-2xl p-3 focus-within:border-[#fc4b01] transition-all",
                                children: [
                                    attachedImage && /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: "k5274_0_266",
                                        className: "relative w-12 h-12 rounded-lg border border-[#e3e0d5] bg-[#f9f8f6] p-0.5 shrink-0 group ml-1 mt-1",
                                        children: [
                                                    /*#__PURE__*/ (0, React.createElement)("img", {
                                            key: "k5281_0_268",
                                            src: attachedImage,
                                            className: "w-full h-full object-cover rounded-md",
                                            alt: "Attached upload"
                                        }),
                                                    /*#__PURE__*/ (0, React.createElement)("button", {
                                            key: "k5281_1_269",
                                            type: "button",
                                            onClick: () => {
                                                setAttachedImage(null);
                                                if (fileInputRef.current) fileInputRef.current.value = "";
                                            },
                                            className: "absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold shadow-sm",
                                            children: "✕"
                                        })
                                        ]
                                    }),
                                            /*#__PURE__*/ (0, React.createElement)("textarea", {
                                        key: "k5300_1_271",
                                        rows: 1,
                                        ref: (el) => {
                                            if (el) {
                                                el.style.height = 'auto';
                                                el.style.height = Math.min(el.scrollHeight, 20 * 18) + 'px';
                                                el.style.overflowY = el.scrollHeight > (20 * 18) ? 'auto' : 'hidden';
                                            }
                                        },
                                        value: assistantInput,
                                        onChange: (e) => setAssistantInput(e.target.value),
                                        onKeyDown: (e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                if (assistantInput.trim() || attachedImage) {
                                                    handleSendAssistantMessage();
                                                }
                                            }
                                        },
                                        placeholder: "Ask a question or instruct a browser task...",
                                        className: "w-full bg-transparent text-[13px] outline-none border-none text-[#191919] placeholder-[#8c8877] font-sans resize-none py-1 leading-[18px]"
                                    }),
                                            /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: "k5274_1_267",
                                        className: "flex items-center justify-between w-full mt-0.5",
                                        children: [
                                                    /*#__PURE__*/ (0, React.createElement)("div", {
                                            key: "action-left",
                                            className: "flex items-center gap-1 relative",
                                            children: [
                                                        /*#__PURE__*/ (0, React.createElement)("button", {
                                                key: "k5300_0_270",
                                                type: "button",
                                                onClick: () => setIsPlusMenuOpen(!isPlusMenuOpen),
                                                className: "w-8 h-8 rounded-full flex items-center justify-center text-[#8c8877] hover:text-[#191919] hover:bg-black/5 active:scale-95 transition-all",
                                                title: "Add Context & Plan",
                                                children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                                    viewBox: "0 0 24 24",
                                                    fill: "none",
                                                    stroke: "currentColor",
                                                    strokeWidth: "2",
                                                    className: "w-4 h-4 text-[#fc4b01]",
                                                    children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        d: "M12 4.5v15m7.5-7.5h-15"
                                                    })
                                                })
                                            }),
                                                        /*#__PURE__*/ (0, React.createElement)(PlusContextMenu, {
                                                key: "plus_menu_ctx",
                                                isOpen: isPlusMenuOpen,
                                                onClose: () => setIsPlusMenuOpen(false),
                                                onSelectMedia: () => fileInputRef.current?.click(),
                                                onSelectMentions: () => {
                                                    setAssistantInput((prev) => prev + " @tabs ");
                                                },
                                                onSelectPlanMode: () => {
                                                    setAssistantInput("/plan ");
                                                }
                                            }),
                                                        /*#__PURE__*/ (0, React.createElement)("div", {
                                                key: "tabs-in-action-bar",
                                                className: "flex items-center gap-1.5 select-none text-[10px] font-semibold text-[#8c8877]",
                                                children: (() => {
                                                    let currentWidth = 0;
                                                    const visible = [];
                                                    const overflow = [];
                                                    for (let i = 0; i < tabs.length; i++) {
                                                        const tab = tabs[i];
                                                        const title = tab.title || "New Tab";
                                                        const approxWidth = 32 + title.length * 6;
                                                        if (currentWidth + approxWidth <= 150) {
                                                            visible.push(tab);
                                                            currentWidth += approxWidth + 8;
                                                        } else {
                                                            if (visible.length === 0) {
                                                                visible.push(tab);
                                                                currentWidth += approxWidth + 8;
                                                            } else {
                                                                overflow.push(tab);
                                                            }
                                                        }
                                                    }
                                                    return /*#__PURE__*/ (0, React.createElement)(React["Fragment"], {
                                                        children: [
                                                            visible.map((tab, idx) => {
                                                                const isTabActive = tab.id === activeTab.id;
                                                                const faviconUrl = (0, getFaviconUrl)(tab);
                                                                return /*#__PURE__*/ (0, React.createElement)("div", {
                                                                    key: tab.id,
                                                                    className: `flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${isTabActive ? "bg-[#fc4b01]/10 text-[#fc4b01]" : "hover:bg-black/5 hover:text-[#191919]"}`,
                                                                    onClick: () => setActiveTabId(tab.id),
                                                                    title: tab.title || "New Tab",
                                                                    children: [
                                                                        faviconUrl ? /*#__PURE__*/ (0, React.createElement)("img", {
                                                                            key: "fav",
                                                                            src: faviconUrl,
                                                                            className: "w-3.5 h-3.5 rounded-sm shrink-0 object-contain bg-transparent",
                                                                            alt: "",
                                                                            onError: (e) => {
                                                                                e.target.style.display = 'none';
                                                                            }
                                                                        }) : /*#__PURE__*/ (0, React.createElement)("div", {
                                                                            key: "fav-fallback",
                                                                            className: "w-3.5 h-3.5 rounded-full bg-[#fc4b01]/20 text-[#fc4b01] flex items-center justify-center shrink-0",
                                                                            children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                                                                viewBox: "0 0 24 24",
                                                                                fill: "none",
                                                                                stroke: "currentColor",
                                                                                strokeWidth: "2.5",
                                                                                className: "w-2.5 h-2.5",
                                                                                children: [
                                                                                                /*#__PURE__*/ (0, React.createElement)("path", {
                                                                                    key: "p1",
                                                                                    d: "M12 2a10 10 0 0 1 10 10"
                                                                                }),
                                                                                                /*#__PURE__*/ (0, React.createElement)("path", {
                                                                                    key: "p2",
                                                                                    d: "M12 6a6 6 0 0 1 6 6"
                                                                                })
                                                                                ]
                                                                            })
                                                                        }),
                                                                                    /*#__PURE__*/ (0, React.createElement)("span", {
                                                                            key: "title",
                                                                            className: "truncate max-w-[90px] font-medium",
                                                                            children: tab.title || "New Tab"
                                                                        })
                                                                    ]
                                                                });
                                                            }),
                                                            overflow.length > 0 && /*#__PURE__*/ (0, React.createElement)("div", {
                                                                key: "overflow",
                                                                className: "flex items-center -space-x-1.5 ml-1 shrink-0",
                                                                children: overflow.map((oTab, oIdx) => {
                                                                    const faviconUrl = (0, getFaviconUrl)(oTab);
                                                                    return /*#__PURE__*/ (0, React.createElement)("div", {
                                                                        key: oTab.id,
                                                                        onClick: () => setActiveTabId(oTab.id),
                                                                        className: "relative cursor-pointer hover:z-10 group transition-all",
                                                                        title: oTab.title || "New Tab",
                                                                        style: {
                                                                            zIndex: 10 - oIdx
                                                                        },
                                                                        children: faviconUrl ? /*#__PURE__*/ (0, React.createElement)("img", {
                                                                            src: faviconUrl,
                                                                            className: "w-3.5 h-3.5 rounded-sm object-contain bg-[#f9f8f6] border border-[#e3e0d5] shadow-xs",
                                                                            alt: "",
                                                                            onError: (e) => {
                                                                                e.target.style.display = 'none';
                                                                            }
                                                                        }) : /*#__PURE__*/ (0, React.createElement)("div", {
                                                                            className: "w-3.5 h-3.5 rounded-full bg-[#fc4b01]/20 text-[#fc4b01] flex items-center justify-center border border-[#e3e0d5] text-[7px] font-bold shadow-xs",
                                                                            children: oTab.title ? oTab.title.charAt(0).toUpperCase() : "N"
                                                                        })
                                                                    });
                                                                })
                                                            })
                                                        ]
                                                    });
                                                })()
                                            })
                                            ]
                                        }),
                                                    /*#__PURE__*/ (0, React.createElement)("div", {
                                            key: "k5300_2_272",
                                            className: "flex items-center gap-1 shrink-0",
                                            children: isAgentActive || isTyping ? /*#__PURE__*/ (0, React.createElement)("button", {
                                                key: "stop-btn",
                                                type: "button",
                                                onClick: () => {
                                                    if (isAgentActive) {
                                                        handleCancelAgent();
                                                    } else {
                                                        setIsTyping(false);
                                                    }
                                                },
                                                className: "w-8 h-8 rounded-full bg-[#191919] hover:bg-black flex items-center justify-center text-white active:scale-95 transition-all shrink-0 shadow-sm",
                                                title: "Stop Generation",
                                                children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                                    viewBox: "0 0 24 24",
                                                    fill: "currentColor",
                                                    className: "w-3 h-3",
                                                    children: /*#__PURE__*/ (0, React.createElement)("rect", {
                                                        x: "6",
                                                        y: "6",
                                                        width: "12",
                                                        height: "12",
                                                        rx: "1"
                                                    })
                                                })
                                            }) : /*#__PURE__*/ (0, React.createElement)("button", {
                                                key: "send-btn",
                                                type: "submit",
                                                disabled: !assistantInput.trim() && !attachedImage,
                                                className: `w-8 h-8 rounded-full flex items-center justify-center text-white active:scale-95 transition-all shrink-0 shadow-sm ${!assistantInput.trim() && !attachedImage ? "bg-[#e3e0d5] cursor-not-allowed" : "bg-[#fc4b01] hover:bg-[#a34b2c]"}`,
                                                title: "Send Message",
                                                children: /*#__PURE__*/ (0, React.createElement)("svg", {
                                                    viewBox: "0 0 24 24",
                                                    fill: "none",
                                                    stroke: "currentColor",
                                                    strokeWidth: "2.5",
                                                    className: "w-4 h-4 ml-0.5",
                                                    children: /*#__PURE__*/ (0, React.createElement)("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        d: "M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                                                    })
                                                })
                                            })
                                        })
                                        ]
                                    })
                                ]
                            })
                            ]
                        })
                    ]
                })
            ]
        }),
            isSearchTabsOpen && /*#__PURE__*/ (0, React.createElement)(React.Fragment, {
                key: "k2970_2_19",
                children: [
                    /*#__PURE__*/ (0, React.createElement)("div", {
                    key: "k5381_0_273",
                    className: "fixed inset-0 bg-black/40 z-[999998] backdrop-blur-[1px]",
                    onClick: () => setIsSearchTabsOpen(false)
                }),
                    /*#__PURE__*/ (0, React.createElement)("div", {
                    key: "k5381_1_274",
                    className: "fixed top-[150px] left-1/2 -translate-x-1/2 w-full max-w-lg bg-[#202221] border border-zinc-800 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-[999999] p-3 flex flex-col gap-2 font-sans select-none",
                    children: [
                            /*#__PURE__*/ (0, React.createElement)("div", {
                        key: "k5387_0_275",
                        className: "flex items-center gap-2 px-3 py-2 bg-[#2c2c2c] border border-zinc-700/60 rounded-xl",
                        children: [
                                    /*#__PURE__*/ (0, React.createElement)("svg", {
                            key: "k5390_0_277",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: "2.2",
                            className: "w-4 h-4 text-zinc-400 shrink-0",
                            children: /*#__PURE__*/ (0, React.createElement)("path", {
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                d: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                            })
                        }),
                                    /*#__PURE__*/ (0, React.createElement)("input", {
                            key: "k5390_1_278",
                            type: "text",
                            autoFocus: true,
                            value: tabSearchQuery,
                            onChange: (e) => setTabSearchQuery(e.target.value),
                            placeholder: "Search open tabs...",
                            className: "bg-transparent text-sm text-white outline-none flex-1 font-sans placeholder-zinc-500"
                        })
                        ]
                    }),
                            /*#__PURE__*/ (0, React.createElement)("div", {
                        key: "k5387_1_276",
                        className: "flex flex-col gap-0.5 max-h-[300px] overflow-y-auto mt-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-700",
                        children: tabs
                            .filter(t => {
                                const q = tabSearchQuery.toLowerCase();
                                return t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q);
                            })
                            .map((t) => {
                                const isTabActive = t.id === activeTabId;
                                return /*#__PURE__*/ (0, React.createElement)("button", {
                                    key: `search-item-${t.id}`,
                                    onClick: () => {
                                        setActiveTabId(t.id);
                                        setIsSearchTabsOpen(false);
                                    },
                                    className: `w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between hover:bg-zinc-800 ${isTabActive ? "bg-zinc-800/40 text-[#fc4b01]" : "text-zinc-300"}`,
                                    children: [
                                                /*#__PURE__*/ (0, React.createElement)("div", {
                                        key: "k5424_0_279",
                                        className: "flex items-center gap-2.5 min-w-0 flex-1",
                                        children: [
                                            t.isIncognito
                                                ? renderIncognitoIcon("w-4 h-4 text-[#fc4b01] shrink-0")
                                                : /*#__PURE__*/ (0, React.createElement)("img", {
                                                    key: "k5432_0_f_281",
                                                    src: getFaviconUrl(t),
                                                    alt: "",
                                                    className: "w-4 h-4 object-contain shrink-0 rounded-sm",
                                                    onError: (e) => {
                                                        e.target.src = "/logo/brocus-logo.webp";
                                                    }
                                                }),
                                                        /*#__PURE__*/ (0, React.createElement)("div", {
                                                    key: "k5432_1_282",
                                                    className: "flex flex-col min-w-0 flex-1",
                                                    children: [
                                                                /*#__PURE__*/ (0, React.createElement)("span", {
                                                        key: "k5445_0_283",
                                                        className: "text-xs font-semibold truncate",
                                                        children: t.title || "New Tab"
                                                    }),
                                                                /*#__PURE__*/ (0, React.createElement)("span", {
                                                        key: "k5445_1_284",
                                                        className: "text-[10px] text-zinc-500 truncate mt-0.5",
                                                        children: t.url
                                                    })
                                                    ]
                                                })
                                        ]
                                    }),
                                        isTabActive && /*#__PURE__*/ (0, React.createElement)("span", {
                                            key: "k5424_1_280",
                                            className: "text-[10px] font-bold text-[#fc4b01] bg-[#fc4b01]/20 px-2 py-0.5 rounded-full uppercase tracking-wider",
                                            children: "Active"
                                        })
                                    ]
                                });
                            })
                    })
                    ]
                })
                ]
            }),
            /*#__PURE__*/ (0, React.createElement)(VisualPointerHand, {
                key: "k2970_3_20",
                handPosition: handPosition
            }),
            /*#__PURE__*/ (0, React.createElement)(AgentStatusOverlay, {
                key: "k2970_4_21",
                active: isAgentActive,
                thought: agentThought,
                onCancel: handleCancelAgent
            }),

            // Perplexity Direct Login Card in the Bottom Right Corner
            /*#__PURE__*/ (0, React.createElement)(PerplexityLoginCard, {
                key: "k2970_6_23",
                isOpen: isPerplexityModalOpen,
                onClose: () => setIsPerplexityModalOpen(false),
                isAssistantOpen: isAssistantOpen,
                assistantWidth: assistantWidth
            }),
            /*#__PURE__*/ (0, React.createElement)(UpdateBanner, {
                key: "update-banner"
            }),
            isPhoneReportFullscreen && /*#__PURE__*/ (0, React.createElement)("div", {
                key: "phone-report-fullscreen",
                className: "fixed inset-0 z-[1000] bg-[#f4f3ee] flex flex-col animate-in fade-in duration-150",
                children: [
                        /*#__PURE__*/ (0, React.createElement)("div", {
                        key: "plfs-header",
                        className: "h-14 px-5 flex items-center justify-between border-b border-[#e3e0d5] shrink-0",
                        children: [
                                    /*#__PURE__*/ (0, React.createElement)("span", {
                                key: "plfs-title",
                                className: "text-xs font-bold uppercase tracking-wider text-[#8c8877] select-none",
                                children: "Phone LookUp Report"
                            }),
                                    /*#__PURE__*/ (0, React.createElement)("form", {
                                key: "plfs-searchbar",
                                onSubmit: (e: any) => { e.preventDefault(); runPhoneLookup(); },
                                className: "flex-1 max-w-2xl mx-6",
                                children: /*#__PURE__*/ (0, React.createElement)("div", {
                                    className: "flex items-center gap-2 rounded-full bg-[#1a1a1a] px-4 py-2 border border-white/10 shadow-[0_4px_14px_rgba(0,0,0,0.15)] focus-within:border-[#fc4b01]/60 transition-all",
                                    children: [
                                        /*#__PURE__*/ (0, React.createElement)(Search, { key: "plfs-search-icon", size: 15, className: "text-white/40 shrink-0" }),
                                        /*#__PURE__*/ (0, React.createElement)("input", {
                                            key: "plfs-search-input",
                                            value: phoneLookupInput,
                                            onChange: (e: any) => setPhoneLookupInput(e.target.value),
                                            placeholder: "Search a phone number...",
                                            className: "flex-1 bg-transparent outline-none text-[13px] text-white placeholder:text-white/30 font-sans min-w-0"
                                        }),
                                        /*#__PURE__*/ (0, React.createElement)("button", {
                                            key: "plfs-search-btn",
                                            type: "submit",
                                            className: "shrink-0 text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full text-white transition-all hover:brightness-110",
                                            style: { background: "linear-gradient(135deg, #fc4b01 0%, #c43e01 100%)" },
                                            children: "Search"
                                        })
                                    ]
                                })
                            }),
                                    /*#__PURE__*/ (0, React.createElement)("div", {
                                key: "plfs-actions",
                                className: "flex items-center gap-1",
                                children: [
                                            /*#__PURE__*/ (0, React.createElement)("button", {
                                        key: "plfs-min",
                                        title: "Minimize to panel",
                                        onClick: () => setIsPhoneReportFullscreen(false),
                                        className: "p-2 rounded-lg text-[#8c8877] hover:text-[#191919] hover:bg-black/5 transition-all",
                                        children: /*#__PURE__*/ (0, React.createElement)(Minus, { size: 18 })
                                    }),
                                            /*#__PURE__*/ (0, React.createElement)("button", {
                                        key: "plfs-close",
                                        title: "Close",
                                        onClick: () => { setIsPhoneReportFullscreen(false); setIsPhonePanelOpen(false); },
                                        className: "p-2 rounded-lg text-[#8c8877] hover:text-[#191919] hover:bg-black/5 transition-all",
                                        children: /*#__PURE__*/ (0, React.createElement)(X, { size: 18 })
                                    })
                                ]
                            })
                        ]
                    }),
                        /*#__PURE__*/ (0, React.createElement)("div", {
                        key: "plfs-body",
                        className: "flex-1 overflow-y-auto py-6",
                        style: { paddingLeft: 96, paddingRight: 96 },
                        children: /*#__PURE__*/ (0, React.createElement)("div", {
                            className: "w-full flex flex-col gap-5",
                            children: [
                                phoneLookupProfiles.length > 0 && /*#__PURE__*/ (0, React.createElement)("div", {
                                    key: "plfs-profiles",
                                    className: "flex gap-4 overflow-x-auto px-4 py-10 items-center",
                                    children: phoneLookupProfiles.map((p, i) => {
                                        const chips = (p.includes || "").replace(/✓/g, "").split(/\s{2,}|\n/).map(s => s.trim()).filter(s => s && !/^includes$/i.test(s)).slice(0, 3);
                                        const locParts = p.livesAt.split(",").map(s => s.trim());
                                        const locLabel = locParts.length > 1 ? locParts.slice(-1)[0] : (p.livesAt || "Unknown");
                                        return /*#__PURE__*/ (0, React.createElement)("div", {
                                            key: `profile-${i}`,
                                            className: `rounded-3xl ${p.bestMatch ? "px-8 py-5 min-h-[240px] mx-6" : "p-4 min-h-[170px]"} flex flex-col gap-3 relative overflow-hidden text-white shrink-0`,
                                            style: { background: "linear-gradient(165deg, #2f2f2f 0%, #0c0c0c 100%)", fontFamily: "'Poppins', system-ui, sans-serif", width: p.bestMatch ? "440px" : "300px", ...(p.bestMatch ? { boxShadow: "0 0 0 1px rgba(0,0,0,0.8), 0 0 30px 6px rgba(0,0,0,0.55), 0 8px 20px rgba(0,0,0,0.4)" } : { boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }) },
                                            children: [
                                                            /*#__PURE__*/ (0, React.createElement)("div", {
                                                    key: "dots",
                                                    className: "absolute inset-0 pointer-events-none opacity-25",
                                                    style: { backgroundImage: "radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)", backgroundSize: "14px 14px" }
                                                }),
                                                            /*#__PURE__*/ (0, React.createElement)("div", {
                                                    key: "ptop",
                                                    className: "relative flex items-start justify-between",
                                                    children: [
                                                                /*#__PURE__*/ (0, React.createElement)("div", {
                                                            key: "avatars",
                                                            className: "flex -space-x-2.5",
                                                            children: [
                                                                        /*#__PURE__*/ (0, React.createElement)("div", {
                                                                    key: "a1",
                                                                    className: "w-9 h-9 rounded-full bg-[#fc4b01] border-2 border-[#1a1a1a] flex items-center justify-center text-xs font-bold text-white",
                                                                    children: (p.name || "?").charAt(0).toUpperCase()
                                                                }),
                                                                        /*#__PURE__*/ (0, React.createElement)("div", {
                                                                    key: "a2",
                                                                    className: "w-9 h-9 rounded-full bg-zinc-600 border-2 border-[#1a1a1a] flex items-center justify-center text-xs font-bold text-white/70",
                                                                    children: (p.name.split(" ").slice(-1)[0] || "?").charAt(0).toUpperCase()
                                                                })
                                                            ]
                                                        }),
                                                                p.bestMatch && /*#__PURE__*/ (0, React.createElement)("span", {
                                                            key: "pbm",
                                                            className: "flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-white/15 text-white/90 px-2.5 py-1 rounded-lg",
                                                            children: [
                                                                        /*#__PURE__*/ (0, React.createElement)(Star, { key: "star", size: 11, fill: "#fbbf24", color: "#fbbf24" }),
                                                                        "Best Match"
                                                            ]
                                                        })
                                                    ]
                                                }),
                                                            /*#__PURE__*/ (0, React.createElement)("div", {
                                                    key: "ptitle",
                                                    className: "relative flex flex-col",
                                                    children: [
                                                                /*#__PURE__*/ (0, React.createElement)("span", {
                                                            key: "psub",
                                                            className: "text-[10px] text-white/50 font-sans",
                                                            children: p.bestMatch ? "Current Owner" : "Possible Owner"
                                                        }),
                                                                /*#__PURE__*/ (0, React.createElement)("h3", {
                                                            key: "pname",
                                                            className: `${p.bestMatch ? "text-xl" : "text-base"} font-semibold font-sans text-white truncate`,
                                                            children: `${p.name}${p.age ? `, ${p.age}` : ""}`
                                                        })
                                                    ]
                                                }),
                                                            chips.length > 0 && /*#__PURE__*/ (0, React.createElement)("div", {
                                                    key: "pchips",
                                                    className: "relative flex flex-wrap gap-1.5",
                                                    children: chips.map((c, ci) => /*#__PURE__*/ (0, React.createElement)("span", {
                                                        key: `chip-${ci}`,
                                                        className: "text-[9px] font-bold uppercase tracking-wider bg-white/10 text-white/80 px-2.5 py-1 rounded-md",
                                                        children: c
                                                    }))
                                                }),
                                                            p.aka && /*#__PURE__*/ (0, React.createElement)("span", {
                                                    key: "paka",
                                                    className: "relative text-[10px] text-white/40 font-sans truncate",
                                                    children: `AKA ${p.aka}`
                                                }),
                                                            p.livedIn && /*#__PURE__*/ (0, React.createElement)("span", {
                                                    key: "plived",
                                                    className: "relative text-[10px] text-white/40 font-sans truncate",
                                                    children: `Lived in ${p.livedIn}`
                                                }),
                                                            p.relatedTo && /*#__PURE__*/ (0, React.createElement)("span", {
                                                    key: "prel",
                                                    className: "relative text-[10px] text-white/40 font-sans truncate",
                                                    children: `Related: ${p.relatedTo}`
                                                }),
                                                            /*#__PURE__*/ (0, React.createElement)("div", {
                                                    key: "pbottom",
                                                    className: "relative mt-auto pt-3 border-t border-white/10 flex items-end justify-between",
                                                    children: [
                                                                /*#__PURE__*/ (0, React.createElement)("div", {
                                                            key: "ploc",
                                                            className: "flex flex-col",
                                                            children: [
                                                                        /*#__PURE__*/ (0, React.createElement)("span", {
                                                                    key: "plocv",
                                                                    className: `${p.bestMatch ? "text-base" : "text-sm"} font-bold text-white font-sans`,
                                                                    children: locLabel
                                                                }),
                                                                        /*#__PURE__*/ (0, React.createElement)("span", {
                                                                    key: "plocl",
                                                                    className: "text-[9px] text-white/50 font-sans uppercase tracking-wider",
                                                                    children: "Current Location"
                                                                })
                                                            ]
                                                        }),
                                                                /*#__PURE__*/ (0, React.createElement)("button", {
                                                            key: "pview",
                                                            onClick: () => openPhoneLookupProfile(p),
                                                            className: `bg-white hover:bg-[#fc4b01] hover:text-white text-black text-[10px] font-bold uppercase tracking-wider ${p.bestMatch ? "px-4 py-2" : "px-3 py-1.5"} rounded-[5px] transition-all`,
                                                            children: "View Details"
                                                        })
                                                    ]
                                                })
                                        ]
                                        });
                                    })
                                }),
                                phoneLookupResult && isPhoneDetailView ? /*#__PURE__*/ (0, React.createElement)(React.Fragment, {
                                    key: "plfs-report",
                                    children: renderPhoneLookupReport(true)
                                }) : phoneLookupProfiles.length > 0 ? (isPhoneDetailView ? /*#__PURE__*/ (0, React.createElement)("div", {
                                    key: "plfs-loading",
                                    className: "flex items-center justify-center py-10 gap-2 text-[#8c8877]",
                                    children: [
                                                /*#__PURE__*/ (0, React.createElement)("div", { key: "spin", className: "w-4 h-4 border-2 border-[#fc4b01]/30 border-t-[#fc4b01] rounded-full animate-spin" }),
                                                /*#__PURE__*/ (0, React.createElement)("span", { key: "txt", className: "text-xs font-sans", children: "Loading profile details..." })
                                    ]
                                }) : null) : /*#__PURE__*/ (0, React.createElement)("div", {
                                key: "plfs-empty",
                                className: "h-full min-h-[50vh] flex flex-col items-center justify-center gap-3",
                                children: [
                                            /*#__PURE__*/ (0, React.createElement)(Search, {
                                        key: "plfs-empty-icon",
                                        size: 28,
                                        className: "text-[#8c8877]/50"
                                    }),
                                            /*#__PURE__*/ (0, React.createElement)("span", {
                                        key: "plfs-empty-title",
                                        className: "text-sm font-bold text-[#55534a] font-sans",
                                        children: "Enter a phone number in the search bar above"
                                    })
                                ]
                            })
                            ]
                        })
                    })
                ]
            })
        ]
    });
}

const __TURBOPACK__default__export__ = Home;

export default Home;
