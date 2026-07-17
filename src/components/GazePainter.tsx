import React, { useState, useEffect, useRef } from 'react';
import { PaintLine } from '../types';
import { playSound } from '../utils/audio';
import { Palette, Trash2, Sliders, Space, Info, Check } from 'lucide-react';

interface GazePainterProps {
  gazeX: number;
  gazeY: number;
  isGazeActive: boolean;
}

const COLORS = [
  { hex: '#ef4444', name: '红色', textClass: 'bg-rose-500' },
  { hex: '#f97316', name: '橙色', textClass: 'bg-orange-500' },
  { hex: '#10b981', name: '绿色', textClass: 'bg-emerald-500' },
  { hex: '#3b82f6', name: '蓝色', textClass: 'bg-blue-500' },
  { hex: '#a855f7', name: '紫色', textClass: 'bg-purple-500' },
];

const BRUSH_SIZES = [
  { size: 4, name: '细' },
  { size: 10, name: '中' },
  { size: 22, name: '粗' },
];

export default function GazePainter({ gazeX, gazeY, isGazeActive }: GazePainterProps) {
  const [currentColor, setCurrentColor] = useState('#3b82f6');
  const [currentSize, setCurrentSize] = useState(10);
  const [isContinuous, setIsContinuous] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [lines, setLines] = useState<PaintLine[]>([]);
  
  // Dwell timer tracking for gaze button interactions
  const [dwellingButtonId, setDwellingButtonId] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0); // 0 to 1

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const dwellStartTime = useRef<number | null>(null);

  // Initialize canvas background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Fill background off-white
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Listen to Spacebar for precision drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isSpacePressed) {
          setIsSpacePressed(true);
          playSound.click();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(false);
        isDrawingRef.current = false;
        lastPointRef.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpacePressed]);

  // Handle actual drawing loop based on active Gaze positions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isGazeActive) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const relX = gazeX - rect.left;
    const relY = gazeY - rect.top;

    // Check if drawing is currently active
    // Active if continuous mode OR if Spacebar is pressed, AND cursor is within canvas
    const isWithinCanvas = relX >= 0 && relX <= rect.width && relY >= 0 && relY <= rect.height;
    const isDrawingActive = isWithinCanvas && (isContinuous || isSpacePressed);

    if (isDrawingActive) {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = currentSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (!isDrawingRef.current || !lastPointRef.current) {
        // Start a new path segment
        isDrawingRef.current = true;
        ctx.beginPath();
        ctx.moveTo(relX, relY);
        lastPointRef.current = { x: relX, y: relY };
      } else {
        // Draw line segment
        ctx.beginPath();
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.lineTo(relX, relY);
        ctx.stroke();
        lastPointRef.current = { x: relX, y: relY };
      }
    } else {
      isDrawingRef.current = false;
      lastPointRef.current = null;
    }
  }, [gazeX, gazeY, isContinuous, isSpacePressed, currentColor, currentSize, isGazeActive]);

  // Gaze Dwell Controls Detection
  // We check which buttons the gaze pointer hovers over, and trigger them after 750ms dwell time!
  useEffect(() => {
    if (!isGazeActive) return;

    // Get all elements with 'data-gaze-action'
    const actionableElements = document.querySelectorAll('[data-gaze-action]');
    let hoveredId: string | null = null;
    let hoveredEl: HTMLElement | null = null;

    for (let i = 0; i < actionableElements.length; i++) {
      const el = actionableElements[i] as HTMLElement;
      const r = el.getBoundingClientRect();
      if (gazeX >= r.left && gazeX <= r.right && gazeY >= r.top && gazeY <= r.bottom) {
        hoveredId = el.getAttribute('data-gaze-id');
        hoveredEl = el;
        break;
      }
    }

    if (hoveredId) {
      if (dwellingButtonId !== hoveredId) {
        // Just entered hover zone
        setDwellingButtonId(hoveredId);
        dwellStartTime.current = Date.now();
        setDwellProgress(0);
      } else if (dwellStartTime.current) {
        // Currently dwelling
        const elapsed = Date.now() - dwellStartTime.current;
        const totalNeeded = 750; // 750ms dwell time
        const progress = Math.min(elapsed / totalNeeded, 1);
        setDwellProgress(progress);

        if (progress >= 1) {
          // Trigger the action!
          triggerGazeAction(hoveredId, hoveredEl);
          // Reset dwell to prevent double trigger
          setDwellingButtonId(null);
          setDwellProgress(0);
          dwellStartTime.current = null;
        }
      }
    } else {
      // Not hovering over anything
      setDwellingButtonId(null);
      setDwellProgress(0);
      dwellStartTime.current = null;
    }
  }, [gazeX, gazeY, isGazeActive, dwellingButtonId]);

  const triggerGazeAction = (id: string, el: HTMLElement | null) => {
    playSound.bell();
    
    // Parse actions
    if (id.startsWith('color_')) {
      const colorHex = id.split('color_')[1];
      setCurrentColor(colorHex);
    } else if (id.startsWith('size_')) {
      const sizeVal = parseInt(id.split('size_')[1], 10);
      setCurrentSize(sizeVal);
    } else if (id === 'clear') {
      handleClearCanvas();
    } else if (id === 'mode_continuous') {
      setIsContinuous(true);
    } else if (id === 'mode_precision') {
      setIsContinuous(false);
    }
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    playSound.click();
  };

  return (
    <div className="flex flex-col h-[620px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden relative text-white">
      {/* Upper controls dashboard with instructions */}
      <div className="bg-slate-950 border-b border-slate-800 px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Palette className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="text-base font-bold tracking-tight">眼神创意画布 (Gaze Painter)</h3>
            <p className="text-[10px] text-slate-400">
              用眼睛看作画！注视控制面板按钮 <span className="text-rose-400 font-semibold">0.7秒</span> 即可免点击切换颜色、粗细或清空。
            </p>
          </div>
        </div>

        {/* Spacebar indicator */}
        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
          <Space className={`w-4 h-4 transition-colors ${isSpacePressed ? 'text-green-400' : 'text-slate-400'}`} />
          <span className="text-xs font-mono font-medium">
            {isContinuous ? (
              <span className="text-cyan-400">● 自动画笔激活</span>
            ) : (
              <span>
                按住 <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isSpacePressed ? 'bg-green-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>空格键</kbd> 落笔
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Main painting panel */}
      <div className="flex-1 flex relative">
        {/* Left Vertical Tool Rail (Eye-tracking accessible!) */}
        <div className="w-48 bg-slate-950/90 border-r border-slate-800 p-4 flex flex-col justify-between select-none z-10">
          <div className="space-y-5">
            {/* 1. Draw Modes */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block font-mono">
                作画模式
              </span>
              <div className="space-y-1">
                <button
                  data-gaze-action="true"
                  data-gaze-id="mode_precision"
                  onClick={() => { playSound.bell(); setIsContinuous(false); }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-all border ${
                    !isContinuous
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 font-semibold'
                      : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <span>眼神+空格精细</span>
                  {!isContinuous && <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  data-gaze-action="true"
                  data-gaze-id="mode_continuous"
                  onClick={() => { playSound.bell(); setIsContinuous(true); }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-all border ${
                    isContinuous
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 font-semibold'
                      : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <span>眼神自由流</span>
                  {isContinuous && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* 2. Color Palette */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block font-mono">
                选择画笔颜色
              </span>
              <div className="grid grid-cols-1 gap-1">
                {COLORS.map((c) => {
                  const isActive = currentColor === c.hex;
                  const isDwelling = dwellingButtonId === `color_${c.hex}`;
                  return (
                    <button
                      key={c.hex}
                      data-gaze-action="true"
                      data-gaze-id={`color_${c.hex}`}
                      onClick={() => { playSound.bell(); setCurrentColor(c.hex); }}
                      className={`relative w-full px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 border transition-all ${
                        isActive
                          ? 'bg-slate-900 border-slate-700 text-white font-medium'
                          : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-900'
                      }`}
                    >
                      {/* Color Circle Indicator */}
                      <span className={`w-3.5 h-3.5 rounded-full ${c.textClass} shrink-0`} />
                      <span>{c.name}</span>

                      {/* Dwell Progress Cover overlay */}
                      {isDwelling && (
                        <div
                          className="absolute left-0 bottom-0 h-0.5 bg-rose-500 transition-all duration-75"
                          style={{ width: `${dwellProgress * 100}%` }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Brush Size */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block font-mono">
                画笔尺寸
              </span>
              <div className="flex gap-1">
                {BRUSH_SIZES.map((b) => {
                  const isActive = currentSize === b.size;
                  const isDwelling = dwellingButtonId === `size_${b.size}`;
                  return (
                    <button
                      key={b.size}
                      data-gaze-action="true"
                      data-gaze-id={`size_${b.size}`}
                      onClick={() => { playSound.bell(); setCurrentSize(b.size); }}
                      className={`relative flex-1 py-1.5 rounded-lg border text-xs text-center transition-all ${
                        isActive
                          ? 'bg-slate-900 border-slate-700 text-white font-bold'
                          : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-900'
                      }`}
                    >
                      <span>{b.name}</span>
                      
                      {/* Inner point representation */}
                      <div className="flex justify-center mt-1">
                        <span 
                          className="rounded-full bg-slate-300"
                          style={{ width: `${Math.max(b.size / 2, 2)}px`, height: `${Math.max(b.size / 2, 2)}px` }}
                        />
                      </div>

                      {/* Dwell Progress overlay */}
                      {isDwelling && (
                        <div
                          className="absolute left-0 bottom-0 h-0.5 bg-rose-500 transition-all duration-75"
                          style={{ width: `${dwellProgress * 100}%` }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Action buttons at bottom */}
          <div className="pt-4 border-t border-slate-900 space-y-1">
            <button
              data-gaze-action="true"
              data-gaze-id="clear"
              onClick={handleClearCanvas}
              className={`relative w-full py-2 px-3 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-900/30 hover:border-rose-800 rounded-lg text-xs font-semibold text-rose-300 transition-all flex items-center justify-center gap-1.5`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清空画布</span>

              {/* Dwell Progress Overlay */}
              {dwellingButtonId === 'clear' && (
                <div
                  className="absolute left-0 bottom-0 h-0.5 bg-rose-500 transition-all duration-75"
                  style={{ width: `${dwellProgress * 100}%` }}
                />
              )}
            </button>
          </div>
        </div>

        {/* Dynamic canvas element */}
        <div className="flex-1 relative overflow-hidden bg-slate-100">
          <canvas
            ref={canvasRef}
            className="w-full h-full block cursor-none"
          />

          {/* Precision cursor drawing mode notification */}
          {!isContinuous && !isSpacePressed && isGazeActive && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/80 border border-slate-800 px-4 py-2 rounded-xl text-xs flex items-center gap-2 pointer-events-none text-slate-300 animate-pulse z-10 shadow-lg">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>凝视目标点并【按住键盘空格键】开始落笔，释放抬笔</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
