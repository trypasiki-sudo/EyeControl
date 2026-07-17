import React, { useState, useEffect, useRef } from 'react';
import { AppTab, TrackingMode, GazePoint, TrackerStats } from './types';
import { playSound } from './utils/audio';
import GazeCursor from './components/GazeCursor';
import CalibrationLab from './components/CalibrationLab';
import BubblePopper from './components/BubblePopper';
import GazePainter from './components/GazePainter';
import ReadingAssist from './components/ReadingAssist';
import DiagnosticPanel from './components/DiagnosticPanel';
import { Target, Sparkles, AlertCircle, Info, ShieldAlert, Cpu } from 'lucide-react';

declare global {
  interface Window {
    webgazer: any;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('calibrate');
  const [mode, setMode] = useState<TrackingMode>('simulated');
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [webgazerLoaded, setWebgazerLoaded] = useState(false);

  // Smooth interpolated gaze coordinates
  const [gazeX, setGazeX] = useState<number>(() => window.innerWidth / 2);
  const [gazeY, setGazeY] = useState<number>(() => window.innerHeight / 2);

  // Raw/Target gaze coordinates (before smoothing)
  const targetX = useRef<number>(window.innerWidth / 2);
  const targetY = useRef<number>(window.innerHeight / 2);

  // History trail for diagnostics radar
  const [history, setHistory] = useState<GazePoint[]>([]);

  // Telemetry metrics
  const [stats, setStats] = useState<TrackerStats>({
    fps: 0,
    stability: 95,
    totalPointsCount: 0,
    calibrationAccuracy: 0,
    headPosition: 'stable',
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const frameCount = useRef(0);
  const lastFpsUpdateTime = useRef(Date.now());
  const lerpAnimRef = useRef<number | null>(null);

  // 1. Inject WebGazer script asynchronously on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/webgazer@2.1.1/dist/webgazer.min.js';
    script.async = true;
    script.onload = () => {
      setWebgazerLoaded(true);
      console.log('WebGazer script successfully loaded!');
    };
    script.onerror = () => {
      console.error('Failed to load WebGazer script.');
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
      // Clean up any webgazer elements that might have been created dynamically on body
      const containers = [
        'webgazerVideoContainer',
        'webgazerVideoFeed',
        'webgazerFaceOverlay',
        'webgazerFaceFeedbackBox',
      ];
      containers.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.remove();
      });
      if (window.webgazer) {
        try {
          window.webgazer.end();
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, []);

  // 2. Linear Interpolation (LERP) loop for coordinate smoothing at ~60fps
  useEffect(() => {
    const lerpLoop = () => {
      // Apply linear interpolation to glide displayed gaze coordinates smoothly
      setGazeX((prevX) => {
        const diffX = targetX.current - prevX;
        // A factor of 0.16 results in smooth tracking while keeping latency minimal
        return prevX + diffX * 0.16;
      });

      setGazeY((prevY) => {
        const diffY = targetY.current - prevY;
        return prevY + diffY * 0.16;
      });

      // Maintain a rolling coordinate history for diagnostics
      if (isTrackingActive) {
        setHistory((prev) => {
          const newPoint: GazePoint = {
            x: targetX.current,
            y: targetY.current,
            timestamp: Date.now(),
          };
          return [newPoint, ...prev.slice(0, 40)]; // Keep last 40 points
        });
      }

      // Track processing frame rate (FPS)
      frameCount.current += 1;
      const now = Date.now();
      const elapsed = now - lastFpsUpdateTime.current;
      if (elapsed >= 1000) {
        const currentFps = Math.round((frameCount.current * 1000) / elapsed);
        setStats((prev) => {
          // Calculate gaze stability index: based on average standard deviation of recent history
          let devFactor = 0;
          if (history.length > 1) {
            const avgX = history.reduce((sum, p) => sum + p.x, 0) / history.length;
            const avgY = history.reduce((sum, p) => sum + p.y, 0) / history.length;
            const variance = history.reduce((sum, p) => {
              const dx = p.x - avgX;
              const dy = p.y - avgY;
              return sum + (dx * dx + dy * dy);
            }, 0) / history.length;
            devFactor = Math.sqrt(variance);
          }
          
          // Mapped stability index
          const computedStability = Math.max(100 - Math.round(devFactor / 2.5), 10);

          return {
            ...prev,
            fps: isTrackingActive ? currentFps : 0,
            stability: isTrackingActive ? computedStability : 100,
          };
        });
        frameCount.current = 0;
        lastFpsUpdateTime.current = now;
      }

      lerpAnimRef.current = requestAnimationFrame(lerpLoop);
    };

    lerpAnimRef.current = requestAnimationFrame(lerpLoop);
    return () => {
      if (lerpAnimRef.current) {
        cancelAnimationFrame(lerpAnimRef.current);
      }
    };
  }, [isTrackingActive, history.length]);

  // 3. Simulated Gaze Tracking Mode (Saccadic Mouse Emulation)
  useEffect(() => {
    if (mode !== 'simulated' || !isTrackingActive) return;

    // A helper function to add organic saccade-like mini tremors/micro-movements
    let jitterX = 0;
    let jitterY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      // Base mouse coordinates + organic micro-physiological eye tremors
      targetX.current = e.clientX + jitterX;
      targetY.current = e.clientY + jitterY;
    };

    // Micro-saccades interval: Every 800ms, inject brief eye tremors simulating actual ocular fixation
    const saccadeInterval = setInterval(() => {
      // Simulate real micro-saccade offset (random small jump within a 6px radius)
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 5 + 1; // 1 to 6 px tremor
      jitterX = Math.cos(angle) * radius;
      jitterY = Math.sin(angle) * radius;
    }, 450);

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(saccadeInterval);
    };
  }, [mode, isTrackingActive]);

  // 4. Start / Stop Real Camera Eye-Tracking using WebGazer.js
  const startRealWebgazerTracking = async () => {
    if (!webgazerLoaded || !window.webgazer) {
      throw new Error('WebGazer script has not fully loaded in client yet.');
    }

    try {
      // Initialize the physical camera stream for our Diagnostic Panel first (Visual comfort/feedback)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
      });
      webcamStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Hide all WebGazer's standard DOM overlays so we can render our custom layouts
      window.webgazer.params.showVideo = false;
      window.webgazer.params.showVideoPreview = false;
      window.webgazer.params.showFaceOverlay = false;
      window.webgazer.params.showFaceFeedbackBox = false;
      window.webgazer.params.showPredictionPoints = false;

      // Bind WebGazer coordinates tracker listener
      window.webgazer.setGazeListener((data: any) => {
        if (data) {
          targetX.current = data.x;
          targetY.current = data.y;
        }
      });

      // Launch WebGazer model
      await window.webgazer.begin();
      window.webgazer.showVideo(false);
      window.webgazer.showPredictionPoints(false);

      setIsTrackingActive(true);
      setStats((prev) => ({ ...prev, calibrationAccuracy: 80 }));
    } catch (err: any) {
      console.error('WebGazer initialization error: ', err);
      stopRealWebcamStream();
      throw new Error('摄像头访问失败。请确认您已授予此 iframe 的摄像头使用权限。');
    }
  };

  // Helper to cleanly release Webcam tracks
  const stopRealWebcamStream = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      webcamStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleToggleTracking = () => {
    playSound.click();
    if (isTrackingActive) {
      // Pause
      setIsTrackingActive(false);
      if (mode === 'real') {
        stopRealWebcamStream();
        if (window.webgazer) {
          window.webgazer.pause();
        }
      }
    } else {
      // Resume
      if (mode === 'real') {
        startRealWebgazerTracking()
          .then(() => setIsTrackingActive(true))
          .catch((err) => {
            alert(err.message);
            setMode('simulated');
            setIsTrackingActive(true);
          });
      } else {
        setIsTrackingActive(true);
      }
    }
  };

  // Trigger when calibration completes
  const handleCalibrationFinished = () => {
    setStats((prev) => ({ ...prev, calibrationAccuracy: 98 }));
    setActiveTab('bubble'); // Go directly to bubble popper game!
    playSound.success();
  };

  // Safe mode/state change handler
  const handleModeChange = (newMode: TrackingMode) => {
    playSound.click();
    setMode(newMode);
    
    // Cleanup old streams
    stopRealWebcamStream();
    if (window.webgazer) {
      try {
        window.webgazer.pause();
      } catch (e) {}
    }

    if (newMode === 'simulated') {
      setIsTrackingActive(true); // Active simulated mouse tracking immediately
    } else {
      setIsTrackingActive(false); // Let calibration screen guide webcam activation
      setActiveTab('calibrate');
    }
  };

  // Tab routing with sound blips
  const handleTabRoute = (tab: AppTab) => {
    playSound.click();
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* 1. Header Area */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo Brand Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <Target className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight flex items-center gap-1.5">
                眼神控：多模态网页眼动追踪套件
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-400/20">
                  v1.2.0
                </span>
              </h1>
              <p className="text-xs text-slate-400">基于机器视觉的创新眼神交互实验室 · 探索未来人机交互新模态</p>
            </div>
          </div>

          {/* Mode & Status Banner */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Real Webcam vs. Simulator quick select */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center">
              <button
                onClick={() => handleModeChange('real')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  mode === 'real'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                网镜眼动 (Webcam)
              </button>
              <button
                onClick={() => handleModeChange('simulated')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  mode === 'simulated'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                智能模拟器
              </button>
            </div>

            {/* Status indicator badge */}
            <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs font-mono flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isTrackingActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-slate-400">系统服务:</span>
              <strong className={isTrackingActive ? 'text-emerald-400' : 'text-rose-400'}>
                {isTrackingActive ? '已激活' : '已暂停'}
              </strong>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Dashboard Layout Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left column (Tabs & Active Screen Content) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          {/* Navigation Sub-Tabs */}
          <nav className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-xl gap-1 select-none">
            <button
              onClick={() => handleTabRoute('calibrate')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 border ${
                activeTab === 'calibrate'
                  ? 'bg-slate-950 border-slate-800 text-cyan-400 font-extrabold shadow-sm'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <Target className="w-4 h-4" />
              1. 算法校准实验室
            </button>
            <button
              onClick={() => handleTabRoute('bubble')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 border ${
                activeTab === 'bubble'
                  ? 'bg-slate-950 border-slate-800 text-cyan-400 font-extrabold shadow-sm'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              2. 眼神戳气泡游戏
            </button>
            <button
              onClick={() => handleTabRoute('painter')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 border ${
                activeTab === 'painter'
                  ? 'bg-slate-950 border-slate-800 text-cyan-400 font-extrabold shadow-sm'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <Cpu className="w-4 h-4" />
              3. 眼神创意画布
            </button>
            <button
              onClick={() => handleTabRoute('reader')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 border ${
                activeTab === 'reader'
                  ? 'bg-slate-950 border-slate-800 text-cyan-400 font-extrabold shadow-sm'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <Info className="w-4 h-4" />
              4. 眼神辅助滚屏
            </button>
          </nav>

          {/* Active Screen View router */}
          <div className="relative">
            {activeTab === 'calibrate' && (
              <CalibrationLab
                onCalibrationComplete={handleCalibrationFinished}
                isTrackingActive={isTrackingActive}
                startRealTracking={startRealWebgazerTracking}
                setMode={handleModeChange}
                mode={mode}
              />
            )}

            {activeTab === 'bubble' && (
              <BubblePopper
                gazeX={gazeX}
                gazeY={gazeY}
                isGazeActive={isTrackingActive}
              />
            )}

            {activeTab === 'painter' && (
              <GazePainter
                gazeX={gazeX}
                gazeY={gazeY}
                isGazeActive={isTrackingActive}
              />
            )}

            {activeTab === 'reader' && (
              <ReadingAssist
                gazeX={gazeX}
                gazeY={gazeY}
                isGazeActive={isTrackingActive}
              />
            )}
          </div>

          {/* Mode-specific Quick Helper banner */}
          {mode === 'simulated' && isTrackingActive && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl px-5 py-3 text-xs flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="leading-relaxed">
                <strong>💡 智能模拟器模式已激活：</strong> 您的电脑鼠标当前的移动坐标将被转换为眼动焦点坐标，同时我们附加了生理眼神微抖动（Saccade fixations）以还原真实的眼动追踪体验。任何时候您都可以点击 header 右上角“网镜眼动”来使用物理摄像头。
              </div>
            </div>
          )}
        </div>

        {/* Right column (Control panel / Telemetry diagnostics) */}
        <DiagnosticPanel
          mode={mode}
          setMode={handleModeChange}
          gazeX={gazeX}
          gazeY={gazeY}
          isGazeActive={isTrackingActive}
          history={history}
          stats={stats}
          isTrackingActive={isTrackingActive}
          onToggleTracking={handleToggleTracking}
          videoRef={videoRef}
        />
      </main>

      {/* Floating global Gaze cursor overlay */}
      <GazeCursor
        x={gazeX}
        y={gazeY}
        isDwelling={activeTab === 'painter'} // Dwell indicators active on painter controls
        dwellProgress={0} // Managed inside painting panel locally
        mode={mode}
        isActive={isTrackingActive}
      />
    </div>
  );
}
