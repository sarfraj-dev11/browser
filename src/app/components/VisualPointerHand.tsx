import React, { useState, useEffect, useRef } from "react";

interface HandPosition {
  x: number;
  y: number;
  visible: boolean;
  clicking: boolean;
}

interface VisualPointerHandProps {
  handPosition: HandPosition;
}

export const VisualPointerHand: React.FC<VisualPointerHandProps> = ({ handPosition }) => {
  const [trail, setTrail] = useState<{ x: number; y: number; id: number }[]>([]);
  const trailIdRef = useRef(0);

  useEffect(() => {
    if (!handPosition.visible) {
      setTrail([]);
      return;
    }
    trailIdRef.current++;
    const newPoint = { x: handPosition.x, y: handPosition.y, id: trailIdRef.current };
    setTrail((prev) => [...prev.slice(-5), newPoint]);
  }, [handPosition.x, handPosition.y, handPosition.visible]);

  if (!handPosition.visible) return null;

  return (
    <>
      {/* Visual Cursor Trailing Trace Trail */}
      {trail.map((pt, idx) => {
        const opacity = ((idx + 1) / (trail.length + 1)) * 0.45;
        return (
          <div
            key={pt.id}
            className="fixed w-1.5 h-1.5 rounded-full bg-[#c15f3c] pointer-events-none z-[9999] transition-opacity duration-300 shadow-[0_0_4px_#c15f3c]"
            style={{
              left: pt.x + 6,
              top: pt.y + 6,
              opacity,
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}

      <div
        className={`fixed z-[10000] pointer-events-none transition-all duration-[750ms] ease-out ${
          handPosition.clicking ? "scale-90 opacity-90" : "scale-100 opacity-100"
        }`}
        style={{
          left: handPosition.x,
          top: handPosition.y,
          transform: "translate(0px, 0px)", // Align cursor top-left hotspot with target coordinates
        }}
      >
        {/* Click Ripple Effect */}
        {handPosition.clicking && <div className="click-ripple" />}

        {/* Custom Cursor Image */}
        <img
          src="/icon/cursor.png"
          className="w-7 h-7 object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)]"
          alt="Pointer Cursor"
        />
      </div>
    </>
  );
};
