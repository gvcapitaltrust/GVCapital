"use client";

import React, { useState } from "react";
import { useUser } from "@/providers/UserProvider";
import { useSettings } from "@/providers/SettingsProvider";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
            amount: "Amount",
            noTxFound: "No transactions found",
            statementCenter: "Statement Center",
            statementCenterDesc: "Generate and download official PDF statements for your account activity and investment performance.",
            selectMonth: "Select Month",
            selectYear: "Select Year",
            generateDownload: "Generate & Download PDF",
            months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        },
        zh: {
            history: "交易历史",
            date: "日期",
            refId: "参考编号",
            type: "类型",
            status: "状态",
            amount: "金额",
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

    const filteredTotal = filteredTransactions
        .filter(tx => ['Approved', 'Completed', 'Pending Release'].includes(tx.status))
        .reduce((acc, tx) => {
            const amount = Number(tx.amount);
            if (tx.type === 'Withdrawal' && !tx.metadata?.adjustment_category) return acc - Math.abs(amount);
            if (tx.metadata?.adjustment_type === 'Decrease') return acc - Math.abs(amount);
            return acc + amount;
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
            head: [['Description', 'Amount (RM)']],
            body: summaryBody,
            theme: 'striped',
            headStyles: { fillColor: [51, 65, 85] }
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 15,
            head: [['Date', 'Ref ID', 'Type', 'Status', 'Amount (RM)']],
            body: periodTxs.map(tx => [
                new Date(tx.created_at || tx.transfer_date).toLocaleDateString(),
                tx.ref_id || "-",
                tx.metadata?.description || tx.type,
                tx.status,
                Number(tx.amount).toFixed(2)
            ]),
            headStyles: { fillColor: [71, 85, 105] }
        });

        doc.save(`GV_Statement_${monthName}_${selectedYear}.pdf`);
    };

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;

    return (
        <div className="space-y-12 pb-20">
            <section className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex bg-white p-1 rounded-2xl border border-gray-200">
                        {(['All', 'Capital', 'Dividends'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    activeFilter === f ? 'bg-gv-gold text-black shadow-lg' : 'text-gray-400 hover:text-gray-900'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4 px-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.totalInView}:</span>
                    <span className={`text-sm font-black tabular-nums ${filteredTotal >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        RM {filteredTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                </div>

                <div className="border border-gray-200 rounded-[40px] overflow-hidden bg-white backdrop-blur-md shadow-2xl">
                    <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-gray-300">
                        <table className="w-full text-left min-w-[700px] border-collapse">
                            <thead className="bg-white border-b border-gray-200 sticky top-0 z-10 backdrop-blur-md">
                                <tr className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
                                    <th className="px-6 py-4">{t.date}</th>
                                    <th className="px-6 py-4">{t.refId}</th>
                                    <th className="px-6 py-4">{t.type}</th>
                                    <th className="px-6 py-4">{t.status}</th>
                                    <th className="px-6 py-4 text-right">{t.amount}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredTransactions.map((tx, idx) => (
                                    <React.Fragment key={idx}>
                                        <tr 
                                            onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                                            className="text-sm font-medium group hover:bg-gray-50 transition-colors border-t border-gray-100 cursor-pointer"
                                        >
                                            <td className="px-6 py-4 text-gray-500 font-mono text-xs">{new Date(tx.created_at || tx.transfer_date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-gray-400 font-mono text-[11px] opacity-70">{tx.ref_id || "-"}</td>
                                            <td className="px-6 py-4 uppercase tracking-widest text-[10px] font-bold text-gray-900">
                                                <div className="flex items-center gap-2">
                                                    {tx.metadata?.description || tx.type}
                                                    {(tx.type === 'Withdrawal' || tx.metadata?.is_adjustment) && (
                                                        <svg className={`h-3 w-3 text-gray-500 transition-transform ${expandedId === tx.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1.5 rounded-lg text-[9px] uppercase font-bold tracking-widest ${
                                                    ['Approved', 'Completed'].includes(tx.status) ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                    tx.status === 'Pending Release' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                    tx.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                }`}>{tx.status}</span>
                                            </td>
                                            {(() => {
                                                const isWithdrawal = tx.type === 'Withdrawal' || tx.metadata?.adjustment_type === 'Decrease' || tx.metadata?.is_penalty || tx.metadata?.description?.toLowerCase().includes('penalty');
                                                const amountValue = Number(tx.amount);
                                                const displayAmount = isWithdrawal ? -Math.abs(amountValue) : amountValue;
                                                
                                                return (
                                                    <td className={`px-6 py-4 text-right font-black tabular-nums ${displayAmount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        {displayAmount >= 0 ? '+' : '-'}{Math.abs(displayAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                );
                                            })()}
                                        </tr>
                                        {expandedId === tx.id && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-6 bg-white/[0.01] animate-in slide-in-from-top-2 duration-300">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                        <div className="space-y-4">
                                                            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Financial Breakdown</h4>
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between text-xs font-bold">
                                                                    <span className="text-gray-400 uppercase">Gross Amount</span>
                                                                    <span className="text-gray-900">RM {Math.abs(Number(tx.metadata?.original_request_amount || tx.amount)).toFixed(2)}</span>
                                                                </div>
                                                                {tx.metadata?.penalty_applied && (
                                                                    <div className="flex justify-between text-xs font-bold">
                                                                        <span className="text-red-500 uppercase italic">Early Withdrawal Penalty (40%)</span>
                                                                        <span className="text-red-500">-RM {Number(tx.metadata?.finalized_penalty).toFixed(2)}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between text-xs font-black border-t border-gray-200 pt-2">
                                                                    <span className="text-emerald-500 uppercase">Final Payout (Net)</span>
                                                                    <span className="text-emerald-500 underline decoration-gv-gold">RM {Number(tx.metadata?.finalized_payout || tx.amount).toFixed(2)}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Target Account</h4>
                                                            <div className="bg-white border border-gray-200 p-4 rounded-2xl space-y-2">
                                                                <p className="text-[10px] font-black text-gv-gold uppercase">{tx.metadata?.bank_name || user?.bank_name || "Institutional Account"}</p>
                                                                <p className="text-sm font-mono text-gray-900 select-all">{tx.metadata?.account_number || user?.account_number || "Verified on File"}</p>
                                                                <p className="text-[9px] font-bold text-gray-400 uppercase">{tx.metadata?.bank_account_holder || user?.full_name}</p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Processing Timeline</h4>
                                                            <div className="space-y-3 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1px] before:bg-gray-100">
                                                                <div className="flex items-center gap-3 pl-6 relative">
                                                                    <div className="h-2 w-2 rounded-full bg-zinc-500 absolute left-[3.5px]"></div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] font-black text-gray-900 uppercase">Submitted</span>
                                                                        <span className="text-[9px] text-gray-500 font-bold">{new Date(tx.created_at).toLocaleString()}</span>
                                                                    </div>
                                                                </div>
                                                                {tx.metadata?.approved_at && (
                                                                    <div className="flex items-center gap-3 pl-6 relative">
                                                                        <div className="h-2 w-2 rounded-full bg-blue-500 absolute left-[3.5px] shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[10px] font-black text-blue-400 uppercase">Accepted by {tx.metadata?.processed_by_name || 'Admin'}</span>
                                                                            <span className="text-[9px] text-gray-500 font-bold">{new Date(tx.metadata.approved_at).toLocaleString()}</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {tx.metadata?.released_at && (
                                                                    <div className="flex items-center gap-3 pl-6 relative">
                                                                        <div className="h-2 w-2 rounded-full bg-emerald-500 absolute left-[3.5px] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[10px] font-black text-emerald-400 uppercase">Released for Distribution</span>
                                                                            <span className="text-[9px] text-gray-500 font-bold">{new Date(tx.metadata.released_at).toLocaleString()}</span>
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
                                    <tr><td colSpan={5} className="px-8 py-20 text-center text-gray-500 font-bold uppercase tracking-widest">{t.noTxFound}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="bg-gray-50 border border-gray-200 p-8 rounded-[32px] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gv-gold/5 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-1000"></div>
                <div className="relative z-10 max-w-2xl">
                    <h2 className="text-2xl font-bold uppercase tracking-tight mb-3">{t.statementCenter}</h2>
                    <p className="text-gray-400 text-sm font-medium mb-8">{t.statementCenterDesc}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                        <div className="space-y-3">
                            <label className="text-gray-400 text-[10px] font-bold uppercase tracking-widest px-1">{t.selectMonth}</label>
                            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="w-full bg-white border border-gray-200 rounded-xl p-4 text-base font-semibold focus:outline-none focus:border-gv-gold transition-all text-gray-900">
                                {t.months.map((m, i) => <option key={i} value={i} className="bg-white">{m}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-gray-400 text-[10px] font-bold uppercase tracking-widest px-1">{t.selectYear}</label>
                            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="w-full bg-white border border-gray-200 rounded-xl p-4 text-base font-semibold focus:outline-none focus:border-gv-gold transition-all text-gray-900">
                                {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-white">{y}</option>)}
                            </select>
                        </div>
                    </div>

                    <button onClick={generateStatement} className="bg-gv-gold text-black font-bold py-4 px-8 rounded-2xl text-sm uppercase tracking-widest shadow-xl hover:-translate-y-0.5 transition-all">{t.generateDownload}</button>
                </div>
            </section>
        </div>
    );
}
