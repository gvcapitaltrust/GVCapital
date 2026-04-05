"use client";

import React, { useState } from "react";
import { useUser } from "@/providers/UserProvider";
import { useSettings } from "@/providers/SettingsProvider";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate, formatDateTime } from "@/lib/dateUtils";

export default function TransactionsClient({ lang }: { lang: "en" | "zh" }) {
    const { userProfile: user, transactions, loading } = useUser();
    const { forexRate, withdrawalRate } = useSettings();

    const [typeFilter, setTypeFilter] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateRange, setDateRange] = useState({ start: "", end: "" });
    const [selectedTx, setSelectedTx] = useState<any | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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
            title: "Transaction Ledger",
            subtitle: "Comprehensive audit trail of all capital movements and dividend distributions.",
            tableType: "Type",
            tableDate: "Execution Date",
            tableAmount: "Net Amount (USD)",
            tableStatus: "Audit Status",
            tableActions: "Actions",
            details: "Details",
            typeLabel: "Type",
            statusLabel: "Status",
            dateRange: "Date Range",
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
            totalInView: "视图内总额",
            title: "交易账本",
            subtitle: "所有资金变动和分红分配的全面审计轨迹。",
            tableType: "类型",
            tableDate: "执行日期",
            tableAmount: "净额 (USD)",
            tableStatus: "审计状态",
            tableActions: "操作",
            details: "详情",
            typeLabel: "类型",
            statusLabel: "状态",
            dateRange: "日期范围",
        }
    }[lang];

    const filteredTransactions = transactions.filter(tx => {
        // 1. Type Filter
        let matchesType = true;
        if (typeFilter !== 'all') {
            const txType = tx.type?.toLowerCase();
            const isDiv = tx.metadata?.adjustment_category === 'Dividend' || tx.metadata?.adjustment_category === 'Bonus' || txType?.includes('dividend') || txType?.includes('bonus');
            
            if (typeFilter === 'dividend') matchesType = isDiv;
            else if (typeFilter === 'deposit') matchesType = txType === 'deposit';
            else if (typeFilter === 'withdraw') matchesType = txType === 'withdrawal' || txType === 'withdraw';
            else if (typeFilter === 'bonus') matchesType = tx.metadata?.adjustment_category === 'Bonus' || txType?.includes('bonus');
        }
        
        // 2. Status Filter
        const matchesStatus = statusFilter === 'all' || tx.status?.toLowerCase() === statusFilter.toLowerCase();

        // 3. Date Range Filter
        const txDate = new Date(tx.created_at || tx.transfer_date);
        const matchesStart = !dateRange.start || txDate >= new Date(dateRange.start);
        const matchesEnd = !dateRange.end || txDate <= new Date(dateRange.end + "T23:59:59");
        
        return matchesType && matchesStatus && matchesStart && matchesEnd;
    });

    const filteredTotalUSD = filteredTransactions
        .filter(tx => ['Approved', 'Completed', 'Pending Release'].includes(tx.status))
        .reduce((acc, tx) => {
            const isWithdrawal = tx.type === 'Withdrawal' || tx.metadata?.adjustment_type === 'Decrease' || tx.metadata?.is_penalty;
            const amountUSD = Number(tx.original_currency_amount || (Number(tx.amount) / forexRate));
            if (isWithdrawal) return acc - Math.abs(amountUSD);
            return acc + amountUSD;
        }, 0);

    const generateStatement = () => {
        if (!user) return;
        const doc = new jsPDF();
        const monthName = t.months[selectedMonth];
        
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 45, 'F');
        
        doc.setTextColor(212, 175, 55);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text("GV CAPITAL TRUST", 20, 28);
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("OFFICIAL INSTITUTIONAL ACCOUNT STATEMENT", 130, 28);
        doc.text("SECURE MULTI-ASSET INVESTMENT TERMINAL", 130, 33);

        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("IDENTIFICATION / AUDIT TRAIL", 20, 55);
        
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`Account Holder: ${user.full_name || user.username}`, 20, 62);
        doc.setFont("helvetica", "normal");
        doc.text(`Statement Period: ${monthName} ${selectedYear}`, 20, 68);
        doc.text(`Date Generated: ${formatDateTime(new Date())}`, 20, 74);
        doc.text(`Currency Base: USD (United States Dollar)`, 20, 80);

        const periodTxs = transactions.filter(tx => {
            const d = new Date(tx.created_at || tx.transfer_date);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });

        const getUSD = (tx: any) => Number(tx.original_currency_amount || (Number(tx.amount) / forexRate));

        const periodProfitUSD = periodTxs.filter(t => 
            (t.metadata?.adjustment_category === 'Dividend' || t.metadata?.adjustment_category === 'Bonus' || t.type?.toLowerCase().includes('dividend') || t.type?.toLowerCase().includes('bonus')) &&
            t.status === 'Approved'
        ).reduce((acc, t) => acc + getUSD(t), 0);

        const totalDepositsUSD = periodTxs.filter(tx => tx.type === 'Deposit' && tx.status === 'Approved').reduce((acc, tx) => acc + getUSD(tx), 0);
        const totalWithdrawalsUSD = periodTxs.filter(tx => (tx.type === 'Withdrawal' || tx.type === 'withdraw') && !tx.metadata?.is_penalty && ['Approved', 'Completed', 'Pending Release'].includes(tx.status)).reduce((acc, tx) => acc + Math.abs(getUSD(tx)), 0);
        const totalPenaltiesUSD = periodTxs.filter(tx => (tx.metadata?.is_penalty || tx.metadata?.description?.toLowerCase().includes('penalty')) && ['Approved', 'Completed'].includes(tx.status)).reduce((acc, tx) => acc + Math.abs(getUSD(tx)), 0);
        
        const closingBalanceUSD = (Number(user.balance_usd || (Number(user.total_investment || 0) / forexRate))) + (Number(user.profit || 0));
        const openingBalanceUSD = closingBalanceUSD - totalDepositsUSD + totalWithdrawalsUSD + totalPenaltiesUSD - periodProfitUSD;

        const formatUSD = (usd: number) => `$ ${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        const summaryBody = [
            ['Opening Balance', formatUSD(openingBalanceUSD)],
            ['Total Net Deposits', formatUSD(totalDepositsUSD)],
            ['Total Monthly Dividends', formatUSD(periodProfitUSD)],
            ['Total Withdrawals (Net)', formatUSD(totalWithdrawalsUSD)],
        ];

        if (totalPenaltiesUSD > 0) summaryBody.push(['Early Withdrawal Penalties', `-${formatUSD(totalPenaltiesUSD)}`]);
        summaryBody.push(['Closing Balance', formatUSD(closingBalanceUSD)]);

        autoTable(doc, {
            startY: 90,
            head: [['Account Summary', 'Financial Position (USD)']],
            body: summaryBody,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: [212, 175, 55], fontStyle: 'bold' },
            bodyStyles: { fontSize: 9, cellPadding: 5 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
        });

        const txBody = periodTxs.map(tx => {
            const usd = getUSD(tx);
            const isWithdrawal = tx.type === 'Withdrawal' || tx.metadata?.adjustment_type === 'Decrease';
            const rateToUse = tx.metadata?.forex_rate || (isWithdrawal ? withdrawalRate : forexRate);
            const rm = usd * rateToUse;
            let typeDesc = tx.metadata?.description || tx.type;
            
            return [
                formatDate(tx.created_at || tx.transfer_date),
                tx.ref_id || "-",
                typeDesc,
                { content: `$ ${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nRM ${rm.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, styles: { fontSize: 8, halign: 'right' } }
            ];
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 15,
            head: [['Date', 'Reference ID', 'Position Description', 'Net Amount (Base/Local)']],
            body: txBody,
            theme: 'striped',
            headStyles: { fillColor: [71, 85, 105], fontSize: 8 },
            bodyStyles: { fontSize: 8, cellPadding: 4 },
            columnStyles: { 2: { cellWidth: 80 }, 3: { halign: 'right', fontStyle: 'bold' } }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setDrawColor(226, 232, 240);
        doc.line(20, finalY, 190, finalY);
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(7);
        doc.text("SECURITY CLASSIFICATION: CONFIDENTIAL", 20, finalY + 10);
        doc.text("This statement is electronically generated and verified by GV Capital Trust Fiduciary Systems.", 20, finalY + 15);

        const pdfBlobUrl = doc.output("bloburl").toString();
        setPreviewUrl(pdfBlobUrl);
        setIsPreviewOpen(true);
    };

    const downloadPdf = () => {
        if (!previewUrl) return;
        const link = document.createElement("a");
        link.href = previewUrl;
        link.download = `GV_Institutional_Statement_${t.months[selectedMonth]}_${selectedYear}.pdf`;
        link.click();
    };

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Institutional Header & Controls */}
            <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 md:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 shadow-sm">
                <div className="space-y-4">
                    <div className="hidden md:flex items-center gap-3">
                        <div className="h-0.5 w-10 bg-gv-gold rounded-full"></div>
                        <span className="text-gv-gold text-[10px] font-black uppercase tracking-[0.4em] mb-0.5">Institutional Log</span>
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">{t.title}</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">{t.subtitle}</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex flex-col gap-1.5 min-w-[140px]">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.typeLabel}</span>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-gv-gold transition-all text-slate-900 appearance-none cursor-pointer"
                        >
                            <option value="all">{lang === "en" ? "All Types" : "所有类型"}</option>
                            <option value="deposit">{lang === "en" ? "Deposits" : "存款"}</option>
                            <option value="withdraw">{lang === "en" ? "Withdrawals" : "提款"}</option>
                            <option value="dividend">{lang === "en" ? "Dividends" : "分红"}</option>
                            <option value="bonus">{lang === "en" ? "Bonuses" : "奖金"}</option>
                        </select>
                    </div>
                    
                    <div className="flex flex-col gap-1.5 min-w-[140px]">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.statusLabel}</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-gv-gold transition-all text-slate-900 appearance-none cursor-pointer"
                        >
                            <option value="all">{lang === "en" ? "All Status" : "所有状态"}</option>
                            <option value="Completed">{lang === "en" ? "Completed" : "已完成"}</option>
                            <option value="Pending">{lang === "en" ? "Pending" : "处理中"}</option>
                            <option value="Rejected">{lang === "en" ? "Rejected" : "已拒绝"}</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.dateRange}</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-gv-gold transition-all text-slate-900"
                            />
                            <span className="text-slate-300 font-bold text-[10px]">TO</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-gv-gold transition-all text-slate-900"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 px-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.totalInView}:</span>
                <span className={`text-sm font-black tabular-nums ${filteredTotalUSD >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {filteredTotalUSD >= 0 ? '+' : '-'}$ {Math.abs(filteredTotalUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>
            </div>

            <div className="bg-white border border-gray-200 rounded-[32px] overflow-hidden shadow-2xl relative">
                <div className="overflow-x-auto overflow-y-auto max-h-[650px] scrollbar-thin scrollbar-thumb-gray-200">
                    <table className="w-full text-left border-collapse min-w-[850px] lg:min-w-full">
                        <thead className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10 backdrop-blur-md">
                            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                <th className="px-6 py-6 pl-10 whitespace-nowrap">{t.tableType}</th>
                                <th className="px-6 py-6 whitespace-nowrap">{t.tableDate}</th>
                                <th className="px-6 py-6 whitespace-nowrap">{t.tableAmount}</th>
                                <th className="px-6 py-6 whitespace-nowrap">{t.tableStatus}</th>
                                <th className="px-6 py-6 pr-10 text-right whitespace-nowrap">{t.tableActions}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredTransactions.map((tx, idx) => {
                                const isWithdrawal = tx.type === 'Withdrawal' || tx.metadata?.adjustment_type === 'Decrease' || tx.metadata?.is_penalty;
                                const amountUSD = Number(tx.original_currency_amount || (Number(tx.amount) / forexRate));
                                const displayAmount = isWithdrawal ? -Math.abs(amountUSD) : amountUSD;
                                // Rule: Withdrawals use forexRate - 0.4
                                const rateToUse = tx.metadata?.forex_rate || (isWithdrawal ? (forexRate - 0.4) : forexRate);
                                const payoutRM = Math.abs(displayAmount) * rateToUse;
                                const currentUserTier = (user?.tier && user?.tier !== "Standard") ? user.tier.toLowerCase() : getTierByAmount(Number(user?.balance_usd || 0)).id;

                                return (
                                    <tr key={tx.id || idx} className="group hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-0 border-collapse">
                                        <td className="px-6 py-6 pl-10">
                                            <div className="flex items-center gap-4">
                                                <div className={`h-10 w-10 md:h-12 md:w-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
                                                    isWithdrawal ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 group-hover:scale-110' : 
                                                    tx.type === 'Deposit' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 group-hover:rotate-12' : 
                                                    'bg-gv-gold/10 text-gv-gold border-gv-gold/20 group-hover:-translate-y-1'
                                                }`}>
                                                    {isWithdrawal ? <TierMedal tierId={currentUserTier} size="xs" /> : 
                                                    tx.type === 'Deposit' ? <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg> :
                                                    <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="font-black text-slate-900 uppercase tracking-tight text-sm group-hover:text-gv-gold transition-colors truncate max-w-[120px]">{tx.type}</span>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">Net Ledger</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-slate-500 font-mono text-[11px] font-bold tabular-nums">{formatDate(tx.created_at || tx.transfer_date)}</span>
                                                <span className="text-[9px] text-slate-300 font-bold tabular-nums uppercase">{new Date(tx.created_at || tx.transfer_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col">
                                                <span className={`font-black tabular-nums text-lg leading-none ${displayAmount < 0 ? 'text-slate-400' : 'text-emerald-500'}`}>
                                                    {displayAmount < 0 ? '-' : '+'} $ {Math.abs(displayAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-[9px] text-slate-300 font-bold uppercase mt-1 tracking-widest">≈ RM {payoutRM.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                                                ['Approved', 'Completed'].includes(tx.status) ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                tx.status === 'Pending Release' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                tx.status === 'Rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                            }`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6 pr-10 text-right">
                                            <button 
                                                onClick={() => { setSelectedTx(tx); setIsDetailsOpen(true); }} 
                                                className="bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest px-8 py-3 rounded-2xl transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                                            >
                                                {t.details}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredTransactions.length === 0 && (
                        <div className="p-20 text-center flex flex-col items-center gap-4">
                            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            </div>
                            <span className="text-slate-400 font-black uppercase tracking-widest">{t.noTxFound}</span>
                        </div>
                    )}
                </div>
            </div>

            <section className="bg-slate-900 border border-slate-800 p-8 md:p-10 rounded-[32px] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gv-gold/5 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-1000"></div>
                <div className="relative z-10 max-w-2xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-1 w-8 bg-gv-gold rounded-full"></div>
                        <h2 className="text-white text-xl font-black uppercase tracking-tight">{t.statementCenter}</h2>
                    </div>
                    <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed">{t.statementCenterDesc}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                        <div className="space-y-3">
                            <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest px-1">{t.selectMonth}</label>
                            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-base font-semibold focus:outline-none focus:border-gv-gold transition-all text-white appearance-none cursor-pointer">
                                {t.months.map((m, i) => <option key={i} value={i} className="bg-slate-800">{m}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest px-1">{t.selectYear}</label>
                            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-base font-semibold focus:outline-none focus:border-gv-gold transition-all text-white appearance-none cursor-pointer">
                                {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-slate-800">{y}</option>)}
                            </select>
                        </div>
                    </div>

                    <button onClick={generateStatement} className="bg-gv-gold text-black font-black py-4 px-10 rounded-2xl text-xs uppercase tracking-widest shadow-xl hover:-translate-y-0.5 transition-all active:translate-y-0">
                        {t.generateDownload}
                    </button>
                </div>
            </section>

            {isDetailsOpen && selectedTx && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-500 p-8 md:p-10">
                        <div className="flex flex-col gap-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Transaction Details</h3>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Audit Trace: {selectedTx.ref_id || selectedTx.id}</p>
                                </div>
                                <button onClick={() => setIsDetailsOpen(false)} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-all border border-slate-100 shadow-sm hover:rotate-90">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                            <div className="h-1 w-4 bg-gv-gold rounded-full"></div>
                                            Financial Breakdown
                                        </h4>
                                        <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl space-y-4">
                                            <div className="flex justify-between text-xs font-bold items-center">
                                                <span className="text-slate-400 uppercase tracking-tighter">Gross Amount</span>
                                                <span className="text-slate-900 tabular-nums font-black">$ {Number(selectedTx.metadata?.original_request_amount_usd || selectedTx.original_currency_amount || (Number(selectedTx.amount) / forexRate)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                            {(selectedTx.metadata?.penalty_applied || selectedTx.metadata?.is_penalty) && (
                                                <div className="flex justify-between text-xs font-bold items-center">
                                                    <span className="text-red-400 uppercase italic tracking-tighter">Early Settlement Adjustment</span>
                                                    <span className="text-red-500 tabular-nums font-black">-$ {Number(selectedTx.metadata?.penalty_amount_usd || selectedTx.metadata?.original_usd_penalty || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                            <div className="pt-4 border-t border-slate-200 flex flex-col items-end gap-1.5 font-black">
                                                <span className="text-[8px] text-emerald-500 uppercase tracking-widest self-start">Final Net Realized</span>
                                                <div className="flex flex-col items-end leading-none">
                                                    <span className="text-3xl text-slate-900 tabular-nums tracking-tighter">$ {Number(selectedTx.metadata?.final_payout_usd || Math.abs(Number(selectedTx.original_currency_amount || (Number(selectedTx.amount) / forexRate)))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    <span className="text-[11px] text-slate-400 mt-1">≈ RM {(Number(selectedTx.metadata?.final_payout_usd || Math.abs(Number(selectedTx.original_currency_amount || (Number(selectedTx.amount) / forexRate)))) * (selectedTx.metadata?.forex_rate || (selectedTx.type === 'Withdrawal' ? withdrawalRate : forexRate))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                            <div className="h-1 w-4 bg-blue-500 rounded-full"></div>
                                            Institutional Context
                                        </h4>
                                        <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl space-y-4">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Reference ID</span>
                                                <span className="text-xs font-mono font-black text-slate-900 select-all tracking-tight uppercase">{selectedTx.ref_id || selectedTx.id}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Transaction Category</span>
                                                <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">{selectedTx.type}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                            <div className="h-1 w-4 bg-emerald-500 rounded-full"></div>
                                            Execution Timeline
                                    </h4>
                                    <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 px-2 pt-1">
                                        <div className="flex items-start gap-6 pl-8 relative">
                                            <div className="h-4 w-4 rounded-full bg-slate-200 absolute left-[3.5px] border-4 border-white shadow-sm"></div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-2">Request Processed</span>
                                                <span className="text-xs font-black text-slate-900 leading-none">{formatDateTime(selectedTx.created_at)}</span>
                                            </div>
                                        </div>

                                        {['Approved', 'Completed', 'Pending Release'].includes(selectedTx.status) && (
                                            <div className="flex items-start gap-6 pl-8 relative">
                                                <div className="h-4 w-4 rounded-full bg-blue-500 absolute left-[3.5px] border-4 border-white shadow-[0_0_12px_rgba(59,130,246,0.3)]"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] leading-none mb-2">Institutional Clearance</span>
                                                    <span className="text-xs font-black text-slate-900 leading-none">{formatDateTime(selectedTx.updated_at)}</span>
                                                </div>
                                            </div>
                                        )}

                                        {['Approved', 'Completed'].includes(selectedTx.status) && (
                                            <div className="flex items-start gap-6 pl-8 relative">
                                                <div className="h-4 w-4 rounded-full bg-emerald-500 absolute left-[3.5px] border-4 border-white shadow-[0_0_12px_rgba(16,185,129,0.3)]"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] leading-none mb-2">Capital Finalized</span>
                                                    <span className="text-xs font-black text-slate-900 leading-none">{formatDateTime(selectedTx.updated_at)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isPreviewOpen && previewUrl && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[3rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-500">
                        <div className="p-6 md:p-8 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                            <div>
                                <h3 className="text-base font-black uppercase text-slate-900 tracking-tight">Institutional Statement Preview</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Verify before download</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <button onClick={downloadPdf} className="bg-slate-900 text-white font-black py-3 px-8 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2">Download File</button>
                                <button onClick={() => setIsPreviewOpen(false)} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white text-slate-400 border border-slate-200">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden bg-slate-800">
                            <iframe src={previewUrl} className="w-full h-full border-none" title="PDF Preview" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
