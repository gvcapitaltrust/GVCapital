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
    zinc: "border-zinc-500/30 text-zinc-400",
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
          ? `${colorMap[tier.color]} bg-[#1a1a1a] scale-[1.02] ${glowMap[tier.color]} z-10`
          : "border-white/5 bg-[#111] opacity-60 hover:opacity-100"
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
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
            {`${formatUSD(tier.minAmount)} - ${formatUSD(tier.maxAmount)}`}
          </p>
        </div>
        <TierMedal tierId={tier.id} size="sm" className="shrink-0" />
      </div>

      <div className="mb-4 flex items-baseline gap-1">
        <span className="text-xl font-black text-white shrink-0 flex items-baseline">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mr-1 whitespace-nowrap">
            {tier.id === "silver" ? "min" : "up to"}
          </span>
          {tier.id === "silver" 
            ? `${(tier.minDividend * 100).toFixed(0)}%` 
            : `${(tier.maxDividend * 100).toFixed(0)}%`}
        </span>
        <span className="text-[9px] font-bold text-zinc-500 ml-0.5 uppercase">Monthly</span>
      </div>

      <ul className="space-y-2 flex-1">
        {tier.benefits.map((benefit, idx) => (
          <li key={idx} className="flex items-start gap-1.5">
            <Check className={`h-3 w-3 mt-0.5 shrink-0 ${isActive ? 'text-gv-gold' : 'text-zinc-600'}`} />
            <span className="text-[11px] text-zinc-400 font-medium leading-tight">{benefit}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
