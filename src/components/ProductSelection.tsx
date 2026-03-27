"use client";

import React, { useState, useEffect } from "react";
import { TIERS, getTierByAmount, calculateDividendRange, formatUSD } from "@/lib/tierUtils";
import ProductCard from "./ProductCard";
import TierMedal from "./TierMedal";
import { Info, TrendingUp, Wallet } from "lucide-react";

interface ProductSelectionProps {
  currentInvestment: number;
  onSelect?: (amount: number) => void;
  lang: "en" | "zh";
  onOpenComparison: () => void;
  forexRate: number;
}

export default function ProductSelection({ 
  currentInvestment, 
  onSelect, 
  lang, 
  onOpenComparison,
  forexRate 
}: ProductSelectionProps) {
  const [amount, setAmount] = useState(Math.max(1, currentInvestment));
  const activeTier = getTierByAmount(amount);
  const qualifiedTier = getTierByAmount(currentInvestment);
  const dividendRange = calculateDividendRange(amount, activeTier);

  const t = {
    en: {
      title: "Choose Your Investment Plan",
      subtitle: "Select an amount to see your tier and estimated returns",
      sliderLabel: "Investment Amount (USD)",
      monthlyReturn: "Estimated Monthly Return",
      compare: "Compare Tiers",
      cta: "Proceed to Deposit",
      currentTier: "Current Tier",
      noTier: "No Tier",
      potentialUpgrade: "Potential Upgrade",
      increaseBy: "Increase by",
      toReach: "to reach"
    },
    zh: {
      title: "选择您的投资计划",
      subtitle: "选择金额以查看您的等级和预计回报",
      sliderLabel: "投资金额 (USD)",
      monthlyReturn: "预计每月回报",
      compare: "比较等级",
      cta: "前往入金",
      currentTier: "当前等级",
      noTier: "无等级",
      potentialUpgrade: "潜在升级",
      increaseBy: "增加",
      toReach: "即可达到"
    }
  }[lang];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-0.5">
          <h2 className="text-base md:text-lg font-bold uppercase tracking-tight text-white">{t.title}</h2>
          <p className="text-zinc-500 text-xs">{t.subtitle}</p>
        </div>
        <button 
          onClick={onOpenComparison}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <Info className="h-3.5 w-3.5" />
          {t.compare}
        </button>
      </div>

      {/* Slider Section */}
      <div className="bg-[#1a1a1a] border border-white/5 p-6 sm:p-8 rounded-2xl shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
          <TrendingUp className="h-40 w-40 text-gv-gold" />
        </div>

        <div className="flex flex-col xl:grid xl:grid-cols-2 gap-8 relative z-10">
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">{t.sliderLabel}</label>
                <div className="flex flex-col items-end">
                  <span className="text-2xl font-black text-gv-gold tracking-tighter">
                    {formatUSD(amount)}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-500">
                    ≈ RM {(amount * forexRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="100000"
                step="100"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-gv-gold"
              />
              <div className="flex justify-between text-[8px] font-black text-zinc-700 uppercase tracking-widest">
                <span>$1</span>
                <span>$50,000</span>
                <span>$100,000+</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">{t.monthlyReturn}</p>
                <div className="flex flex-col">
                  <p className="text-lg font-black text-emerald-500 tracking-tight">
                    <span className="text-xs font-normal opacity-60 mr-1">up to</span>
                    {formatUSD(dividendRange.max)}
                  </p>
                  <p className="text-[9px] font-bold text-emerald-500/60 uppercase">
                    ≈ up to RM {(dividendRange.max * forexRate).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="bg-gv-gold/10 border border-gv-gold/20 p-5 rounded-xl space-y-3 w-full flex flex-col items-center text-center">
              <div className="flex items-center gap-3 text-gv-gold">
                <Wallet className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Investment Summary</span>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-400 text-[9px] font-medium uppercase tracking-widest">{t.currentTier}</p>
                <div className="flex items-center justify-center gap-2">
                  <TierMedal tierId={currentInvestment > 0 ? qualifiedTier.id : "none"} size="sm" />
                  <span className="text-white text-xs font-black uppercase tracking-tight">
                    {currentInvestment > 0 ? qualifiedTier.name.replace(/ package/gi, '') : t.noTier}
                  </span>
                </div>
              </div>
              {amount > currentInvestment && (
                <div className="pt-2 border-t border-gv-gold/10 w-full">
                  <p className="text-[9px] text-gv-gold/60 font-black uppercase">{t.potentialUpgrade}</p>
                  <p className="text-white text-xs font-bold italic">
                    {t.increaseBy} {formatUSD(amount - currentInvestment)} (≈ RM {((amount - currentInvestment) * forexRate).toLocaleString()}) {t.toReach} {activeTier.name.replace(/ package/gi, '')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TIERS.map((tier) => (
          <ProductCard
            key={tier.id}
            tier={tier}
            isActive={activeTier.id === tier.id}
            isQualified={currentInvestment > 0 && qualifiedTier.id === tier.id}
          />
        ))}
      </div>
    </div>
  );
}
