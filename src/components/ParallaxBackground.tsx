import React, { useEffect, useRef, useState } from 'react';
import { AppTheme } from '../types';

interface ParallaxBackgroundProps {
  theme: AppTheme;
}

export const ParallaxBackground: React.FC<ParallaxBackgroundProps> = ({ theme }) => {
  const isNotebook = theme === 'notebook';
  const isDark = false;

  // Smooth mouse coordinates (-1 to 1)
  const [coords, setCoords] = useState({ x: 0, y: 0, scrollY: 0, time: 0 });
  const [hasMovedMouse, setHasMovedMouse] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check user preference for reduced motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(motionQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };
    motionQuery.addEventListener('change', handleMotionChange);

    // On mobile devices, do not run parallax animation to optimize performance
    if (window.innerWidth < 768) {
      return;
    }

    let animationFrameId: number;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let targetScrollY = window.scrollY || 0;
    let currentScrollY = targetScrollY;
    const startTime = performance.now();

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to range [-1, 1]
      targetX = (e.clientX / window.innerWidth) * 2 - 1;
      targetY = (e.clientY / window.innerHeight) * 2 - 1;
      setHasMovedMouse(true);
    };

    const handleScroll = () => {
      targetScrollY = window.scrollY || window.pageYOffset;
    };

    // Smooth lerp loop with ambient harmonic breathing
    const loop = (timestamp: number) => {
      const elapsed = (timestamp - startTime) / 1000;

      // Smooth interpolation for mouse coordinates
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;
      currentScrollY += (targetScrollY - currentScrollY) * 0.08;

      setCoords({
        x: Math.round(currentX * 1000) / 1000,
        y: Math.round(currentY * 1000) / 1000,
        scrollY: Math.round(currentScrollY * 10) / 10,
        time: elapsed,
      });

      animationFrameId = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    animationFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      motionQuery.removeEventListener('change', handleMotionChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Parallax offsets (if reduced motion, lock to neutral)
  const mx = reducedMotion ? 0 : coords.x;
  const my = reducedMotion ? 0 : coords.y;
  const sy = reducedMotion ? 0 : coords.scrollY;
  // Ambient continuous harmonic motion so the background is dynamic even before cursor moves
  const breatheX = reducedMotion ? 0 : Math.sin(coords.time * 0.7) * 12;
  const breatheY = reducedMotion ? 0 : Math.cos(coords.time * 0.6) * 10;
  const rotAmbient = reducedMotion ? 0 : Math.sin(coords.time * 0.5) * 4;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="hidden md:block fixed inset-0 pointer-events-none overflow-hidden select-none z-0"
      style={{ perspective: 1200 }}
    >
      {/* =========================================================
          LAYER 1: DYNAMIC INTERACTIVE SPOTLIGHT (Tracks Cursor)
          ========================================================= */}
      {isNotebook ? (
        <>
          {/* Warm Study Desk Lamp Spotlight (interactive radial spotlight) */}
          <div
            className="absolute rounded-full pointer-events-none will-change-transform transition-opacity duration-700"
            style={{
              width: '70vw',
              height: '70vw',
              maxWidth: '900px',
              maxHeight: '900px',
              left: '50%',
              top: '35%',
              background: 'radial-gradient(circle at center, rgba(245, 158, 11, 0.20) 0%, rgba(217, 119, 6, 0.08) 40%, rgba(180, 83, 9, 0.02) 65%, transparent 75%)',
              filter: 'blur(45px)',
              transform: `translate3d(calc(-50% + ${mx * 75 + breatheX}px), calc(-50% + ${my * 60 + sy * -0.05 + breatheY}px), 0)`,
            }}
          />

          {/* Warm Amber Glow (Top Right Corner) */}
          <div
            className="absolute rounded-full pointer-events-none opacity-70 will-change-transform"
            style={{
              top: '-10%',
              right: '-5%',
              width: '45vw',
              height: '45vw',
              maxWidth: '650px',
              maxHeight: '650px',
              background: 'radial-gradient(circle, rgba(251, 191, 36, 0.22) 0%, rgba(245, 158, 11, 0.06) 50%, transparent 70%)',
              filter: 'blur(55px)',
              transform: `translate3d(${mx * -30 + breatheX * 0.5}px, ${my * -25 + sy * -0.04}px, 0)`,
            }}
          />

          {/* Calming Sage Foliage Glow (Bottom Left Corner) */}
          <div
            className="absolute rounded-full pointer-events-none opacity-60 will-change-transform"
            style={{
              bottom: '-10%',
              left: '-5%',
              width: '45vw',
              height: '45vw',
              maxWidth: '600px',
              maxHeight: '600px',
              background: 'radial-gradient(circle, rgba(56, 118, 82, 0.18) 0%, rgba(46, 101, 68, 0.05) 50%, transparent 70%)',
              filter: 'blur(55px)',
              transform: `translate3d(${mx * 25 - breatheX * 0.5}px, ${my * 25 + sy * -0.04}px, 0)`,
            }}
          />
        </>
      ) : (
        <>
          {/* Dynamic Cool Electric Indigo Focus Lens (tracks cursor) */}
          <div
            className="absolute rounded-full pointer-events-none will-change-transform transition-opacity duration-700"
            style={{
              width: '65vw',
              height: '65vw',
              maxWidth: '850px',
              maxHeight: '850px',
              left: '50%',
              top: '35%',
              background: 'radial-gradient(circle at center, rgba(99, 102, 241, 0.18) 0%, rgba(56, 189, 248, 0.09) 35%, rgba(14, 165, 233, 0.02) 60%, transparent 75%)',
              filter: 'blur(45px)',
              transform: `translate3d(calc(-50% + ${mx * 70 + breatheX}px), calc(-50% + ${my * 55 + sy * -0.05 + breatheY}px), 0)`,
            }}
          />

          {/* Precision Architectural Indigo Halo (Top Left) */}
          <div
            className="absolute rounded-full pointer-events-none opacity-70 will-change-transform"
            style={{
              top: '-10%',
              left: '-5%',
              width: '45vw',
              height: '45vw',
              maxWidth: '600px',
              maxHeight: '600px',
              background: 'radial-gradient(circle, rgba(79, 70, 229, 0.18) 0%, rgba(99, 102, 241, 0.05) 50%, transparent 70%)',
              filter: 'blur(55px)',
              transform: `translate3d(${mx * -28}px, ${my * -22 + sy * -0.04}px, 0)`,
            }}
          />

          {/* Electric Sky Cyan Glow (Bottom Right) */}
          <div
            className="absolute rounded-full pointer-events-none opacity-60 will-change-transform"
            style={{
              bottom: '-10%',
              right: '-5%',
              width: '42vw',
              height: '42vw',
              maxWidth: '580px',
              maxHeight: '580px',
              background: 'radial-gradient(circle, rgba(14, 165, 233, 0.16) 0%, rgba(56, 189, 248, 0.05) 50%, transparent 70%)',
              filter: 'blur(55px)',
              transform: `translate3d(${mx * 26}px, ${my * 22 + sy * -0.04}px, 0)`,
            }}
          />
        </>
      )}

      {/* =========================================================
          LAYER 2: TACTILE THEMED GRAPHICAL ARTIFACTS
          ========================================================= */}
      {isNotebook ? (
        <>
          {/* Authentic College Red Margin Line */}
          <div
            className="absolute top-0 bottom-0 left-4 sm:left-8 lg:left-12 w-[1.5px] pointer-events-none will-change-transform opacity-75"
            style={{
              background: 'linear-gradient(to bottom, rgba(220, 38, 38, 0.55) 0%, rgba(220, 38, 38, 0.40) 60%, rgba(220, 38, 38, 0.20) 100%)',
              transform: `translate3d(${mx * 6}px, 0, 0)`,
              boxShadow: '1px 0 2px rgba(254, 202, 202, 0.5)',
            }}
          />

          {/* Spiral Notebook Ring Punches (Along left edge) */}
          <div
            className="hidden sm:flex flex-col gap-8 lg:gap-11 absolute left-1 sm:left-2 lg:left-3 top-10 pointer-events-none will-change-transform opacity-70"
            style={{
              transform: `translate3d(${mx * 8}px, ${my * 6 + sy * -0.05}px, 0)`,
            }}
          >
            {[...Array(9)].map((_, i) => (
              <div key={i} className="relative flex items-center">
                {/* Metallic Spiral Wire Loop */}
                <div
                  className="absolute -left-1 w-4 h-2 rounded-full border-t border-b border-[#a8997c] shadow-xs"
                  style={{
                    background: 'linear-gradient(90deg, #d8cdb8 0%, #b8a88f 50%, #8c7e68 100%)',
                    transform: 'rotate(-10deg)',
                  }}
                />
                {/* Paper Punch Hole */}
                <div className="w-3 h-3 rounded-full border border-[#d8cdb8] bg-[#ebe3d2] shadow-inner" />
              </div>
            ))}
          </div>

          {/* Vintage Official Study Rubber Stamp (Top Right) */}
          <div
            className="absolute top-4 sm:top-8 right-3 sm:right-6 lg:right-12 pointer-events-none will-change-transform opacity-65 sm:opacity-85"
            style={{
              transform: `translate3d(${mx * -20 + breatheX * 0.6}px, ${my * -16 + sy * -0.06}px, 0) rotate(${-6 + rotAmbient * 0.4}deg)`,
            }}
          >
            <div className="relative border-2 border-dashed border-[#8d5e42] rounded-xl px-3 py-2 text-center text-[#8d5e42] bg-[#fdfaf3]/50 backdrop-blur-[2px] shadow-xs">
              <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest border-b border-[#8d5e42]/40 pb-0.5">
                Estudo Ativo
              </div>
              <div className="text-[10px] sm:text-[11px] font-serif-title font-bold mt-0.5 tracking-wider">
                GABARITO OFICIAL
              </div>
              <div className="text-[7px] sm:text-[8px] font-mono-code opacity-85">
                CONFERÊNCIA & REVISÃO
              </div>
              <div className="absolute -top-1.5 -right-1.5 text-[9px] text-[#8d5e42]">★</div>
              <div className="absolute -bottom-1.5 -left-1.5 text-[9px] text-[#8d5e42]">★</div>
            </div>
          </div>

          {/* Hand-Drawn Geometric Compass Draft (Bottom Right) */}
          <div
            className="hidden md:block absolute bottom-8 sm:bottom-12 right-6 lg:right-14 opacity-45 text-[#735338] pointer-events-none will-change-transform"
            style={{
              transform: `translate3d(${mx * -22 - breatheX * 0.5}px, ${my * -18 + sy * -0.06}px, 0)`,
            }}
          >
            <svg width="130" height="130" viewBox="0 0 130 130" fill="none" stroke="currentColor">
              <circle cx="65" cy="65" r="48" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="65" cy="65" r="28" strokeWidth="0.8" />
              <circle cx="65" cy="65" r="2" fill="currentColor" />
              <line x1="12" y1="65" x2="118" y2="65" strokeWidth="0.75" />
              <line x1="65" y1="12" x2="65" y2="118" strokeWidth="0.75" />
              <path d="M65,37 A28,28 0 0,1 88,48" strokeWidth="1.2" strokeDasharray="2 2" />
              <text x="70" y="47" fill="currentColor" fontSize="8" fontFamily="monospace">45°</text>
            </svg>
          </div>

          {/* Study Milestone Badge (Bottom Left) */}
          <div
            className="hidden lg:flex items-center gap-2 absolute bottom-10 left-16 px-3 py-1.5 rounded-lg border border-[#ded5c2] bg-[#fbf7ed]/60 text-[#7c6f58] font-mono-code text-[10px] pointer-events-none will-change-transform opacity-70"
            style={{
              transform: `translate3d(${mx * 18}px, ${my * 16 + sy * -0.05}px, 0)`,
            }}
          >
            <span className="w-2 h-2 rounded-full bg-[#387652] inline-block shadow-2xs" />
            <span>MODO CADERNO ATIVO • FOCO TOTAL</span>
          </div>
        </>
      ) : isDark ? (
        <>
          {/* =========================================================
              DARK THEME: DIGITAL HUD & TELEMETRY MATRIX (GRAPHITE & ZINC)
              ========================================================= */}

          {/* 1. Low-Contrast Minimalist Focus Terminal Badge (Top Left) */}
          <div
            className="absolute top-4 sm:top-7 left-3 sm:left-6 opacity-85 sm:opacity-95 pointer-events-none will-change-transform"
            style={{
              transform: `translate3d(${mx * -18}px, ${my * -14 + sy * -0.05}px, 0)`,
            }}
          >
            <div className="flex items-center gap-2 bg-[#22242a]/90 p-2 rounded-lg border border-[#3b3e48] shadow-lg shadow-black/40 backdrop-blur-xs">
              <div className="w-5 h-5 bg-zinc-700/40 border border-zinc-500/40 rounded-md flex items-center justify-center">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-60" />
                <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full" />
              </div>
              <div className="flex flex-col">
                <span className="font-mono-code text-[9px] tracking-widest text-zinc-200 font-bold uppercase">
                  DIAGNÓSTICO DIGITAL · GRAFITE SUAVE
                </span>
                <span className="font-mono-code text-[7.5px] text-zinc-400 tracking-wider">
                  MODO ESCURO CONFORTÁVEL // ZERO FADIGA
                </span>
              </div>
              <div className="w-2 h-2 bg-zinc-400/80 rounded-xs ml-1" />
            </div>
          </div>

          {/* 2. Precision Hexagonal Radar & Technical Calibrator (Top Right Area) */}
          <div
            className="hidden md:block absolute top-12 right-8 lg:right-16 opacity-45 text-zinc-400 pointer-events-none will-change-transform"
            style={{
              transform: `translate3d(${mx * -24 + breatheX * 0.7}px, ${my * -20 + sy * -0.07}px, 0)`,
            }}
          >
            <svg width="140" height="140" viewBox="0 0 140 140" fill="none" stroke="currentColor">
              {/* Outer dashed hex / circular ring */}
              <circle cx="70" cy="70" r="58" strokeWidth="1" strokeDasharray="4 4" className="text-zinc-500/40" />
              {/* Hexagonal inner frame */}
              <polygon points="70,28 106,49 106,91 70,112 34,91 34,49" strokeWidth="1.2" className="text-zinc-400/50" />
              {/* Inner core */}
              <circle cx="70" cy="70" r="18" strokeWidth="0.8" className="text-zinc-300/60" />
              <circle cx="70" cy="70" r="3" fill="currentColor" className="text-emerald-400/90" />
              {/* Crosshair telemetry lines */}
              <line x1="8" y1="70" x2="132" y2="70" strokeWidth="0.75" className="text-zinc-600/60" />
              <line x1="70" y1="8" x2="70" y2="132" strokeWidth="0.75" className="text-zinc-600/60" />
              {/* Angle sector sweep */}
              <path d="M70,30 A40,40 0 0,1 105,50" strokeWidth="2" className="text-zinc-300" />
              <path d="M70,110 A40,40 0 0,1 35,90" strokeWidth="1.5" strokeDasharray="3 2" className="text-zinc-400" />
              {/* Corner HUD framing brackets */}
              <path d="M16,28 L16,16 L28,16" strokeWidth="1.5" className="text-zinc-400/80" />
              <path d="M124,28 L124,16 L112,16" strokeWidth="1.5" className="text-zinc-400/80" />
              <path d="M16,112 L16,124 L28,124" strokeWidth="1.5" className="text-zinc-400/80" />
              <path d="M124,112 L124,124 L112,124" strokeWidth="1.5" className="text-zinc-400/80" />
              <text x="76" y="24" fill="currentColor" fontSize="7.5" fontFamily="monospace" className="text-zinc-300">CALIB · 360°</text>
            </svg>
          </div>

          {/* 3. Graphite Stepper Nodes (Left Margin) */}
          <div
            className="hidden md:flex flex-col gap-2 absolute left-3 sm:left-5 top-28 bottom-28 opacity-40 text-zinc-400 pointer-events-none will-change-transform"
            style={{
              transform: `translate3d(${mx * 12}px, ${my * 9 + sy * -0.04}px, 0)`,
            }}
          >
            {[...Array(16)].map((_, i) => (
              <div key={i} className="flex items-center gap-1">
                <div
                  className={`h-1 rounded-full transition-all ${
                    i % 4 === 0
                      ? 'w-4 bg-zinc-300 shadow-xs shadow-zinc-300/40'
                      : i % 2 === 0
                      ? 'w-2.5 bg-zinc-500/70'
                      : 'w-1.5 bg-zinc-700/60'
                  }`}
                />
                {i % 4 === 0 && (
                  <span className="text-[7px] font-mono-code text-zinc-400">
                    {String(i * 10).padStart(2, '0')}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 4. Neutral Graphite Waveform Card (Bottom Right) */}
          <div
            className="hidden md:flex flex-col items-end gap-1 absolute bottom-6 right-6 opacity-85 text-zinc-300 pointer-events-none will-change-transform font-mono-code text-[10px] bg-[#22242a]/90 p-2.5 rounded-xl border border-[#3b3e48] shadow-xl shadow-black/40 backdrop-blur-xs"
            style={{
              transform: `translate3d(${mx * -16}px, ${my * 14 + sy * -0.04}px, 0)`,
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-zinc-200 tracking-wider">SISTEMA ÓPTICO GRAFITE</span>
            </div>
            {/* Sparkline wave */}
            <div className="flex items-end gap-0.5 h-3 my-0.5">
              {[4, 7, 3, 9, 6, 11, 8, 5, 10, 12, 7, 9, 11, 8].map((h, idx) => (
                <div
                  key={idx}
                  className="w-1 bg-zinc-400/60 rounded-xs"
                  style={{ height: `${h}px`, opacity: idx >= 8 ? 0.9 : 0.4 }}
                />
              ))}
            </div>
            <div className="text-[8.5px] text-zinc-400">LEITURA SUAVE // CONTRASTE OTIMIZADO</div>
          </div>

          {/* 5. Night Study Status Pill (Bottom Left) */}
          <div
            className="hidden lg:flex items-center gap-2 absolute bottom-10 left-16 px-3.5 py-2 rounded-xl border border-[#3b3e48] bg-[#22242a]/90 text-zinc-200 font-mono-code text-[10px] pointer-events-none will-change-transform opacity-85 shadow-lg shadow-black/40 backdrop-blur-xs"
            style={{
              transform: `translate3d(${mx * 18}px, ${my * 16 + sy * -0.05}px, 0)`,
            }}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 inline-block shadow-xs shadow-zinc-400/60" />
            <span className="font-semibold text-zinc-100">MODO ESCURO CINZA</span>
            <span className="text-zinc-400">· BAIXO CONTRASTE</span>
          </div>
        </>
      ) : (
        <>
          {/* =========================================================
              CLEAN THEME: OPTICAL MARK RECOGNITION (OMR) & DRAFTING
              ========================================================= */}

          {/* OMR Scanner Corner Registration Target (Top Left) */}
          <div
            className="absolute top-4 sm:top-6 left-3 sm:left-6 opacity-65 sm:opacity-85 text-slate-600 pointer-events-none will-change-transform"
            style={{
              transform: `translate3d(${mx * -16}px, ${my * -14 + sy * -0.05}px, 0)`,
            }}
          >
            <div className="flex items-center gap-1.5 bg-white/70 p-1.5 rounded-md border border-slate-200/80 shadow-2xs">
              <div className="w-4 h-4 bg-slate-900 border border-slate-700 rounded-[2px]" />
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
              <span className="font-mono-code text-[9px] tracking-wider text-slate-700 font-bold uppercase">
                LEITURA ÓPTICA · CALIBRAÇÃO A-01
              </span>
            </div>
          </div>

          {/* OMR Scanner Corner Registration Target (Top Right) */}
          <div
            className="absolute top-4 sm:top-6 right-3 sm:right-6 opacity-65 sm:opacity-85 text-slate-600 pointer-events-none will-change-transform"
            style={{
              transform: `translate3d(${mx * 16}px, ${my * -14 + sy * -0.05}px, 0)`,
            }}
          >
            <div className="flex items-center gap-1.5 flex-row-reverse bg-white/70 p-1.5 rounded-md border border-slate-200/80 shadow-2xs">
              <div className="w-4 h-4 bg-slate-900 border border-slate-700 rounded-[2px]" />
              <div className="w-1.5 h-1.5 bg-sky-500 rounded-full" />
              <span className="font-mono-code text-[9px] tracking-wider text-slate-700 font-bold uppercase">
                CARTÃO-RESPOSTA PRONTO
              </span>
            </div>
          </div>

          {/* Vertical Optical Timing Track (Barcode calibration markers on the margin) */}
          <div
            className="hidden md:flex flex-col gap-2.5 absolute left-3 sm:left-5 top-24 bottom-24 opacity-45 text-slate-700 pointer-events-none will-change-transform"
            style={{
              transform: `translate3d(${mx * 10}px, ${my * 8 + sy * -0.04}px, 0)`,
            }}
          >
            {[...Array(14)].map((_, i) => (
              <div
                key={i}
                className="w-3 h-1 bg-slate-800 rounded-[1px]"
                style={{ opacity: i % 3 === 0 ? 0.9 : 0.4 }}
              />
            ))}
          </div>

          {/* Precision Architectural Reticle & Protractor (Top Right Area) */}
          <div
            className="hidden md:block absolute top-16 right-10 lg:right-16 opacity-45 text-slate-600 pointer-events-none will-change-transform"
            style={{
              transform: `translate3d(${mx * -22 + breatheX * 0.5}px, ${my * -18 + sy * -0.06}px, 0)`,
            }}
          >
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" stroke="currentColor">
              <circle cx="60" cy="60" r="44" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="60" cy="60" r="22" strokeWidth="0.8" />
              <circle cx="60" cy="60" r="2" fill="currentColor" />
              <line x1="8" y1="60" x2="112" y2="60" strokeWidth="0.75" />
              <line x1="60" y1="8" x2="60" y2="112" strokeWidth="0.75" />
              <path d="M20,30 L20,20 L30,20" strokeWidth="1.2" />
              <path d="M100,30 L100,20 L90,20" strokeWidth="1.2" />
              <path d="M20,90 L20,100 L30,100" strokeWidth="1.2" />
              <path d="M100,90 L100,100 L90,100" strokeWidth="1.2" />
            </svg>
          </div>

          {/* Minimalist Calibration Spec Sheet (Bottom Right) */}
          <div
            className="hidden md:flex flex-col items-end gap-0.5 absolute bottom-6 right-6 opacity-65 text-slate-600 pointer-events-none will-change-transform font-mono-code text-[10px] bg-white/60 p-2 rounded-lg border border-slate-200/60 shadow-2xs"
            style={{
              transform: `translate3d(${mx * -15}px, ${my * 12 + sy * -0.04}px, 0)`,
            }}
          >
            <div className="font-bold text-slate-800">CONFERÊNCIA DE CARTÃO-RESPOSTA</div>
            <div className="text-[9px] text-slate-500">PRECISÃO DE LEITURA // CORREÇÃO ATIVA</div>
          </div>

          {/* Study Milestone Badge (Bottom Left) */}
          <div
            className="hidden lg:flex items-center gap-2 absolute bottom-10 left-16 px-3 py-1.5 rounded-lg border border-slate-200/80 bg-white/70 text-slate-600 font-mono-code text-[10px] pointer-events-none will-change-transform opacity-75 shadow-2xs"
            style={{
              transform: `translate3d(${mx * 18}px, ${my * 16 + sy * -0.05}px, 0)`,
            }}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block shadow-2xs" />
            <span>MODO PLATAFORMA • SIMULAÇÃO & FOCO</span>
          </div>
        </>
      )}

      {/* =========================================================
          LAYER 3: MULTI-DEPTH FLOATING PARTICLES (3D Motes)
          ========================================================= */}
      {isNotebook ? (
        <>
          {/* Luminous Warm Dust Motes */}
          <div
            className="absolute rounded-full bg-amber-500/50 pointer-events-none will-change-transform shadow-xs"
            style={{
              top: '22%',
              left: '15%',
              width: '6px',
              height: '6px',
              transform: `translate3d(${mx * 40 + breatheX * 1.5}px, ${my * 35 + sy * -0.12 + breatheY * 1.5}px, 0)`,
            }}
          />
          <div
            className="absolute rounded-full bg-amber-600/40 pointer-events-none will-change-transform shadow-xs"
            style={{
              top: '55%',
              left: '85%',
              width: '7px',
              height: '7px',
              transform: `translate3d(${mx * -45 - breatheX * 1.2}px, ${my * -40 + sy * -0.15}px, 0)`,
            }}
          />
          <div
            className="absolute rounded-full bg-[#387652]/45 pointer-events-none will-change-transform shadow-xs"
            style={{
              top: '75%',
              left: '22%',
              width: '5px',
              height: '5px',
              transform: `translate3d(${mx * 35 + breatheX}px, ${my * 30 + sy * -0.1}px, 0)`,
            }}
          />
          <div
            className="absolute rounded-full bg-amber-400/55 pointer-events-none will-change-transform shadow-xs"
            style={{
              top: '38%',
              left: '88%',
              width: '5px',
              height: '5px',
              transform: `translate3d(${mx * -30 + breatheX}px, ${my * 25 + sy * -0.08}px, 0)`,
            }}
          />
        </>
      ) : isDark ? (
        <>
          {/* Neutral Graphite & Platinum Floating Nodes */}
          <div
            className="absolute rounded-full bg-zinc-400/50 pointer-events-none will-change-transform shadow-sm shadow-zinc-400/30"
            style={{
              top: '25%',
              left: '16%',
              width: '5px',
              height: '5px',
              transform: `translate3d(${mx * 38 + breatheX * 1.3}px, ${my * 32 + sy * -0.12}px, 0)`,
            }}
          />
          <div
            className="absolute rounded-full bg-zinc-300/50 pointer-events-none will-change-transform shadow-sm shadow-zinc-300/30"
            style={{
              top: '60%',
              left: '86%',
              width: '6px',
              height: '6px',
              transform: `translate3d(${mx * -40 - breatheX * 1.2}px, ${my * -36 + sy * -0.14}px, 0)`,
            }}
          />
          <div
            className="absolute rounded-full bg-emerald-400/40 pointer-events-none will-change-transform shadow-sm shadow-emerald-400/20"
            style={{
              top: '80%',
              left: '24%',
              width: '4px',
              height: '4px',
              transform: `translate3d(${mx * 28 + breatheX}px, ${my * 26 + sy * -0.09}px, 0)`,
            }}
          />
        </>
      ) : (
        <>
          {/* Tech Matrix Alignment Nodes */}
          <div
            className="absolute rounded-full bg-indigo-500/50 pointer-events-none will-change-transform shadow-xs"
            style={{
              top: '25%',
              left: '16%',
              width: '5px',
              height: '5px',
              transform: `translate3d(${mx * 38 + breatheX * 1.3}px, ${my * 32 + sy * -0.12}px, 0)`,
            }}
          />
          <div
            className="absolute rounded-full bg-sky-500/50 pointer-events-none will-change-transform shadow-xs"
            style={{
              top: '60%',
              left: '86%',
              width: '6px',
              height: '6px',
              transform: `translate3d(${mx * -40 - breatheX * 1.2}px, ${my * -36 + sy * -0.14}px, 0)`,
            }}
          />
          <div
            className="absolute rounded-full bg-slate-400/60 pointer-events-none will-change-transform shadow-xs"
            style={{
              top: '80%',
              left: '24%',
              width: '4px',
              height: '4px',
              transform: `translate3d(${mx * 28 + breatheX}px, ${my * 26 + sy * -0.09}px, 0)`,
            }}
          />
        </>
      )}
    </div>
  );
};
