import React, { useState, useEffect, useRef } from 'react';
import { Bubble } from '../types';
import { playSound } from '../utils/audio';
import { Play, RotateCcw, Trophy, Timer, Sparkles, Award } from 'lucide-react';

interface BubblePopperProps {
  gazeX: number;
  gazeY: number;
  isGazeActive: boolean;
}

const BUBBLE_COLORS = [
  'from-cyan-400/80 to-blue-500/80',
  'from-rose-400/80 to-purple-500/80',
  'from-emerald-400/80 to-teal-500/80',
  'from-amber-400/80 to-orange-500/80',
  'from-pink-400/80 to-fuchsia-500/80',
];

export default function BubblePopper({ gazeX, gazeY, isGazeActive }: BubblePopperProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('gaze_bubble_highscore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [timeLeft, setTimeLeft] = useState(45);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [floatingScores, setFloatingScores] = useState<{ id: number; x: number; y: number; val: number }[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const nextBubbleId = useRef(0);
  const nextFloatId = useRef(0);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('gaze_bubble_highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Timer loop
  useEffect(() => {
    if (!isPlaying) return;
    if (timeLeft <= 0) {
      setIsPlaying(false);
      // Update high score
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('gaze_bubble_highscore', score.toString());
        playSound.success();
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, timeLeft, score, highScore]);

  // Bubble generation and updates
  useEffect(() => {
    if (!isPlaying) {
      setBubbles([]);
      return;
    }

    // Spawn bubbles periodically
    const spawnInterval = setInterval(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      
      const radius = Math.floor(Math.random() * 20) + 20; // 20px to 40px radius (40-80px width)
      const x = Math.random() * (rect.width - radius * 2) + radius;
      const y = rect.height + radius; // Start below bottom boundary
      const speed = Math.random() * 2 + 1.2; // 1.2 to 3.2 px per frame
      const colorIndex = Math.floor(Math.random() * BUBBLE_COLORS.length);
      const scoreValue = Math.round((50 - radius) * speed); // Smaller & faster = much more points!

      const newBubble: Bubble = {
        id: nextBubbleId.current++,
        x,
        y,
        radius,
        color: BUBBLE_COLORS[colorIndex],
        speed,
        popped: false,
        scoreValue,
      };

      setBubbles((prev) => [...prev, newBubble]);
    }, 900);

    // Animation frame loop for bubble rising
    let animId: number;
    const updateBubbles = () => {
      setBubbles((prev) =>
        prev
          .map((b) => ({
            ...b,
            y: b.y - b.speed, // Rise up
          }))
          // Keep bubbles that are still visible
          .filter((b) => b.y + b.radius > -20 && !b.popped)
      );
      animId = requestAnimationFrame(updateBubbles);
    };

    animId = requestAnimationFrame(updateBubbles);

    return () => {
      clearInterval(spawnInterval);
      cancelAnimationFrame(animId);
    };
  }, [isPlaying]);

  // Check collision with Gaze pointer
  useEffect(() => {
    if (!isPlaying || !containerRef.current || !isGazeActive) return;

    const rect = containerRef.current.getBoundingClientRect();
    // Translate global gaze coordinates to relative container coordinates
    const relX = gazeX - rect.left;
    const relY = gazeY - rect.top;

    setBubbles((prev) => {
      let scoreGained = 0;
      const nextBubbles = prev.map((b) => {
        if (b.popped) return b;

        // Calculate distance from gaze relative point to bubble center
        // Bubble centers are (b.x, b.y) in container coordinate
        const dx = relX - b.x;
        const dy = relY - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if cursor is inside bubble radius (plus a small 10px buffer for user-friendly gazes)
        if (distance <= b.radius + 15) {
          playSound.pop();
          scoreGained += b.scoreValue;
          
          // Spawn floating score
          const fId = nextFloatId.current++;
          setFloatingScores((f) => [
            ...f,
            { id: fId, x: b.x, y: b.y, val: b.scoreValue },
          ]);
          
          // Remove floating score after animation
          setTimeout(() => {
            setFloatingScores((f) => f.filter((item) => item.id !== fId));
          }, 1000);

          return { ...b, popped: true };
        }
        return b;
      });

      if (scoreGained > 0) {
        setScore((s) => s + scoreGained);
      }
      return nextBubbles;
    });
  }, [gazeX, gazeY, isPlaying, isGazeActive]);

  const handleStartGame = () => {
    playSound.start();
    setScore(0);
    setTimeLeft(45);
    setBubbles([]);
    setIsPlaying(true);
  };

  return (
    <div className="flex flex-col h-[620px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden relative text-white">
      {/* Top dashboard controls */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-bold tracking-tight">凝视气泡破裂小游戏</h3>
        </div>

        <div className="flex items-center gap-6 font-mono text-sm">
          {/* Current Score */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">SCORE:</span>
            <span className="text-cyan-400 font-bold text-base">{score}</span>
          </div>

          {/* Time Left */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <Timer className="w-4 h-4 text-rose-400" />
            <span className="text-slate-400">TIME:</span>
            <span className={`font-bold text-base ${timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-slate-200'}`}>
              {timeLeft}s
            </span>
          </div>

          {/* High Score */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <Trophy className="w-4 h-4 text-yellow-400 fill-yellow-400/20" />
            <span className="text-slate-400">BEST:</span>
            <span className="text-yellow-400 font-bold">{highScore}</span>
          </div>
        </div>
      </div>

      {/* Game Playing Area */}
      <div
        ref={containerRef}
        className="flex-1 relative bg-slate-950 overflow-hidden cursor-none select-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, #0d1527 0%, #020617 100%)',
        }}
      >
        {!isPlaying ? (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            {timeLeft <= 0 ? (
              <div className="space-y-6 max-w-sm animate-scale-up">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Trophy className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-2xl font-bold text-slate-100">时间到！游戏结束</h4>
                  <p className="text-sm text-slate-400">
                    你的最终得分是 <strong className="text-cyan-400 text-lg">{score}</strong> 分。
                    {score >= highScore && score > 0 && (
                      <span className="block text-emerald-400 text-xs mt-1">🎉 恭喜创造了新的个人纪录！</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={handleStartGame}
                  className="w-full py-3 rounded-xl font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
                >
                  <RotateCcw className="w-4 h-4" />
                  再玩一次
                </button>
              </div>
            ) : (
              <div className="space-y-6 max-w-md animate-scale-up">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-2xl font-bold text-slate-100">准备好用眼神扫平一切了吗？</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    游戏开始后，彩色气泡会从屏幕底部浮现。
                    将您的<strong className="text-cyan-400">目光光标（Gaze Pointer）</strong>移入气泡内部，即可瞬间将其戳破！
                    越小、速度越快的气泡分值越高。
                  </p>
                </div>
                <button
                  onClick={handleStartGame}
                  className="px-8 py-3.5 mx-auto rounded-xl font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98]"
                >
                  <Play className="w-5 h-5 fill-current" />
                  开始游戏 (45秒限时)
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Render bubbles */}
            {bubbles.map((b) => (
              <div
                key={b.id}
                className={`absolute rounded-full bg-gradient-to-tr ${b.color} transition-transform duration-75 shadow-[inset_-2px_-2px_10px_rgba(255,255,255,0.2),_0_4px_16px_rgba(0,0,0,0.4)] border border-white/20`}
                style={{
                  left: `${b.x}px`,
                  top: `${b.y}px`,
                  width: `${b.radius * 2}px`,
                  height: `${b.radius * 2}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {/* Bubble specular highlight for 3D glass look */}
                <span className="absolute top-[15%] left-[15%] w-2.5 h-2.5 rounded-full bg-white/60" />
              </div>
            ))}

            {/* Render floating points notifications */}
            {floatingScores.map((fs) => (
              <div
                key={fs.id}
                className="absolute font-mono font-black text-lg text-cyan-300 pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-score-float"
                style={{
                  left: `${fs.x}px`,
                  top: `${fs.y}px`,
                }}
              >
                +{fs.val}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Embedded Animation Styles */}
      <style>{`
        @keyframes scoreFloat {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1) translateY(0);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.4) translateY(-40px);
          }
        }
        .animate-score-float {
          animation: scoreFloat 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
