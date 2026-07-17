import React, { useEffect, useRef, useState } from 'react';
import { TrackerStats, TrackingMode, GazePoint } from '../types';
import { Play, Pause, Activity, Camera, Eye, Wifi, AlertTriangle } from 'lucide-react';

interface DiagnosticPanelProps {
  mode: TrackingMode;
  setMode: (mode: TrackingMode) => void;
  gazeX: number;
  gazeY: number;
  isGazeActive: boolean;
  history: GazePoint[];
  stats: TrackerStats;
  isTrackingActive: boolean;
  onToggleTracking: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export default function DiagnosticPanel({
  mode,
  setMode,
  gazeX,
  gazeY,
  isGazeActive,
  history,
  stats,
  isTrackingActive,
  onToggleTracking,
  videoRef,
}: DiagnosticPanelProps) {
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);
  const [showFaceOutline, setShowFaceOutline] = useState(true);

  // Draw Gaze Saccade trail on the Diagnostic Radar Canvas
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear with dark tech background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // Draw Radar Grid lines (concentric circles)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let r = 30; r < width / 2; r += 30) {
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Radar crosshairs
    ctx.strokeStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Map global screen coordinates to small radar representation
    if (history.length === 0) return;

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    ctx.lineWidth = 1.5;
    
    // Draw the gaze paths connecting points
    ctx.beginPath();
    history.forEach((pt, index) => {
      // Map global screen coordinate (0 to screenWidth) relative to radar center
      const mappedX = (pt.x / screenW) * width;
      const mappedY = (pt.y / screenH) * height;

      if (index === 0) {
        ctx.moveTo(mappedX, mappedY);
      } else {
        ctx.lineTo(mappedX, mappedY);
      }
    });
    ctx.strokeStyle = mode === 'simulated' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(34, 211, 238, 0.25)';
    ctx.stroke();

    // Draw gaze points (fading out older ones)
    history.forEach((pt, index) => {
      const mappedX = (pt.x / screenW) * width;
      const mappedY = (pt.y / screenH) * height;
      const agePercent = 1 - index / history.length;

      ctx.beginPath();
      ctx.arc(mappedX, mappedY, index === 0 ? 5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = index === 0 
        ? '#ef4444' // active eye focus red dot
        : mode === 'simulated'
        ? `rgba(245, 158, 11, ${agePercent * 0.7})`
        : `rgba(34, 211, 238, ${agePercent * 0.7})`;
      ctx.fill();
    });

  }, [history, mode]);

  return (
    <div className="w-full lg:w-80 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-5 select-none text-white shrink-0 shadow-xl">
      
      {/* 1. Hardware Connection & Mode selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase">
            追踪模式选择
          </span>
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${isTrackingActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-[10px] font-bold font-mono text-slate-400">
              {isTrackingActive ? 'ON' : 'OFF'}
            </span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode('real')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
              mode === 'real'
                ? 'bg-cyan-500/10 border-cyan-400/40 text-cyan-400 font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            真·网摄像头
          </button>
          <button
            onClick={() => setMode('simulated')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
              mode === 'simulated'
                ? 'bg-amber-500/10 border-amber-400/40 text-amber-400 font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            智能模拟器
          </button>
        </div>
      </div>

      {/* 2. Webcam Alignment & Calibration Preview (only in webcam mode) */}
      {mode === 'real' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-cyan-400" /> 脸部校准对齐
            </span>
            <button
              onClick={() => setShowFaceOutline(!showFaceOutline)}
              className="text-[9px] font-mono text-slate-500 hover:text-slate-300 underline"
            >
              {showFaceOutline ? '隐藏人脸轮廓' : '显示人脸轮廓'}
            </button>
          </div>

          <div className="aspect-video bg-slate-950 rounded-xl overflow-hidden relative border border-slate-800 flex items-center justify-center">
            {/* Live Video Feed (Hidden behind canvas scanlines or rendered) */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" // mirror effect
            />

            {/* Holographic scanner overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent bg-[size:100%_12px] animate-scanline pointer-events-none" />

            {/* Simulated face guide outline */}
            {showFaceOutline && (
              <svg className="absolute inset-0 w-full h-full text-cyan-400/50 pointer-events-none" viewBox="0 0 100 100">
                <ellipse cx="50" cy="45" rx="20" ry="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3,3" />
                <line x1="30" y1="45" x2="70" y2="45" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
                <circle cx="43" cy="42" r="2.5" fill="none" stroke="currentColor" strokeWidth="1" />
                <circle cx="57" cy="42" r="2.5" fill="none" stroke="currentColor" strokeWidth="1" />
              </svg>
            )}

            {/* If tracking is off, prompt user */}
            {!isTrackingActive && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center space-y-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <p className="text-[10px] text-slate-400 leading-normal">
                  摄像头暂未激活。请在校准页中点击“启动摄像头”授权使用。
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Live Saccade radar trail visualizer */}
      <div className="space-y-2">
        <span className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-rose-400" /> 眼跳轨迹诊断雷达
        </span>
        <div className="p-1 rounded-xl bg-slate-950 border border-slate-800">
          <canvas
            ref={radarCanvasRef}
            width={260}
            height={160}
            className="w-full h-[140px] rounded-lg block"
          />
        </div>
      </div>

      {/* 4. Tracking telemetry diagnostics */}
      <div className="space-y-3">
        <span className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase block">
          实时指标诊断
        </span>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-3 bg-slate-950/60 border border-slate-800/40 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block">处理帧率</span>
            <span className="text-base font-bold text-emerald-400">{stats.fps} <span className="text-[10px] text-slate-400">FPS</span></span>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800/40 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block">视线稳定度</span>
            <span className="text-base font-bold text-cyan-400">{stats.stability}%</span>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800/40 rounded-xl space-y-1 col-span-2">
            <span className="text-[10px] text-slate-500 uppercase block">当前视点坐标 (Viewport X, Y)</span>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-300">X: <strong className="text-rose-400 font-bold">{Math.round(gazeX)}</strong>px</span>
              <span className="text-slate-300">Y: <strong className="text-rose-400 font-bold">{Math.round(gazeY)}</strong>px</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Trigger Stop/Start */}
      <button
        onClick={onToggleTracking}
        className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
          isTrackingActive
            ? 'bg-rose-950/40 border-rose-900/40 text-rose-400 hover:bg-rose-900/20'
            : 'bg-emerald-950/40 border-emerald-900/40 text-emerald-400 hover:bg-emerald-900/20'
        }`}
      >
        {isTrackingActive ? (
          <>
            <Pause className="w-4 h-4 fill-current" />
            暂停眼动追踪服务
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-current" />
            激活眼动追踪服务
          </>
        )}
      </button>

      {/* Custom Keyframe animation for Scanlines */}
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .animate-scanline {
          animation: scanline 4s linear infinite;
        }
      `}</style>
    </div>
  );
}
