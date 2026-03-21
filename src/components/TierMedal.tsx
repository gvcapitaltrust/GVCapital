"use client";

import React from "react";
import { Medal, Shield, Star, Trophy, X } from "lucide-react";

interface TierMedalProps {
  tierId: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function TierMedal({ tierId, className = "", size = "md" }: TierMedalProps) {
  const sizeMap = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-20 w-20"
  };

  const getIcon = () => {
    switch (tierId.toLowerCase()) {
      case "platinum":
        return <Trophy className={`${sizeMap[size]} text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]`} />;
      case "gold":
        return <Star className={`${sizeMap[size]} text-gv-gold drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]`} />;
      case "silver":
        return <Medal className={`${sizeMap[size]} text-slate-300 drop-shadow-[0_0_10px_rgba(148,163,184,0.3)]`} />;
      case "none":
        return <X className={`${sizeMap[size]} text-zinc-400`} />;
      default:
        return <Shield className={`${sizeMap[size]} text-zinc-500`} />;
    }
  };

  const getGradient = () => {
    switch (tierId.toLowerCase()) {
      case "platinum":
        return "bg-gradient-to-br from-amber-400 via-amber-600 to-amber-900";
      case "gold":
        return "bg-gradient-to-br from-gv-gold via-[#B8860B] to-[#45362E]";
      case "silver":
        return "bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600";
      case "none":
        return "bg-gradient-to-br from-zinc-800 via-zinc-900 to-black";
      default:
        return "bg-gradient-to-br from-zinc-400 via-zinc-600 to-zinc-800";
    }
  };

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${sizeMap[size].replace('h-', 'h-[calc(').replace('w-', 'w-[calc(').replace(' ', ')] ')} ${
      size === 'sm' ? 'w-6 h-6' : 
      size === 'md' ? 'w-12 h-12' : 
      size === 'lg' ? 'w-16 h-16' : 
      'w-24 h-24'
    } ${className}`}>
      <div className={`absolute inset-0 blur-2xl opacity-20 ${tierId === 'platinum' ? 'bg-amber-500' : tierId === 'gold' ? 'bg-gv-gold' : 'bg-white/10'}`} />
      <div className={`relative rounded-full flex items-center justify-center p-2 border border-white/10 ${getGradient()} shadow-2xl transition-transform duration-500`}>
        {getIcon()}
      </div>
    </div>
  );
}
