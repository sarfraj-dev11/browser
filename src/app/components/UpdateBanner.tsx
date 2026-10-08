"use client";

import React, { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";

type UpdateState =
    | { status: "idle" }
    | { status: "available"; version?: string }
    | { status: "downloading"; percent: number }
    | { status: "downloaded"; version?: string }
    | { status: "error"; message?: string };

export function UpdateBanner() {
    const [state, setState] = useState<UpdateState>({ status: "idle" });
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const api: any =
            (window as any).electronAPI ||
            (typeof (window as any).require === "function" ? (window as any).require("electron").ipcRenderer : null);
        if (!api) return;

        const handler = (_event: any, data: any) => {
            if (!data || !data.status) return;
            setDismissed(false);
            setState(data);
        };

        if (api.on) {
            api.on("updater-event", handler);
            return () => api.removeListener && api.removeListener("updater-event", handler);
        }
        if (api.ipcRenderer) {
            api.ipcRenderer.on("updater-event", handler);
            return () => api.ipcRenderer.removeListener("updater-event", handler);
        }
    }, []);

    const install = () => {
        const api: any =
            (window as any).electronAPI ||
            (typeof (window as any).require === "function" ? (window as any).require("electron").ipcRenderer : null);
        if (api && api.send) api.send("updater-install");
        else if (api && api.ipcRenderer) api.ipcRenderer.send("updater-install");
    };

    if (state.status === "idle" || dismissed) return null;
    if (state.status === "error" && dismissed) return null;

    return (
        <div className="fixed bottom-5 right-5 z-[1100] w-80 bg-white border border-[#e3e0d5] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-4 flex flex-col gap-2 font-sans animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-[#191919]">
                    <Download size={15} className="text-[#fc4b01]" />
                    <span className="text-[13px] font-semibold">
                        {state.status === "available" && `Update ${state.version ? `v${state.version} ` : ""}available`}
                        {state.status === "downloading" && `Downloading update… ${state.percent}%`}
                        {state.status === "downloaded" && `Update ${state.version ? `v${state.version} ` : ""}ready to install`}
                        {state.status === "error" && "Update failed"}
                    </span>
                </div>
                <button
                    onClick={() => setDismissed(true)}
                    className="text-[#8c8877] hover:text-[#191919] transition-colors p-0.5"
                    title="Dismiss"
                >
                    <X size={14} />
                </button>
            </div>

            {state.status === "downloading" && (
                <div className="w-full h-1.5 bg-[#f0eee7] rounded-full overflow-hidden">
                    <div
                        className="h-full bg-[#fc4b01] rounded-full transition-all duration-300"
                        style={{ width: `${state.percent}%` }}
                    />
                </div>
            )}

            {state.status === "available" && (
                <p className="text-[11.5px] text-[#6e6b5e] leading-relaxed">
                    Downloading in the background — you'll be able to restart into the new version when it's ready.
                </p>
            )}

            {state.status === "downloaded" && (
                <button
                    onClick={install}
                    className="mt-1 flex items-center justify-center gap-2 bg-[#fc4b01] hover:bg-[#e04401] text-white text-[12px] font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                    <RefreshCw size={13} />
                    Restart &amp; Update
                </button>
            )}

            {state.status === "error" && (
                <p className="text-[11px] text-[#a33] truncate" title={state.message}>
                    {state.message || "Couldn't check for updates."}
                </p>
            )}
        </div>
    );
}

export default UpdateBanner;
