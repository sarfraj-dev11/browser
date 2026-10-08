"use client";

import React, { useState } from "react";

interface PerplexityLoginCardProps {
    isOpen: boolean;
    onClose: () => void;
    isAssistantOpen: boolean;
    assistantWidth: number;
}

export default function PerplexityLoginCard({
    isOpen,
    onClose,
    isAssistantOpen,
    assistantWidth
}: PerplexityLoginCardProps) {
    const [perplexityEmail, setPerplexityEmail] = useState("");
    const [perplexityStep, setPerplexityStep] = useState("login"); // "login" | "otp"
    const [isEmailLoading, setIsEmailLoading] = useState(false);
    const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);

    if (!isOpen) return null;

    const handleEmailSubmit = () => {
        if (perplexityEmail.trim()) {
            setIsEmailLoading(true);
            setTimeout(() => {
                setIsEmailLoading(false);
                setPerplexityStep("otp");
            }, 1500);
        }
    };

    const handleOtpConfirm = () => {
        alert(`OTP verification successful! Code: ${otpDigits.join("")}`);
        onClose();
        setPerplexityStep("login");
        setOtpDigits(["", "", "", "", "", ""]);
    };

    if (perplexityStep === "otp") {
        return /*#__PURE__*/ React.createElement("div", {
            key: "perplexity-otp-overlay",
            className: "fixed bg-[#0f0e0c] flex flex-col items-center justify-center p-6 z-[99999] animate-in fade-in duration-300 select-none",
            style: {
                top: "94px",
                bottom: "0px",
                left: "0px",
                right: isAssistantOpen ? `${assistantWidth}px` : "0px"
            },
            children: [

                // Close button (right top)
                /*#__PURE__*/ React.createElement("button", {
                    key: "close-btn",
                    onClick: () => {
                        onClose();
                        setPerplexityStep("login");
                        setOtpDigits(["", "", "", "", "", ""]);
                    },
                    className: "absolute top-8 right-8 w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all hover:bg-zinc-800 active:scale-95",
                    children: /*#__PURE__*/ React.createElement("svg", {
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: "2.5",
                        className: "w-5 h-5",
                        children: /*#__PURE__*/ React.createElement("path", {
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                            d: "M6 18L18 6M6 6l12 12"
                        })
                    })
                }),
                // Centered Container Block
                /*#__PURE__*/ React.createElement("div", {
                    key: "otp-centered-content",
                    className: "flex flex-col items-center max-w-[420px] w-full text-center px-4",
                    children: [
                        // Logo header
                        /*#__PURE__*/ React.createElement("img", {
                            key: "logo",
                            src: "/claudecode-color.png",
                            alt: "Logo",
                            className: "w-14 h-14 object-contain mb-6"
                        }),
                        // Title
                        /*#__PURE__*/ React.createElement("h2", {
                            key: "otp-title",
                            className: "text-3xl font-semibold tracking-tight text-white font-serif mb-2",
                            children: "Check your email"
                        }),
                        // Subtitle
                        /*#__PURE__*/ React.createElement("p", {
                            key: "otp-subtitle",
                            className: "text-sm text-zinc-400 font-sans leading-relaxed mb-8 max-w-sm",
                            children: [
                                "A temporary sign-in link has been sent to ",
                                /*#__PURE__*/ React.createElement("span", {
                                    key: "email-highlight",
                                    className: "font-semibold text-zinc-200 break-all",
                                    children: perplexityEmail
                                })
                            ]
                        }),
                        // OTP Input boxes (6 boxes)
                        /*#__PURE__*/ React.createElement("div", {
                            key: "otp-inputs-wrapper",
                            className: "flex gap-2.5 justify-center mb-8 w-full",
                            children: otpDigits.map((digit, idx) => 
                                /*#__PURE__*/ React.createElement("input", {
                                    key: `otp-input-${idx}`,
                                    id: `otp-input-${idx}`,
                                    type: "text",
                                    maxLength: 1,
                                    value: digit,
                                    onChange: (e) => {
                                        const val = e.target.value;
                                        const newDigits = [...otpDigits];
                                        newDigits[idx] = val.slice(-1);
                                        setOtpDigits(newDigits);
                                        if (val && idx < 5) {
                                            const nextEl = document.getElementById(`otp-input-${idx + 1}`);
                                            if (nextEl) nextEl.focus();
                                        }
                                    },
                                    onKeyDown: (e) => {
                                        if (e.key === "Backspace" && !otpDigits[idx] && idx > 0) {
                                            const prevEl = document.getElementById(`otp-input-${idx - 1}`);
                                            if (prevEl) prevEl.focus();
                                        }
                                    },
                                    className: "w-11 h-14 border border-zinc-800 rounded-xl bg-[#161513] text-center text-2xl font-semibold text-white focus:border-[#c15f3c] focus:ring-1 focus:ring-[#c15f3c]/20 outline-none transition-all"
                                })
                            )
                        }),
                        // Confirm OTP Button
                        /*#__PURE__*/ React.createElement("button", {
                            key: "otp-confirm-btn",
                            disabled: otpDigits.some(d => !d),
                            onClick: handleOtpConfirm,
                            className: `w-full py-3 rounded-xl font-bold text-sm font-sans transition-all duration-150 ${
                                otpDigits.some(d => !d)
                                    ? "bg-zinc-800/80 text-zinc-500 cursor-not-allowed opacity-60"
                                    : "bg-[#c15f3c] text-white hover:bg-[#d66b44] shadow-lg active:scale-[0.98]"
                            }`,
                            children: "Confirm"
                        }),
                        // Resend option
                        /*#__PURE__*/ React.createElement("div", {
                            key: "otp-resend",
                            className: "text-xs text-zinc-500 font-sans text-center mt-6",
                            children: [
                                "Didn't receive the email? ",
                                /*#__PURE__*/ React.createElement("button", {
                                    key: "resend-btn",
                                    onClick: () => {
                                        alert("Email verification resent!");
                                    },
                                    className: "text-[#c15f3c] font-bold hover:underline bg-transparent border-none p-0 inline cursor-pointer",
                                    children: "Resend"
                                })
                            ]
                        })
                    ]
                })
            ]
        });
    }

    return /*#__PURE__*/ React.createElement("div", {
        key: "perplexity-direct-login",
        className: "fixed bottom-5 w-[330px] border border-[#2e2b24] bg-[#191919] text-[#e3e0d5] rounded-[28px] p-7 shadow-2xl flex flex-col gap-5 z-[9999] font-sans transition-all duration-300",
        style: {
            right: isAssistantOpen ? `${assistantWidth + 20}px` : "20px"
        },
        children: [
            // Login View
            // Close button X
            /*#__PURE__*/ React.createElement("button", {
                key: "close-btn",
                onClick: onClose,
                className: "absolute top-5 right-5 text-[#8c8877] hover:text-[#e3e0d5] transition-all p-1 hover:bg-white/5 rounded-lg active:scale-90",
                children: /*#__PURE__*/ React.createElement("svg", {
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "2.5",
                    className: "w-4 h-4",
                    children: /*#__PURE__*/ React.createElement("path", {
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        d: "M6 18L18 6M6 6l12 12"
                    })
                })
            }),
            // Header with Logo
            /*#__PURE__*/ React.createElement("div", {
                key: "modal-header",
                className: "flex flex-col items-center gap-4 mt-2 text-center",
                children: [
                    /*#__PURE__*/ React.createElement("img", {
                        key: "logo",
                        src: "/claudecode-color.png",
                        alt: "Logo",
                        className: "w-11 h-11 object-contain"
                    }),
                    /*#__PURE__*/ React.createElement("h2", {
                        key: "title",
                        className: "text-lg font-bold tracking-tight text-[#e3e0d5] mt-1 font-sans",
                        children: "Login or sign up for free"
                    }),
                    /*#__PURE__*/ React.createElement("p", {
                        key: "subtitle",
                        className: "text-xs text-[#8c8877] font-sans -mt-2",
                        children: "Save and sync your searches"
                    })
                ]
            }),
            // Main Login Actions
            /*#__PURE__*/ React.createElement("div", {
                key: "modal-actions",
                className: "flex flex-col gap-2.5 w-full",
                children: [
                    // Google Login
                    /*#__PURE__*/ React.createElement("button", {
                        key: "google-btn",
                        className: "w-full py-2.5 rounded-xl bg-[#e3e0d5] hover:bg-[#efede8] text-[#191919] font-bold text-xs font-sans flex items-center justify-center gap-2.5 transition-all duration-150 active:scale-[0.98]",
                        children: [
                            /*#__PURE__*/ React.createElement("svg", {
                                key: "g-icon",
                                viewBox: "0 0 24 24",
                                className: "w-4 h-4 shrink-0",
                                children: [
                                    /*#__PURE__*/ React.createElement("path", {
                                        key: "gp1",
                                        fill: "#4285F4",
                                        d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    }),
                                    /*#__PURE__*/ React.createElement("path", {
                                        key: "gp2",
                                        fill: "#34A853",
                                        d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    }),
                                    /*#__PURE__*/ React.createElement("path", {
                                        key: "gp3",
                                        fill: "#FBBC05",
                                        d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                    }),
                                    /*#__PURE__*/ React.createElement("path", {
                                        key: "gp4",
                                        fill: "#EA4335",
                                        d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                    })
                                ]
                            }),
                            "Continue with Google"
                        ]
                    }),
                    // Apple Login
                    /*#__PURE__*/ React.createElement("button", {
                        key: "apple-btn",
                        className: "w-full py-2.5 rounded-xl bg-[#2a2926] hover:bg-[#383632] text-[#e3e0d5] border border-[#3e3b34] font-bold text-xs font-sans flex items-center justify-center gap-2.5 transition-all duration-150 active:scale-[0.98]",
                        children: [
                            /*#__PURE__*/ React.createElement("svg", {
                                key: "a-icon",
                                viewBox: "0 0 24 24",
                                fill: "currentColor",
                                className: "w-4 h-4 shrink-0 text-[#e3e0d5]",
                                children: /*#__PURE__*/ React.createElement("path", {
                                    d: "M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.2.67-2.92 1.52-.63.73-1.18 1.87-1.03 2.97 1.1.09 2.23-.55 2.96-1.43z"
                                })
                            }),
                            "Continue with Apple"
                        ]
                    }),
                    // Divider Line
                    /*#__PURE__*/ React.createElement("div", {
                        key: "divider",
                        className: "w-full h-[1px] bg-[#2e2b24] my-2"
                    }),
                    // Email Form Inputs
                    /*#__PURE__*/ React.createElement("input", {
                        key: "email-input",
                        type: "email",
                        value: perplexityEmail,
                        onChange: (e) => setPerplexityEmail(e.target.value),
                        placeholder: "Enter your email",
                        disabled: isEmailLoading,
                        className: "w-full px-4 py-2.5 rounded-xl border border-[#2e2b24] bg-[#22211e] text-[#e3e0d5] text-xs outline-none focus:border-[#c15f3c] transition-all font-sans placeholder-[#8c8877]"
                    }),
                    /*#__PURE__*/ React.createElement("button", {
                        key: "email-submit-btn",
                        disabled: !perplexityEmail.trim() || isEmailLoading,
                        onClick: handleEmailSubmit,
                        className: `w-full py-2.5 rounded-xl border font-bold text-xs font-sans transition-all duration-150 flex items-center justify-center ${
                            !perplexityEmail.trim() || isEmailLoading
                                ? "bg-[#2a2926] text-[#8c8877] border-[#3e3b34] opacity-40 cursor-not-allowed pointer-events-none"
                                : "bg-[#2a2926] hover:bg-[#383632] text-[#e3e0d5] hover:text-white border-[#3e3b34] active:scale-[0.98]"
                        }`,
                        children: isEmailLoading
                            ? /*#__PURE__*/ React.createElement("div", {
                                className: "w-4 h-4 animate-spin rounded-full border-2 border-t-transparent border-[#e3e0d5]"
                            })
                            : "Continue with email"
                    }),
                    // Single sign-on (SSO)
                    /*#__PURE__*/ React.createElement("button", {
                        key: "sso-btn",
                        className: "w-full py-2 mt-1 text-[10px] font-bold text-[#8c8877] hover:text-[#e3e0d5] font-sans transition-all active:scale-95 text-center bg-transparent border-none outline-none cursor-pointer",
                        children: "Single sign-on (SSO)"
                    })
                ]
            })
        ]
    });
}
