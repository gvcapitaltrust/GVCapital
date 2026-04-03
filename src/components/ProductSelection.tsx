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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter text-white">{t.title}</h2>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest opacity-80">{t.subtitle}</p>
        </div>
        <button 
          onClick={onOpenComparison}
          className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-white hover:bg-white/10 hover:border-gv-gold/30 hover:-translate-y-1 transition-all shadow-sm"
        >
          <Info className="h-4 w-4" />
          {t.compare}
        </button>
      </div>

      {/* Slider Section */}
      <div className="premium-glass bg-black/40 border-gv-gold/10 p-8 sm:p-12 rounded-[48px] shadow-[0_30px_60px_rgba(0,0,0,0.4)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gv-gold/5 blur-[120px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-1000"></div>
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity rotate-12 group-hover:rotate-0 duration-1000">
          <TrendingUp className="h-48 w-48 text-gv-gold" />
        </div>

        <div className="flex flex-col xl:grid xl:grid-cols-2 gap-8 relative z-10">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-end px-1">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gv-gold/60">{t.sliderLabel}</label>
                <div className="flex flex-col items-end">
                  <span className="text-3xl font-black text-white tracking-tighter animate-in fade-in zoom-in-95 duration-300">
                    {formatUSD(amount)}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="15000"
                step="100"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value))}
                className="w-full h-2.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-gv-gold hover:accent-gv-gold/80 transition-all shadow-inner"
              />
              <div className="flex justify-between text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] pt-2 px-1">
                <span>$0</span>
                <span className="text-gv-gold/40">$7,500</span>
                <span>$15,000+</span>
              </div>
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-[28px] flex items-center gap-6 backdrop-blur-md shadow-inner group/return overflow-hidden relative">
              <div className="absolute inset-0 bg-emerald-500/5 blur-3xl opacity-0 group-hover/return:opacity-100 transition-opacity"></div>
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)] relative z-10 transition-transform group-hover/return:scale-110">
                <TrendingUp className="h-7 w-7" />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60 mb-1">{t.monthlyReturn}</p>
                <div className="flex flex-col">
                  <p className="text-2xl font-black text-emerald-400 tracking-tighter">
                    <span className="text-xs font-normal normal-case opacity-60 mr-2 tracking-normal">up to</span>
                    {formatUSD(dividendRange.max)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="premium-glass bg-gv-gold/[0.02] border-gv-gold/20 p-8 rounded-[40px] space-y-6 w-full flex flex-col items-center text-center shadow-2xl relative overflow-hidden group/summary">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gv-gold/5 blur-[50px] group-hover/summary:bg-gv-gold/10 transition-all duration-700"></div>
              <div className="flex items-center gap-4 text-gv-gold relative z-10">
                <div className="h-0.5 w-6 bg-gv-gold/40 rounded-full"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em]">{lang === 'en' ? 'Investment Intelligence' : '投资情报'}</span>
                <div className="h-0.5 w-6 bg-gv-gold/40 rounded-full"></div>
              </div>
              <div className="space-y-4 relative z-10 w-full px-4">
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">{t.currentTier}</p>
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center justify-center gap-4 bg-white/5 border border-white/5 p-4 rounded-3xl w-full group-hover/summary:border-gv-gold/20 transition-all">
                    <TierMedal tierId={currentInvestment > 0 ? qualifiedTier.id : "none"} size="md" className="drop-shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-transform group-hover/summary:rotate-12" />
                    <span className="text-white text-xl font-black uppercase tracking-tight">
                      {currentInvestment > 0 ? qualifiedTier.name.replace(/ package/gi, '') : t.noTier}
                    </span>
                  </div>
                  {currentInvestment > 0 && qualifiedTier.yearlyBonus && (
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-gv-gold/10 border border-gv-gold/30 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.1)]">
                        <span className="text-gv-gold text-[10px] font-black tracking-widest">+{ (qualifiedTier.yearlyBonus * 100).toFixed(0) }% YEARLY BONUS APPLIED</span>
                      </div>
                      {qualifiedTier.id === 'platinum' && (
                        <p className="text-[8px] font-black text-gv-gold/60 uppercase tracking-[0.2em] italic leading-none pt-1">
                          * 12 months lock-in period requirement met
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {amount > currentInvestment && (
                <div className="pt-6 border-t border-white/5 w-full relative z-10">
                  <p className="text-[10px] text-gv-gold font-black uppercase tracking-[0.3em] mb-2">{t.potentialUpgrade}</p>
                  <p className="text-gray-200 text-sm font-bold leading-relaxed">
                    <span className="text-gray-500 font-medium normal-case block mb-1">{t.increaseBy}</span>
                    <span className="text-white font-black">{formatUSD(amount - currentInvestment)}</span>
                    <span className="text-gray-500 font-medium normal-case block mt-1">{t.toReach} <span className="text-gv-gold uppercase tracking-widest font-black inline-block ml-1">{activeTier.name.replace(/ package/gi, '')}</span></span>
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
