"use client";

import React, { useState } from "react";
import { useUser } from "@/providers/UserProvider";
import { useSettings } from "@/providers/SettingsProvider";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import PremiumLoader from "@/components/PremiumLoader";

export default function TransactionsClient({ lang }: { lang: "en" | "zh" }) {
    const { userProfile: user, transactions, dividendHistory, loading } = useUser();
    const { forexRate } = useSettings();

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [activeFilter, setActiveFilter] = useState<'All' | 'Capital' | 'Dividends'>('All');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const t = {
        en: {
            history: "Transaction History",
            date: "Date",
            refId: "Reference ID",
            type: "Type",
            status: "Status",
            amount: "Amount (USD)",
            noTxFound: "No transactions found",
            statementCenter: "Statement Center",
            statementCenterDesc: "Generate and download official PDF statements for your account activity and investment performance.",
            selectMonth: "Select Month",
            selectYear: "Select Year",
            generateDownload: "Generate & Download PDF",
            months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
            totalInView: "Total Assets in View",
        },
        zh: {
            history: "交易历史",
            date: "日期",
            refId: "参考编号",
            type: "类型",
            status: "状态",
            amount: "金额 (USD)",
            noTxFound: "未找到交易记录",
            statementCenter: "对账单中心",
            statementCenterDesc: "生成并下载您的账户活动和投资表现的官方 PDF 对账单。",
            selectMonth: "选择月份",
            selectYear: "选择年份",
            generateDownload: "生成并下载 PDF",
            months: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
            all: "All Transactions",
            capital: "Capital Flow",
            dividends: "Dividends & Bonuses",
            filterBy: "Filter by",
            totalInView: "Total in this view",
        }
    }[lang];

    const filteredTransactions = transactions.filter(tx => {
        if (activeFilter === 'All') return true;
        const isDiv = tx.metadata?.adjustment_category === 'Dividend' || tx.metadata?.adjustment_category === 'Bonus' || tx.type?.toLowerCase().includes('dividend') || tx.type?.toLowerCase().includes('bonus');
        if (activeFilter === 'Dividends') return isDiv;
        if (activeFilter === 'Capital') return !isDiv;
        return true;
    });

    const filteredTotalUSD = filteredTransactions
        .filter(tx => ['Approved', 'Completed', 'Pending Release'].includes(tx.status))
        .reduce((acc, tx) => {
            const amountUSD = Number(tx.original_currency_amount || (Number(tx.amount) / forexRate));
            if (tx.type === 'Withdrawal' && !tx.metadata?.adjustment_category) return acc - Math.abs(amountUSD);
            if (tx.metadata?.adjustment_type === 'Decrease') return acc - Math.abs(amountUSD);
            return acc + amountUSD;
        }, 0);

    const generateStatement = () => {
        if (!user) return;
        const doc = new jsPDF();
        const monthName = t.months[selectedMonth];
        
        // Header
        doc.setFillColor(10, 10, 10);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(212, 175, 55);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("GV CAPITAL TRUST", 20, 25);
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text("OFFICIAL ACCOUNT STATEMENT", 140, 25);

        // User Info
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(10);
        doc.text(`Account Holder: ${user.full_name || user.username}`, 20, 50);
        doc.text(`Statement Period: ${monthName} ${selectedYear}`, 20, 55);
        doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 20, 60);

        // Data processing
        const periodTxs = transactions.filter(tx => {
            const d = new Date(tx.created_at || tx.transfer_date);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });

        const periodProfit = periodTxs.filter(t => 
            (t.metadata?.adjustment_category === 'Dividend' || t.metadata?.adjustment_category === 'Bonus' || t.type?.toLowerCase().includes('dividend') || t.type?.toLowerCase().includes('bonus')) &&
            t.status === 'Approved'
        ).reduce((acc, t) => acc + Number(t.amount), 0);

        const totalDeposits = periodTxs.filter(tx => tx.type === 'Deposit' && tx.status === 'Approved').reduce((acc, tx) => acc + Number(tx.amount), 0);
        const totalWithdrawals = periodTxs.filter(tx => tx.type === 'Withdrawal' && !tx.metadata?.is_penalty && ['Approved', 'Completed', 'Pending Release'].includes(tx.status)).reduce((acc, tx) => acc + Math.abs(Number(tx.amount)), 0);
        const totalPenalties = periodTxs.filter(tx => (tx.metadata?.is_penalty || tx.metadata?.description?.toLowerCase().includes('penalty')) && ['Approved', 'Completed'].includes(tx.status)).reduce((acc, tx) => acc + Math.abs(Number(tx.amount)), 0);
        
        const closingBalance = (user.total_investment || 0) + (Number(user.profit || 0));
        const openingBalance = closingBalance - totalDeposits + totalWithdrawals + totalPenalties - periodProfit;

        const summaryBody = [
            ['Opening Balance', openingBalance.toFixed(2)],
            ['Total Deposits', totalDeposits.toFixed(2)],
            ['Total Monthly Dividends', periodProfit.toFixed(2)],
            ['Total Withdrawals (Net)', totalWithdrawals.toFixed(2)],
        ];

        if (totalPenalties > 0) {
            summaryBody.push(['Early Withdrawal Penalties', `-${totalPenalties.toFixed(2)}`]);
        }

        summaryBody.push(['Closing Balance', closingBalance.toFixed(2)]);

        autoTable(doc, {
            startY: 70,
            head: [['Description', 'Amount (USD)']],
            body: summaryBody.map(([desc, amt]) => [desc, (Number(amt) / forexRate).toFixed(2)]),
            theme: 'striped',
            headStyles: { fillColor: [51, 65, 85] }
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 15,
            head: [['Date', 'Ref ID', 'Type', 'Status', 'Amount (USD)']],
            body: periodTxs.map(tx => [
                new Date(tx.created_at || tx.transfer_date).toLocaleDateString(),
                tx.ref_id || "-",
                tx.metadata?.description || tx.type,
                tx.status,
                (Number(tx.original_currency_amount || (Number(tx.amount) / forexRate))).toFixed(2)
            ]),
            headStyles: { fillColor: [71, 85, 105] }
        });

        doc.save(`GV_Statement_${monthName}_${selectedYear}.pdf`);
    };

    if (loading) return <div className="flex items-center justify-center p-20"><PremiumLoader /></div>;

    return (
        <div className="space-y-12 pb-20">
            <section className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex bg-slate-100 p-1.5 rounded-[22px] border border-slate-200 backdrop-blur-3xl shadow-inner scrollbar-hide overflow-x-auto">
                        {(['All', 'Capital', 'Dividends'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-8 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-[0.25em] transition-all whitespace-nowrap ${
                                    activeFilter === f 
                                        ? 'bg-gv-gold text-black shadow-[0_10px_20px_rgba(212,175,55,0.2)] scale-105 relative z-10' 
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center gap-4 px-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.totalInView}:</span>
                    <span className={`text-sm font-black tabular-nums transition-colors ${filteredTotalUSD >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {filteredTotalUSD >= 0 ? '+' : '-'}$ {Math.abs(filteredTotalUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </span>
                </div>

                <div className="premium-glass bg-white rounded-[40px] overflow-hidden shadow-xl border border-slate-200">
                    <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-200">
                        <table className="w-full text-left min-w-[700px] border-collapse">
                            <thead className="sticky top-0 z-10 backdrop-blur-3xl bg-slate-50 border-b border-slate-200">
                                <tr className="text-[10px] text-slate-500 font-semibold uppercase tracking-[0.22em]">
                                    <th className="px-8 py-5">{t.date}</th>
                                    <th className="px-8 py-5">{t.refId}</th>
                                    <th className="px-8 py-5">{t.type}</th>
                                    <th className="px-8 py-5">{t.status}</th>
                                    <th className="px-8 py-5 text-right">{t.amount}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gv-gold/5">
                                {filteredTransactions.map((tx, idx) => (
                                    <React.Fragment key={idx}>
                                        <tr 
                                            onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                                            className="text-sm border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer group/row"
                                        >
                                            <td className="px-8 py-5 text-slate-500 font-mono text-[11px] font-medium">{new Date(tx.created_at || tx.transfer_date).toLocaleDateString()}</td>
                                            <td className="px-8 py-5 text-slate-400 font-mono text-[10px] opacity-70 tracking-widest uppercase">{tx.ref_id || "-"}</td>
                                            <td className="px-8 py-5 uppercase tracking-[0.2em] text-[10px] font-bold text-slate-800">
                                                <div className="flex items-center gap-2">
                                                    {tx.metadata?.description || tx.type}
                                                    {(tx.type === 'Withdrawal' || tx.metadata?.is_adjustment) && (
                                                        <svg className={`h-3 w-3 text-gv-gold transition-transform ${expandedId === tx.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M19 9l-7 7-7-7" /></svg>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] uppercase font-black tracking-[0.15em] border ${
                                                    ['Approved', 'Completed'].includes(tx.status) ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                    tx.status === 'Pending Release' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                    tx.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                                                    'bg-gv-gold/10 text-gv-gold/80 border-gv-gold/30 shadow-[0_0_15px_rgba(212,175,55,0.05)]'
                                                }`}>{tx.status}</span>
                                            </td>
                                            {(() => {
                                                const isWithdrawal = tx.type === 'Withdrawal' || tx.metadata?.adjustment_type === 'Decrease' || tx.metadata?.is_penalty || tx.metadata?.description?.toLowerCase().includes('penalty');
                                                const amountUSD = Number(tx.original_currency_amount || (Number(tx.amount) / forexRate));
                                                const displayAmount = isWithdrawal ? -Math.abs(amountUSD) : amountUSD;
                                                
                                                return (
                                                        <td className={`px-8 py-5 text-right font-black tabular-nums transition-colors ${displayAmount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                            {displayAmount >= 0 ? '+' : '-'}{Math.abs(displayAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                );
                                            })()}
                                        </tr>
                                        {expandedId === tx.id && (
                                            <tr>
                                                <td colSpan={5} className="px-10 py-10 bg-gv-gold/[0.02] border-t border-gv-gold/5 animate-in slide-in-from-top-2 duration-300">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                                                        <div className="space-y-6">
                                                            <h4 className="text-[10px] font-black uppercase text-gv-gold tracking-[0.3em] opacity-80 mb-2">Financial Breakdown</h4>
                                                            <div className="space-y-3">
                                                                <div className="flex justify-between text-xs font-bold gap-4 px-1">
                                                                    <span className="text-slate-400 uppercase tracking-widest whitespace-nowrap">Gross Amount</span>
                                                                    <span className="text-slate-800 tabular-nums whitespace-nowrap">$ {Number(tx.original_currency_amount || (Number(tx.amount) / forexRate)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                </div>
                                                                {tx.metadata?.penalty_applied && (
                                                                    <div className="flex justify-between text-xs font-bold gap-4 px-1">
                                                                        <span className="text-red-500 uppercase italic tracking-widest whitespace-nowrap">Penalty (40%)</span>
                                                                        <span className="text-red-600 tabular-nums whitespace-nowrap">-$ {(Number(tx.metadata?.original_usd_penalty || (Number(tx.metadata?.finalized_penalty) / forexRate))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between text-xs font-black border-t border-slate-100 pt-4 px-2 bg-emerald-50 rounded-xl py-3 border border-emerald-100 gap-4 shadow-[0_0_20px_rgba(16,185,129,0.03)]">
                                                                    <span className="text-emerald-600 uppercase tracking-[0.15em] whitespace-nowrap">{tx.type === 'Deposit' ? 'Final Deposit (Net)' : 'Final Payout (Net)'}</span>
                                                                    <span className="text-emerald-600 tabular-nums whitespace-nowrap">$ {(Number(tx.metadata?.original_usd_payout || tx.metadata?.original_currency_amount || (Number(tx.metadata?.finalized_payout || tx.amount) / forexRate))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                </div>
                                                                {tx.metadata?.remark && (
                                                                    <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 backdrop-blur-md">
                                                                        <p className="text-[9px] font-black text-gv-gold/60 uppercase tracking-[0.3em] mb-2">User Remark</p>
                                                                        <p className="text-[11px] font-medium text-slate-600 italic leading-relaxed">"{tx.metadata.remark}"</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-6">
                                                            <h4 className="text-[10px] font-black uppercase text-gv-gold tracking-[0.3em] opacity-80 mb-2">Target Account</h4>
                                                            <div className="premium-glass p-5 rounded-3xl space-y-4 border-gv-gold/10">
                                                                <div className="flex flex-col gap-1">
                                                                    <p className="text-[9px] font-black text-gv-gold/60 uppercase tracking-widest">Bank Entity</p>
                                                                    <p className="text-xs font-black text-white uppercase tracking-tight">{tx.metadata?.bank_name || user?.bank_name || "Institutional Account"}</p>
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <p className="text-[9px] font-black text-gv-gold/60 uppercase tracking-widest">Identification</p>
                                                                    <p className="text-sm font-mono text-gv-gold font-bold select-all tracking-tighter">{tx.metadata?.account_number || user?.account_number || "Verified on File"}</p>
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <p className="text-[9px] font-black text-gv-gold/60 uppercase tracking-widest">Beneficiary</p>
                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{tx.metadata?.bank_account_holder || user?.full_name}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-6">
                                                            <h4 className="text-[10px] font-black uppercase text-gv-gold tracking-[0.3em] opacity-80 mb-2">Processing Timeline</h4>
                                                            <div className="space-y-4 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-gv-gold/10">
                                                                <div className="flex items-center gap-4 pl-8 relative">
                                                                    <div className="h-2 w-2 rounded-full bg-slate-300 absolute left-[3.5px] shadow-[0_0_8px_rgba(82,82,91,0.1)]"></div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Submitted</span>
                                                                        <span className="text-[9px] text-slate-500 font-bold tabular-nums">{new Date(tx.created_at).toLocaleString()}</span>
                                                                    </div>
                                                                </div>
                                                                {tx.metadata?.approved_at && (
                                                                    <div className="flex items-center gap-4 pl-8 relative">
                                                                        <div className="h-2.5 w-2.5 rounded-full bg-blue-500 absolute left-[2.5px] shadow-[0_0_12px_rgba(59,130,246,0.3)]"></div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Accepted by {tx.metadata?.processed_by_name || 'Admin'}</span>
                                                                            <span className="text-[9px] text-slate-500 font-bold tabular-nums">{new Date(tx.metadata.approved_at).toLocaleString()}</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {['Approved', 'Completed'].includes(tx.status) && (
                                                                    <div className="flex items-center gap-4 pl-8 relative">
                                                                        <div className="h-3 w-3 rounded-full bg-emerald-500 absolute left-[1.5px] shadow-[0_0_15px_rgba(16,185,129,0.6)] ring-4 ring-emerald-500/20"></div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Successful</span>
                                                                            <span className="text-[9px] text-gray-500 font-bold tabular-nums">{new Date(tx.metadata?.approved_at || tx.updated_at || tx.created_at).toLocaleString()}</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                                {filteredTransactions.length === 0 && (
                                    <tr><td colSpan={5} className="px-8 py-32 text-center text-slate-400 font-bold uppercase tracking-[0.3em] opacity-60 text-sm">{t.noTxFound}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="premium-glass bg-white p-8 md:p-12 rounded-[40px] shadow-xl relative overflow-hidden group border border-slate-200">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gv-gold/5 blur-[120px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-1000"></div>
                <div className="relative z-10 max-w-2xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-0.5 w-8 bg-gv-gold/60 rounded-full"></div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">{t.statementCenter}</h2>
                    </div>
                    <p className="text-slate-500 text-sm font-medium mb-12 opacity-80 leading-relaxed font-semibold">{t.statementCenterDesc}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
                        <div className="space-y-4">
                            <label className="text-gv-gold/60 text-[9px] font-black uppercase tracking-[0.3em] px-1">{t.selectMonth}</label>
                            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 text-sm font-bold focus:outline-none focus:border-gv-gold transition-all text-slate-900 backdrop-blur-md appearance-none cursor-pointer hover:bg-slate-100 shadow-inner">
                                {t.months.map((m, i) => <option key={i} value={i} className="bg-white">{m}</option>)}
                            </select>
                        </div>
                        <div className="space-y-4">
                            <label className="text-gv-gold/60 text-[9px] font-black uppercase tracking-[0.3em] px-1">{t.selectYear}</label>
                            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 text-sm font-bold focus:outline-none focus:border-gv-gold transition-all text-slate-900 backdrop-blur-md appearance-none cursor-pointer hover:bg-slate-100 shadow-inner">
                                {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-white">{y}</option>)}
                            </select>
                        </div>
                    </div>

                    <button onClick={generateStatement} className="bg-gv-gold text-black font-black py-5 px-12 rounded-2xl text-xs uppercase tracking-[0.25em] shadow-[0_15px_40px_rgba(212,175,55,0.25)] hover:shadow-[0_20px_50px_rgba(212,175,55,0.35)] hover:-translate-y-1 transition-all active:scale-95">
                        {t.generateDownload}
                    </button>
                </div>
            </section>
        </div>
    );
}
