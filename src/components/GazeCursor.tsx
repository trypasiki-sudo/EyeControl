import React, { useEffect, useState } from 'react';

interface GazeCursorProps {
  x: number;
  y: number;
  isDwelling: boolean;
  dwellProgress: number; // 0 to 1
  mode: 'real' | 'simulated';
  isActive: boolean;
}

export default function GazeCursor({
  x,
  y,
  isDwelling,
  dwellProgress,
  mode,
  isActive,
}: GazeCursorProps) {
  const [trail, setTrail] = useState<{ x: number; y: number; id: number }[]>([]);
  
  // Track gaze history for a subtle, elegant trail effect
  useEffect(() => {
    if (!isActive) return;
    
    const newId = Math.random();
    setTrail((prev) => [
      { x, y, id: newId },
      ...prev.slice(0, 5), // Keep last 6 positions
    ]);
  }, [x, y, isActive]);

  if (!isActive) return null;

  return (
    <>
      {/* Gaze Trail */}
      {trail.map((point, index) => {
        const opacity = (1 - index / 6) * 0.25;
        const scale = (1 - index / 6) * 12;
        return (
          <div
            key={point.id}
            className="fixed pointer-events-none rounded-full bg-cyan-400 transition-all duration-75 z-50 transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${point.x}px`,
              top: `${point.y}px`,
              width: `${scale}px`,
              height: `${scale}px`,
              opacity,
            }}
          />
        );
      })}

      {/* Main Gaze Cursor */}
      <div
        className="fixed pointer-events-none z-[9999] transform -translate-x-1/2 -translate-y-1/2 select-none"
        style={{
          left: `${x}px`,
          top: `${y}px`,
        }}
      >
        {/* Glowing Outer Ring */}
        <div
          className={`relative flex items-center justify-center rounded-full transition-all duration-200 ${
            isDwelling 
              ? 'w-12 h-12 bg-rose-500/10 border-2 border-rose-500/50 scale-110' 
              : mode === 'simulated'
              ? 'w-10 h-10 bg-amber-500/10 border border-amber-500/40'
              : 'w-10 h-10 bg-cyan-500/15 border-2 border-cyan-400/60 shadow-[0_0_12px_rgba(34,211,238,0.4)]'
          }`}
        >
          {/* Inner Precise Core Dot */}
          <div
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              isDwelling ? 'bg-rose-500 scale-125' : mode === 'simulated' ? 'bg-amber-500' : 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]'
            }`}
          />

          {/* Dwell Progress Radial Ring */}
          {isDwelling && (
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                className="stroke-rose-500 fill-none"
                strokeWidth="2.5"
                strokeDasharray={`${2 * Math.PI * 45 * 0.45}`} // Circ length approx
                style={{
                  strokeDashoffset: `${2 * Math.PI * 45 * 0.45 * (1 - dwellProgress)}`,
                  transition: 'stroke-dashoffset 50ms linear',
                }}
              />
            </svg>
          )}

          {/* Indicator label showing mode in tiny font if needed */}
          <span
            className={`absolute -top-5 text-[9px] font-mono font-semibold tracking-wider uppercase px-1 rounded-sm ${
              mode === 'simulated' 
                ? 'bg-amber-500/80 text-black' 
                : 'bg-cyan-500/80 text-slate-900'
            }`}
          >
            {mode === 'simulated' ? 'SIM' : 'GAZE'}
          </span>
        </div>
      </div>
    </>
  );
}
