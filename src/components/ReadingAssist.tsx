import React, { useState, useEffect, useRef } from 'react';
import { Eye, BookOpen, ChevronUp, ChevronDown, Sparkles, Activity } from 'lucide-react';

interface ReadingAssistProps {
  gazeX: number;
  gazeY: number;
  isGazeActive: boolean;
}

interface Paragraph {
  id: number;
  text: string;
}

const PARAGRAPHS: Paragraph[] = [
  {
    id: 1,
    text: "人类眼睛是极为精密的数据采集系统。我们进行日常阅读、观察环境时，视线并非在屏幕上进行平滑均匀的扫视，而是由极速跳跃的「眼动（Saccades）」与短暂静止的「注视（Fixations）」交替组成。这种快速、跳跃性的生理微运动就是眼动追踪交互的科学底层基础。",
  },
  {
    id: 2,
    text: "在这些「注视（Fixations）」期间，人类大脑开始抓取文字或图像的细节。注视通常持续100到400毫秒，占整个阅读时间的90%。而发生在两次注视之间的眼跳（Saccades）则极度敏捷，速度可高达每秒900度，在此极速移动中我们的视觉信号实际上是「瞬时中断（Saccadic Suppression）」的，也就是说大脑在眼跳时几乎是盲目的。",
  },
  {
    id: 3,
    text: "通过在网页端集成眼动追踪（Eye-tracking），我们不仅能够将视线作为取代传统鼠标的输入指针，更可以以此开启全新的「自适应无感交互（Foveated Interactions）」。例如本阅读辅助器，能自动高亮并清晰呈现您眼神落点的段落，同时调暗周围非核心阅读区的字色，为您提供前所未有的「沉浸式降噪阅读体验」。",
  },
  {
    id: 4,
    text: "另外，更神奇的在于「眼神控制自适应滚屏（Eye-gaze Auto Scroll）」。当您专注看书快读完一页时，您的视线会自然而然地滑落至屏幕的底部区间。本组件一旦检测到视线落在底部边界触发带（18% 边缘区），无需任何键盘、鼠标或滚轮操作，内容将会轻柔平滑地自动向上滚动。相反，若您回看或重读顶部内容，视线上移时页面又将自动向下回滚。",
  },
  {
    id: 5,
    text: "对于患有运动神经损伤、ALS（渐冻症）或肢体残障的特殊用户群体，眼动追踪不仅仅是一个酷炫的极客科技，更是一扇重新与广袤互联网数字世界顺畅沟通的生命之窗。它提供了全天候免手控、无障碍的「真·双手自由」辅助技术（AT）。",
  },
  {
    id: 6,
    text: "眼动交互的未来不仅仅在于「凝视即点击（Dwell-to-Click）」，而在于多模态融合、环境语义感知与认知负荷检测。搭载前沿AI微视觉模型，在不远的未来，浏览器甚至能通过您的瞬时瞳孔收缩、眼颤频率，精准感知到您何时因句子晦涩而产生困惑，并为您实时提供AI智能摘要、释义或翻译弹窗，从而重塑人类终身学习的效率极限。",
  }
];

export default function ReadingAssist({ gazeX, gazeY, isGazeActive }: ReadingAssistProps) {
  const [activeParagraphId, setActiveParagraphId] = useState<number | null>(null);
  const [scrollState, setScrollState] = useState<'idle' | 'up' | 'down'>('idle');
  const [scrollProgress, setScrollProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const paragraphRefs = useRef<{ [key: number]: HTMLParagraphElement | null }>({});
  const scrollAnimRef = useRef<number | null>(null);

  // 1. Gaze vertical coordinate check: Detect which paragraph matches GazeY
  useEffect(() => {
    if (!isGazeActive) return;

    let foundId: number | null = null;
    
    // Iterate paragraph boxes to find the one matching current gaze coordinate
    Object.keys(paragraphRefs.current).forEach((key) => {
      const id = parseInt(key, 10);
      const el = paragraphRefs.current[id];
      if (el) {
        const rect = el.getBoundingClientRect();
        // Check if Gaze Y position is vertically within this paragraph box (with 15px extra padding)
        if (gazeY >= rect.top - 15 && gazeY <= rect.bottom + 15) {
          foundId = id;
        }
      }
    });

    if (foundId !== null) {
      setActiveParagraphId(foundId);
    }
  }, [gazeX, gazeY, isGazeActive]);

  // 2. Auto Scroll Trigger depending on Gaze vertical bounds inside the reading zone
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isGazeActive) {
      setScrollState('idle');
      return;
    }

    const rect = container.getBoundingClientRect();
    const relY = gazeY - rect.top; // Gaze Y relative to reading box
    const containerHeight = rect.height;

    // Define hot-zones (18% from top and bottom)
    const topZone = containerHeight * 0.18;
    const bottomZone = containerHeight * 0.82;

    let targetScrollSpeed = 0;

    if (relY >= 0 && relY < topZone) {
      // Gaze is at the top: scroll upwards (content moves down)
      setScrollState('up');
      // Speed proportional to proximity to absolute top
      const factor = (topZone - relY) / topZone;
      targetScrollSpeed = -Math.max(factor * 3.5, 0.6); // smooth speed
    } else if (relY > bottomZone && relY <= containerHeight) {
      // Gaze is at the bottom: scroll downwards (content moves up)
      setScrollState('down');
      const factor = (relY - bottomZone) / (containerHeight - bottomZone);
      targetScrollSpeed = Math.max(factor * 3.5, 0.6);
    } else {
      setScrollState('idle');
    }

    // Scroll animation executor
    if (targetScrollSpeed !== 0) {
      const scrollFrame = () => {
        if (container) {
          container.scrollTop += targetScrollSpeed;
          
          // Calculate scroll progress percent
          const totalScrollable = container.scrollHeight - container.clientHeight;
          if (totalScrollable > 0) {
            setScrollProgress(Math.round((container.scrollTop / totalScrollable) * 100));
          }
        }
        scrollAnimRef.current = requestAnimationFrame(scrollFrame);
      };
      
      scrollAnimRef.current = requestAnimationFrame(scrollFrame);
    }

    return () => {
      if (scrollAnimRef.current) {
        cancelAnimationFrame(scrollAnimRef.current);
        scrollAnimRef.current = null;
      }
    };
  }, [gazeX, gazeY, isGazeActive]);

  return (
    <div className="flex flex-col h-[620px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden relative text-slate-100 shadow-xl">
      {/* Dynamic Header */}
      <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between z-10 select-none">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="text-sm font-bold">无障碍眼神阅读助理 (Reading Assist)</h3>
            <p className="text-[10px] text-slate-400">自适应降噪排版，配合边缘视线检测实现免手控滚屏</p>
          </div>
        </div>

        {/* Live reading statistics */}
        <div className="flex items-center gap-4 text-[11px] font-mono">
          {/* Scroll indicators */}
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">状态:</span>
            {scrollState === 'up' && (
              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                <ChevronUp className="w-3.5 h-3.5 animate-bounce" /> 向上回滚
              </span>
            )}
            {scrollState === 'down' && (
              <span className="text-cyan-400 flex items-center gap-1 font-bold">
                <ChevronDown className="w-3.5 h-3.5 animate-bounce" /> 自动下滚
              </span>
            )}
            {scrollState === 'idle' && (
              <span className="text-slate-400">静止阅读中</span>
            )}
          </div>

          <div className="bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-slate-300">
            进度: <span className="font-bold text-cyan-400">{scrollProgress}%</span>
          </div>
        </div>
      </div>

      {/* Main viewport with border zone lines indicators for absolute transparency */}
      <div className="flex-1 flex flex-col relative bg-slate-950">
        
        {/* Helper overlays visualizing top/bottom scroll zones */}
        {isGazeActive && (
          <>
            {/* Top Hotzone indicator line */}
            <div className="absolute top-0 left-0 right-0 h-[18%] bg-gradient-to-b from-emerald-500/5 to-transparent border-b border-dashed border-emerald-500/10 pointer-events-none flex items-center justify-center">
              <span className="text-[8px] font-mono font-bold tracking-widest text-emerald-500/20 uppercase flex items-center gap-1">
                <ChevronUp className="w-3 h-3" />
                向上滚屏视区 (18%)
              </span>
            </div>

            {/* Bottom Hotzone indicator line */}
            <div className="absolute bottom-0 left-0 right-0 h-[18%] bg-gradient-to-t from-cyan-500/5 to-transparent border-t border-dashed border-cyan-500/10 pointer-events-none flex items-center justify-center">
              <span className="text-[8px] font-mono font-bold tracking-widest text-cyan-500/20 uppercase flex items-center gap-1">
                <ChevronDown className="w-3 h-3" />
                向下滚屏视区 (18%)
              </span>
            </div>
          </>
        )}

        {/* Scrollable Article Area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-8 md:px-14 py-16 space-y-8 scroll-smooth"
          style={{ scrollbarWidth: 'thin' }}
        >
          {/* Article Title */}
          <div className="border-b border-slate-900 pb-6 space-y-2">
            <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase font-mono bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded-md">
              科研与辅助技术
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight leading-snug">
              眼跳、注视与网页端的眼神人机交互革命
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-1 font-mono">
              <Eye className="w-3.5 h-3.5" />
              智能眼动算法研究中心 ｜ 辅助阅览模态
            </p>
          </div>

          {/* Article Content Paragraphs */}
          <div className="space-y-6 text-sm leading-relaxed">
            {PARAGRAPHS.map((p) => {
              const isActive = activeParagraphId === p.id;
              return (
                <p
                  key={p.id}
                  ref={(el) => {
                    paragraphRefs.current[p.id] = el;
                  }}
                  className={`pl-4 py-2 border-l-2 transition-all duration-300 ${
                    isActive
                      ? 'border-cyan-400 text-slate-100 bg-slate-900/60 font-medium scale-[1.01] shadow-[inset_1px_0_0_rgba(34,211,238,0.2)] rounded-r-lg'
                      : 'border-transparent text-slate-400/80'
                  }`}
                >
                  {p.text}
                </p>
              );
            })}
          </div>

          <div className="pt-10 pb-6 text-center border-t border-slate-900">
            <p className="text-xs text-slate-500 font-mono flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              文章结束 ｜ 体验免手控滚屏的自然魅力
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
