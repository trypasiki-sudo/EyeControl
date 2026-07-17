import React, { useState } from 'react';
import { CalibrationPoint } from '../types';
import { playSound } from '../utils/audio';
import { Target, CheckCircle2, RefreshCw, Zap, ShieldAlert, ArrowRight } from 'lucide-react';

interface CalibrationLabProps {
  onCalibrationComplete: () => void;
  isTrackingActive: boolean;
  startRealTracking: () => Promise<void>;
  setMode: (mode: 'real' | 'simulated') => void;
  mode: 'real' | 'simulated';
}

const INITIAL_POINTS: CalibrationPoint[] = [
  { id: 1, label: 'Top Left', x: 10, y: 12, clicks: 0, maxClicks: 5, calibrated: false },
  { id: 2, label: 'Top Center', x: 50, y: 12, clicks: 0, maxClicks: 5, calibrated: false },
  { id: 3, label: 'Top Right', x: 90, y: 12, clicks: 0, maxClicks: 5, calibrated: false },
  { id: 4, label: 'Middle Left', x: 10, y: 50, clicks: 0, maxClicks: 5, calibrated: false },
  { id: 5, label: 'Center', x: 50, y: 50, clicks: 0, maxClicks: 5, calibrated: false },
  { id: 6, label: 'Middle Right', x: 90, y: 50, clicks: 0, maxClicks: 5, calibrated: false },
  { id: 7, label: 'Bottom Left', x: 10, y: 88, clicks: 0, maxClicks: 5, calibrated: false },
  { id: 8, label: 'Bottom Center', x: 50, y: 88, clicks: 0, maxClicks: 5, calibrated: false },
  { id: 9, label: 'Bottom Right', x: 90, y: 88, clicks: 0, maxClicks: 5, calibrated: false },
];

export default function CalibrationLab({
  onCalibrationComplete,
  isTrackingActive,
  startRealTracking,
  setMode,
  mode,
}: CalibrationLabProps) {
  const [points, setPoints] = useState<CalibrationPoint[]>(INITIAL_POINTS);
  const [hasStarted, setHasStarted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStartCalibration = async () => {
    setIsInitializing(true);
    setErrorMsg(null);
    try {
      playSound.click();
      await startRealTracking();
      setMode('real');
      setHasStarted(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Webcam permission denied or camera missing.');
      // Fail over to simulator
      setMode('simulated');
    } finally {
      setIsInitializing(false);
    }
  };

  const handlePointClick = (id: number) => {
    playSound.click();
    setPoints((prev) =>
      prev.map((pt) => {
        if (pt.id === id) {
          const nextClicks = pt.clicks + 1;
          const isDone = nextClicks >= pt.maxClicks;
          return {
            ...pt,
            clicks: nextClicks,
            calibrated: isDone,
          };
        }
        return pt;
      })
    );

    // Check if everything is fully calibrated
    const updatedPoints = points.map((pt) => {
      if (pt.id === id) {
        return { ...pt, clicks: pt.clicks + 1, calibrated: pt.clicks + 1 >= pt.maxClicks };
      }
      return pt;
    });

    const allDone = updatedPoints.every((pt) => pt.calibrated);
    if (allDone) {
      playSound.success();
      onCalibrationComplete();
    }
  };

  const handleReset = () => {
    playSound.click();
    setPoints(INITIAL_POINTS.map(p => ({ ...p, clicks: 0, calibrated: false })));
  };

  const totalClicksMade = points.reduce((acc, p) => acc + p.clicks, 0);
  const totalClicksNeeded = points.reduce((acc, p) => acc + p.maxClicks, 0);
  const progressPercent = Math.round((totalClicksMade / totalClicksNeeded) * 100);
  const calibratedCount = points.filter((p) => p.calibrated).length;

  return (
    <div className="relative w-full h-[620px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6 text-white shadow-xl">
      
      {!hasStarted ? (
        <div className="max-w-xl text-center space-y-6 z-10">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center text-cyan-400 animate-pulse">
            <Target className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              眼动追踪校准实验室
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              为了开启高精度网页眼动追踪，需要将您的目光与屏幕坐标系进行映射校准。请根据步骤进行校准。
            </p>
          </div>

          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-4 text-xs text-left flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">无法启动摄像头：</p>
                <p className="opacity-90 mt-0.5">{errorMsg}</p>
                <button 
                  onClick={() => { setMode('simulated'); setHasStarted(true); }}
                  className="mt-2 text-cyan-400 font-medium hover:underline block"
                >
                  无硬件？切换到「智能模拟器」模式
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-cyan-400 text-xs font-bold font-mono">01. 头部保持静止</span>
              <p className="text-xs text-slate-400">将头部置于屏幕正前方，并保持恒定适度的环境光线。</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-cyan-400 text-xs font-bold font-mono">02. 凝视并点击</span>
              <p className="text-xs text-slate-400">双眼仅仅盯住红色靶心，并使用鼠标在靶心上点击 5 次。</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={handleStartCalibration}
              disabled={isInitializing}
              className="px-6 py-3 rounded-xl font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isInitializing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  正在启动摄像头...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-current" />
                  启动摄像头并校准
                </>
              )}
            </button>
            
            <button
              onClick={() => {
                playSound.click();
                setMode('simulated');
                setHasStarted(true);
              }}
              className="px-6 py-3 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-[0.98]"
            >
              直接进入模拟模式
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 w-full h-full p-6">
          {/* Top Status Bar during active calibration */}
          <div className="absolute top-4 left-6 right-6 flex items-center justify-between bg-slate-950/80 backdrop-blur-md px-5 py-3 rounded-xl border border-slate-800 z-10">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-sm font-semibold tracking-wide">
                校准进度: <span className="text-rose-400">{calibratedCount} / 9</span> 点已完成
              </span>
            </div>

            {/* Custom linear progress bar */}
            <div className="flex-1 max-w-xs mx-6 bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-rose-500 to-cyan-400 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all text-xs flex items-center gap-1 border border-slate-700"
                title="重新开始校准"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                重置
              </button>
            </div>
          </div>

          {/* Calibration Instructions overlay */}
          {totalClicksMade === 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none max-w-sm bg-slate-950/90 border border-slate-800 p-6 rounded-2xl shadow-2xl z-20 animate-fade-in">
              <p className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-2">
                校准说明
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                请盯着出现的红色靶点。保持头不动，眼睛看靶心并双击或连续点击 <strong className="text-rose-400">5 次</strong>。
                靶点变绿即表示该区域校准成功。
              </p>
            </div>
          )}

          {/* Render 9 Grid Calibration Points */}
          {points.map((pt) => (
            <button
              key={pt.id}
              onClick={() => handlePointClick(pt.id)}
              disabled={pt.calibrated}
              className="absolute group transform -translate-x-1/2 -translate-y-1/2 focus:outline-none z-10 transition-all duration-300"
              style={{
                left: `${pt.x}%`,
                top: `${pt.y}%`,
              }}
            >
              <div className="relative flex items-center justify-center">
                {/* Calibration Point Outer Orbit */}
                <div
                  className={`rounded-full flex items-center justify-center transition-all duration-300 ${
                    pt.calibrated
                      ? 'w-10 h-10 bg-emerald-500/20 border-2 border-emerald-400 scale-95 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                      : 'w-12 h-12 bg-rose-500/10 border-2 border-rose-500 hover:scale-110 active:scale-90 cursor-pointer shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                  }`}
                >
                  {pt.calibrated ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <span className="text-[10px] font-bold font-mono text-rose-300">
                      {pt.maxClicks - pt.clicks}
                    </span>
                  )}
                </div>

                {/* Pulsing center point core */}
                {!pt.calibrated && (
                  <span className="absolute w-2 h-2 rounded-full bg-rose-500 animate-ping pointer-events-none" />
                )}

                {/* Point Label Hover */}
                <span className="absolute top-10 whitespace-nowrap text-[9px] font-mono uppercase bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-slate-400">
                  {pt.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
