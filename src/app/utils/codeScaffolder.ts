export interface ScaffoldedFile {
  filepath: string;
  language: "tsx" | "ts" | "css" | "json";
  code: string;
  description: string;
}

export const generateCodeScaffold = (planTitle: string, prompt: string): ScaffoldedFile[] => {
  const isEcommerce = prompt.toLowerCase().includes("blinkit") || prompt.toLowerCase().includes("store") || prompt.toLowerCase().includes("shop") || prompt.toLowerCase().includes("cart");

  return [
    {
      filepath: "src/app/layout.tsx",
      language: "tsx",
      description: "Root Layout with modern font scales and global metadata tags",
      code: `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "${planTitle || "Next.js High-Performance App"}",
  description: "Built with Next.js App Router, Tailwind CSS, and AI Deduplication Engine.",
  openGraph: {
    title: "${planTitle}",
    description: "Ultra-fast Next.js application",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f9f8f6] text-[#191919] antialiased selection:bg-[#c15f3c]/20">
        {children}
      </body>
    </html>
  );
}`
    },
    {
      filepath: "src/app/page.tsx",
      language: "tsx",
      description: "Main Application Page featuring sticky navigation, hero section, and dynamic grid",
      code: `"use client";

import React, { useState } from "react";
import { Sparkles, ShoppingBag, Search, Clock, ShieldCheck } from "lucide-react";

export default function HomePage() {
  const [cartCount, setCartCount] = useState(0);

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border border-[#e3e0d5] rounded-2xl p-4 mb-8 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#c15f3c] text-white flex items-center justify-center font-black">
            B
          </div>
          <span className="font-extrabold text-lg tracking-tight">${isEcommerce ? "Blinkit Express" : "NextApp Pro"}</span>
        </div>

        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="flex items-center bg-[#f9f8f6] border border-[#e3e0d5] rounded-xl px-3 py-2 text-xs">
            <Search className="w-4 h-4 text-zinc-400 mr-2" />
            <input type="text" placeholder="${isEcommerce ? "Search milk, vegetables, snacks..." : "Search app features..."}" className="bg-transparent outline-none w-full" />
          </div>
        </div>

        <button className="px-4 py-2 rounded-xl bg-[#c15f3c] text-white font-bold text-xs flex items-center gap-2 shadow-sm">
          <ShoppingBag className="w-4 h-4" />
          <span>Cart ({cartCount})</span>
        </button>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#c15f3c] to-[#d97706] rounded-3xl p-6 md:p-10 text-white shadow-lg mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold mb-4 backdrop-blur-xs">
          <Clock className="w-3.5 h-3.5" /> ${isEcommerce ? "Instant 10-Minute Delivery" : "Lightning Fast Performance"}
        </div>
        <h1 className="text-3xl md:text-5xl font-black mb-3 leading-tight">
          ${isEcommerce ? "Groceries Delivered in 10 Minutes." : "Enterprise Next.js Architecture"}
        </h1>
        <p className="text-xs md:text-sm text-white/90 max-w-2xl leading-relaxed mb-6">
          ${isEcommerce ? "Order fresh vegetables, dairy, electronics, and daily essentials straight to your door." : "Modular, self-healing code scaffold generated automatically by AI."}
        </p>
        <button onClick={() => setCartCount(cartCount + 1)} className="px-6 py-3 rounded-2xl bg-white text-[#c15f3c] font-black text-xs shadow-md hover:bg-zinc-100 transition-all active:scale-95">
          ${isEcommerce ? "Start Shopping Now" : "Explore Documentation"}
        </button>
      </div>
    </main>
  );
}`
    },
    {
      filepath: "src/app/globals.css",
      language: "css",
      description: "Vanilla CSS Design Tokens and Tailwind Utilities",
      code: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --brand-primary: #c15f3c;
  --brand-accent: #d97706;
  --bg-surface: #f9f8f6;
  --text-main: #191919;
  --border-subtle: #e3e0d5;
}

body {
  background-color: var(--bg-surface);
  color: var(--text-main);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}`
    }
  ];
};
