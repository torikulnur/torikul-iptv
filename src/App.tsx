/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { 
  Tv, 
  Search, 
  Heart, 
  Clock, 
  ChevronRight, 
  Sparkles, 
  LayoutGrid, 
  Radio, 
  Info, 
  TrendingUp, 
  Flame, 
  Moon, 
  Globe, 
  RefreshCw, 
  Filter, 
  Plus, 
  Check, 
  X,
  TvIcon,
  Play
} from "lucide-react";
import { IPTVChannel, PlaybackHistoryItem } from "./types";
import HLSPlayer from "./components/HLSPlayer";
import HeroSlider from "./components/HeroSlider";

export default function App() {
  // State elements
  const [channels, setChannels] = useState<IPTVChannel[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]); // Sourced by URL
  const [recentlyWatched, setRecentlyWatched] = useState<PlaybackHistoryItem[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search and filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("All Regions");
  const [activeSidebar, setActiveSidebar] = useState<string>("All Channels");
  
  // Active playing stream
  const [selectedChannel, setSelectedChannel] = useState<IPTVChannel | null>(null);

  // Clock state
  const [liveClock, setLiveClock] = useState("");

  useEffect(() => {
    // 24-hr Real-Time Clock matching local zone query (UTC 2026)
    const updateTime = () => {
      const now = new Date();
      setLiveClock(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch playlist on mount
  useEffect(() => {
    const fetchChannels = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const response = await fetch("https://raw.githubusercontent.com/foridul422/IPTV-/main/channels.json");
        if (!response.ok) {
          throw new Error(`Server returned status: ${response.status}`);
        }
        const data = await response.json();
        
        if (Array.isArray(data)) {
          // Clean empty or invalid records
          const cleanedData = data
            .filter((item: any) => item && item.name && item.url)
            .map((item: any) => ({
              name: item.name.trim(),
              logo: item.logo || "",
              group: item.group || "Channels",
              url: item.url.trim(),
            }));
          
          setChannels(cleanedData);

          // Select first Bangla or General channel as default stream
          const banglaDefault = cleanedData.find(c => c.group.toLowerCase() === "bangla");
          setSelectedChannel(banglaDefault || cleanedData[0] || null);
        } else {
          throw new Error("Invalid structure: Expected standard channel entries array");
        }
      } catch (err: any) {
        console.error("Fetch failure: ", err);
        setErrorMsg("Failed to synchronize iptv live database. Please check your network connection or try manually reloading.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchChannels();
  }, []);

  // Sync favorites & recentlyWatched with localStorage
  useEffect(() => {
    const savedFavs = localStorage.getItem("torikul_iptv_favorites");
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (e) {
        console.warn("Fav parse error:", e);
      }
    }

    const savedHistory = localStorage.getItem("torikul_iptv_history");
    if (savedHistory) {
      try {
        setRecentlyWatched(JSON.parse(savedHistory));
      } catch (e) {
        console.warn("History parse error:", e);
      }
    }
  }, []);

  const handleFavoriteToggle = (channelUrl: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const updated = favorites.includes(channelUrl)
      ? favorites.filter((url) => url !== channelUrl)
      : [...favorites, channelUrl];
    
    setFavorites(updated);
    localStorage.setItem("torikul_iptv_favorites", JSON.stringify(updated));
  };

  const handlePlayChannel = (channel: IPTVChannel) => {
    setSelectedChannel(channel);

    // Save into history
    const newItem: PlaybackHistoryItem = {
      name: channel.name,
      logo: channel.logo,
      group: channel.group,
      url: channel.url,
      playedAt: Date.now(),
    };

    const trimmedHistory = recentlyWatched.filter((item) => item.url !== channel.url);
    const newHistory = [newItem, ...trimmedHistory].slice(0, 8); // Keep top 8 recently watched
    setRecentlyWatched(newHistory);
    localStorage.setItem("torikul_iptv_history", JSON.stringify(newHistory));

    // Scroll to player smoothly on mobile/desktop
    const playerEl = document.getElementById("iptv-player-container");
    if (playerEl) {
      playerEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleClearHistory = () => {
    setRecentlyWatched([]);
    localStorage.removeItem("torikul_iptv_history");
  };

  // Compile unique countries or regions from dataset (groups that represent country flags)
  const uniqueGroups = useMemo(() => {
    const allGroups = channels.map((c) => c.group);
    const set = new Set(allGroups);
    // Sort logically and remove typical genre classifications to extract countries
    return Array.from(set).sort();
  }, [channels]);

  // Filters calculation
  const filteredChannels = useMemo(() => {
    let result = channels;

    // 1. Sidebar classification filter
    if (activeSidebar !== "All Channels") {
      if (activeSidebar === "Favorites") {
        result = result.filter((c) => favorites.includes(c.url));
      } else {
        result = result.filter((chan) => {
          const groupName = (chan.group || "").toLowerCase();
          const chanName = (chan.name || "").toLowerCase();

          if (activeSidebar === "Sports") {
            return (
              groupName.includes("sports") ||
              groupName.includes("ipl") ||
              groupName.includes("psl") ||
              chanName.includes("sports") ||
              chanName.includes("t sports") ||
              chanName.includes("beIN") ||
              chanName.includes("cricket")
            );
          }
          if (activeSidebar === "Movies") {
            return (
              groupName.includes("movie") ||
              groupName.includes("movies") ||
              groupName.includes("drama") ||
              groupName.includes("vod") ||
              chanName.includes("movie") ||
              chanName.includes("cinema") ||
              chanName.includes("action")
            );
          }
          if (activeSidebar === "News") {
            return (
              groupName.includes("news") ||
              groupName.includes("business") ||
              groupName.includes("weather") ||
              chanName.includes("news") ||
              chanName.includes("cnn") ||
              chanName.includes("bbc")
            );
          }
          if (activeSidebar === "Kids") {
            return (
              groupName.includes("kids") ||
              groupName.includes("cartoon") ||
              groupName.includes("duronto") ||
              chanName.includes("disney") ||
              chanName.includes("kids") ||
              chanName.includes("baby")
            );
          }
          if (activeSidebar === "Music") {
            return (
              groupName.includes("music") ||
              groupName.includes("song") ||
              chanName.includes("music") ||
              chanName.includes("song")
            );
          }
          return true;
        });
      }
    }

    // 2. Region/Country custom filter
    if (selectedCountry !== "All Regions") {
      result = result.filter((c) => c.group === selectedCountry);
    }

    // 3. Instant search text filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.group.toLowerCase().includes(query)
      );
    }

    return result;
  }, [channels, activeSidebar, selectedCountry, searchQuery, favorites]);

  // Stats Counters
  const groupStats = useMemo(() => {
    const stats: Record<string, number> = {
      Bangla: 0,
      Sports: 0,
      News: 0,
      Movies: 0,
      Kids: 0,
      Music: 0,
    };

    channels.forEach((chan) => {
      const g = (chan.group || "").toLowerCase();
      const n = (chan.name || "").toLowerCase();
      
      if (g.includes("bangla")) stats["Bangla"]++;
      if (g.includes("sports") || g.includes("ipl") || g.includes("psl")) stats["Sports"]++;
      if (g.includes("news")) stats["News"]++;
      if (g.includes("movie") || g.includes("movies") || g.includes("vod")) stats["Movies"]++;
      if (g.includes("kids") || g.includes("cartoon")) stats["Kids"]++;
      if (g.includes("music")) stats["Music"]++;
    });

    return stats;
  }, [channels]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-all duration-300 antialiased relative">
      
      {/* Background Decorative Mesh Gradients */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-blue/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-brand-cyan/5 rounded-full blur-[150px] pointer-events-none z-0"></div>
      <div className="absolute bottom-10 right-1/3 w-80 h-80 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Top Banner Accessor Notice (Sticky Header) */}
      <header className="sticky top-0 z-50 glass-card bg-slate-950/80 border-b border-slate-900/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          
          {/* Logo Brand Title */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="p-2 bg-gradient-to-tr from-brand-blue to-brand-cyan rounded-xl shadow-lg shadow-blue-500/25">
                <Tv className="w-5 h-5 text-white stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <h1 className="font-display font-extrabold text-white text-lg tracking-tight leading-none flex items-center gap-1.5">
                  TORIKUL- <span className="bg-gradient-to-r from-brand-blue to-cyan-400 bg-clip-text text-transparent">IPTV</span>
                </h1>
                <span className="text-[9px] tracking-widest text-slate-400 font-bold uppercase mt-0.5">PREMIUM PORTAL</span>
              </div>
            </div>

            <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-400">
              <button 
                onClick={() => { setActiveSidebar("All Channels"); setSelectedCountry("All Regions"); }} 
                className={`hover:text-white transition-colors cursor-pointer ${activeSidebar === "All Channels" && selectedCountry === "All Regions" ? "text-brand-blue font-semibold" : ""}`}
              >
                Home
              </button>
              <button 
                onClick={() => setActiveSidebar("Movies")} 
                className={`hover:text-white transition-colors cursor-pointer ${activeSidebar === "Movies" ? "text-brand-blue font-semibold" : ""}`}
              >
                Movies
              </button>
              <button 
                onClick={() => setActiveSidebar("Sports")} 
                className={`hover:text-white transition-colors cursor-pointer ${activeSidebar === "Sports" ? "text-brand-blue font-semibold" : ""}`}
              >
                Sports Live
              </button>
              <button 
                onClick={() => setActiveSidebar("News")} 
                className={`hover:text-white transition-colors cursor-pointer ${activeSidebar === "News" ? "text-brand-blue font-semibold" : ""}`}
              >
                Live News
              </button>
            </nav>
          </div>

          {/* Centered Desktop Universal Search */}
          <div className="hidden md:flex flex-1 max-w-md relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search 1,200+ Live channels, genres, categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-2.5 rounded-full bg-slate-900/80 border border-slate-800/80 text-white placeholder-slate-400 outline-none transition-all focus:border-brand-blue/60 focus:ring-2 focus:ring-brand-blue/15"
              id="iptv-search-bar"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Header Controls (Clock + Channel Counter) */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Live channels indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/50 border border-slate-800 text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-300">Live Channels:</span>
              <span className="text-emerald-400 font-bold">{channels.length}</span>
            </div>

            {/* Smart Digital Clock matching current local year */}
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-905 bg-brand-blue/10 border border-brand-blue/20 shadow-md">
              <Clock className="w-3.5 h-3.5 text-brand-cyan" />
              <span className="text-xs font-mono font-bold text-brand-cyan tracking-wider">{liveClock || "18:19:11"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6 w-full z-10">
        
        {/* Left Sidebar Panel - Desktop Menu */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-5">
          
          {/* Main Navigation Sidebar Links */}
          <div className="glass-card rounded-2xl p-4 flex flex-col gap-1.5 border border-slate-800/40">
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-2 py-1 flex items-center justify-between">
              Browse Categories
              <span className="text-brand-blue text-[11px] font-mono lowercase">v2.6</span>
            </h3>

            {[
              { label: "All Channels", count: channels.length },
              { label: "Sports", count: groupStats["Sports"] },
              { label: "Movies", count: groupStats["Movies"] },
              { label: "News", count: groupStats["News"] },
              { label: "Kids", count: groupStats["Kids"] },
              { label: "Music", count: groupStats["Music"] },
              { label: "Favorites", count: favorites.length, icon: Heart, iconColor: "text-red-500 fill-red-500" }
            ].map((item) => {
              const isActive = activeSidebar === item.label;
              const Icon = item.icon || Radio;
              
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    setActiveSidebar(item.label);
                    // Reset pagination/scroll parameters of lists if required
                  }}
                  className={`flex items-center justify-between w-full text-left font-sans text-xs px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? "bg-gradient-to-r from-brand-blue to-brand-cyan text-white font-semibold shadow-md shadow-brand-blue/15 translate-x-1" 
                      : "text-slate-300 hover:bg-slate-900/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : item.iconColor || "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-900 text-slate-400"
                  }`}>
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick country filters dropdown inside left sidebar */}
          <div className="glass-card rounded-2xl p-4 flex flex-col gap-2 border border-slate-800/40">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider px-1">
              <Globe className="w-3 h-3 text-slate-400" />
              <span>Filter by Region</span>
            </div>

            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-slate-100 placeholder-slate-400 outline-none cursor-pointer focus:border-brand-blue"
            >
              <option value="All Regions">All Regions ({channels.length})</option>
              {uniqueGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Stat metrics widgets */}
          <div className="glass-card rounded-2xl p-4 flex flex-col gap-3.5 border border-slate-800/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-cyan/5 rounded-full blur-2xl pointer-events-none"></div>
            
            <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-brand-cyan" />
              Platform Statistics
            </h4>
            
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/40">
                <span className="text-[10px] text-slate-400 block font-light">Categorized</span>
                <span className="text-sm font-display font-bold text-white mt-0.5">{uniqueGroups.length} Groups</span>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/40">
                <span className="text-[10px] text-slate-400 block font-light">Status Link</span>
                <span className="text-sm font-display font-medium text-emerald-400 mt-0.5">99.7% Online</span>
              </div>
            </div>

            <div className="mt-1 flex items-center gap-2 p-2 bg-slate-900/20 rounded-xl border border-slate-800/30">
              <Sparkles className="w-4 h-4 text-brand-cyan shrink-0 animate-bounce" />
              <p className="text-[10px] text-slate-400 leading-normal font-light">
                Autoplay is enabled. Click any channels on the grid side to immediately launch stream.
              </p>
            </div>

            {/* Premium Plan remaining duration card from theme */}
            <div className="mt-2 pt-2 border-t border-slate-900/60">
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-xl p-3.5 border border-slate-800/80">
                <p className="text-[10px] text-slate-400 mb-0.5 font-light">Premium Plan Account</p>
                <p className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Expires 24 Dec 2026</span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase font-bold">Active</span>
                </p>
                <div className="w-full bg-slate-800 h-1 mt-2.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-brand-blue to-teal-400 h-full w-[70%]"></div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Central Display & Queue System */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          
          {/* Dynamic Interactive Video Player */}
          {selectedChannel ? (
            <div className="w-full">
              <HLSPlayer 
                url={selectedChannel.url} 
                name={selectedChannel.name} 
                logo={selectedChannel.logo} 
                group={selectedChannel.group} 
              />
            </div>
          ) : (
            <div className="w-full aspect-video rounded-2xl bg-slate-900 flex flex-col items-center justify-center gap-3 border border-slate-800 p-8 text-center">
              <TvIcon className="w-12 h-12 text-slate-600 animate-pulse" />
              <div>
                <h4 className="font-display font-bold text-white text-base">No Channel Selected</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">Select any stream card in the channels list below to begin high-speed live playback.</p>
              </div>
            </div>
          )}

          {/* Hero sliders (Prominent curated channel streams with sliding banners) */}
          <HeroSlider 
            channels={channels}
            onPlayChannel={handlePlayChannel} 
          />

          {/* Mobile Search Row (Only visible on small devices) */}
          <div className="md:hidden w-full flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-10 pr-4 py-3 rounded-full bg-slate-900 border border-slate-800 text-white placeholder-slate-400 outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Recently Played Tray (Persistent memory drawer) */}
          {recentlyWatched.length > 0 && (
            <div className="glass-card rounded-2xl p-4 border border-slate-800/40">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-cyan" />
                  <h3 className="font-display font-extrabold text-sm text-white">Recently Watched Streams</h3>
                </div>
                <button 
                  onClick={handleClearHistory}
                  className="text-[10px] text-slate-400 hover:text-red-400 font-mono tracking-wider items-center gap-1 border border-slate-800 hover:border-red-500/20 px-2.5 py-1 rounded-lg bg-slate-950/20 transition-all cursor-pointer"
                >
                  Clear History
                </button>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-1 Scrollbar-hide">
                {recentlyWatched.map((item) => (
                  <button
                    key={item.url + "_" + item.playedAt}
                    onClick={() => handlePlayChannel(item)}
                    className="flex items-center gap-3 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/50 hover:border-brand-blue/30 p-2 rounded-xl shrink-0 transition-all text-left group max-w-[190px] cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-950 p-1 flex items-center justify-center border border-slate-800 overflow-hidden relative">
                      {item.logo ? (
                        <img 
                          src={item.logo} 
                          alt={item.name} 
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(item.name)}`;
                          }} 
                        />
                      ) : (
                        <Tv className="w-4 h-4 text-brand-blue" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="font-display font-medium text-xs text-white line-clamp-1 group-hover:text-brand-cyan transition-colors">{item.name}</h4>
                      <p className="text-[9px] text-slate-400 line-clamp-1 font-mono">{item.group}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Channels Matrix Grid Header */}
          <div className="flex flex-col gap-4">
            
            {/* Filter tags title summary */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display font-extrabold text-lg text-white leading-tight tracking-tight flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-brand-blue" />
                  <span>{activeSidebar} Playlist</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Showing {filteredChannels.length} streams in {selectedCountry === "All Regions" ? "all regions" : selectedCountry}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 hidden sm:inline">Regions:</span>
                <span className="text-xs bg-slate-900 border border-slate-800 text-brand-cyan px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wide">
                  {selectedCountry}
                </span>
              </div>
            </div>

            {/* Grid display layout */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" id="skeleton-loader-channels">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-2xl p-4 border border-slate-800/30 animate-pulse flex flex-col gap-3">
                    <div className="w-full aspect-video rounded-xl bg-slate-905 bg-slate-900/80"></div>
                    <div className="h-3 bg-slate-800 rounded w-2/3"></div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="h-2.5 bg-slate-800 rounded w-1/3"></div>
                      <div className="h-5 w-5 rounded-full bg-slate-800"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : errorMsg ? (
              <div className="glass-card rounded-2xl p-8 border border-red-500/20 text-center flex flex-col items-center justify-center gap-4">
                <Info className="w-12 h-12 text-red-400" />
                <div>
                  <h3 className="font-display font-bold text-white text-base">Synchronize Failure</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm ml-auto mr-auto leading-relaxed">{errorMsg}</p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 text-white font-semibold rounded-xl text-xs transition-all shadow-lg shadow-rose-500/25 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Retry Connection
                </button>
              </div>
            ) : filteredChannels.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 border border-slate-800/40 text-center flex flex-col items-center justify-center gap-4">
                <Search className="w-12 h-12 text-slate-500 animate-bounce" />
                <div>
                  <h3 className="font-display font-semibold text-white text-base">No Matching Live Channels Found</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md ml-auto mr-auto leading-relaxed">
                    We couldn't locate any channels for "{searchQuery || activeSidebar}". Try selecting another category, changing the group filter or resetting queries.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCountry("All Regions");
                    setActiveSidebar("All Channels");
                  }}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-brand-cyan font-semibold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Reset Filtration Metrics
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" id="channels-matrix-grid">
                {filteredChannels.map((channel) => {
                  const isFav = favorites.includes(channel.url);
                  const isCurrent = selectedChannel?.url === channel.url;
                  
                  return (
                    <div
                      key={channel.url + "_" + channel.name}
                      onClick={() => handlePlayChannel(channel)}
                      className={`glass-card glass-card-hover rounded-2xl p-3.5 flex flex-col gap-2.5 border relative group cursor-pointer transition-all duration-300 ${
                        isCurrent 
                          ? "border-brand-blue/80 ring-2 ring-brand-blue/20 bg-slate-900/60 scale-100 shadow-xl shadow-brand-blue/10" 
                          : "border-slate-800/30"
                      }`}
                    >
                      {/* Logo Frame Box */}
                      <div className="w-full aspect-video rounded-xl bg-slate-950 p-2.5 flex items-center justify-center border border-slate-900 overflow-hidden relative shadow-inner">
                        {channel.logo ? (
                          <img 
                            src={channel.logo} 
                            alt={channel.name} 
                            loading="lazy"
                            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              // If image logo URL fails, replace with dicebear dynamic elegant profile identity placeholder
                              e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(channel.name)}`;
                            }}
                          />
                        ) : (
                          <Tv className="w-8 h-8 text-brand-blue" />
                        )}

                        {/* Hover Overlay Play Icon */}
                        <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                          <div className="p-3 bg-brand-blue text-white rounded-full scale-75 group-hover:scale-100 transition-transform duration-300 shadow-lg shadow-blue-500/40">
                            <Play className="w-5 h-5 fill-white translate-x-0.5" />
                          </div>
                        </div>

                        {/* Top floating absolute elements */}
                        <div className="absolute top-1.5 inset-x-1.5 flex items-center justify-between z-10">
                          {/* Live Indicator Dot */}
                          <span className="flex items-center gap-1 bg-slate-950/80 text-red-400 font-mono text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                            <span className="w-1 h-1 rounded-full bg-red-500 animate-ping"></span> LIVE
                          </span>

                          {/* Country/Group Flag Badge */}
                          <span className="text-[8px] bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/20 px-1.5 py-0.5 rounded-md font-mono line-clamp-1 max-w-[80px]">
                            {channel.group}
                          </span>
                        </div>
                      </div>

                      {/* Info Block panel */}
                      <div className="flex flex-col flex-1 justify-between gap-1">
                        <div>
                          <h4 className="font-display font-extrabold text-xs text-white line-clamp-1 group-hover:text-brand-blue transition-colors leading-tight">
                            {channel.name}
                          </h4>
                          <span className="text-[9px] text-slate-400 mt-0.5 font-light block">
                            Region: {channel.group || "Global"}
                          </span>
                        </div>

                        {/* Item Footer - Favorite Action & Live Watch Trigger */}
                        <div className="flex items-center justify-between gap-2 border-t border-slate-900/60 pt-2 mt-1">
                          <span className="text-[10px] text-brand-cyan/90 font-mono tracking-wide font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Stream Live
                          </span>

                          <button
                            onClick={(e) => handleFavoriteToggle(channel.url, e)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer group-favorite-button"
                            title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isFav ? "text-red-500 fill-red-500" : "text-slate-400 group-hover:text-red-500"}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Persistent Mobile Bottom Navigation (User Request: Home/All, Sports, Movies, News, Favorites) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-slate-950/95 border-t border-slate-900 z-50 py-2.5 px-4 flex justify-around items-center backdrop-blur bg-opacity-95">
        {[
          { label: "Home", active: "All Channels", icon: Radio },
          { label: "Sports", active: "Sports", icon: Radio },
          { label: "Movies", active: "Movies", icon: Radio },
          { label: "News", active: "News", icon: Radio },
          { label: "Favorites", active: "Favorites", icon: Heart, iconColor: "text-red-500 fill-red-500" }
        ].map((item) => {
          const isActive = activeSidebar === item.active;
          const Icon = item.icon;
          
          return (
            <button
              key={item.label}
              onClick={() => {
                setActiveSidebar(item.active);
                // Also scroll slightly above player for direct viewing
                const header = document.querySelector("header");
                if (header) header.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex flex-col items-center gap-1 text-[10px] outline-none relative py-1 hover:text-white"
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-brand-cyan" : "text-slate-400"}`} />
              <span className={isActive ? "text-brand-cyan font-bold" : "text-slate-500"}>{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-4 h-0.5 bg-brand-cyan rounded-full"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Large Spacer before Mobile Sticky Navbar */}
      <div className="h-16 md:hidden"></div>

      {/* Footer Element */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 mt-12 z-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg">
              <Tv className="w-4 h-4 text-brand-blue" />
            </div>
            <h5 className="font-display font-extrabold text-sm text-white">
              TORIKUL- <span className="text-brand-cyan">IPTV</span>
            </h5>
          </div>
          <p className="text-xs text-slate-400 font-light">
            Premium IPTV Streaming Platform &bull; Copyright &copy; 2026. All stream protocols sourced dynamically.
          </p>
          <div className="flex gap-4 text-[11px] text-slate-400 font-mono">
            <span className="hover:text-brand-cyan transition-colors">v2.6 Stable Build</span>
            <span>&bull;</span>
            <span className="hover:text-brand-cyan transition-colors">Terms of Use</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
