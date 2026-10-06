import React from 'react';

export function WorkwayzBackground({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center p-4 selection:bg-emerald-500/30 bg-[#070e1b]"
      style={{
        background: 'radial-gradient(circle at 50% 38%, #0d1e34 0%, #081324 55%, #050a14 100%)',
      }}
    >
      {/* ─── Workwayz Ambient Floating Spheres & Brand Lighting ─────────── */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        {/* Large Prominent Left Sphere (Ocean Teal & Deep Blue Weave) */}
        <div
          className="absolute -left-28 sm:-left-36 md:-left-44 top-[24%] sm:top-[28%] w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] md:w-[500px] md:h-[500px] rounded-full"
          style={{
            background:
              'radial-gradient(circle at 40% 35%, rgba(14, 116, 144, 0.5) 0%, rgba(30, 58, 138, 0.35) 45%, rgba(10, 25, 47, 0.15) 70%, transparent 100%)',
            boxShadow: 'inset -15px -15px 40px rgba(5, 15, 30, 0.5)',
          }}
        />

        {/* Small Floating Upper-Left Sphere (Teal / Cyan Accents) */}
        <div
          className="absolute left-[15%] sm:left-[20%] top-[10%] sm:top-[12%] w-[65px] h-[65px] sm:w-[85px] sm:h-[85px] rounded-full"
          style={{
            background:
              'radial-gradient(circle at 35% 35%, rgba(56, 189, 248, 0.55) 0%, rgba(13, 148, 136, 0.35) 50%, rgba(10, 30, 50, 0.1) 85%, transparent 100%)',
          }}
        />

        {/* Top-Right Ascent Orb (Workwayz Electric Emerald Arrow Glow) */}
        <div
          className="absolute right-[8%] sm:right-[12%] top-[12%] sm:top-[16%] w-[110px] h-[110px] sm:w-[150px] sm:h-[150px] rounded-full"
          style={{
            background:
              'radial-gradient(circle at 35% 35%, rgba(16, 185, 129, 0.55) 0%, rgba(13, 148, 136, 0.3) 50%, rgba(5, 40, 45, 0.1) 85%, transparent 100%)',
            boxShadow: '0 0 50px rgba(16, 185, 129, 0.15)',
          }}
        />

        {/* Large Bottom-Right Sphere (Workwayz Cobalt Blue & Deep Navy) */}
        <div
          className="absolute -right-24 sm:-right-32 md:-right-40 -bottom-24 sm:-bottom-32 w-[340px] h-[340px] sm:w-[440px] sm:h-[440px] md:w-[520px] md:h-[520px] rounded-full"
          style={{
            background:
              'radial-gradient(circle at 35% 35%, rgba(59, 130, 246, 0.45) 0%, rgba(30, 64, 175, 0.3) 45%, rgba(10, 25, 47, 0.15) 75%, transparent 100%)',
            boxShadow: 'inset -20px -20px 45px rgba(5, 15, 30, 0.5)',
          }}
        />

        {/* Soft Ambient Bottom-Left Orb (Subtle Emerald/Teal Horizon) */}
        <div
          className="absolute left-[8%] sm:left-[12%] -bottom-16 w-[200px] h-[200px] sm:w-[260px] sm:h-[260px] rounded-full opacity-60"
          style={{
            background:
              'radial-gradient(circle at 40% 40%, rgba(16, 185, 129, 0.3) 0%, rgba(14, 116, 144, 0.2) 60%, transparent 100%)',
          }}
        />
      </div>

      {/* ─── Center Content ──────────────────────────────────────────────── */}
      <div className="w-full relative z-10 flex flex-col items-center">
        {children}
      </div>
    </div>
  );
}
