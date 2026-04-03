"use client";

import React from "react";
import { TIERS, formatUSD } from "@/lib/tierUtils";
import { X, Check, Minus } from "lucide-react";

interface ComparisonTableProps {
  onClose: () => void;
  lang: "en" | "zh";
}

export default function ComparisonTable({ onClose, lang }: ComparisonTableProps) {
  const t = {
    en: {
      title: "Compare Packages",
      feature: "Feature",
      dividend: "Monthly Dividend",
      range: "Deposit Range",
      priority: "Priority Support",
      accountManager: "Account Manager",
      insurance: "Insurance Coverage",
      fees: "Withdrawal Fees",
      standard: "Standard",
      reduced: "Reduced",
      zero: "Zero",
      yearlyBonus: "Yearly Bonus",
      lockIn: "Capital Lock-in",
      months: "Months",
      days: "Days",
      footnote: "* All dividends are calculated monthly based on your investment capital. Higher tiers enjoy lower withdrawal fees and priority liquidation."
    },
    zh: {
      title: "比较计划",
      feature: "功能",
      dividend: "每月利润",
      range: "投资范围",
      priority: "优先支持",
      accountManager: "客户经理",
      insurance: "保险保障",
      fees: "提款费用",
      standard: "标准",
      reduced: "降低",
      zero: "零",
      yearlyBonus: "年度奖金",
      lockIn: "资金锁定内",
      months: "个月",
      days: "天",
      footnote: "* 所有分红均根据您的投资本金按月计算。更高级别享受更低的提款费和优先清算权。"
    }
  }[lang];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-white/60 backdrop-blur-2xl animate-in fade-in duration-500">
      <div className="premium-glass bg-white border-slate-200 rounded-[48px] p-8 sm:p-14 max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-[0_40px_100px_rgba(0,0,0,0.08)] relative overflow-x-hidden group">
        <div className="absolute top-0 right-0 w-full h-64 bg-gv-gold/5 blur-[100px] -translate-y-1/2 pointer-events-none"></div>
        <button
          onClick={onClose}
          className="absolute top-8 right-8 p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-gv-gold/40 transition-all text-slate-400 hover:text-slate-900 z-20 group/close"
        >
          <X className="h-6 w-6 group-hover/close:rotate-90 transition-transform duration-500" />
        </button>

        <div className="relative z-10 mb-12">
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-3">{t.title}</h2>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Package Analysis & Yield Comparison</p>
        </div>

        <div className="overflow-x-auto pb-6 relative z-10 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-gv-gold/10">
                <th className="py-8 px-6 text-[10px] font-black uppercase tracking-[0.4em] text-gv-gold/60 bg-slate-50 rounded-tl-3xl">{t.feature}</th>
                {TIERS.map((tier, idx) => (
                  <th key={tier.id} className={`py-8 px-6 text-center bg-slate-50 ${idx === TIERS.length - 1 ? 'rounded-tr-3xl' : ''}`}>
                    <span className={`text-[11px] font-black uppercase tracking-[0.3em] ${tier.id === 'gold' ? 'text-gv-gold' : tier.id === 'platinum' ? 'text-slate-600' : tier.id === 'vvip' ? 'text-cyan-600' : 'text-slate-400'}`}>
                      {tier.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm font-medium">
              <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group/row">
                <td className="py-8 px-6 text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">{t.range}</td>
                {TIERS.map((tier) => (
                  <td key={tier.id} className="py-8 px-6 text-center text-slate-900 font-black whitespace-nowrap tracking-tight tabular-nums group-hover/row:text-gv-gold transition-colors">
                    {tier.id === 'vvip' 
                      ? `> ${formatUSD(tier.minAmount)}` 
                      : `${formatUSD(tier.minAmount)} - ${formatUSD(tier.maxAmount)}`}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group/row">
                <td className="py-8 px-6 text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">{t.dividend}</td>
                {TIERS.map((tier) => (
                  <td key={tier.id} className="py-8 px-6 text-center text-emerald-600 font-black tabular-nums group-hover/row:scale-110 transition-transform">
                    <span className="text-[10px] font-normal normal-case opacity-40 mr-2 italic tracking-normal">up to</span>
                    {(tier.maxDividend * 100).toFixed(0)}%
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="py-8 px-6 text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">{t.yearlyBonus}</td>
                {TIERS.map((tier) => (
                  <td key={tier.id} className="py-8 px-6 text-center">
                    {tier.yearlyBonus ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative inline-block py-2 px-4 rounded-xl bg-gv-gold/10 border border-gv-gold/30 shadow-[0_0_25px_rgba(201,168,76,0.15)] animate-pulse group-hover:animate-none group-hover:scale-110 transition-transform">
                          <span className="text-gv-gold font-black text-xs tracking-widest">
                            +{ (tier.yearlyBonus * 100).toFixed(0) }%
                            {tier.id === 'platinum' && '*'}
                          </span>
                        </div>
                        {tier.id === 'platinum' && (
                        <p className="text-[8px] font-black text-gv-gold/60 uppercase tracking-tighter italic whitespace-nowrap leading-none pt-1">
                          * 12mo mand.
                        </p>
                      )}
                      </div>
                    ) : (
                      <Minus className="h-4 w-4 mx-auto text-gray-600 opacity-40" />
                    )}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-8 px-6 text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] rounded-bl-3xl">{t.lockIn}</td>
                {TIERS.map((tier, idx) => (
                  <td key={tier.id} className={`py-8 px-6 text-center text-slate-700 font-black tracking-widest text-[11px] ${idx === TIERS.length - 1 ? 'rounded-br-3xl' : ''}`}>
                    {tier.id === 'vvip' 
                      ? `12 ${t.months}` 
                      : tier.id === 'platinum'
                        ? `6 - 12 ${t.months}*`
                        : `6 ${t.months}`}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-12 p-8 bg-slate-50 rounded-[32px] border border-slate-100 shadow-inner relative overflow-hidden">
          <div className="absolute inset-0 bg-gv-gold/[0.02] blur-3xl pointer-events-none"></div>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] text-center leading-relaxed relative z-10">
            {t.footnote}
            <br />
            <span className="text-gv-gold/60 mt-2 block">
              {lang === 'en' 
                ? "* Platinum users who opt for the 12-month lock-in period will receive an extra 3% yearly bonus." 
                : "* 选择 12 个月锁定期的白金用户将获得额外的 3% 年度奖金。"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
