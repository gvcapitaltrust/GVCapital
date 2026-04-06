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
  const [amount, setAmount] = useState(currentInvestment > 0 ? currentInvestment : 1000);
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
          <h2 className="text-base md:text-lg font-bold uppercase tracking-tight text-gray-900">{t.title}</h2>
          <p className="text-gray-400 text-xs">{t.subtitle}</p>
        </div>
        <button 
          onClick={onOpenComparison}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
        >
          <Info className="h-3.5 w-3.5" />
          {t.compare}
        </button>
      </div>

      {/* Slider Section */}
      <div className="bg-gray-50 border border-gray-200 p-6 sm:p-8 rounded-2xl shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
          <TrendingUp className="h-40 w-40 text-gv-gold" />
        </div>

        <div className="flex flex-col xl:grid xl:grid-cols-2 gap-8 relative z-10">
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">{t.sliderLabel}</label>
                <div className="flex flex-col items-end">
                  <span className="text-2xl font-black text-gv-gold tracking-tighter">
                    {formatUSD(amount)}
                  </span>
                  <div className="flex items-center gap-1 opacity-60">
                    <span className="text-[9px] font-black text-gv-gold uppercase tracking-widest">≈ RM</span>
                    <span className="text-xs font-black text-slate-900 tabular-nums">{(amount * forexRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="15000"
                step="100"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gv-gold hover:accent-gv-gold/80 transition-all"
              />
              <div className="flex justify-between text-[8px] font-black text-gray-400 uppercase tracking-widest pt-1">
                <span>$0</span>
                <span>$7,500</span>
                <span>$15,000+</span>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-4 rounded-xl flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{t.monthlyReturn}</p>
                <div className="flex flex-col">
                  <p className="text-lg font-black text-emerald-500 tracking-tight">
                    <span className="text-xs font-normal opacity-60 mr-1">up to</span>
                    {formatUSD(dividendRange.max)}
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
                <p className="text-gray-500 text-[9px] font-medium uppercase tracking-widest">{t.currentTier}</p>
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center justify-center gap-2">
                    <TierMedal tierId={currentInvestment > 0 ? qualifiedTier.id : "none"} size="sm" />
                    <span className="text-gray-900 text-xs font-black uppercase tracking-tight">
                      {currentInvestment > 0 ? qualifiedTier.name.replace(/ package/gi, '') : t.noTier}
                    </span>
                  </div>
                  {currentInvestment > 0 && qualifiedTier.yearlyBonus && (
                    <div className="flex flex-col items-center gap-1">
                      <div className="bg-gv-gold/10 border border-gv-gold/30 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                        <span className="text-gv-gold text-[8px] font-black">+{ (qualifiedTier.yearlyBonus * 100).toFixed(0) }% Yearly Bonus</span>
                      </div>
                      {qualifiedTier.id === 'platinum' && (
                        <p className="text-[7px] font-bold text-gv-gold/60 uppercase tracking-tighter italic whitespace-nowrap leading-none mt-0.5">
                          * 12 months lock-in period is required
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {amount > currentInvestment && (
                <div className="pt-2 border-t border-gv-gold/10 w-full">
                  <p className="text-[9px] text-gv-gold/60 font-black uppercase">{t.potentialUpgrade}</p>
                  <p className="text-gray-900 text-xs font-bold italic">
                    {t.increaseBy} {formatUSD(amount - currentInvestment)} {t.toReach} {activeTier.name.replace(/ package/gi, '')}
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
