import React from 'react';
import { ArrowRight, Compass } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  return (
    <div
      id="landing-page-root"
      className="relative w-screen h-screen overflow-hidden flex items-center justify-center bg-slate-950 font-sans select-none"
    >
      {/* 1. Realistic Antarctic Background Image (Ice, Mountains, Ocean, Vessel) */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-100"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=2400&q=85')`,
        }}
      >
        {/* Subtle high-contrast fallback gradient in case network image takes a moment */}
        <div className="w-full h-full bg-slate-950/40" />
      </div>

      {/* 2. Professional Dark Navy Translucent Overlay for Optical Legibility */}
      <div className="absolute inset-0 z-10 bg-[#061224]/75 backdrop-blur-[2px]" />

      {/* 3. Subtle Ambient Vignette */}
      <div className="absolute inset-0 z-10 bg-radial from-transparent via-[#030914]/40 to-[#02060f]/90" />

      {/* 4. Centered Minimal Content (Nothing else competes with this) */}
      <div className="relative z-20 max-w-2xl px-6 text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
        {/* Minimal Subtle Compass Crest */}
        <div className="mb-6 flex items-center justify-center w-14 h-14 rounded-full bg-white/10 border border-white/20 text-sky-300 shadow-lg">
          <Compass className="w-7 h-7 stroke-[2]" />
        </div>

        {/* Primary Title */}
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white font-mono uppercase leading-none drop-shadow-sm">
          POLAR DSS
        </h1>

        {/* Subtitle */}
        <h2 className="mt-4 text-xl sm:text-2xl font-semibold text-slate-100 tracking-tight leading-snug">
          Antarctic Navigation Decision Support System
        </h2>

        {/* Short Description */}
        <p className="mt-5 text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-xl">
          AI-assisted decision support for safer and fuel-aware Antarctic research-vessel navigation.
        </p>

        {/* One Primary Action Button */}
        <div className="mt-9">
          <button
            id="btn-enter-application"
            onClick={onEnter}
            className="group px-8 py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-md font-semibold text-sm tracking-wide uppercase transition-all duration-200 shadow-xl hover:shadow-blue-500/25 flex items-center gap-2.5 cursor-pointer"
          >
            <span>ENTER APPLICATION</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Minimalist Demo Watermark */}
        <div className="mt-12 text-[11px] font-mono tracking-wider text-slate-400/80">
          DEMO / SIMULATED DATA • 44th ISEA EXPEDITION
        </div>
      </div>
    </div>
  );
};
