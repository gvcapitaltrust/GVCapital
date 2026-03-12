"use client";

import React, { useState, useEffect } from "react";
import { TIERS, getTierByAmount, calculateDividendRange, formatUSD } from "@/lib/tierUtils";
import ProductCard from "./ProductCard";
import { Info, TrendingUp, Wallet } from "lucide-react";

interface ProductSelectionProps {
  currentInvestment: number;
  onSelect?: (amount: number) => void;
  lang: "en" | "zh";
  onOpenComparison: () => void;
}

export default function ProductSelection({ currentInvestment, onSelect, lang, onOpenComparison }: ProductSelectionProps) {
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
      compare: "Compare Packages",
      cta: "Proceed to Deposit",
    },
    zh: {
      title: "选择您的投资计划",
      subtitle: "选择金额以查看您的等级和预计回报",
      sliderLabel: "投资金额 (USD)",
      monthlyReturn: "预计每月回报",
      compare: "比较套餐",
      cta: "前往入金",
    }
  }[lang];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-black uppercase tracking-tighter text-white">{t.title}</h2>
          <p className="text-zinc-500 font-medium">{t.subtitle}</p>
        </div>
        <button 
          onClick={onOpenComparison}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <Info className="h-4 w-4" />
          {t.compare}
        </button>
      </div>

      {/* Slider Section */}
      <div className="bg-[#1a1a1a] border border-white/5 p-8 sm:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
          <TrendingUp className="h-64 w-64 text-gv-gold" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">{t.sliderLabel}</label>
                <span className="text-4xl font-black text-gv-gold tracking-tighter">
                  {formatUSD(amount)}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10000"
                step="50"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-gv-gold"
              />
              <div className="flex justify-between text-[8px] font-black text-zinc-700 uppercase tracking-widest">
                <span>$1</span>
                <span>$5,000</span>
                <span>$10,000</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem] flex items-center gap-6">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <TrendingUp className="h-8 w-8" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">{t.monthlyReturn}</p>
                <p className="text-2xl font-black text-emerald-500 tracking-tight">
                  {formatUSD(dividendRange.min)} - {formatUSD(dividendRange.max)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <div className="bg-gv-gold/10 border border-gv-gold/20 p-6 rounded-[2rem] space-y-4 w-full">
              <div className="flex items-center gap-4 text-gv-gold">
                <Wallet className="h-5 w-5" />
                <span className="text-xs font-black uppercase tracking-widest">Investment Summary</span>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-400 text-xs font-medium">Your current tier is based on your total balance.</p>
                <p className="text-white text-sm font-bold">Current Tier: <span className="text-gv-gold font-black uppercase">{qualifiedTier.name}</span></p>
              </div>
              {amount > currentInvestment && (
                <div className="pt-2 border-t border-gv-gold/10">
                  <p className="text-[10px] text-gv-gold/60 font-black uppercase">Potential Upgrade</p>
                  <p className="text-white text-sm font-bold italic">Increase by {formatUSD(amount - currentInvestment)} to reach {activeTier.name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {TIERS.map((tier) => (
          <ProductCard
            key={tier.id}
            tier={tier}
            isActive={activeTier.id === tier.id}
            isQualified={qualifiedTier.id === tier.id}
          />
        ))}
      </div>
    </div>
  );
}
