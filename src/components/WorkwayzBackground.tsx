import React from 'react';
import Image from 'next/image';

export function WorkwayzBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center p-4 selection:bg-emerald-500/30 bg-[#07111e]">
      {/* ─── Workwayz Dynamic Trajectory Background ────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        <Image
          src="/workwayz-login-bg.png"
          alt="Workwayz Background"
          fill
          priority
          quality={100}
          className="object-cover object-center"
        />
        {/* Soft Ambient Vignette for Card Readability & Depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#060c16]/70 via-transparent to-[#060c16]/50" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(7, 17, 30, 0.2) 0%, rgba(5, 12, 22, 0.6) 100%)',
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
