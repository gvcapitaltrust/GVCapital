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
        .filter(tx => tx.status === 'Approved')
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
        const totalWithdrawals = periodTxs.filter(tx => tx.type === 'Withdrawal' && tx.status === 'Approved').reduce((acc, tx) => acc + Math.abs(Number(tx.amount)), 0);
        
        const closingBalance = (user.total_investment || 0) + (Number(user.profit || 0));
        const openingBalance = closingBalance - totalDeposits + totalWithdrawals - periodProfit;

        autoTable(doc, {
            startY: 70,
            head: [['Description', 'Amount (RM)']],
            body: [
                ['Opening Balance', openingBalance.toFixed(2)],
                ['Total Deposits', totalDeposits.toFixed(2)],
                ['Total Monthly Dividends', periodProfit.toFixed(2)],
                ['Total Withdrawals', totalWithdrawals.toFixed(2)],
                ['Closing Balance', closingBalance.toFixed(2)]
            ],
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
                    <h2 className="text-2xl font-black uppercase tracking-tighter">{t.history}</h2>
                    
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                        {(['All', 'Capital', 'Dividends'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    activeFilter === f ? 'bg-gv-gold text-black shadow-lg' : 'text-zinc-500 hover:text-white'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4 px-2">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t.totalInView}:</span>
                    <span className={`text-sm font-black tabular-nums ${filteredTotal >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        RM {filteredTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                </div>

                <div className="border border-white/10 rounded-[40px] overflow-hidden bg-[#1a1a1a]/50 backdrop-blur-md shadow-2xl">
                    <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-white/10">
                        <table className="w-full text-left min-w-[700px] border-collapse">
                            <thead className="bg-white/5 border-b border-white/10 sticky top-0 z-10 backdrop-blur-md">
                                <tr className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">
                                    <th className="px-8 py-6">{t.date}</th>
                                    <th className="px-8 py-6">{t.refId}</th>
                                    <th className="px-8 py-6">{t.type}</th>
                                    <th className="px-8 py-6">{t.status}</th>
                                    <th className="px-8 py-6 text-right">{t.amount}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {filteredTransactions.map((tx, idx) => (
                                    <tr key={idx} className="text-sm font-bold group hover:bg-white/[0.02] transition-colors">
                                        <td className="px-8 py-6 text-zinc-500 font-mono text-xs">{new Date(tx.created_at || tx.transfer_date).toLocaleDateString()}</td>
                                        <td className="px-8 py-6 text-zinc-400 font-mono text-xs opacity-50">{tx.ref_id || "-"}</td>
                                        <td className="px-8 py-6 uppercase tracking-widest text-[10px]">{tx.metadata?.description || tx.type}</td>
                                        <td className="px-8 py-6">
                                            <span className={`px-4 py-2 rounded-xl text-[9px] uppercase font-black tracking-widest ${
                                                tx.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' :
                                                tx.status === 'Rejected' ? 'bg-red-500/10 text-red-500' :
                                                'bg-amber-500/10 text-amber-400'
                                            }`}>{tx.status}</span>
                                        </td>
                                        <td className={`px-8 py-6 text-right font-black tabular-nums ${Number(tx.amount) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {Number(tx.amount) >= 0 ? '+' : ''}{Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                                {filteredTransactions.length === 0 && (
                                    <tr><td colSpan={5} className="px-8 py-20 text-center text-zinc-600 font-bold uppercase tracking-widest">{t.noTxFound}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="bg-[#1a1a1a] border border-white/5 p-12 rounded-[40px] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gv-gold/5 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-1000"></div>
                <div className="relative z-10 max-w-2xl">
                    <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">{t.statementCenter}</h2>
                    <p className="text-zinc-500 font-medium mb-12">{t.statementCenterDesc}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
                        <div className="space-y-4">
                            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">{t.selectMonth}</label>
                            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-lg font-black focus:outline-none focus:border-gv-gold transition-all text-white">
                                {t.months.map((m, i) => <option key={i} value={i} className="bg-[#111]">{m}</option>)}
                            </select>
                        </div>
                        <div className="space-y-4">
                            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">{t.selectYear}</label>
                            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-lg font-black focus:outline-none focus:border-gv-gold transition-all text-white">
                                {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-[#111]">{y}</option>)}
                            </select>
                        </div>
                    </div>

                    <button onClick={generateStatement} className="bg-gv-gold text-black font-black py-6 px-12 rounded-[28px] uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all">{t.generateDownload}</button>
                </div>
            </section>
        </div>
    );
}
