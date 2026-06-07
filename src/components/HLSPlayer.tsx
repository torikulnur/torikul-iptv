/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Settings, 
  Tv, 
  AlertCircle, 
  RefreshCw, 
  TvIcon,
  Radio
} from "lucide-react";

interface HLSPlayerProps {
  url: string;
  name: string;
  logo: string;
  group: string;
}

export default function HLSPlayer({ url, name, logo, group }: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [levels, setLevels] = useState<{ id: number; name: string }[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 is auto
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Restart loading state and Hls player on URL change
  useEffect(() => {
    setErrorMsg(null);
    setIsLoading(true);
    setLevels([]);
    setCurrentLevel(-1);

    const video = videoRef.current;
    if (!video || !url) {
      setIsLoading(false);
      return;
    }

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Check if browser supports HLS natively (like Safari)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      video.addEventListener("error", handleNativeError);
      video.addEventListener("waiting", handleWaiting);
      video.addEventListener("playing", handlePlaying);

      // Trigger play
      video.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("Muted autoplay triggered or user block: ", err);
          // Try playing muted
          video.muted = true;
          setIsMuted(true);
          video.play()
            .then(() => setIsPlaying(true))
            .catch((e) => console.error("Playback block:", e));
        });

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        video.removeEventListener("error", handleNativeError);
        video.removeEventListener("waiting", handleWaiting);
        video.removeEventListener("playing", handlePlaying);
      };
    } else if (Hls.isSupported()) {
      // HLS.js setup
      const hls = new Hls({
        enableWorker: true,
        maxBufferLength: 30,
        liveSyncDurationCount: 3,
        manifestLoadingMaxRetry: 3,
        manifestLoadingRetryDelay: 1000,
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsLoading(false);
        setErrorMsg(null);
        
        // Quality levels
        const hlsLevels = hls.levels.map((lvl, index) => ({
          id: index,
          name: lvl.height ? `${lvl.height}p` : `Stream ${index + 1}`,
        }));
        setLevels(hlsLevels);

        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Unmuted autoplay blocked, try playing muted
            video.muted = true;
            setIsMuted(true);
            video.play()
              .then(() => setIsPlaying(true))
              .catch((e) => console.error("Unmuted playback blocked", e));
          });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentLevel(hls.currentLevel);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.warn("HLS ERROR:", data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log("fatal network error encountered, try to recover");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("fatal media error encountered, try to recover");
              hls.recoverMediaError();
              break;
            default:
              setErrorMsg("Unable to decode stream. This live stream may be temporarily inactive or requires secure access.");
              setIsLoading(false);
              hls.destroy();
              break;
          }
        }
      });

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    } else {
      setErrorMsg("Your browser does not support HLS streaming.");
      setIsLoading(false);
    }
  }, [url, retryCount]);

  // Set initial volume
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = isMuted ? 0 : volume;
      video.muted = isMuted;
    }
  }, [volume, isMuted]);

  const handleLoadedMetadata = () => {
    setIsLoading(false);
    setErrorMsg(null);
  };

  const handleNativeError = () => {
    setErrorMsg("CORS block or offline stream. This channel stream is currently inactive or restricted.");
    setIsLoading(false);
  };

  const handleWaiting = () => {
    setIsLoading(true);
  };

  const handlePlaying = () => {
    setIsLoading(false);
    setIsPlaying(true);
    setErrorMsg(null);
  };

  // Interaction handlers
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().then(() => setIsPlaying(true));
        });
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0) {
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleQualityChange = (levelId: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = levelId;
    setCurrentLevel(levelId);
    setShowQualityMenu(false);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((e) => console.error("Fullscreen error:", e));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false));
    }
  };

  // Monitor full screen changes (e.g. esc key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Show/Hide controls overlay
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showQualityMenu) {
        setShowControls(false);
      }
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, showQualityMenu]);

  const triggerRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Container holding the video player */}
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        className="relative aspect-video w-full rounded-2xl bg-black overflow-hidden shadow-2xl glass-card select-none"
        id="iptv-player-container"
      >
        <video
          ref={videoRef}
          onClick={togglePlay}
          className="w-full h-full object-contain"
          playsInline
          crossOrigin="anonymous"
        />

        {/* Loading Spinner */}
        {isLoading && !errorMsg && (
          <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-3 z-10">
            <RefreshCw className="w-12 h-12 text-brand-blue animate-spin" />
            <span className="text-sm tracking-wider font-medium text-slate-300">Connecting to Stream...</span>
          </div>
        )}

        {/* Error Screen */}
        {errorMsg && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center text-center p-6 gap-4 z-20">
            <div className="p-3 bg-red-950/50 rounded-full border border-red-500/30">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-white">Playback Interrupted</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">{errorMsg}</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={triggerRetry}
                className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reconnect
              </button>
              <div className="px-4 py-2 bg-slate-800 border border-slate-700/50 text-slate-300 rounded-lg text-xs font-semibold">
                Geo-restricted / Down.
              </div>
            </div>
          </div>
        )}

        {/* Top Floating Channel Info (Overlay) */}
        {showControls && (
          <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between z-10 transition-opacity duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center p-1.5 shadow-inner">
                {logo ? (
                  <img 
                    src={logo} 
                    alt={name} 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`;
                    }}
                  />
                ) : (
                  <Tv className="w-5 h-5 text-brand-blue" />
                )}
              </div>
              <div>
                <h4 className="font-display font-medium text-sm text-white line-clamp-1">{name}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono tracking-wide">{group}</span>
                  <span className="flex items-center gap-1 text-[10px] bg-red-600/30 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> LIVE
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-brand-blue/20 text-brand-cyan border border-brand-cyan/20 text-[10px] px-2 py-0.5 rounded-full font-mono">
                {currentLevel === -1 ? "AUTO QUALITY" : levels.find(l => l.id === currentLevel)?.name || "HD"}
              </span>
            </div>
          </div>
        )}

        {/* Central Play/Pause giant overlay trigger */}
        {showControls && isPlaying && !isLoading && !errorMsg && (
          <button 
            onClick={togglePlay}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-4 bg-slate-900/60 hover:bg-slate-900/80 text-white rounded-full border border-white/10 hover:scale-110 active:scale-95 transition-all outline-none"
          >
            <Pause className="w-7 h-7 fill-white" />
          </button>
        )}

        {showControls && !isPlaying && !isLoading && !errorMsg && (
          <button 
            onClick={togglePlay}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-4 bg-brand-blue/90 text-white rounded-full border border-blue-500/30 shadow-xl shadow-blue-500/20 hover:scale-110 active:scale-95 transition-all outline-none"
          >
            <Play className="w-7 h-7 fill-white translate-x-0.5" />
          </button>
        )}

        {/* Bottom Controls Panel (Overlay) */}
        {showControls && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 flex flex-col gap-3 z-10 transition-opacity duration-300">
            {/* Timeline Progress Bar (Simulated custom look for live broadcast) */}
            <div className="w-full flex items-center gap-3">
              <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden relative">
                <div className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-brand-blue to-brand-cyan"></div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-brand-cyan font-mono animate-pulse font-semibold">
                <Radio className="w-3 h-3" /> LIVE BROADCAST
              </div>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Play / Pause */}
                <button 
                  onClick={togglePlay}
                  className="text-white hover:text-brand-blue transition-colors cursor-pointer"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                {/* Volume Controller */}
                <div className="flex items-center gap-2 group/volume">
                  <button 
                    onClick={toggleMute}
                    className="text-white hover:text-brand-blue transition-colors cursor-pointer"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 rounded-full accent-brand-blue bg-slate-700 cursor-pointer hover:w-20 transition-all"
                  />
                </div>
              </div>

              {/* Action indicators and Quality Selector */}
              <div className="flex items-center gap-4">
                {/* Quality Button */}
                {levels.length > 0 && (
                  <div className="relative">
                    <button 
                      onClick={() => setShowQualityMenu(!showQualityMenu)}
                      className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors bg-slate-900/60 border border-slate-800 px-2 py-1 rounded-lg cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>{currentLevel === -1 ? "Auto" : levels.find(l => l.id === currentLevel)?.name}</span>
                    </button>

                    {showQualityMenu && (
                      <div className="absolute bottom-full right-0 mb-2 w-32 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-1 z-30 flex flex-col gap-0.5">
                        <div className="text-[10px] text-slate-500 px-2 py-1 border-b border-slate-800/60 font-mono">QUALITY</div>
                        <button
                          onClick={() => handleQualityChange(-1)}
                          className={`w-full text-left font-sans text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                            currentLevel === -1 
                              ? "bg-brand-blue/20 text-brand-cyan font-semibold" 
                              : "text-slate-300 hover:bg-slate-900/50"
                          }`}
                        >
                          Auto Select
                        </button>
                        {levels.map((lvl) => (
                          <button
                            key={lvl.id}
                            onClick={() => handleQualityChange(lvl.id)}
                            className={`w-full text-left font-sans text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                              currentLevel === lvl.id 
                                ? "bg-brand-blue/20 text-brand-cyan font-semibold" 
                                : "text-slate-300 hover:bg-slate-900/50"
                            }`}
                          >
                            {lvl.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Fullscreen Button */}
                <button 
                  onClick={toggleFullscreen}
                  className="text-white hover:text-brand-blue transition-colors cursor-pointer"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Badge Underneath */}
      <div className="glass-card rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border border-slate-800/40">
        <div className="flex gap-3 items-center">
          <div className="p-2.5 bg-brand-blue/10 rounded-xl border border-brand-blue/10">
            <TvIcon className="w-6 h-6 text-brand-cyan" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-white">{name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Source: <span className="text-brand-cyan hover:underline font-mono text-[11px] select-all cursor-copy">{url.split("?")[0]}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Stream Status:</span>
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> ONLINE
          </span>
        </div>
      </div>
    </div>
  );
}
