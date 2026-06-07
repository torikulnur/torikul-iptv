/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Play, Flame, Award, ShieldCheck, ChevronRight, ChevronLeft } from "lucide-react";
import { IPTVChannel } from "../types";

interface HeroSliderProps {
  channels: IPTVChannel[];
  onPlayChannel: (channel: IPTVChannel) => void;
}

interface BannerSlide {
  title: string;
  subtitle: string;
  desc: string;
  bgUrl: string;
  tag: string;
  channelName: string; // The channel to match in json
}

const STATIC_SLIDES: BannerSlide[] = [
  {
    title: "Live Sports & Action Hub",
    subtitle: "IPL & PSL 2026 LIVE STREAMING",
    desc: "Catch every single ball, run, wicket and boundary broadcast live in ultra HD. Premium access to specialized sports groups without any buffering lag.",
    bgUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1600&auto=format&fit=crop",
    tag: "SPORTS LIVE",
    channelName: "IPL-2026"
  },
  {
    title: "Universal Live Entertainment",
    subtitle: "BANGLA & INDO-BANGLA HD TELEVISION",
    desc: "Experience premier talk shows, thrilling TV dramas, daily lifestyle, and national cultural programs instantly from your favourite native broadcasters.",
    bgUrl: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1600&auto=format&fit=crop",
    tag: "REGIONAL TV",
    channelName: "Boishakhi TV"
  },
  {
    title: "Global breaking News & Reports",
    subtitle: "24/7 LIVE COVERAGE STREAMING",
    desc: "Stay informed on international relations, current events, stock markets, and weather systems with world-renown live journalistic channels.",
    bgUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop",
    tag: "WORLD NEWS",
    channelName: "Al Jazeera English"
  }
];

export default function HeroSlider({ channels, onPlayChannel }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-scroll every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % STATIC_SLIDES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % STATIC_SLIDES.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + STATIC_SLIDES.length) % STATIC_SLIDES.length);
  };

  const handleWatchNow = (slide: BannerSlide) => {
    // Attempt to locate matching channel dynamically in the loaded list
    let targetChan = channels.find(
      (c) => 
        c.name.toLowerCase().includes(slide.channelName.toLowerCase()) || 
        c.group.toLowerCase().includes(slide.channelName.toLowerCase())
    );

    // Rollback fallback to first match or whatever
    if (!targetChan && channels.length > 0) {
      targetChan = channels.find(c => c.group.toLowerCase() === "bangla" || c.group.toLowerCase() === "sports") || channels[0];
    }

    if (targetChan) {
      onPlayChannel(targetChan);
    }
  };

  if (!channels || channels.length === 0) {
    return (
      <div className="w-full h-80 rounded-2xl bg-slate-900/60 animate-pulse flex items-center justify-center border border-slate-800">
        <div className="text-slate-400 text-sm">Loading Premium Experience...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl group border border-slate-800/50" id="hero-slider-main">
      {/* Slider viewports */}
      <div className="relative h-[420px] md:h-[340px] w-full overflow-hidden bg-slate-950">
        
        {STATIC_SLIDES.map((slide, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={index}
              className={`absolute inset-0 transition-all duration-1000 ease-out flex items-center ${
                isActive 
                  ? "opacity-100 translate-x-0 scale-100 z-10" 
                  : "opacity-0 translate-x-12 scale-105 z-0 pointer-events-none"
              }`}
            >
              {/* Backing Image Layer with Rich Overlay */}
              <div 
                className="absolute inset-0 bg-cover bg-center transition-all duration-700 select-none pb-12"
                style={{ backgroundImage: `url(${slide.bgUrl})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/20"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent"></div>
              </div>

              {/* Informative Floating Panel */}
              <div className="relative z-20 px-6 md:px-12 max-w-2xl flex flex-col items-start gap-3 text-left">
                {/* Dynamic live badge */}
                <span className="flex items-center gap-1.5 bg-red-600 text-white font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-lg shadow-red-600/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                  {slide.tag}
                </span>

                <h3 className="text-brand-cyan tracking-wider font-semibold font-mono text-xs uppercase">
                  {slide.subtitle}
                </h3>
                
                <h1 className="font-display font-extrabold text-white text-2xl md:text-4xl tracking-tight leading-tight">
                  {slide.title}
                </h1>

                <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-light line-clamp-3">
                  {slide.desc}
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <button
                    onClick={() => handleWatchNow(slide)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-brand-blue to-brand-cyan hover:from-blue-600 hover:to-cyan-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20 scale-100 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" /> Watch Now
                  </button>

                  <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 font-mono bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tested Stream Link</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual buttons for navigation */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-slate-950/60 hover:bg-slate-950/90 hover:text-brand-blue border border-slate-800/60 text-slate-300 rounded-full z-20 opacity-0 group-hover:opacity-100 transform -translate-x-4 group-hover:translate-x-0 transition-all cursor-pointer"
        title="Previous banner"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-slate-950/60 hover:bg-slate-950/90 hover:text-brand-blue border border-slate-800/60 text-slate-300 rounded-full z-20 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all cursor-pointer"
        title="Next banner"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Indicator Pills */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {STATIC_SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === currentIndex ? "w-6 bg-brand-cyan" : "w-1.5 bg-slate-600 hover:bg-slate-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
