import React from "react";
import { AutofillProfile, MacroStep } from "../types";

interface MacroBuilderProps {
  onRunMacro?: (steps: MacroStep[]) => void;
  onAutofill?: (profile: AutofillProfile) => void;
  onAnnihilateCookies?: () => void;
  cookieBlockingEnabled?: boolean;
  setCookieBlockingEnabled?: (enabled: boolean) => void;
  isRecording?: boolean;
  recordedSteps?: MacroStep[];
  startRecording?: () => void;
  stopRecording?: () => void;
  onSaveRecordedMacro?: (name: string, steps: MacroStep[]) => void;

  // Chrome Profile Props
  activeProfileId: string;
  profiles: { id: string; name: string; email?: string; color: string; avatar?: string | null; isGuest?: boolean }[];
  onSwitchProfile: (profileId: string) => void;
  isSyncing?: boolean;
  onSyncCookies?: () => void;
  onClearSession?: () => void;
}

export const MacroBuilder: React.FC<MacroBuilderProps> = ({
  activeProfileId,
  profiles,
  onSwitchProfile
}) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#22222f] text-zinc-100" style={{ fontFamily: "'Lexend', system-ui, sans-serif" }}>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {(() => {
          const AVATAR_COLORS = ["#c15f3c", "#4f6fd8", "#3d8b5f", "#8a5fbf", "#b8860b", "#357a8c"];
          const colorFor = (s: string) =>
            AVATAR_COLORS[[...(s || "?")].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
          const Avatar = ({ p, size, textSize }: { p: any; size: string; textSize: string }) =>
            p?.avatar ? (
              <img
                src={p.avatar}
                alt={p.name}
                className={`${size} rounded-full shrink-0 object-cover`}
              />
            ) : (
              <div
                className={`${size} rounded-full shrink-0 flex items-center justify-center text-white font-light ${textSize}`}
                style={{ backgroundColor: colorFor(p?.name || "?") }}
              >
                {(p?.name || "?").trim().charAt(0).toUpperCase()}
              </div>
            );

          const active = profiles.find((p) => p.id === activeProfileId) || profiles[0];
          const others = profiles.filter((p) => p.id !== active?.id);

          return (
            <div className="flex flex-col gap-2">
              {/* Hero card — active profile, Edge-style dark block */}
              {active && (
                <div className="relative overflow-hidden rounded-2xl bg-[#2b2b3a] border border-white/10 select-none">
                  {active.email && (
                    <span className="absolute top-3 right-3 flex items-center gap-1.5 text-[9px] font-extralight text-zinc-300">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                      Managed account
                    </span>
                  )}
                  <div className="flex flex-col items-center px-4 pt-9 pb-5">
                    <Avatar p={active} size="w-16 h-16" textSize="text-2xl" />
                    <span className="text-[15px] font-light text-white mt-3 truncate max-w-full">{active.name}</span>
                    <span className="text-[11px] font-extralight text-zinc-300 truncate max-w-full mt-0.5">
                      {active.email || "Local profile"}
                    </span>
                  </div>
                </div>
              )}

              {/* Other available profiles */}
              {others.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="px-2 text-[9px] font-light text-zinc-500 uppercase tracking-[0.15em] select-none">
                    Other Chrome profiles
                  </span>
                  <div className="flex flex-col bg-[#2b2b3a] border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
                    {others.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => onSwitchProfile(p.id)}
                        className="px-3.5 py-3 text-left transition-all flex items-center gap-3.5 hover:bg-white/[0.07] group"
                      >
                        <div className="ring-2 ring-white/10 rounded-full group-hover:ring-white/25 transition-all shrink-0">
                          <Avatar p={p} size="w-9 h-9" textSize="text-sm" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[13px] font-light text-zinc-100 truncate group-hover:text-white transition-colors">
                            {p.name}
                          </span>
                          <span className="text-[10px] font-extralight text-zinc-400 truncate">
                            {p.isGuest ? "Browse without saving session" : (p.email || "Click to import session")}
                          </span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-zinc-600 group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all shrink-0">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {profiles.length === 0 && (
                <div className="text-[10px] text-zinc-500 italic p-1">No profiles loaded.</div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};
