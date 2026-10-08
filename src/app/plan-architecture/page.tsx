"use client";

import React, { useState, useRef, useEffect } from "react";
import { Star, RefreshCw, Plus, Mic, ArrowUp, X, Check, Globe, Camera, Copy, Share2, RotateCcw, AlertTriangle, Upload, AtSign, Key, Video, ChevronDown } from "lucide-react";
import { HexColorPicker } from "react-colorful";

interface CustomFontPickerProps {
  label: string;
  value: string;
  onChange: (font: string) => void;
  fonts: string[];
}

function CustomFontPicker({ label, value, onChange, fonts }: CustomFontPickerProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [visibleCount, setVisibleCount] = useState<number>(40);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setVisibleCount(40);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 40) {
      setVisibleCount((prev) => Math.min(prev + 40, fonts.length));
    }
  };

  const filtered = fonts.filter((f) =>
    f.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Batch load Google Font CSS for all visible fonts in ONE single HTTP request
  useEffect(() => {
    if (!isOpen) return;
    const currentBatch = filtered.slice(0, visibleCount);
    if (currentBatch.length === 0) return;

    // Split into chunks of 30 families per request URL to stay well within browser URL limit
    const chunkSize = 30;
    for (let i = 0; i < currentBatch.length; i += chunkSize) {
      const chunk = currentBatch.slice(i, i + chunkSize);
      const chunkHash = chunk.map((f) => f.replace(/\s+/g, "")).join("-");
      const linkId = `google-fonts-batch-${chunkHash}`;

      if (!document.getElementById(linkId)) {
        const familyQuery = chunk
          .map((f) => `family=${encodeURIComponent(f)}`)
          .join("&");
        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?${familyQuery}&display=swap`;
        document.head.appendChild(link);
      }
    }
  }, [isOpen, visibleCount, filtered]);

  return (
    <div className="flex items-center gap-3 relative" ref={containerRef}>
      <span className="font-['Poppins'] text-[18px] font-normal text-[#191919] select-none">
        {label}
      </span>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-[#EFECE4] border border-[#E2DDD2] rounded-xl text-[14px] font-medium font-['Poppins'] text-[#333] cursor-pointer hover:bg-[#E4E0D5] hover:border-[#D4CEBF] transition-all shadow-2xs flex items-center justify-between gap-3 min-w-[150px] active:scale-95"
      >
        <span style={{ fontFamily: value }} className="truncate">{value}</span>
        <span className="text-[10px] text-gray-500">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 max-h-80 bg-white border border-[#E2DDD2] rounded-2xl shadow-xl z-50 p-2.5 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-150">
          <input
            type="text"
            placeholder={`Search ${fonts.length > 100 ? `${fonts.length}+` : "1,700+"} Google Fonts...`}
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full px-3 py-1.5 bg-[#F9F9F7] border border-gray-200 rounded-xl text-xs outline-none focus:border-[#DE7356] font-['Poppins'] shrink-0"
            autoFocus
          />
          <div
            onScroll={handleScroll}
            className="overflow-y-auto max-h-60 custom-thin-scrollbar flex flex-col gap-0.5"
          >
            {filtered.slice(0, visibleCount).map((font) => (
              <button
                key={font}
                type="button"
                onClick={() => {
                  onChange(font);
                  setIsOpen(false);
                }}
                style={{ fontFamily: font }}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  value === font
                    ? "bg-[#191919] text-white font-medium"
                    : "text-gray-800 hover:bg-[#F2EFE7]"
                }`}
              >
                {font}
              </button>
            ))}
            {visibleCount < filtered.length && (
              <div className="py-2 text-[11px] text-center text-gray-400 font-['Poppins'] animate-pulse">
                Scroll to load more fonts... ({visibleCount} of {filtered.length})
              </div>
            )}
            {filtered.length === 0 && (
              <div className="text-xs text-gray-400 p-3 text-center">
                No Google Font matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const PHASES = [
  { id: 1, name: "Planning & Design", title: "PLANNING & DESIGN" },
  { id: 2, name: "Tech Stack & Setup", title: "TECH STACK & SETUP" },
  { id: 3, name: "Database Design", title: "DATABASE DESIGN" },
  { id: 4, name: "Backend Development", title: "BACKEND DEVELOPMENT" },
  { id: 5, name: "Frontend Development", title: "FRONTEND DEVELOPMENT" },
  { id: 6, name: "3rd party Integrations", title: "3RD PARTY INTEGRATIONS" },
  { id: 7, name: "Testing & QA", title: "TESTING & QA" },
  { id: 8, name: "Deployment & Hosting", title: "DEPLOYMENT & HOSTING" }
];

const THEMES = [
  "Mordern",
  "Classic",
  "Minimal",
  "Colorful",
  "Corporate",
  "Creative",
  "Dark mode",
  "Light mode",
  "brutalism",
  "Dark & Light mode both"
];

const PRIMARY_GOALS = [
  "Generate leads",
  "Sell products",
  "Book appointments",
  "Share information",
  "Build community"
];

const WEBSITE_TYPES = [
  "Business",
  "Portfolio",
  "Blog",
  "Ecommerce",
  "Landing Page",
  "Educational",
  "SaaS",
  "Marketplace",
  "Social Network",
  "Directory"
];

const COLOR_TEMPLATES = [
  { id: 1, name: "Crimson Red", colors: ["#FF4D4D", "#D9534F", "#C02A2A", "#800000", "#4A0000"] },
  { id: 2, name: "Golden Mustard", colors: ["#FFC107", "#E69D00", "#CA8A00", "#A66E00", "#734A00"] },
  { id: 3, name: "Emerald Green", colors: ["#00C853", "#00A843", "#008833", "#006823", "#004813"] },
  { id: 4, name: "Terracotta Coral", colors: ["#E06D53", "#D35438", "#B84126", "#983119", "#73200D"] },
  { id: 5, name: "Ocean Blue", colors: ["#00B0FF", "#0091EA", "#0072C6", "#00549E", "#003875"] }
];

interface AttachedFileItem {
  id: string;
  name: string;
  subText?: string;
  ext: string;
}

export default function PlanArchitecturePage() {
  const [activePhaseId, setActivePhaseId] = useState<number>(1);
  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const [ideaText, setIdeaText] = useState<string>("");
  const [refWebsiteText, setRefWebsiteText] = useState<string>("");
  const [fontRefWebsiteText, setFontRefWebsiteText] = useState<string>("");
  const [websiteNameText, setWebsiteNameText] = useState<string>("");
  const [websiteLogoUrl, setWebsiteLogoUrl] = useState<string | null>(null);
  const [selectedDesignSource, setSelectedDesignSource] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  // Question 6 states
  const [refUrlInput, setRefUrlInput] = useState<string>("");
  const [savedRefUrls, setSavedRefUrls] = useState<string[]>([]);
  const [openAccordionIdx, setOpenAccordionIdx] = useState<number | null>(null);

  // Question 7 states
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [customGoalText, setCustomGoalText] = useState<string>("");

  // Question 8 states
  const [selectedWebsiteType, setSelectedWebsiteType] = useState<string | null>(null);
  const [customWebsiteTypeText, setCustomWebsiteTypeText] = useState<string>("");

  // Question 9 states
  const [selectedColorTemplate, setSelectedColorTemplate] = useState<number | string | null>(null);
  const [isColorModalOpen, setIsColorModalOpen] = useState<boolean>(false);
  const [activeColorIdx, setActiveColorIdx] = useState<number>(0);
  const [customColors, setCustomColors] = useState<string[]>([
    "#DE7356", "#E88A70", "#F2A18A", "#FBB8A4", "#FFD0C0"
  ]);

  // Question 3 font selection states
  const [selectedFontSource, setSelectedFontSource] = useState<string | null>(null);
  const [headingFont, setHeadingFont] = useState<string>("Poppins");
  const [contentFont, setContentFont] = useState<string>("KumbhSans");

  // Live Google Fonts catalog state (fetched straight from Google Fonts API)
  const [googleFontsList, setGoogleFontsList] = useState<string[]>([
    "Poppins", "Inter", "Roboto", "Open Sans", "Montserrat", "Lato", "Oswald", "Raleway",
    "Nunito", "Ubuntu", "Merriweather", "Playfair Display", "Rubik", "Work Sans", "Fira Sans",
    "Quicksand", "Plus Jakarta Sans", "Outfit", "Kumbh Sans", "Lexend", "Space Grotesk"
  ]);

  // Fetch all 1700+ Google Fonts live from Google Fonts API endpoint
  useEffect(() => {
    fetch("/api/google-fonts")
      .then((res) => res.json())
      .then((data) => {
        if (data?.fonts && Array.isArray(data.fonts) && data.fonts.length > 0) {
          setGoogleFontsList(data.fonts);
        }
      })
      .catch((err) => console.error("Error fetching live Google Fonts:", err));
  }, []);

  // Top-Right Dynamic Error Toast Banner State (Starts null, triggers only on real errors)
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Attached files state (starts completely empty until user uploads real files)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileItem[]>([]);

  // Voice recording state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(150).fill(3));

  const isListeningRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const waveformHistoryRef = useRef<number[]>(Array(150).fill(3));
  const lastFrameTimeRef = useRef<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fontFileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const activePhase = PHASES.find((p) => p.id === activePhaseId) || PHASES[0];

  // Helper to safely get Electron IPC API exposed via preload.js
  const getElectronAPI = () => {
    if (typeof window === "undefined") return null;
    if ((window as any).electronAPI) return (window as any).electronAPI;
    try {
      const winReq = (window as any).require;
      if (typeof winReq === "function") {
        const electron = winReq("electron");
        if (electron && electron.ipcRenderer) {
          const { ipcRenderer } = electron;
          return {
            send: (channel: string, data?: any) => ipcRenderer.send(channel, data),
            invoke: (channel: string, data?: any) => ipcRenderer.invoke(channel, data),
            on: (channel: string, func: any) => ipcRenderer.on(channel, func),
            removeListener: (channel: string, func: any) => ipcRenderer.removeListener(channel, func),
          };
        }
      }
    } catch (e) {}
    return null;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIdeaText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const nextHeight = Math.min(textareaRef.current.scrollHeight, 144);
      textareaRef.current.style.height = `${nextHeight}px`;
    }
  };

  // Handle File Upload from + Button
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: AttachedFileItem[] = Array.from(e.target.files).map((f, idx) => {
        const parts = f.name.split(".");
        const ext = (parts.length > 1 ? parts.pop() : "FILE")?.toUpperCase() || "FILE";
        return {
          id: `${Date.now()}_${idx}`,
          name: f.name,
          subText: f.size > 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(f.size / 1024)} KB`,
          ext: ext.slice(0, 5),
        };
      });
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setWebsiteLogoUrl(url);
    }
  };

  // Connect Electron IPC for Native Speech Transcriber Engine
  useEffect(() => {
    const api = getElectronAPI();
    if (api && api.on) {
      const handleSpeechResult = (_: any, text: string) => {
        if (text && text.trim()) {
          setInterimTranscript(text.trim());
        }
      };
      api.on("speech-recognition-result", handleSpeechResult);
      return () => {
        api.removeListener("speech-recognition-result", handleSpeechResult);
        stopVoiceRecording(false);
      };
    }
    return () => {
      stopVoiceRecording(false);
    };
  }, []);

  // Dynamically load Google Font CSS from Google CDN when user selects a font
  useEffect(() => {
    [headingFont, contentFont].forEach((fontName) => {
      if (!fontName) return;
      const fontId = `google-font-${fontName.replace(/\s+/g, "-").toLowerCase()}`;
      if (!document.getElementById(fontId)) {
        const link = document.createElement("link");
        link.id = fontId;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600;700&display=swap`;
        document.head.appendChild(link);
      }
    });
  }, [headingFont, contentFont]);

  const handleRunBuild = () => {
    setIsBuilding(true);
    setTimeout(() => {
      setIsBuilding(false);
    }, 1500);
  };

  const handleFormulateIdea = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ideaText.trim() && attachedFiles.length === 0) return;
    alert(`Formulating architectural plan for: "${ideaText}" with ${attachedFiles.length} attached file(s)`);
  };

  // Start Voice Recording & Real-Time Speech Recognition
  const startVoiceRecording = async () => {
    const api = getElectronAPI();
    const isElectronEnv =
      typeof window !== "undefined" &&
      (navigator.userAgent.toLowerCase().includes("electron") ||
        !!(window as any).process?.versions?.electron ||
        !!api);

    try {
      // 1. Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      isListeningRef.current = true;

      // Reset waveform history buffer & interim text
      waveformHistoryRef.current = Array(150).fill(3);
      setAudioLevels(Array(150).fill(3));
      setInterimTranscript("");

      // 2. Setup Web Audio API for Real-Time Equalizer Waveform
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateWaveform = (timestamp: number) => {
        if (analyserRef.current && timestamp - lastFrameTimeRef.current > 40) {
          lastFrameTimeRef.current = timestamp;
          analyserRef.current.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const avg = sum / bufferLength;

          // Expand height dynamically: 3px when quiet, up to 34px when speaking loud
          const height = Math.max(3, Math.min(34, Math.round((avg / 55) * 30) + 3));

          // Continuous scroll shift
          const history = waveformHistoryRef.current;
          history.push(history.length > 0 ? height : 3);
          history.shift();

          setAudioLevels([...history]);
        }
        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };

      animFrameRef.current = requestAnimationFrame(updateWaveform);

      // 3. Speech Recognition Engine Selection
      if (isElectronEnv && api && api.send) {
        // IN ELECTRON: Send start signal to Native Speech Engine via IPC
        api.send("start-speech-recognition");
      }

      // Activate SpeechRecognition whenever available on window
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";

          recognition.onresult = (event: any) => {
            let liveTranscript = "";
            for (let i = 0; i < event.results.length; i++) {
              liveTranscript += event.results[i][0].transcript;
            }
            if (liveTranscript.trim()) {
              setInterimTranscript(liveTranscript);
            }
          };

          recognition.onerror = () => {};

          recognition.onend = () => {
            if (isListeningRef.current) {
              try {
                recognition.start();
              } catch (e) {}
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {}
      }

      setIsListening(true);
    } catch (err: any) {
      console.error("Microphone access denied or error:", err);
      setErrorMessage(err?.message || "Microphone permission was denied. Please allow microphone access to use voice input.");
    }
  };

  // Stop / Confirm / Cancel Voice Recording
  const stopVoiceRecording = (confirm: boolean) => {
    isListeningRef.current = false;

    const api = getElectronAPI();
    if (api && api.send) {
      api.send("stop-speech-recognition");
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (confirm && interimTranscript) {
      setIdeaText((prev) => (prev ? `${prev} ${interimTranscript}` : interimTranscript));
      if (textareaRef.current) {
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 144)}px`;
          }
        }, 50);
      }
    }

    setInterimTranscript("");
    setIsListening(false);
  };

  return (
    <div className="w-full min-h-screen bg-[#F9F9F7] text-[#191919] font-['Poppins'] flex flex-col antialiased p-0 m-0 rounded-none border-none overflow-x-hidden relative">
      {/* Floating Top-Right Error Toast Banner (Exact Match to Screenshot) */}
      {errorMessage && (
        <div className="fixed top-4 right-6 z-50 max-w-md bg-[#FDF3E7] border border-[#F5D8B3] text-[#7C4814] rounded-2xl p-4 shadow-md flex items-start justify-between gap-3 animate-in slide-in-from-top-4 fade-in duration-300 font-['Poppins'] select-none">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#C46B18] shrink-0 mt-0.5" />
            <div className="text-[13px] font-normal leading-relaxed text-[#7C4814]">
              {errorMessage}{" "}
              <button
                type="button"
                onClick={() => alert("Redirecting to Upgrade Plan...")}
                className="font-medium underline hover:text-[#58310B] cursor-pointer"
              >
                explore our Pro plan.
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-[#7C4814] hover:text-black p-0.5 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hidden Native File Input for Question 1 Attachments */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        className="hidden"
      />

      {/* Hidden File Input for Custom Font Upload */}
      <input
        type="file"
        ref={fontFileInputRef}
        accept=".ttf,.otf,.woff,.woff2"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            alert(`Uploaded custom font: ${e.target.files[0].name}`);
          }
        }}
        className="hidden"
      />

      {/* Hidden File Input for Question 5 Logo Upload */}
      <input
        type="file"
        ref={logoFileInputRef}
        accept="image/*"
        onChange={handleLogoUpload}
        className="hidden"
      />

      {/* ==================== 1. TOP BAR (HEX: #DE7356) ==================== */}
      <div className="w-full bg-[#DE7356] text-white px-8 h-[48px] flex items-center justify-between shadow-2xs sticky top-0 z-40 rounded-none border-none">
        <span className="font-['Poppins'] text-[14px] font-normal text-white tracking-normal select-none">
          Swiggy Cloning Plan
        </span>

        {/* Build Button */}
        <button
          onClick={handleRunBuild}
          disabled={isBuilding}
          className="w-[94px] h-[29px] bg-[#C9593A] hover:bg-[#b84e31] active:scale-95 text-white font-['Poppins'] text-[13px] font-light font-[300] tracking-wider rounded-[8px] transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none border-none outline-none shrink-0"
        >
          {isBuilding ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <span className="font-light font-[300] tracking-wider">Build</span>
              <span className="text-[12px] leading-none font-light">⌘</span>
            </>
          )}
        </button>
      </div>

      {/* ==================== 2. MAIN HEADER PANEL ==================== */}
      <div className="w-full bg-[#F9F9F7] border-b border-[#E6E2D8] px-8 pt-8 pb-8 space-y-6 rounded-none">
        {/* Job Designation & Reviews Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="font-['Poppins'] text-[#6E6B5E] text-[18px] font-normal">
            Job Designation : <span className="text-[#191919] font-normal">Website Developer</span>
          </div>

          <div className="flex items-center gap-2.5 text-[18px] font-['Poppins'] text-[#6E6B5E]">
            <span className="font-normal">Reviews :</span>
            <div className="flex items-center text-[#DE7356] gap-1">
              <Star className="w-5 h-5 fill-[#DE7356] stroke-none" />
              <Star className="w-5 h-5 fill-[#DE7356] stroke-none" />
              <Star className="w-5 h-5 fill-[#DE7356] stroke-none" />
              <Star className="w-5 h-5 fill-[#DE7356] stroke-none" />
              <Star className="w-5 h-5 text-gray-300 fill-gray-300 stroke-none" />
            </div>
            <span className="text-[10px] text-[#000000] font-['Poppins'] font-normal">(324 ratings)</span>
            <button className="text-[10px] text-[#0066CC] hover:underline font-normal cursor-pointer ml-0.5">
              View all
            </button>
          </div>
        </div>

        {/* Big Bold Phase Title */}
        <div>
          <h1 className="font-['Poppins'] text-[34px] font-semibold tracking-tight text-[#000000] leading-tight select-none">
            {activePhase.title}
          </h1>
        </div>

        {/* Multi-Step 8 Phase Stepper Bar */}
        <div className="w-full overflow-x-auto pb-2 scrollbar-none pt-2">
          <div className="flex items-start w-full justify-between gap-3 sm:gap-4">
            {PHASES.map((phase) => {
              const isActive = phase.id === activePhaseId;

              return (
                <div
                  key={phase.id}
                  onClick={() => setActivePhaseId(phase.id)}
                  className="flex-1 w-full cursor-pointer group space-y-2.5 select-none"
                >
                  {/* Top Indicator Line */}
                  <div
                    className={`h-[6px] w-full transition-all ${
                      isActive ? "bg-[#DE7356]" : "bg-[#D8D4C8] group-hover:bg-[#C2BDAE]"
                    }`}
                  />

                  {/* Step Badge & Label */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-['Poppins'] text-[13px] font-semibold shrink-0 transition-colors ${
                        isActive
                          ? "bg-[#DE7356]"
                          : "bg-[#7D796C] text-white group-hover:bg-[#686458]"
                      }`}
                    >
                      {phase.id}
                    </span>
                    <span
                      className={`font-['Poppins'] text-[14px] font-medium transition-colors truncate ${
                        isActive
                          ? "text-[#DE7356]"
                          : "text-[#7D796C] group-hover:text-[#191919]"
                      }`}
                      title={phase.name}
                    >
                      {phase.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==================== 3. MAIN CONTENT CONTAINER ==================== */}
      <main className="w-full max-w-3xl mx-auto px-6 sm:px-10 py-10 flex-1 flex flex-col space-y-12">
        {/* QUESTION 1 SECTION */}
        <section className="space-y-6">
          <div className="flex items-center gap-2.5 font-['Poppins'] text-[#191919]">
            <span className="text-[20px] font-medium text-[#000000]">Q 1.</span>
            <span className="text-[18px] font-normal text-[#191919]">
              Explain your idea in briefly and give some refrences website.
            </span>
          </div>

          {/* Text Field Card or Voice Waveform Overlay */}
          {isListening ? (
            /* Active Voice Waveform Recording Overlay */
            <div className="bg-white border border-[#E3E0D5] rounded-2xl px-5 py-4 shadow-[0_0_30px_rgba(0,0,0,0.08)] flex flex-col justify-between min-h-[140px] space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-amber-700 italic font-['Poppins'] text-[15px] font-medium leading-relaxed max-h-16 overflow-y-auto custom-thin-scrollbar">
                {interimTranscript || "Listening to your voice... (Speak now)"}
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center justify-start w-full gap-[3px] flex-1 overflow-hidden h-9">
                  {audioLevels.map((height, idx) => (
                    <div
                      key={idx}
                      className="w-[2.5px] bg-[#191919] rounded-full transition-all duration-75 ease-out shrink-0"
                      style={{ height: `${height}px` }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => stopVoiceRecording(false)}
                    className="w-[30px] h-[30px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                    title="Discard voice recording"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => stopVoiceRecording(true)}
                    className="w-[30px] h-[30px] bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                    title="Apply voice transcript"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Input Card with Default 3 Rows Height and Auto-Expand */
            <div className="bg-white border border-[#E3E0D5] rounded-2xl px-5 py-4 shadow-[0_0_30px_rgba(0,0,0,0.08)] flex flex-col justify-between min-h-[140px] space-y-3 transition-all duration-300 ease-in-out">
              {/* Smooth Collapsible Attached File Cards Row */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  attachedFiles.length > 0
                    ? "max-h-[160px] opacity-100"
                    : "max-h-0 opacity-0 pointer-events-none"
                }`}
              >
                <div className="flex items-center gap-3 overflow-x-auto pb-3 pt-1 px-1 scrollbar-none border-b border-gray-100/60">
                  {attachedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="w-[115px] h-[112px] bg-white border border-[#BDB8A6] rounded-xl p-3 shadow-[0_0_12px_rgba(0,0,0,0.12)] flex flex-col justify-between select-none relative group shrink-0 transition-all hover:shadow-[0_0_16px_rgba(0,0,0,0.18)] hover:border-[#8E8875]"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.id)}
                        className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-gray-700 hover:bg-black text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs z-10"
                        title="Remove file"
                      >
                        <X className="w-3 h-3" />
                      </button>

                      <div>
                        <div className="text-[12px] font-medium text-[#191919] line-clamp-2 leading-tight break-all font-['Poppins']">
                          {file.name}
                        </div>
                        {file.subText && (
                          <div className="text-[10px] text-gray-400 font-normal mt-1 font-['Poppins']">
                            {file.subText}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 px-1.5 py-0.5 border border-[#BDB8A6] rounded-md text-[9px] font-semibold tracking-wider text-gray-600 uppercase self-start bg-gray-50/80 font-['Poppins']">
                        {file.ext}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <textarea
                ref={textareaRef}
                rows={3}
                placeholder="Explain you website here..."
                value={ideaText}
                onChange={handleTextChange}
                className="w-full bg-transparent border-none outline-none resize-none text-[15px] font-['Poppins'] text-[#191919] placeholder:text-gray-400 focus:ring-0 min-h-[72px] max-h-[144px] overflow-y-auto custom-thin-scrollbar transition-all"
              />

              <div className="flex items-center justify-between pt-2 border-t border-transparent">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-[30px] h-[30px] rounded-lg text-gray-600 hover:text-black hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer text-lg font-light"
                  title="Add attachment"
                >
                  <Plus className="w-4.5 h-4.5 text-gray-700" />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    className="w-[30px] h-[30px] rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                    title="Click to start voice recording"
                  >
                    <Mic className="w-4 h-4 text-gray-700" />
                  </button>

                  <button
                    type="button"
                    onClick={handleFormulateIdea}
                    disabled={!ideaText.trim() && attachedFiles.length === 0}
                    className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center transition-all shadow-2xs shrink-0 ${
                      ideaText.trim() || attachedFiles.length > 0
                        ? "bg-[#DE7356] hover:bg-[#C9593A] text-white opacity-100 cursor-pointer"
                        : "bg-[#DE7356] opacity-40 text-white cursor-not-allowed"
                    }`}
                    title="Submit idea"
                  >
                    <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* QUESTION 2 SECTION */}
        <section className="space-y-6 pt-4 border-t border-[#E6E2D8]">
          {/* Question 2 Title */}
          <div className="flex items-center gap-2.5 font-['Poppins'] text-[#191919]">
            <span className="text-[20px] font-medium text-[#000000]">Q 2.</span>
            <span className="text-[18px] font-normal text-[#191919]">
              How do you want to continue the design ?
            </span>
          </div>

          {/* 3 Action Pill Buttons Row (Figma, Claude Ui, Screenshots) */}
          <div className="flex flex-wrap items-center gap-3.5 sm:gap-4">
            {/* Figma Button */}
            <button
              type="button"
              onClick={() => setSelectedDesignSource(selectedDesignSource === "Figma" ? null : "Figma")}
              className={`px-6 py-3 rounded-2xl font-['Poppins'] text-[15px] font-medium flex items-center justify-center gap-2.5 transition-all duration-200 shadow-xs cursor-pointer active:scale-95 border ${
                selectedDesignSource === "Figma"
                  ? "bg-white text-black border-[#E3E0D5] shadow-md scale-[1.03] animate-in zoom-in-95"
                  : "bg-[#0A0A0A] hover:bg-black text-white border-transparent"
              }`}
            >
              {/* Multicolored Figma Logo Icon */}
              <svg className="w-4 h-5" viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38H19V28.5Z" fill="#1ABCFE"/>
                <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
                <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
                <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
                <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
              </svg>
              <span className={selectedDesignSource === "Figma" ? "font-semibold transition-transform scale-105" : ""}>Figma</span>
            </button>

            {/* Claude Ui Button */}
            <button
              type="button"
              onClick={() => setSelectedDesignSource(selectedDesignSource === "Claude Ui" ? null : "Claude Ui")}
              className={`px-6 py-3 rounded-2xl font-['Poppins'] text-[15px] font-medium flex items-center justify-center gap-2.5 transition-all duration-200 shadow-xs cursor-pointer active:scale-95 border ${
                selectedDesignSource === "Claude Ui"
                  ? "bg-white text-black border-[#E3E0D5] shadow-md scale-[1.03] animate-in zoom-in-95"
                  : "bg-[#0A0A0A] hover:bg-black text-white border-transparent"
              }`}
            >
              {/* Claude PNG Icon */}
              <img src="/claudecode-color.png" alt="Claude UI" className="w-5 h-5 object-contain" />
              <span className={selectedDesignSource === "Claude Ui" ? "font-semibold transition-transform scale-105" : ""}>Claude Ui</span>
            </button>

            {/* Screenshots Button */}
            <button
              type="button"
              onClick={() => setSelectedDesignSource(selectedDesignSource === "Screenshots" ? null : "Screenshots")}
              className={`px-6 py-3 rounded-2xl font-['Poppins'] text-[15px] font-medium flex items-center justify-center gap-2.5 transition-all duration-200 shadow-xs cursor-pointer active:scale-95 border ${
                selectedDesignSource === "Screenshots"
                  ? "bg-white text-black border-[#E3E0D5] shadow-md scale-[1.03] animate-in zoom-in-95"
                  : "bg-[#0A0A0A] hover:bg-black text-white border-transparent"
              }`}
            >
              <Camera className={`w-4.5 h-4.5 stroke-[1.8] ${selectedDesignSource === "Screenshots" ? "text-black" : "text-white"}`} />
              <span className={selectedDesignSource === "Screenshots" ? "font-semibold transition-transform scale-105" : ""}>Screenshots</span>
            </button>
          </div>

          {/* Horizontal Divider with OR */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-[#D5D1C5]" />
            <span className="px-4 text-[13px] font-medium text-[#7D796C] tracking-wider select-none font-['Poppins']">
              OR
            </span>
            <div className="flex-1 border-t border-[#D5D1C5]" />
          </div>

          {/* Reference Website Input Field */}
          <div className="bg-white border border-[#E3E0D5] rounded-2xl px-5 py-3 shadow-[0_0_20px_rgba(0,0,0,0.05)] flex items-center gap-3 transition-all hover:border-[#C8C3B4]">
            <Globe className="w-5 h-5 text-gray-700 shrink-0 stroke-[1.8]" />
            <input
              type="text"
              placeholder="Enter your refrence website"
              value={refWebsiteText}
              onChange={(e) => setRefWebsiteText(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-[15px] font-['Poppins'] text-[#191919] placeholder:text-gray-400 focus:ring-0"
            />
            <button
              type="button"
              onClick={() => {
                if (refWebsiteText.trim()) {
                  alert(`Added reference website: ${refWebsiteText}`);
                }
              }}
              disabled={!refWebsiteText.trim()}
              className={`w-[32px] h-[32px] rounded-xl flex items-center justify-center transition-all shadow-2xs shrink-0 ${
                refWebsiteText.trim()
                  ? "bg-[#DE7356] hover:bg-[#C9593A] text-white opacity-100 cursor-pointer"
                  : "bg-[#DE7356] opacity-40 text-white cursor-not-allowed"
              }`}
              title="Submit reference website"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Claude Ui Theme Section */}
          <div className="space-y-3 pt-2">
            <h3 className="font-['Georgia'] text-[20px] font-normal text-[#191919] tracking-tight select-none">
              Claude Ui theme
            </h3>

            {/* Theme Tags / Badges with Selection Text Animation */}
            <div className="flex flex-wrap gap-2.5 pt-1">
              {THEMES.map((theme) => {
                const isSelected = selectedTheme === theme;
                return (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => setSelectedTheme(selectedTheme === theme ? null : theme)}
                    className={`px-4 py-2 rounded-xl text-[13px] font-medium font-['Poppins'] transition-all duration-200 select-none cursor-pointer border active:scale-95 ${
                      isSelected
                        ? "bg-white text-black border-[#191919] shadow-md scale-[1.03] animate-in zoom-in-95"
                        : "bg-[#EFECE4] text-[#333] border-[#E2DDD2] hover:bg-[#E4E0D5] hover:border-[#D4CEBF]"
                    }`}
                  >
                    <span className={isSelected ? "font-semibold inline-block transition-transform scale-105" : ""}>
                      {theme}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Explanation / Output Response Section */}
          <div className="pt-4 space-y-3">
            <p className="font-['Poppins'] text-[15px] font-normal text-[#191919] leading-relaxed select-text">
              This is a common issue on shared hosting like Hostinger when the server&apos;s MIME types aren&apos;t configured properly.
            </p>

            {/* Action Buttons: Copy, Share, Refresh */}
            <div className="flex items-center gap-3 pt-1 text-gray-500">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText("This is a common issue on shared hosting like Hostinger when the server's MIME types aren't configured properly.")}
                className="p-1.5 hover:text-black hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                title="Copy response"
              >
                <Copy className="w-4 h-4" />
              </button>

              <button
                type="button"
                className="p-1.5 hover:text-black hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                className="p-1.5 hover:text-black hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                title="Regenerate"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* QUESTION 3 SECTION */}
        <section className="space-y-6 pt-4 border-t border-[#E6E2D8]">
          {/* Question 3 Title */}
          <div className="flex items-center gap-2.5 font-['Poppins'] text-[#191919]">
            <span className="text-[20px] font-medium text-[#000000]">Q 3.</span>
            <span className="text-[18px] font-normal text-[#191919]">
              Choose your preferred font ?
            </span>
          </div>

          {/* 3 Action Pill Buttons Row (Google Fonts, Claude Fonts, Upload Font) */}
          <div className="flex flex-wrap items-center gap-3.5 sm:gap-4">
            {/* Google Fonts Button */}
            <button
              type="button"
              onClick={() => setSelectedFontSource(selectedFontSource === "Google Fonts" ? null : "Google Fonts")}
              className={`px-6 py-3 rounded-2xl font-['Poppins'] text-[15px] font-medium flex items-center justify-center gap-2.5 transition-all duration-200 shadow-xs cursor-pointer active:scale-95 border ${
                selectedFontSource === "Google Fonts"
                  ? "bg-white text-black border-[#E3E0D5] shadow-md scale-[1.03] animate-in zoom-in-95"
                  : "bg-[#0A0A0A] hover:bg-black text-white border-transparent"
              }`}
            >
              {/* Multicolored Google 'G' Logo Icon */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span className={selectedFontSource === "Google Fonts" ? "font-semibold transition-transform scale-105" : ""}>Google Fonts</span>
            </button>

            {/* Claude Fonts Button */}
            <button
              type="button"
              onClick={() => setSelectedFontSource(selectedFontSource === "Claude Fonts" ? null : "Claude Fonts")}
              className={`px-6 py-3 rounded-2xl font-['Poppins'] text-[15px] font-medium flex items-center justify-center gap-2.5 transition-all duration-200 shadow-xs cursor-pointer active:scale-95 border ${
                selectedFontSource === "Claude Fonts"
                  ? "bg-white text-black border-[#E3E0D5] shadow-md scale-[1.03] animate-in zoom-in-95"
                  : "bg-[#0A0A0A] hover:bg-black text-white border-transparent"
              }`}
            >
              <img src="/claudecode-color.png" alt="Claude Fonts" className="w-5 h-5 object-contain" />
              <span className={selectedFontSource === "Claude Fonts" ? "font-semibold transition-transform scale-105" : ""}>Claude Fonts</span>
            </button>

            {/* Upload Font Button */}
            <button
              type="button"
              onClick={() => fontFileInputRef.current?.click()}
              className={`px-6 py-3 rounded-2xl font-['Poppins'] text-[15px] font-medium flex items-center justify-center gap-2.5 transition-all duration-200 shadow-xs cursor-pointer active:scale-95 border ${
                selectedFontSource === "Upload Font"
                  ? "bg-white text-black border-[#E3E0D5] shadow-md scale-[1.03] animate-in zoom-in-95"
                  : "bg-[#0A0A0A] hover:bg-black text-white border-transparent"
              }`}
            >
              <Camera className={`w-4.5 h-4.5 stroke-[1.8] ${selectedFontSource === "Upload Font" ? "text-black" : "text-white"}`} />
              <span className={selectedFontSource === "Upload Font" ? "font-semibold transition-transform scale-105" : ""}>Upload Font</span>
            </button>
          </div>

          {/* Heading & Content Font Selectors */}
          <div className="flex flex-wrap items-center gap-6 sm:gap-10 pt-1">
            {/* Heading Font Selector */}
            <CustomFontPicker
              label="Heading"
              value={headingFont}
              onChange={setHeadingFont}
              fonts={googleFontsList}
            />

            {/* Content Font Selector */}
            <CustomFontPicker
              label="Content"
              value={contentFont}
              onChange={setContentFont}
              fonts={googleFontsList}
            />
          </div>

          {/* Horizontal Divider with OR */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-[#D5D1C5]" />
            <span className="px-4 text-[13px] font-medium text-[#7D796C] tracking-wider select-none font-['Poppins']">
              OR
            </span>
            <div className="flex-1 border-t border-[#D5D1C5]" />
          </div>

          {/* Font Reference Website Input Field */}
          <div className="bg-white border border-[#E3E0D5] rounded-2xl px-5 py-3 shadow-[0_0_20px_rgba(0,0,0,0.05)] flex items-center gap-3 transition-all hover:border-[#C8C3B4]">
            <Globe className="w-5 h-5 text-gray-700 shrink-0 stroke-[1.8]" />
            <input
              type="text"
              placeholder="Enter your refrence website"
              value={fontRefWebsiteText}
              onChange={(e) => setFontRefWebsiteText(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-[15px] font-['Poppins'] text-[#191919] placeholder:text-gray-400 focus:ring-0"
            />
            <button
              type="button"
              onClick={() => {
                if (fontRefWebsiteText.trim()) {
                  alert(`Added font reference website: ${fontRefWebsiteText}`);
                }
              }}
              disabled={!fontRefWebsiteText.trim()}
              className={`w-[32px] h-[32px] rounded-xl flex items-center justify-center transition-all shadow-2xs shrink-0 ${
                fontRefWebsiteText.trim()
                  ? "bg-[#DE7356] hover:bg-[#C9593A] text-white opacity-100 cursor-pointer"
                  : "bg-[#DE7356] opacity-40 text-white cursor-not-allowed"
              }`}
              title="Submit reference website"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-[14px] italic text-[#DE7356] font-['Poppins'] pt-1 select-none">
            *You can surely change font later also.*
          </p>
        </section>

        {/* QUESTION 4 SECTION */}
        <section className="space-y-6 pt-4 border-t border-[#E6E2D8]">
          {/* Question 4 Title */}
          <div className="flex items-center gap-2.5 font-['Poppins'] text-[#191919]">
            <span className="text-[20px] font-medium text-[#000000]">Q 4.</span>
            <span className="text-[18px] font-normal text-[#191919]">
              What is the name of your website ?
            </span>
          </div>

          {/* Website Name Input Bar with Mic & Submit Button */}
          <div className="bg-white border border-[#E3E0D5] rounded-2xl px-5 py-3.5 shadow-[0_0_20px_rgba(0,0,0,0.05)] flex items-center justify-between gap-3 transition-all hover:border-[#C8C3B4]">
            <input
              type="text"
              placeholder="Enter your website name here..."
              value={websiteNameText}
              onChange={(e) => setWebsiteNameText(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-[15px] font-['Poppins'] text-[#191919] placeholder:text-gray-400 focus:ring-0"
            />

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={startVoiceRecording}
                className="w-[30px] h-[30px] rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                title="Voice input website name"
              >
                <Mic className="w-4.5 h-4.5 text-gray-700" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (websiteNameText.trim()) {
                    alert(`Submitted website name: ${websiteNameText}`);
                  }
                }}
                disabled={!websiteNameText.trim()}
                className={`w-[32px] h-[32px] rounded-xl flex items-center justify-center transition-all shadow-2xs shrink-0 ${
                  websiteNameText.trim()
                    ? "bg-[#DE7356] hover:bg-[#C9593A] text-white opacity-100 cursor-pointer"
                    : "bg-[#DE7356] opacity-40 text-white cursor-not-allowed"
                }`}
                title="Submit website name"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Checking Availability Section */}
          <div className="space-y-3 pt-2">
            <h3 className="font-['Georgia'] text-[20px] font-normal text-[#191919] tracking-tight select-none">
              Checking Availability
            </h3>

            {/* Availability Badges Row */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {/* Badge 1: Instagram */}
              <div className="px-3.5 py-1.5 bg-[#EFECE4] border border-[#E2DDD2] rounded-xl text-[13px] font-medium font-['Poppins'] text-[#333] flex items-center gap-2 shadow-2xs select-none">
                <svg className="w-3.5 h-3.5 text-gray-700 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
                <span>{websiteNameText.trim() || "growcitable"}</span>
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold">✓</span>
              </div>

              {/* Badge 2: Website Domain (www) */}
              <div className="px-3.5 py-1.5 bg-[#EFECE4] border border-[#E2DDD2] rounded-xl text-[13px] font-medium font-['Poppins'] text-[#333] flex items-center gap-2 shadow-2xs select-none">
                <Globe className="w-3.5 h-3.5 text-gray-700 shrink-0 stroke-[1.8]" />
                <span>www.{websiteNameText.trim() || "growcitable"}.com</span>
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold">✓</span>
              </div>

              {/* Badge 3: Facebook */}
              <div className="px-3.5 py-1.5 bg-[#EFECE4] border border-[#E2DDD2] rounded-xl text-[13px] font-medium font-['Poppins'] text-[#333] flex items-center gap-2 shadow-2xs select-none">
                <svg className="w-3.5 h-3.5 text-gray-700 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>{websiteNameText.trim() || "growcitable"}</span>
                <span className="w-3.5 h-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px] font-bold">✕</span>
              </div>

              {/* Badge 4: YouTube */}
              <div className="px-3.5 py-1.5 bg-[#EFECE4] border border-[#E2DDD2] rounded-xl text-[13px] font-medium font-['Poppins'] text-[#333] flex items-center gap-2 shadow-2xs select-none">
                <svg className="w-3.5 h-3.5 text-gray-700 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span>{websiteNameText.trim() || "growcitable"}</span>
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold">✓</span>
              </div>
            </div>
          </div>

          {/* Quick Instructions Section */}
          <div className="space-y-2 pt-3 font-['Poppins']">
            <h4 className="text-[15px] font-medium text-[#191919]">
              Quick Instructions:
            </h4>
            <ol className="list-decimal list-inside text-[14px] text-[#4A473D] space-y-1.5 leading-relaxed font-normal">
              <li>Delete your old .htaccess or _htaccess from Hostinger</li>
              <li>Upload the new .htaccess file to the same folder as your PHP files</li>
              <li>Hard refresh your browser (Ctrl+F5 or Cmd+Shift+R)</li>
              <li>Clear browser cache if needed</li>
            </ol>
          </div>

          {/* AI Explanation Output Response Section */}
          <div className="pt-4 space-y-3">
            <p className="font-['Poppins'] text-[15px] font-normal text-[#191919] leading-relaxed select-text">
              This is a common issue on shared hosting like Hostinger when the server&apos;s MIME types aren&apos;t configured properly.
            </p>

            {/* Action Buttons: Copy, Share, Refresh */}
            <div className="flex items-center gap-3 pt-1 text-gray-500">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText("This is a common issue on shared hosting like Hostinger when the server's MIME types aren't configured properly.")}
                className="p-1.5 hover:text-black hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                title="Copy response"
              >
                <Copy className="w-4 h-4" />
              </button>

              <button
                type="button"
                className="p-1.5 hover:text-black hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                className="p-1.5 hover:text-black hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                title="Regenerate"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* QUESTION 5 SECTION */}
        <section className="space-y-6 pt-4 border-t border-[#E6E2D8]">
          {/* Question 5 Title */}
          <div className="flex items-center gap-2.5 font-['Poppins'] text-[#191919]">
            <span className="text-[20px] font-medium text-[#000000]">Q 5.</span>
            <span className="text-[18px] font-normal text-[#191919]">
              Upload the logo of your website.
            </span>
          </div>

          {/* Square Upload Box Card */}
          <div
            onClick={() => logoFileInputRef.current?.click()}
            className="w-[210px] h-[210px] bg-white border border-[#E3E0D5] rounded-3xl shadow-[0_0_25px_rgba(0,0,0,0.06)] relative p-4 flex flex-col items-center justify-center cursor-pointer hover:border-[#C8C3B4] transition-all group overflow-hidden select-none"
          >
            {websiteLogoUrl ? (
              <img
                src={websiteLogoUrl}
                alt="Website Logo Preview"
                className="w-full h-full object-contain rounded-2xl"
              />
            ) : (
              <div className="flex flex-col items-center text-gray-400 space-y-2 group-hover:text-gray-600 transition-colors">
                <Upload className="w-8 h-8 stroke-[1.5]" />
                <span className="text-xs font-['Poppins'] font-normal">Click to upload logo</span>
              </div>
            )}

            {/* Bottom-Right Terracotta Arrow Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                logoFileInputRef.current?.click();
              }}
              className="absolute bottom-3.5 right-3.5 w-[34px] h-[34px] bg-[#DE7356] hover:bg-[#C9593A] text-white rounded-xl flex items-center justify-center cursor-pointer transition-all shadow-2xs z-10 active:scale-95"
              title="Upload logo image"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Quick Instructions Section */}
          <div className="space-y-2 pt-3 font-['Poppins']">
            <h4 className="text-[15px] font-medium text-[#191919]">
              Quick Instructions:
            </h4>
            <ol className="list-decimal list-inside text-[14px] text-[#4A473D] space-y-1.5 leading-relaxed font-normal">
              <li>Delete your old .htaccess or _htaccess from Hostinger</li>
              <li>Upload the new .htaccess file to the same folder as your PHP files</li>
              <li>Hard refresh your browser (Ctrl+F5 or Cmd+Shift+R)</li>
              <li>Clear browser cache if needed</li>
            </ol>
          </div>

          {/* AI Explanation Output Response Section */}
          <div className="pt-4 space-y-3">
            <p className="font-['Poppins'] text-[15px] font-normal text-[#191919] leading-relaxed select-text">
              This is a common issue on shared hosting like Hostinger when the server&apos;s MIME types aren&apos;t configured properly.
            </p>

            {/* Action Buttons: Copy, Share, Refresh */}
            <div className="flex items-center gap-3 pt-1 text-gray-500">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText("This is a common issue on shared hosting like Hostinger when the server's MIME types aren't configured properly.")}
                className="p-1.5 hover:text-black hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                title="Copy response"
              >
                <Copy className="w-4 h-4" />
              </button>

              <button
                type="button"
                className="p-1.5 hover:text-black hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                className="p-1.5 hover:text-black hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                title="Regenerate"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* QUESTION 6 SECTION */}
        <section className="space-y-6 pt-4 border-t border-[#E6E2D8]">
          {/* Question 6 Title */}
          <div className="flex items-center gap-2.5 font-['Poppins'] text-[#191919]">
            <span className="text-[20px] font-medium text-[#000000]">Q 6.</span>
            <span className="text-[18px] font-normal text-[#191919]">
              Do you have refrence websites and blogs according to you business
            </span>
          </div>

          {/* Reference URL Input Field with Terracotta Save Button */}
          <div className="bg-white border border-[#E3E0D5] rounded-2xl px-5 py-3 shadow-[0_0_20px_rgba(0,0,0,0.05)] flex items-center justify-between gap-3 max-w-xl transition-all hover:border-[#C8C3B4]">
            <div className="flex items-center gap-3 flex-1">
              <Globe className="w-5 h-5 text-[#DE7356] shrink-0 stroke-[1.8]" />
              <input
                type="text"
                placeholder="Enter your website url here..."
                value={refUrlInput}
                onChange={(e) => setRefUrlInput(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-[15px] font-['Poppins'] text-[#191919] placeholder:text-gray-400 focus:ring-0"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (refUrlInput.trim()) {
                  setSavedRefUrls((prev) => [...prev, refUrlInput.trim()]);
                  setRefUrlInput("");
                }
              }}
              disabled={!refUrlInput.trim()}
              className={`px-6 py-2 rounded-xl text-[14px] font-medium font-['Poppins'] transition-all shadow-xs shrink-0 ${
                refUrlInput.trim()
                  ? "bg-[#DE7356] hover:bg-[#C9593A] text-white opacity-100 cursor-pointer"
                  : "bg-[#DE7356] opacity-40 text-white cursor-not-allowed"
              }`}
            >
              Save
            </button>
          </div>

          {/* Action Buttons Row: Add more & Continue */}
          <div className="flex items-center gap-4 pt-1 max-w-xl">
            <button
              type="button"
              onClick={() => setRefUrlInput("")}
              className="flex-1 bg-[#F9F9F7] border border-[#D5D1C5] hover:bg-[#EFECE4] text-[#333] px-8 py-3 rounded-2xl text-[15px] font-medium font-['Poppins'] shadow-2xs text-center cursor-pointer transition-all active:scale-95"
            >
              Add more
            </button>

            <button
              type="button"
              onClick={() => alert("Continuing to next phase...")}
              className="bg-[#DE7356] hover:bg-[#C9593A] text-white px-10 py-3 rounded-2xl text-[15px] font-medium font-['Poppins'] shadow-xs cursor-pointer transition-all active:scale-95"
            >
              Continue
            </button>
          </div>

          {/* Checking Availability Section with Expandable Accordion Rows */}
          <div className="space-y-3 pt-4">
            <h3 className="font-['Georgia'] text-[20px] font-normal text-[#191919] tracking-tight select-none">
              Checking Availability
            </h3>

            {/* Accordion Rows List */}
            <div className="space-y-3 max-w-2xl pt-1">
              {[1, 2, 3].map((itemIdx) => {
                const isOpen = openAccordionIdx === itemIdx;
                return (
                  <div
                    key={itemIdx}
                    className="bg-[#EFECE4] border border-[#E2DDD2] rounded-2xl overflow-hidden shadow-2xs font-['Poppins'] transition-colors"
                  >
                    <div
                      onClick={() => setOpenAccordionIdx(isOpen ? null : itemIdx)}
                      className="px-5 py-4 flex items-center justify-between select-none cursor-pointer hover:bg-[#E7E3D8] transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <span className="w-7 h-7 rounded-full bg-[#C8C3B4] shrink-0" />
                        <span className="text-[15px] font-medium text-[#191919] truncate">
                          Diagnosed CSS loading failure and inves...
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[12px] font-medium text-gray-500">
                          +47
                        </span>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-700 transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {isOpen && (
                      <div className="px-5 pb-4 pt-1 text-[13px] text-[#4A473D] border-t border-[#E2DDD2] bg-[#F4F1E8] leading-relaxed">
                        Comprehensive diagnostic report analyzing asset loading failures, host MIME headers, and .htaccess rewrite rules.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Instructions Section */}
          <div className="space-y-2 pt-3 font-['Poppins']">
            <h4 className="text-[15px] font-medium text-[#191919]">
              Quick Instructions:
            </h4>
            <ol className="list-decimal list-inside text-[14px] text-[#4A473D] space-y-1.5 leading-relaxed font-normal">
              <li>Delete your old .htaccess or _htaccess from Hostinger</li>
              <li>Upload the new .htaccess file to the same folder as your PHP files</li>
              <li>Hard refresh your browser (Ctrl+F5 or Cmd+Shift+R)</li>
              <li>Clear browser cache if needed</li>
            </ol>
          </div>

          {/* AI Explanation Output Response Section */}
          <div className="pt-4 space-y-3">
            <p className="font-['Poppins'] text-[15px] font-normal text-[#191919] leading-relaxed select-text">
              This is a common issue on shared hosting like Hostinger when the server&apos;s MIME types aren&apos;t configured properly.
            </p>

            {/* Action Buttons: Copy, Share, Refresh */}
            <div className="flex items-center gap-3 pt-1 text-gray-500">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText("This is a common issue on shared hosting like Hostinger when the server's MIME types aren't configured properly.")}
                className="p-1.5 hover:text-black hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                title="Copy response"
              >
                <Copy className="w-4 h-4" />
              </button>

              <button
                type="button"
                className="p-1.5 hover:text-black hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                className="p-1.5 hover:text-black hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                title="Regenerate"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* QUESTION 7 SECTION */}
        <section className="space-y-6 pt-4 border-t border-[#E6E2D8]">
          {/* Question 7 Title */}
          <div className="flex items-center gap-2.5 font-['Poppins'] text-[#191919]">
            <span className="text-[20px] font-medium text-[#000000]">Q 7.</span>
            <span className="text-[18px] font-normal text-[#191919]">
              What are your primary goals ?
            </span>
          </div>

          {/* Goal Option Pills */}
          <div className="flex flex-wrap gap-2.5 sm:gap-3 pt-1">
            {PRIMARY_GOALS.map((goal) => {
              const isSelected = selectedGoal === goal;
              return (
                <button
                  key={goal}
                  type="button"
                  onClick={() => setSelectedGoal(isSelected ? null : goal)}
                  className={`px-4 py-2 rounded-xl text-[13px] font-medium font-['Poppins'] transition-all duration-200 select-none cursor-pointer border active:scale-95 ${
                    isSelected
                      ? "bg-white text-black border-[#191919] shadow-md scale-[1.03] animate-in zoom-in-95"
                      : "bg-[#EFECE4] text-[#333] border-[#E2DDD2] hover:bg-[#E4E0D5] hover:border-[#D4CEBF]"
                  }`}
                >
                  <span className={isSelected ? "font-semibold inline-block transition-transform scale-105" : ""}>
                    {goal}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Horizontal Divider with OR */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-[#D5D1C5]" />
            <span className="px-4 text-[13px] font-medium text-[#7D796C] tracking-wider select-none font-['Poppins']">
              OR
            </span>
            <div className="flex-1 border-t border-[#D5D1C5]" />
          </div>

          {/* Custom Goal Input Bar with Mic & Submit Button */}
          <div className="bg-white border border-[#E3E0D5] rounded-2xl px-5 py-3.5 shadow-[0_0_20px_rgba(0,0,0,0.05)] flex items-center justify-between gap-3 transition-all hover:border-[#C8C3B4]">
            <input
              type="text"
              placeholder="You can explain you goal also..."
              value={customGoalText}
              onChange={(e) => setCustomGoalText(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-[15px] font-['Poppins'] text-[#191919] placeholder:text-gray-400 focus:ring-0"
            />

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={startVoiceRecording}
                className="w-[30px] h-[30px] rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                title="Voice input goal"
              >
                <Mic className="w-4.5 h-4.5 text-gray-700" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (customGoalText.trim()) {
                    alert(`Submitted goal: ${customGoalText}`);
                  }
                }}
                disabled={!customGoalText.trim()}
                className={`w-[32px] h-[32px] rounded-xl flex items-center justify-center transition-all shadow-2xs shrink-0 ${
                  customGoalText.trim()
                    ? "bg-[#DE7356] hover:bg-[#C9593A] text-white opacity-100 cursor-pointer"
                    : "bg-[#DE7356] opacity-40 text-white cursor-not-allowed"
                }`}
                title="Submit goal"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* AI Explanation Output Response Section */}
          <div className="pt-4 space-y-3">
            <p className="font-['Poppins'] text-[15px] font-normal text-[#191919] leading-relaxed select-text">
              This is a common issue on shared hosting like Hostinger when the server&apos;s MIME types aren&apos;t configured properly.
            </p>

            {/* Action Buttons: Copy, Share, Refresh */}
            <div className="flex items-center gap-3 pt-1 text-gray-500">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText("This is a common issue on shared hosting like Hostinger when the server's MIME types aren't configured properly.")}
                className="p-1.5 hover:text-black hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                title="Copy response"
              >
                <Copy className="w-4 h-4" />
              </button>

              <button
                type="button"
                className="p-1.5 hover:text-black hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                className="p-1.5 hover:text-black hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                title="Regenerate"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* QUESTION 8 SECTION */}
        <section className="space-y-6 pt-4 border-t border-[#E6E2D8]">
          {/* Question 8 Title */}
          <div className="flex items-center gap-2.5 font-['Poppins'] text-[#191919]">
            <span className="text-[20px] font-medium text-[#000000]">Q 8.</span>
            <span className="text-[18px] font-normal text-[#191919]">
              What type of website do you need?
            </span>
          </div>

          {/* Website Type Option Pills */}
          <div className="flex flex-wrap gap-2.5 sm:gap-3 pt-1">
            {WEBSITE_TYPES.map((type) => {
              const isSelected = selectedWebsiteType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedWebsiteType(isSelected ? null : type)}
                  className={`px-4 py-2 rounded-xl text-[13px] font-medium font-['Poppins'] transition-all duration-200 select-none cursor-pointer border active:scale-95 ${
                    isSelected
                      ? "bg-white text-black border-[#191919] shadow-md scale-[1.03] animate-in zoom-in-95"
                      : "bg-[#EFECE4] text-[#333] border-[#E2DDD2] hover:bg-[#E4E0D5] hover:border-[#D4CEBF]"
                  }`}
                >
                  <span className={isSelected ? "font-semibold inline-block transition-transform scale-105" : ""}>
                    {type}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Horizontal Divider with OR */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-[#D5D1C5]" />
            <span className="px-4 text-[13px] font-medium text-[#7D796C] tracking-wider select-none font-['Poppins']">
              OR
            </span>
            <div className="flex-1 border-t border-[#D5D1C5]" />
          </div>

          {/* Custom Website Type Input Bar with Mic & Submit Button */}
          <div className="bg-white border border-[#E3E0D5] rounded-2xl px-5 py-3.5 shadow-[0_0_20px_rgba(0,0,0,0.05)] flex items-center justify-between gap-3 transition-all hover:border-[#C8C3B4]">
            <input
              type="text"
              placeholder="You can explain you website based on...."
              value={customWebsiteTypeText}
              onChange={(e) => setCustomWebsiteTypeText(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-[15px] font-['Poppins'] text-[#191919] placeholder:text-gray-400 focus:ring-0"
            />

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={startVoiceRecording}
                className="w-[30px] h-[30px] rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                title="Voice input website type"
              >
                <Mic className="w-4.5 h-4.5 text-gray-700" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (customWebsiteTypeText.trim()) {
                    alert(`Submitted website type explanation: ${customWebsiteTypeText}`);
                  }
                }}
                disabled={!customWebsiteTypeText.trim()}
                className={`w-[32px] h-[32px] rounded-xl flex items-center justify-center transition-all shadow-2xs shrink-0 ${
                  customWebsiteTypeText.trim()
                    ? "bg-[#DE7356] hover:bg-[#C9593A] text-white opacity-100 cursor-pointer"
                    : "bg-[#DE7356] opacity-40 text-white cursor-not-allowed"
                }`}
                title="Submit website type"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* AI Explanation Output Response Section */}
          <div className="pt-4 space-y-3">
            <p className="font-['Poppins'] text-[15px] font-normal text-[#191919] leading-relaxed select-text">
              This is a common issue on shared hosting like Hostinger when the server&apos;s MIME types aren&apos;t configured properly.
            </p>

            {/* Action Buttons: Copy, Share, Refresh */}
            <div className="flex items-center gap-3 pt-1 text-gray-500">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText("This is a common issue on shared hosting like Hostinger when the server's MIME types aren't configured properly.")}
                className="p-1.5 hover:text-black hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                title="Copy response"
              >
                <Copy className="w-4 h-4" />
              </button>

              <button
                type="button"
                className="p-1.5 hover:text-black hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                className="p-1.5 hover:text-black hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                title="Regenerate"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* QUESTION 9 SECTION (Exact Match to Reference Design Screenshot) */}
        <section className="space-y-6 pt-4 border-t border-[#E6E2D8]">
          {/* Question 9 Title */}
          <div className="flex items-center gap-2.5 font-['Poppins'] text-[#191919]">
            <span className="text-[20px] font-medium text-[#000000]">Q 9.</span>
            <span className="text-[18px] font-normal text-[#191919]">
              Choose your color template ?
            </span>
          </div>

          {/* Color Palettes Grid (5 Presets + 1 Custom Template) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl pt-2">
            {COLOR_TEMPLATES.map((tmpl) => {
              const isSelected = selectedColorTemplate === tmpl.id;
              return (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedColorTemplate(isSelected ? null : tmpl.id)}
                  className={`rounded-[22px] overflow-hidden shadow-[0_0_18px_rgba(0,0,0,0.06)] flex h-[72px] cursor-pointer transition-all border ${
                    isSelected
                      ? "border-[#191919] ring-2 ring-[#191919] ring-offset-2 scale-[1.03] animate-in zoom-in-95"
                      : "border-[#E3E0D5] hover:scale-[1.02] hover:border-[#C8C3B4]"
                  }`}
                >
                  {tmpl.colors.map((hex, colorIdx) => (
                    <div
                      key={colorIdx}
                      className="flex-1 h-full"
                      style={{ backgroundColor: hex }}
                      title={`${tmpl.name}: ${hex}`}
                    />
                  ))}
                </div>
              );
            })}

            {/* Card 6: "Create your own template" */}
            <div
              onClick={() => {
                setSelectedColorTemplate("custom");
                setIsColorModalOpen(true);
              }}
              className={`border rounded-[22px] shadow-2xs h-[72px] flex items-center justify-center cursor-pointer transition-all font-['Poppins'] text-[14px] font-medium text-[#333] select-none overflow-hidden ${
                selectedColorTemplate === "custom"
                  ? "border-[#191919] ring-2 ring-[#191919] ring-offset-2 scale-[1.03] animate-in zoom-in-95 bg-white"
                  : "bg-white border-[#E3E0D5] hover:border-[#C8C3B4]"
              }`}
            >
              {selectedColorTemplate === "custom" ? (
                <div className="w-full h-full flex">
                  {customColors.map((hex, colorIdx) => (
                    <div
                      key={colorIdx}
                      className="flex-1 h-full"
                      style={{ backgroundColor: hex }}
                      title={`Custom Color: ${hex}`}
                    />
                  ))}
                </div>
              ) : (
                <span>Create your own template</span>
              )}
            </div>
          </div>

          {/* AI Explanation Output Response Section */}
          <div className="pt-4 space-y-3">
            <p className="font-['Poppins'] text-[15px] font-normal text-[#191919] leading-relaxed select-text">
              This is a common issue on shared hosting like Hostinger when the server&apos;s MIME types aren&apos;t configured properly.
            </p>

            {/* Action Buttons: Copy, Share, Refresh */}
            <div className="flex items-center gap-3 pt-1 text-gray-500">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText("This is a common issue on shared hosting like Hostinger when the server's MIME types aren't configured properly.")}
                className="p-1.5 hover:text-black hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                title="Copy response"
              >
                <Copy className="w-4 h-4" />
              </button>

              <button
                type="button"
                className="p-1.5 hover:text-black hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                className="p-1.5 hover:text-black hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                title="Regenerate"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Center Backdrop Blur Dialog for "Create your own template" */}
      {isColorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#E3E0D5] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200 space-y-5 font-['Poppins']">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-['Georgia'] text-[20px] font-semibold text-[#191919]">
                Create Your Color Template
              </h3>
              <button
                type="button"
                onClick={() => setIsColorModalOpen(false)}
                className="p-1 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live 5-Stripe Color Palette Preview Bar & Slot Chooser (Exact Match to Screenshot 1) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[12px] font-medium text-gray-600">
                <span>Select slot to customize:</span>
                <span className="text-[#DE7356]">Slot {activeColorIdx + 1} of 5</span>
              </div>

              {/* White Container Bar with Pill Shapes & Double Border Ring with Center Dot */}
              <div className="rounded-[22px] p-[5px] border border-[#E3E0D5] bg-[#FAF9F5] flex h-[62px] gap-2 items-center shadow-2xs">
                {customColors.map((hex, idx) => {
                  const isActive = activeColorIdx === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveColorIdx(idx)}
                      className={`rounded-[14px] flex-1 h-full cursor-pointer transition-all relative flex items-center justify-center ${
                        isActive
                          ? "border-2 border-[#191919] ring-1 ring-white scale-[1.02] shadow-xs z-10"
                          : "hover:opacity-90 hover:scale-[1.01]"
                      }`}
                      style={{ backgroundColor: hex }}
                      title={`Slot ${idx + 1}: ${hex}`}
                    >
                      {isActive && (
                        <span className="w-2.5 h-2.5 rounded-full bg-white shadow-xs animate-in zoom-in-50" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modern 2D Color Picker Canvas & Hue Slider (react-colorful) */}
            <div className="flex flex-col items-center gap-4 py-1 [&_.react-colorful]:!w-full [&_.react-colorful]:!h-48 [&_.react-colorful]:!rounded-2xl [&_.react-colorful]:!border-none [&_.react-colorful__saturation]:!rounded-t-2xl [&_.react-colorful__hue]:!h-6 [&_.react-colorful__hue]:!rounded-b-2xl [&_.react-colorful__pointer]:!w-6 [&_.react-colorful__pointer]:!h-6">
              <HexColorPicker
                color={customColors[activeColorIdx] || "#DE7356"}
                onChange={(newColor) => {
                  const next = [...customColors];
                  next[activeColorIdx] = newColor.toUpperCase();
                  setCustomColors(next);
                }}
              />

              {/* Color Control Bar: Eye Dropper, Swatch Circle, RGB & HEX Numeric Inputs */}
              <div className="w-full flex items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-3">
                  {/* Active Color Swatch Circle */}
                  <div
                    className="w-10 h-10 rounded-full border-2 border-white shadow-md shrink-0 transition-colors"
                    style={{ backgroundColor: customColors[activeColorIdx] }}
                  />

                  {/* Eye Dropper Tool Button (Native EyeDropper API) */}
                  {"EyeDropper" in window && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const eyeDropper = new (window as any).EyeDropper();
                          const result = await eyeDropper.open();
                          if (result?.sRGBHex) {
                            const next = [...customColors];
                            next[activeColorIdx] = result.sRGBHex.toUpperCase();
                            setCustomColors(next);
                          }
                        } catch (e) {}
                      }}
                      className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer"
                      title="Pick color from screen"
                    >
                      <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m2 22 1-1h3l9-9M3 21v-3l9-9" />
                        <path d="M15 6 9 12" />
                        <path d="m17 4 3 3-2 2-3-3z" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* RGB Numeric Input Fields matching Screenshot */}
                <div className="flex items-center gap-2">
                  {(() => {
                    const currentHex = customColors[activeColorIdx] || "#DE7356";
                    const cleanHex = currentHex.replace("#", "");
                    const num = parseInt(cleanHex.length === 6 ? cleanHex : "000000", 16);
                    const r = (num >> 16) & 255;
                    const g = (num >> 8) & 255;
                    const b = num & 255;

                    const updateRGB = (newR: number, newG: number, newB: number) => {
                      const toHex = (val: number) => Math.max(0, Math.min(255, val)).toString(16).padStart(2, "0");
                      const nextHex = `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`.toUpperCase();
                      const next = [...customColors];
                      next[activeColorIdx] = nextHex;
                      setCustomColors(next);
                    };

                    return (
                      <div className="flex items-center gap-1.5 font-['Poppins']">
                        {/* 6-Digit HEX Code Text Input Field */}
                        <div className="flex flex-col items-center">
                          <div className="flex items-center border border-gray-200 rounded-xl px-2 h-9 bg-white focus-within:border-[#DE7356] transition-colors">
                            <span className="text-xs text-gray-400 font-mono select-none">#</span>
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="DE7356"
                              value={customColors[activeColorIdx]?.replace("#", "") || ""}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
                                const nextHex = `#${val}`;
                                const next = [...customColors];
                                next[activeColorIdx] = nextHex;
                                setCustomColors(next);
                              }}
                              className="w-16 text-center text-xs font-mono font-medium text-[#191919] outline-none uppercase bg-transparent"
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 mt-0.5">HEX</span>
                        </div>

                        {/* R Input */}
                        <div className="flex flex-col items-center">
                          <input
                            type="number"
                            min={0}
                            max={255}
                            value={isNaN(r) ? 0 : r}
                            onChange={(e) => updateRGB(parseInt(e.target.value) || 0, g, b)}
                            className="w-11 h-9 border border-gray-200 rounded-xl text-center text-xs font-medium outline-none focus:border-[#DE7356]"
                          />
                          <span className="text-[10px] text-gray-400 mt-0.5">R</span>
                        </div>

                        {/* G Input */}
                        <div className="flex flex-col items-center">
                          <input
                            type="number"
                            min={0}
                            max={255}
                            value={isNaN(g) ? 0 : g}
                            onChange={(e) => updateRGB(r, parseInt(e.target.value) || 0, b)}
                            className="w-11 h-9 border border-gray-200 rounded-xl text-center text-xs font-medium outline-none focus:border-[#DE7356]"
                          />
                          <span className="text-[10px] text-gray-400 mt-0.5">G</span>
                        </div>

                        {/* B Input */}
                        <div className="flex flex-col items-center">
                          <input
                            type="number"
                            min={0}
                            max={255}
                            value={isNaN(b) ? 0 : b}
                            onChange={(e) => updateRGB(r, g, parseInt(e.target.value) || 0)}
                            className="w-11 h-9 border border-gray-200 rounded-xl text-center text-xs font-medium outline-none focus:border-[#DE7356]"
                          />
                          <span className="text-[10px] text-gray-400 mt-0.5">B</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsColorModalOpen(false)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#333] rounded-xl text-xs font-medium transition-all cursor-pointer shadow-2xs"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedColorTemplate("custom");
                  setIsColorModalOpen(false);
                }}
                className="px-6 py-2.5 bg-[#DE7356] hover:bg-[#C9593A] text-white rounded-xl text-xs font-medium transition-all shadow-xs cursor-pointer active:scale-95"
              >
                Save & Apply Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
