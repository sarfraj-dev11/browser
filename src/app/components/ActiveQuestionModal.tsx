import React from "react";
import { ArrowRight, Edit3, X } from "lucide-react";

interface ActiveQuestion {
    question: string;
    options: string[];
    resolve: (answer: string) => void;
}

interface ActiveQuestionModalProps {
    activeQuestion: ActiveQuestion | null;
    onClose: () => void;
}

export const ActiveQuestionModal: React.FC<ActiveQuestionModalProps> = ({
    activeQuestion,
    onClose,
}) => {
    if (!activeQuestion) return null;

    const handleSelectOption = (opt: string) => {
        activeQuestion.resolve(opt);
        onClose();
    };

    const handleSkip = () => {
        activeQuestion.resolve("Skipped");
        onClose();
    };

    const handleSubmitCustom = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const input = form.elements.namedItem("customResponse") as HTMLInputElement;
        const text = input?.value.trim();
        if (text) {
            activeQuestion.resolve(text);
            onClose();
        }
    };

    return (
        <div className="bg-white border border-[#c15f3c]/30 rounded-2xl rounded-tl-sm w-full p-3.5 flex flex-col gap-3 text-[#191919] animate-fade-in font-sans self-start shadow-sm mt-1 overflow-hidden">
            <div className="flex items-start justify-between gap-2.5">
                <h3 className="text-xs font-bold text-[#191919] leading-snug break-words whitespace-normal flex-1">
                    {activeQuestion.question}
                </h3>
                <button
                    onClick={handleSkip}
                    title="Skip"
                    className="p-1 rounded-md text-zinc-400 hover:bg-black/5 hover:text-zinc-600 transition-all active:scale-90 shrink-0"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="flex flex-col gap-1.5">
                {activeQuestion.options.map((opt, index) => (
                    <button
                        key={`opt-${index}`}
                        onClick={() => handleSelectOption(opt)}
                        className="w-full px-3 py-2 rounded-xl border border-[#e3e0d5] hover:border-[#c15f3c]/40 hover:bg-[#c15f3c]/5 text-left font-semibold text-xs flex items-start gap-2.5 transition-all hover:translate-x-0.5 group"
                    >
                        <span className="w-5 h-5 rounded-lg bg-zinc-100 text-zinc-500 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                            {index + 1}
                        </span>
                        <span className="flex-1 min-w-0 text-[#191919] break-words whitespace-normal leading-relaxed text-xs">{opt}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-[#c15f3c] shrink-0 mt-1 transition-colors" />
                    </button>
                ))}
            </div>

            <form
                onSubmit={handleSubmitCustom}
                className="flex items-center gap-1.5 border-t border-[#e3e0d5] pt-2.5 mt-0.5 w-full overflow-hidden"
            >
                <div className="flex-1 min-w-0 flex items-center bg-zinc-50 border border-[#e3e0d5] rounded-xl px-2 py-1.5 focus-within:border-[#c15f3c] focus-within:ring-1 focus-within:ring-[#c15f3c]/20 transition-all gap-1.5">
                    <Edit3 className="w-3 h-3 text-zinc-400 shrink-0" />
                    <input
                        type="text"
                        name="customResponse"
                        placeholder="Something else..."
                        className="flex-1 min-w-0 bg-transparent text-xs text-[#191919] outline-none border-none placeholder:text-zinc-400 font-sans"
                    />
                </div>
                <button
                    type="submit"
                    className="px-2.5 py-1.5 rounded-xl bg-[#c15f3c] text-white hover:bg-[#d66b44] font-bold text-xs shadow-xs transition-all active:scale-95 shrink-0"
                >
                    Submit
                </button>
                <button
                    type="button"
                    onClick={handleSkip}
                    className="px-2 py-1.5 rounded-xl border border-[#e3e0d5] text-zinc-600 hover:bg-black/5 font-bold text-xs transition-all active:scale-95 shrink-0"
                >
                    Skip
                </button>
            </form>
        </div>
    );
};
