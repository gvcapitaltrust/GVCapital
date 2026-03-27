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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#121212] border border-white/10 rounded-[2.5rem] p-6 sm:p-10 max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full border border-white/10 hover:bg-white/5 transition-all text-white"
        >
          <X className="h-6 w-6" />
        </button>

        <h2 className="text-3xl font-black text-white mb-8 uppercase tracking-tighter">{t.title}</h2>

        <div className="overflow-x-auto pb-4">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="py-6 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">{t.feature}</th>
                {TIERS.map((tier) => (
                  <th key={tier.id} className="py-6 px-4 text-center">
                    <span className={`text-xs font-black uppercase tracking-widest ${tier.id === 'gold' ? 'text-gv-gold' : tier.id === 'platinum' ? 'text-zinc-200' : tier.id === 'vvip' ? 'text-cyan-400' : 'text-slate-300'}`}>
                      {tier.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm font-medium">
              <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-6 px-4 text-zinc-400">{t.range}</td>
                {TIERS.map((tier) => (
                  <td key={tier.id} className="py-6 px-4 text-center text-white font-bold whitespace-nowrap">
                    {tier.id === 'vvip' 
                      ? `> ${formatUSD(tier.minAmount)}` 
                      : `${formatUSD(tier.minAmount)} - ${formatUSD(tier.maxAmount)}`}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-6 px-4 text-zinc-400">{t.dividend}</td>
                {TIERS.map((tier) => (
                  <td key={tier.id} className="py-6 px-4 text-center text-emerald-500 font-black">
                    <span className="text-[10px] font-normal opacity-60 mr-1 italic">up to</span>
                    {(tier.maxDividend * 100).toFixed(0)}%
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-6 px-4 text-zinc-400">{t.yearlyBonus}</td>
                {TIERS.map((tier) => (
                  <td key={tier.id} className="py-6 px-4 text-center">
                    {tier.yearlyBonus ? (
                      <div className="relative inline-block py-1.5 px-3 rounded-full bg-gv-gold/10 border border-gv-gold/20 shadow-[0_0_15px_rgba(201,168,76,0.1)] animate-pulse">
                        <span className="text-gv-gold font-black">
                          +{ (tier.yearlyBonus * 100).toFixed(0) }%
                        </span>
                      </div>
                    ) : (
                      <Minus className="h-4 w-4 mx-auto text-zinc-600" />
                    )}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-6 px-4 text-zinc-400">{t.lockIn}</td>
                {TIERS.map((tier) => (
                  <td key={tier.id} className="py-6 px-4 text-center text-white font-bold">
                    {tier.id === 'vvip' 
                      ? `12 ${t.months}` 
                      : tier.id === 'platinum'
                        ? `6 - 12 ${t.months}*`
                        : `6 ${t.months}`}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-6 px-4 text-zinc-400">{t.priority}</td>
                <td className="py-6 px-4 text-center"><Minus className="h-4 w-4 mx-auto text-zinc-600" /></td>
                <td className="py-6 px-4 text-center"><Check className="h-4 w-4 mx-auto text-gv-gold" /></td>
                <td className="py-6 px-4 text-center"><Check className="h-4 w-4 mx-auto text-gv-gold" /></td>
                <td className="py-6 px-4 text-center"><Check className="h-4 w-4 mx-auto text-gv-gold" /></td>
              </tr>
              <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-6 px-4 text-zinc-400">{t.accountManager}</td>
                <td className="py-6 px-4 text-center"><Minus className="h-4 w-4 mx-auto text-zinc-600" /></td>
                <td className="py-6 px-4 text-center"><Minus className="h-4 w-4 mx-auto text-zinc-600" /></td>
                <td className="py-6 px-4 text-center"><Check className="h-4 w-4 mx-auto text-gv-gold" /></td>
                <td className="py-6 px-4 text-center"><Check className="h-4 w-4 mx-auto text-gv-gold" /></td>
              </tr>
              <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-6 px-4 text-zinc-400">{t.insurance}</td>
                <td className="py-6 px-4 text-center"><Minus className="h-4 w-4 mx-auto text-zinc-600" /></td>
                <td className="py-6 px-4 text-center"><Minus className="h-4 w-4 mx-auto text-zinc-600" /></td>
                <td className="py-6 px-4 text-center"><Minus className="h-4 w-4 mx-auto text-zinc-600" /></td>
                <td className="py-6 px-4 text-center"><Minus className="h-4 w-4 mx-auto text-zinc-600" /></td>
              </tr>
              <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-6 px-4 text-zinc-400">{t.fees}</td>
                <td className="py-6 px-4 text-center text-zinc-500">{t.standard}</td>
                <td className="py-6 px-4 text-center text-zinc-500">{t.standard}</td>
                <td className="py-6 px-4 text-center text-zinc-500">{t.standard}</td>
                <td className="py-6 px-4 text-center text-zinc-500">{t.standard}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-10 p-6 bg-white/5 rounded-2xl border border-white/5">
          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest text-center leading-relaxed">
            {t.footnote}
            <br />
            {lang === 'en' 
              ? "* Platinum users who opt for the 12-month lock-in period will receive an extra 3% yearly bonus." 
              : "* 选择 12 个月锁定期的白金用户将获得额外的 3% 年度奖金。"}
          </p>
        </div>
      </div>
    </div>
  );
}
