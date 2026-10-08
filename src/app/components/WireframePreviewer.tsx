import React, { useState } from "react";
import { Monitor, Smartphone, Tablet, Clock, ShoppingBag, Plus, Minus, Search, Star, Zap, CheckCircle2 } from "lucide-react";

interface WireframePreviewerProps {
  planTitle: string;
}

export const WireframePreviewer: React.FC<WireframePreviewerProps> = ({ planTitle }) => {
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [cartCount, setCartCount] = useState<number>(0);

  const containerWidthClass =
    device === "desktop"
      ? "w-full max-w-5xl"
      : device === "tablet"
      ? "w-[600px]"
      : "w-[360px]";

  const sampleProducts = [
    { id: 1, name: "Amul Taaza Toned Fresh Milk", weight: "500 ml", price: "₹27", oldPrice: "₹30", discount: "10% OFF", rating: 4.8, eta: "8 MINS", image: "🥛" },
    { id: 2, name: "Fresh Farm Organic Tomatoes", weight: "1 kg", price: "₹38", oldPrice: "₹45", discount: "15% OFF", rating: 4.6, eta: "10 MINS", image: "🍅" },
    { id: 3, name: "Whole Wheat Fresh Bread", weight: "400 g", price: "₹45", oldPrice: "₹50", discount: "10% OFF", rating: 4.9, eta: "7 MINS", image: "🍞" },
    { id: 4, name: "Potato Chips - Spanish Tomato", weight: "115 g", price: "₹35", oldPrice: "₹40", discount: "12% OFF", rating: 4.7, eta: "9 MINS", image: "🥔" }
  ];

  return (
    <div className="bg-white rounded-3xl border border-[#e3e0d5] p-6 shadow-sm space-y-6">
      {/* Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#e3e0d5]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#c15f3c] bg-[#c15f3c]/10 px-2 py-0.5 rounded">
            Interactive Wireframe Canvas
          </span>
          <h3 className="text-lg font-bold text-[#191919] mt-1">Live Planned Component Wireframe Mockup</h3>
          <p className="text-xs text-[#6e6b5e]">
            Interactive device preview generated for: <strong className="text-[#191919]">{planTitle}</strong>
          </p>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center bg-[#f9f8f6] border border-[#e3e0d5] p-1 rounded-2xl gap-1">
          <button
            onClick={() => setDevice("desktop")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              device === "desktop" ? "bg-white text-[#c15f3c] shadow-xs" : "text-[#8c8877] hover:text-[#191919]"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" /> Desktop
          </button>
          <button
            onClick={() => setDevice("tablet")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              device === "tablet" ? "bg-white text-[#c15f3c] shadow-xs" : "text-[#8c8877] hover:text-[#191919]"
            }`}
          >
            <Tablet className="w-3.5 h-3.5" /> Tablet
          </button>
          <button
            onClick={() => setDevice("mobile")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              device === "mobile" ? "bg-white text-[#c15f3c] shadow-xs" : "text-[#8c8877] hover:text-[#191919]"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> Mobile
          </button>
        </div>
      </div>

      {/* Screen Frame Container */}
      <div className="flex justify-center bg-[#191919] p-6 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl">
        <div className={`${containerWidthClass} bg-[#f8f9fa] rounded-2xl overflow-hidden text-[#191919] transition-all duration-300 font-sans border border-zinc-700 shadow-lg`}>
          {/* Header Bar */}
          <div className="bg-[#f7c32e] p-3 md:p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0c831f] text-white flex items-center justify-center font-black text-xs">
                ⚡
              </div>
              <span className="font-extrabold text-sm text-[#1c1c1c] tracking-tight">Blinkit Express</span>
            </div>

            <div className="flex items-center gap-1.5 bg-white/90 px-2.5 py-1 rounded-xl text-[10px] font-bold text-[#0c831f] shadow-2xs">
              <Clock className="w-3 h-3" /> Delivery in 10 mins
            </div>

            <button className="px-3 py-1.5 rounded-xl bg-[#0c831f] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs">
              <ShoppingBag className="w-3.5 h-3.5" /> ({cartCount})
            </button>
          </div>

          {/* Hero Banner */}
          <div className="bg-gradient-to-r from-[#0c831f] to-[#15a02e] p-5 text-white">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/20 text-[9px] font-bold uppercase tracking-wider mb-2">
              <Zap className="w-3 h-3" /> Superfast Delivery
            </div>
            <h4 className="text-lg md:text-xl font-black mb-1">Fresh Vegetables & Milk Delivered</h4>
            <p className="text-[10px] text-white/90 mb-3">Guaranteed 10-minute delivery from local dark stores.</p>
          </div>

          {/* Product Grid Mockup */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-[#191919]">Bestsellers in 10 Mins</span>
              <span className="text-[#0c831f] text-[11px] cursor-pointer">See All</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {sampleProducts.map((p) => (
                <div key={p.id} className="bg-white p-3 rounded-xl border border-[#e3e0d5] flex flex-col justify-between shadow-2xs group hover:border-[#0c831f] transition-all">
                  <div>
                    <div className="flex items-center justify-between text-[9px] font-bold mb-1">
                      <span className="bg-amber-500/10 text-amber-800 px-1.5 py-0.5 rounded">{p.discount}</span>
                      <span className="text-[#0c831f] bg-[#0c831f]/10 px-1.5 py-0.5 rounded">{p.eta}</span>
                    </div>

                    <div className="text-3xl text-center py-2 group-hover:scale-110 transition-transform">
                      {p.image}
                    </div>

                    <div className="text-[11px] font-bold text-[#191919] line-clamp-2 leading-tight mt-1">{p.name}</div>
                    <div className="text-[9px] text-[#8c8877] font-semibold mt-0.5">{p.weight}</div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#f0eee6]">
                    <div>
                      <span className="text-xs font-black text-[#191919]">{p.price}</span>
                      <span className="text-[9px] text-[#8c8877] line-through ml-1">{p.oldPrice}</span>
                    </div>

                    <button
                      onClick={() => setCartCount(cartCount + 1)}
                      className="px-2.5 py-1 rounded-lg bg-[#0c831f]/10 text-[#0c831f] hover:bg-[#0c831f] hover:text-white font-extrabold text-[10px] uppercase tracking-wider transition-colors"
                    >
                      ADD
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WireframePreviewer;
