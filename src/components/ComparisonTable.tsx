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
      footnote: "* All dividends are calculated monthly based on your average daily balance. Higher tiers enjoy lower withdrawal fees and priority liquidation."
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
      footnote: "* 所有分红均根据您的每日平均余额按月计算。更高级别享受更低的提款费和优先清算权。"
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

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="py-6 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">{t.feature}</th>
                {TIERS.map((tier) => (
                  <th key={tier.id} className="py-6 px-4 text-center">
                    <span className={`text-xs font-black uppercase tracking-widest ${tier.id === 'gold' ? 'text-gv-gold' : 'text-white'}`}>
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
                  <td key={tier.id} className="py-6 px-4 text-center text-white font-bold">
                    {formatUSD(tier.minAmount)} - {formatUSD(tier.maxAmount)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-6 px-4 text-zinc-400">{t.dividend}</td>
                {TIERS.map((tier) => (
                  <td key={tier.id} className="py-6 px-4 text-center text-emerald-500 font-black">
                    {(tier.minDividend * 100).toFixed(0)} - {(tier.maxDividend * 100).toFixed(0)}%
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
                <td className="py-6 px-4 text-center"><Check className="h-4 w-4 mx-auto text-gv-gold" /></td>
              </tr>
              <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-6 px-4 text-zinc-400">{t.fees}</td>
                <td className="py-6 px-4 text-center text-white">{t.standard}</td>
                <td className="py-6 px-4 text-center text-white">{t.standard}</td>
                <td className="py-6 px-4 text-center text-white">{t.reduced}</td>
                <td className="py-6 px-4 text-center text-emerald-500 font-bold">{t.zero}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-10 p-6 bg-white/5 rounded-2xl border border-white/5">
          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest text-center leading-relaxed">
            {t.footnote}
          </p>
        </div>
      </div>
    </div>
  );
}
