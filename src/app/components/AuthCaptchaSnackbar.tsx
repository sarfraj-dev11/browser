import React from "react";

export interface AuthSnackbarState {
  active: boolean;
  type: "captcha" | "login" | "auth" | "complete" | "";
  message: string;
}

interface AuthCaptchaSnackbarProps {
  state: AuthSnackbarState | null;
  onContinue: () => void;
  onCancel: () => void;
}

export const AuthCaptchaSnackbar: React.FC<AuthCaptchaSnackbarProps> = ({ state, onContinue, onCancel }) => {
  if (!state || !state.active) return null;

  const isComplete = state.type === "complete";
  const isCaptcha = state.type === "captcha";

  const borderColor = isComplete
    ? "border-emerald-500/50 shadow-emerald-500/20"
    : isCaptcha
    ? "border-amber-500/50 shadow-amber-500/20"
    : "border-indigo-500/50 shadow-indigo-500/20";

  const bgColor = isComplete
    ? "bg-emerald-950/95 text-emerald-100"
    : isCaptcha
    ? "bg-amber-950/95 text-amber-100"
    : "bg-slate-950/95 text-indigo-100";

  const icon = isComplete ? (
    <span className="text-xl">✅</span>
  ) : isCaptcha ? (
    <span className="text-xl">🛡️</span>
  ) : (
    <span className="text-xl">🔐</span>
  );

  return (
    <div className={`fixed top-14 left-1/2 -translate-x-1/2 z-[100001] flex items-center gap-4 ${bgColor} backdrop-blur-lg border ${borderColor} px-5 py-3.5 rounded-2xl shadow-2xl animate-fade-in font-sans max-w-[90vw] md:max-w-[650px] transition-all`}>
      <div className="flex items-center gap-3 shrink-0">
        <div className="p-2 rounded-xl bg-white/10 flex items-center justify-center">
          {icon}
        </div>
        {!isComplete && (
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-xs font-bold tracking-wide uppercase text-white/90">
          {isComplete
            ? "Verification Complete"
            : isCaptcha
            ? "CAPTCHA Challenge Detected"
            : "Authentication Required"}
        </span>
        <span className="text-xs text-white/70 truncate" title={state.message}>
          {state.message || (isCaptcha ? "Please solve the CAPTCHA on the page to continue." : "Please log in or verify on screen to continue.")}
        </span>
      </div>

      {!isComplete && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onContinue}
            className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-black shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            I've Completed It
          </button>
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white/10 hover:bg-rose-500/30 text-zinc-300 hover:text-white transition-all active:scale-95"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthCaptchaSnackbar;
