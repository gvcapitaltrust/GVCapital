"use client";

import React, { useState } from "react";
import { useUser } from "@/providers/UserProvider";
import { useSettings } from "@/providers/SettingsProvider";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate, formatDateTime } from "@/lib/dateUtils";

export default function TransactionsClient({ lang }: { lang: "en" | "zh" }) {
    const { userProfile: user, transactions, dividendHistory, loading } = useUser();
    const { forexRate, withdrawalRate } = useSettings();

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [activeFilter, setActiveFilter] = useState<'All' | 'Capital' | 'Dividends'>('All');
    const [statusFilter, setStatusFilter] = useState('All');
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
        // 1. Type Filter
        const isDiv = tx.metadata?.adjustment_category === 'Dividend' || tx.metadata?.adjustment_category === 'Bonus' || tx.type?.toLowerCase().includes('dividend') || tx.type?.toLowerCase().includes('bonus');
        const matchesType = activeFilter === 'All' || (activeFilter === 'Dividends' ? isDiv : !isDiv);
        
        // 2. Status Filter
        const matchesStatus = statusFilter === 'All' || tx.status === statusFilter;

        // 3. Date Range Filter
        const txDate = new Date(tx.created_at || tx.transfer_date);
        const matchesStart = !dateRange.start || txDate >= new Date(dateRange.start);
        const matchesEnd = !dateRange.end || txDate <= new Date(dateRange.end + "T23:59:59");
        
        return matchesType && matchesStatus && matchesStart && matchesEnd;
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
        
        // Institutional Header
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, 210, 45, 'F');
        
        try {
            doc.addImage("/logo.png", "PNG", 20, 10, 25, 25);
        } catch (e) {
            doc.setTextColor(212, 175, 55); // gv-gold fallback
            doc.setFontSize(24);
            doc.setFont("helvetica", "bold");
            doc.text("GV CAPITAL TRUST", 20, 28);
        }
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("OFFICIAL INSTITUTIONAL ACCOUNT STATEMENT", 130, 28);
        doc.text("SECURE MULTI-ASSET INVESTMENT TERMINAL", 130, 33);

        // Client & Period Info
        doc.setTextColor(100, 116, 139); // slate-500
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("IDENTIFICATION / AUDIT TRAIL", 20, 55);
        
        doc.setTextColor(30, 41, 59); // slate-800
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`Account Holder: ${user.full_name || user.username}`, 20, 62);
        doc.setFont("helvetica", "normal");
        doc.text(`Statement Period: ${monthName} ${selectedYear}`, 20, 68);
        doc.text(`Date Generated: ${formatDateTime(new Date())}`, 20, 74);
        doc.text(`Currency Base: USD (United States Dollar)`, 20, 80);

        // Data processing - Institutional Consistency
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
        const totalWithdrawalsUSD = periodTxs.filter(tx => tx.type === 'Withdrawal' && !tx.metadata?.is_penalty && ['Approved', 'Completed', 'Pending Release'].includes(tx.status)).reduce((acc, tx) => acc + Math.abs(getUSD(tx)), 0);
        const totalPenaltiesUSD = periodTxs.filter(tx => (tx.metadata?.is_penalty || tx.metadata?.description?.toLowerCase().includes('penalty')) && ['Approved', 'Completed'].includes(tx.status)).reduce((acc, tx) => acc + Math.abs(getUSD(tx)), 0);
        
        const closingBalanceUSD = (Number(user.balance_usd || (Number(user.total_investment || 0) / forexRate))) + (Number(user.profit || 0));
        const openingBalanceUSD = closingBalanceUSD - totalDepositsUSD + totalWithdrawalsUSD + totalPenaltiesUSD - periodProfitUSD;

        const formatUSD = (usd: number) => `$ ${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const formatDual = (usd: number, isWithdrawal: boolean = false) => {
            const rate = isWithdrawal ? withdrawalRate : forexRate;
            return `$ ${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (RM ${(usd * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
        };

        const summaryBody = [
            ['Opening Balance', formatUSD(openingBalanceUSD)],
            ['Total Net Deposits', formatUSD(totalDepositsUSD)],
            ['Total Monthly Dividends (Dividend Received)', formatUSD(periodProfitUSD)],
            ['Total Withdrawals (Net)', formatUSD(totalWithdrawalsUSD)],
        ];

        if (totalPenaltiesUSD > 0) {
            summaryBody.push(['Early Withdrawal Penalties', `-${formatUSD(totalPenaltiesUSD)}`]);
        }

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

        // Transaction List - Detailed Breakdown
        const txBody = periodTxs.map(tx => {
            const usd = getUSD(tx);
            const isWithdrawal = tx.type === 'Withdrawal' || tx.metadata?.adjustment_type === 'Decrease';
            const rateToUse = tx.metadata?.forex_rate || (isWithdrawal ? withdrawalRate : forexRate);
            const rm = usd * rateToUse;
            let typeDesc = tx.metadata?.description || tx.type;
            const isDiv = tx.metadata?.adjustment_category === 'Dividend' || tx.type === 'Dividend';
            
            if (isDiv && (!tx.metadata?.description || tx.metadata?.description === 'Dividend')) {
                typeDesc = "Dividend Received";
            }
            
            // Add details for penalized withdrawals
            if (tx.type === 'Withdrawal' && tx.metadata?.penalty_applied) {
                const grossUSD = Number(tx.metadata?.original_request_amount_usd || usd);
                const penaltyUSD = Number(tx.metadata?.penalty_amount_usd || (grossUSD * 0.4));
                const bank = tx.metadata?.bank_name || "Institutional Bank";
                const acc = tx.metadata?.account_number || "Verified Account";
                
                typeDesc = {
                    content: `${typeDesc}\nGross: $${grossUSD.toFixed(2)} | Penalty: $${penaltyUSD.toFixed(2)}\nPay to: ${bank} (${acc})`,
                    styles: { fontSize: 7, textColor: [100, 116, 139] }
                } as any;
            } else if (tx.type === 'Deposit') {
                 typeDesc = `${typeDesc}\nVerification: Hash Certified`;
            }

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

        // Fiduciary Footer
        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setDrawColor(226, 232, 240);
        doc.line(20, finalY, 190, finalY);
        
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(7);
        doc.text("SECURITY CLASSIFICATION: CONFIDENTIAL", 20, finalY + 10);
        doc.text("This statement is electronically generated and verified by GV Capital Trust Fiduciary Systems. No physical signature required.", 20, finalY + 15);
        doc.text("For support, please contact your account manager directly via the secure portal.", 20, finalY + 20);

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
        <div className="space-y-12 pb-20">
            <section className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-[2rem] p-6 md:p-8 flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Period</label>
                            <div className="flex gap-2">
                                <input 
                                    type="date" 
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-gv-gold transition-all" 
                                />
                                <span className="text-gray-300 self-center">-</span>
                                <input 
                                    type="date" 
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-gv-gold transition-all" 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Transaction Types</label>
                            <select 
                                value={activeFilter}
                                onChange={(e) => setActiveFilter(e.target.value as any)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-gv-gold transition-all text-gray-900"
                            >
                                <option value="All">All Transactions</option>
                                <option value="Capital">Capital Flow</option>
                                <option value="Dividends">Dividends & Bonuses</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Status</label>
                            <select 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-gv-gold transition-all text-gray-900"
                            >
                                <option value="All">All Status</option>
                                <option value="Pending">Pending</option>
                                <option value="Pending Release">Pending Release</option>
                                <option value="Approved">Approved</option>
                                <option value="Completed">Completed</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        </div>

                        <div className="flex items-end gap-2 text-sm font-bold">
                           <button 
                                onClick={() => { setDateRange({ start: "", end: "" }); setStatusFilter('All'); setActiveFilter('All'); }}
                                className="flex-1 bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 py-2.5 rounded-xl transition-all uppercase text-[10px] font-black tracking-widest"
                           >
                               Clear
                           </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 px-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.totalInView}:</span>
                    <span className={`text-sm font-black tabular-nums ${filteredTotalUSD >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {filteredTotalUSD >= 0 ? '+' : '-'}$ {Math.abs(filteredTotalUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </span>
                </div>

                <div className="border border-gray-200 rounded-[32px] overflow-hidden bg-white backdrop-blur-md shadow-2xl relative">
                    <div className="max-h-[600px] overflow-auto scrollbar-thin scrollbar-thumb-gray-300">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead className="bg-gray-50/50 border-b border-gray-100 sticky top-0 z-10 backdrop-blur-md">
                                <tr className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                    <th className="px-8 py-5 whitespace-nowrap">{t.date}</th>
                                    <th className="px-8 py-5 whitespace-nowrap">{t.refId}</th>
                                    <th className="px-8 py-5 whitespace-nowrap">Category</th>
                                    <th className="px-8 py-5 whitespace-nowrap">{t.status}</th>
                                    <th className="px-8 py-5 text-right whitespace-nowrap">{t.amount}</th>
                                    <th className="px-8 py-5 text-right whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredTransactions.map((tx, idx) => {
                                    const isWithdrawal = tx.type === 'Withdrawal' || tx.metadata?.adjustment_type === 'Decrease' || tx.metadata?.is_penalty || tx.metadata?.description?.toLowerCase().includes('penalty');
                                    const amountUSD = Number(tx.original_currency_amount || (Number(tx.amount) / forexRate));
                                    const displayAmount = isWithdrawal ? -Math.abs(amountUSD) : amountUSD;
                                    const isDiv = tx.metadata?.adjustment_category === 'Dividend' || tx.metadata?.adjustment_category === 'Bonus' || tx.type?.toLowerCase().includes('dividend') || tx.type?.toLowerCase().includes('bonus');
                                    const rateToUse = tx.metadata?.forex_rate || (isWithdrawal ? withdrawalRate : forexRate);
                                    const payoutRM = Math.abs(displayAmount) * rateToUse;

                                    return (
                                        <tr key={tx.id || idx} className="group hover:bg-gray-50/50 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-gray-900 tracking-tight">{formatDate(tx.created_at || tx.transfer_date)}</span>
                                                    <span className="text-[9px] text-gray-400 font-bold tabular-nums">{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-[10px] font-mono font-bold text-gray-500 uppercase select-all group-hover:text-gv-gold transition-colors">{tx.ref_id || "-"}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">
                                                        {isDiv && (!tx.metadata?.description || tx.metadata?.description === 'Dividend') ? "Dividend Received" : (tx.metadata?.description || tx.type)}
                                                    </span>
                                                    <span className="text-[9px] text-gray-400 font-bold uppercase">{isDiv ? 'Fiduciary Distribution' : 'Institutional Flow'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                                                    ['Approved', 'Completed'].includes(tx.status) ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                    tx.status === 'Pending Release' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                    tx.status === 'Rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                }`}>{tx.status}</span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-sm font-black tabular-nums tracking-tighter ${displayAmount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        {displayAmount >= 0 ? '+' : '-'}$ {Math.abs(displayAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                    <span className="text-[9px] font-black text-gray-400 mt-0.5 tracking-tighter">
                                                        ≈ RM {payoutRM.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button 
                                                    onClick={() => { setSelectedTx(tx); setIsDetailsOpen(true); }}
                                                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    Details
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredTransactions.length === 0 && (
                            <div className="p-20 text-center flex flex-col items-center gap-4">
                                <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                </div>
                                <span className="text-gray-400 font-black uppercase tracking-widest">{t.noTxFound}</span>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="bg-gray-50 border border-gray-200 p-8 rounded-[32px] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gv-gold/5 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-1000"></div>
                <div className="relative z-10 max-w-2xl">
                    <h2 className="text-xl font-bold uppercase tracking-tight mb-3">{t.statementCenter}</h2>
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

            {/* Institutional Details Modal */}
            {isDetailsOpen && selectedTx && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 px-6">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-500 p-8">
                        <div className="flex flex-col gap-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">Transaction Details</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Audit Ref: {selectedTx.ref_id || selectedTx.id}</p>
                                </div>
                                <button 
                                    onClick={() => setIsDetailsOpen(false)}
                                    className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 transition-colors"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Financial Breakdown</h4>
                                        <div className="bg-gray-50 border border-gray-100 p-6 rounded-3xl space-y-3">
                                            <div className="flex justify-between text-xs font-bold items-center">
                                                <span className="text-gray-400 uppercase tracking-tighter">Gross Principal</span>
                                                <span className="text-gray-900 tabular-nums font-black">$ {Number(selectedTx.metadata?.original_request_amount_usd || selectedTx.original_currency_amount || (Number(selectedTx.amount) / forexRate)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                            {selectedTx.metadata?.penalty_applied && (
                                                <div className="flex justify-between text-xs font-bold items-center">
                                                    <span className="text-red-400 uppercase italic tracking-tighter">Early Settlement (40%)</span>
                                                    <span className="text-red-500 tabular-nums font-black">-$ {Number(selectedTx.metadata?.penalty_amount_usd || selectedTx.metadata?.original_usd_penalty || (Number(selectedTx.metadata?.finalized_penalty) / forexRate)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                            <div className="pt-3 border-t border-gray-200 flex flex-col items-end gap-1">
                                                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest self-start">Final Net Realized</span>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-2xl font-black text-emerald-500 tabular-nums tracking-tighter leading-none">$ {Number(selectedTx.metadata?.final_payout_usd || selectedTx.metadata?.original_usd_payout || selectedTx.original_currency_amount || (Number(selectedTx.metadata?.finalized_payout || selectedTx.amount) / forexRate)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    <span className="text-[10px] font-black text-gray-400 mt-1">≈ RM {(Number(selectedTx.metadata?.final_payout_usd || selectedTx.metadata?.original_usd_payout || selectedTx.original_currency_amount || (Number(selectedTx.metadata?.finalized_payout || selectedTx.amount) / forexRate)) * (selectedTx.metadata?.forex_rate || (selectedTx.type === 'Withdrawal' ? withdrawalRate : forexRate))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Processing Location</h4>
                                        <div className="bg-white border border-gray-100 p-5 rounded-3xl space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-gv-gold shadow-[0_0_8px_rgba(212,175,55,0.4)]"></div>
                                                <span className="text-[10px] font-black text-gray-900 uppercase">{selectedTx.metadata?.bank_name || user?.bank_name || "Institutional Account"}</span>
                                            </div>
                                            <p className="text-xs font-mono font-bold text-gv-gold select-all tracking-tight break-all">{selectedTx.metadata?.account_number || user?.account_number || "Verified Account on File"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Execution Timeline</h4>
                                        <div className="space-y-6 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-gray-100 px-2 pt-1">
                                            <div className="flex items-start gap-4 pl-6 relative">
                                                <div className="h-3 w-3 rounded-full bg-zinc-300 absolute left-[1.5px] border-2 border-white"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Request Initiated</span>
                                                    <span className="text-xs font-bold text-gray-900">{formatDateTime(selectedTx.created_at)}</span>
                                                </div>
                                            </div>

                                            {['Approved', 'Completed', 'Pending Release'].includes(selectedTx.status) && (
                                                <div className="flex items-start gap-4 pl-6 relative">
                                                    <div className="h-3 w-3 rounded-full bg-blue-500 absolute left-[1.5px] border-2 border-white shadow-[0_0_8px_rgba(59,130,246,0.3)]"></div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">Audit Approved</span>
                                                        <span className="text-xs font-bold text-gray-900">{formatDateTime(selectedTx.metadata?.approved_at || selectedTx.updated_at)}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {['Approved', 'Completed'].includes(selectedTx.status) && (
                                                <div className="flex items-start gap-4 pl-6 relative">
                                                    <div className="h-3 w-3 rounded-full bg-emerald-500 absolute left-[1.5px] border-2 border-white shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-1">Funds Released</span>
                                                        <span className="text-xs font-bold text-gray-900">{formatDateTime(selectedTx.metadata?.released_at || selectedTx.metadata?.completed_at || selectedTx.updated_at)}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {selectedTx.status === 'Rejected' && (
                                                <div className="flex items-start gap-4 pl-6 relative">
                                                    <div className="h-3 w-3 rounded-full bg-red-500 absolute left-[1.5px] border-2 border-white shadow-[0_0_8px_rgba(239,68,68,0.3)]"></div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest leading-none mb-1">Request Denied</span>
                                                        <span className="text-xs font-bold text-gray-900">{formatDateTime(selectedTx.metadata?.rejected_at || selectedTx.updated_at)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {selectedTx.status === 'Rejected' && selectedTx.metadata?.reason && (
                                        <div className="p-5 bg-red-50 border border-red-100 rounded-[2rem] space-y-1">
                                            <p className="text-[9px] font-black text-red-400 uppercase tracking-widest px-1">Rejection Basis</p>
                                            <p className="text-[11px] font-bold text-gray-900 leading-relaxed italic">"{selectedTx.metadata.reason}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
