"use client";

import React from "react";
import { Tier, formatUSD } from "@/lib/tierUtils";
import { Check } from "lucide-react";
import TierMedal from "./TierMedal";

interface ProductCardProps {
  tier: Tier;
  isActive: boolean;
  isQualified: boolean;
}

export default function ProductCard({ tier, isActive, isQualified }: ProductCardProps) {
  const colorMap: Record<string, string> = {
    zinc: "border-zinc-500/30 text-gray-500",
    slate: "border-slate-400/30 text-slate-300",
    "gv-gold": "border-gv-gold/50 text-gv-gold",
    amber: "border-amber-500/50 text-amber-500",
  };

  const glowMap: Record<string, string> = {
    zinc: "shadow-[0_0_20px_rgba(161,161,170,0.1)]",
    slate: "shadow-[0_0_20px_rgba(148,163,184,0.1)]",
    "gv-gold": "shadow-[0_0_30px_rgba(212,175,55,0.2)]",
    amber: "shadow-[0_0_40px_rgba(245,158,11,0.3)]",
  };

  return (
    <div
      className={`relative flex flex-col p-4 rounded-xl border transition-all duration-500 ${
        isActive
          ? `${colorMap[tier.color]} bg-gray-50 scale-[1.02] ${glowMap[tier.color]} z-10`
          : "border-gray-200 bg-white opacity-60 hover:opacity-100"
      }`}
    >
      {isQualified && isActive && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gv-gold text-black text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest shadow-md text-center whitespace-nowrap">
          Current Tier
        </div>
      )}

      <div className="flex justify-between items-start mb-3 gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm xl:text-base font-black mb-0.5 uppercase tracking-tight break-words">{tier.name}</h3>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
            {tier.id === 'vvip' 
              ? `> ${formatUSD(tier.minAmount)}` 
              : `${formatUSD(tier.minAmount)} - ${formatUSD(tier.maxAmount)}`}
          </p>
        </div>
        <TierMedal tierId={tier.id} size="sm" className="shrink-0" />
      </div>

      <div className="mb-4 flex flex-col gap-1">
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black text-gray-900 shrink-0 flex items-baseline">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mr-1 whitespace-nowrap">
              {tier.id === "silver" ? "min" : "up to"}
            </span>
            {tier.id === "silver" 
              ? `${(tier.minDividend * 100).toFixed(0)}%` 
              : `${(tier.maxDividend * 100).toFixed(0)}%`}
          </span>
          <span className="text-[9px] font-bold text-gray-400 ml-0.5 uppercase tracking-tighter">Monthly Dividend</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-black text-amber-500/80 uppercase tracking-[0.2em] bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
            {tier.lockInDays === 365 ? '12-Month' : '6-Month'} Lock-in
          </span>
        </div>
        
        {tier.yearlyBonus && (
          <div className="flex flex-col gap-1 items-start mt-1">
            <div className="bg-gv-gold/10 border border-gv-gold/30 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
              <span className="text-gv-gold text-[10px] font-black">
                +{ (tier.yearlyBonus * 100).toFixed(0) }% 
                {tier.id === 'platinum' && '*'}
              </span>
              <span className="text-gv-gold/60 text-[7px] font-black uppercase tracking-widest">Yearly</span>
            </div>
          </div>
        )}
      </div>

      <ul className="space-y-2 flex-1">
        {tier.id === 'platinum' && (
          <li className="flex items-start gap-1.5 pb-2 border-b border-gray-200 mb-2">
            <div className="h-4 w-4 rounded-md bg-gv-gold/10 flex items-center justify-center shrink-0">
              <Check className="h-2.5 w-2.5 text-gv-gold" />
            </div>
            <span className="text-[8px] text-gv-gold font-bold uppercase tracking-tighter italic">
              * 12 months lock-in period is required
            </span>
          </li>
        )}
        {tier.benefits.map((benefit, idx) => (
          <li key={idx} className="flex items-start gap-1.5">
            <Check className={`h-3 w-3 mt-0.5 shrink-0 ${isActive ? 'text-gv-gold' : 'text-gray-500'}`} />
            <span className="text-[11px] text-gray-500 font-medium leading-tight">{benefit}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
