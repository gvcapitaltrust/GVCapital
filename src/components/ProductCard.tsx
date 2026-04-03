"use client";

import React from "react";
import { Tier, formatUSD } from "@/lib/tierUtils";
import { Check } from "lucide-react";
import TierMedal from "./TierMedal";

interface ProductCardProps {
  tier: Tier;
  isActive: boolean;
  isQualified: boolean;
  lang: "en" | "zh";
}

export default function ProductCard({ tier, isActive, isQualified, lang }: ProductCardProps) {
  const colorMap: Record<string, string> = {
    zinc: "border-zinc-500/30 text-zinc-400 bg-zinc-500/5",
    slate: "border-slate-400/30 text-slate-300 bg-slate-400/5",
    "gv-gold": "border-gv-gold/50 text-gv-gold bg-gv-gold/5",
    amber: "border-amber-500/50 text-amber-500 bg-amber-500/5",
  };

  const glowMap: Record<string, string> = {
    zinc: "shadow-[0_0_30px_rgba(161,161,170,0.15)]",
    slate: "shadow-[0_0_30px_rgba(148,163,184,0.15)]",
    "gv-gold": "shadow-[0_0_50px_rgba(212,175,55,0.25)]",
    amber: "shadow-[0_0_60px_rgba(245,158,11,0.35)]",
  };

  return (
    <div
      className={`relative flex flex-col p-6 rounded-[32px] border transition-all duration-700 premium-glass ${
        isActive
          ? `${colorMap[tier.color]} scale-[1.05] ${glowMap[tier.color]} z-10 border-opacity-100`
          : "border-white/5 bg-white/5 opacity-50 hover:opacity-80 grayscale hover:grayscale-0"
      }`}
    >
      {isQualified && isActive && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gv-gold text-black text-[9px] font-black px-4 py-1 rounded-full uppercase tracking-[0.2em] shadow-[0_10px_20px_rgba(212,175,55,0.3)] text-center whitespace-nowrap z-20">
          {lang === 'en' ? 'Active Membership' : '当前会员'}
        </div>
      )}

      <div className="flex justify-between items-start mb-6 gap-3">
        <div className="min-w-0 flex-1">
          <h3 className={`text-base xl:text-lg font-black mb-1 uppercase tracking-tight break-words ${isActive ? 'text-white' : 'text-gray-400'}`}>{tier.name}</h3>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
            {tier.id === 'vvip' 
              ? `> ${formatUSD(tier.minAmount)}` 
              : `${formatUSD(tier.minAmount)} - ${formatUSD(tier.maxAmount)}`}
          </p>
        </div>
        <TierMedal tierId={tier.id} size="sm" className={`shrink-0 ${isActive ? 'drop-shadow-[0_0_10px_rgba(212,175,55,0.4)]' : 'grayscale'}`} />
      </div>

      <div className="mb-6 flex flex-col gap-3">
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-black shrink-0 flex items-baseline ${isActive ? 'text-white' : 'text-gray-500'}`}>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mr-2 whitespace-nowrap">
              {tier.id === "silver" ? "min" : "up to"}
            </span>
            {tier.id === "silver" 
              ? `${(tier.minDividend * 100).toFixed(0)}%` 
              : `${(tier.maxDividend * 100).toFixed(0)}%`}
          </span>
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter opacity-60">Monthly</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg border shadow-inner ${isActive ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-white/5 border-white/10 text-gray-500'}`}>
            {tier.lockInDays === 365 ? '12-Month' : '6-Month'} Lock-in
          </span>
        </div>
        
        {tier.yearlyBonus && (
          <div className="flex flex-col gap-1 items-start mt-2">
            <div className={`border px-3 py-1.5 rounded-full flex items-center gap-2 shadow-inner ${isActive ? 'bg-gv-gold/10 border-gv-gold/30 animate-pulse' : 'bg-white/5 border-white/5 opacity-40'}`}>
              <span className={`text-[11px] font-black tracking-widest ${isActive ? 'text-gv-gold' : 'text-gray-500'}`}>
                +{ (tier.yearlyBonus * 100).toFixed(0) }% 
                {tier.id === 'platinum' && '*'}
              </span>
              <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-gv-gold/60' : 'text-gray-600'}`}>Yearly</span>
            </div>
          </div>
        )}
      </div>

      <ul className="space-y-3 flex-1">
        {tier.id === 'platinum' && (
          <li className="flex items-start gap-2 pb-3 border-b border-white/5 mb-3">
            <div className="h-4 w-4 rounded-md bg-gv-gold/20 flex items-center justify-center shrink-0 border border-gv-gold/40">
              <Check className="h-2.5 w-2.5 text-gv-gold" strokeWidth={4} />
            </div>
            <span className="text-[9px] text-gv-gold/80 font-black uppercase tracking-tighter italic leading-tight">
              * 12 MONTH MANDATORY LOCK-IN PERIOD
            </span>
          </li>
        )}
        {tier.benefits.map((benefit, idx) => (
          <li key={idx} className="flex items-start gap-3 group/benefit">
            <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors ${isActive ? 'bg-white/10 text-gv-gold' : 'bg-white/5 text-gray-600 group-hover/benefit:text-gray-400'}`}>
              <Check className="h-2.5 w-2.5" strokeWidth={4} />
            </div>
            <span className={`text-[11px] font-semibold leading-snug transition-colors ${isActive ? 'text-gray-300' : 'text-gray-500 group-hover/benefit:text-gray-400'}`}>{benefit}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
