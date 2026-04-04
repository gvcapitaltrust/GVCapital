"use client";

import React, { useState } from "react";
import { useUser } from "@/providers/UserProvider";
import { useSettings } from "@/providers/SettingsProvider";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate, formatDateTime } from "@/lib/dateUtils";

export default function TransactionsClient({ lang }: { lang: "en" | "zh" }) {
    const { userProfile: user, transactions, dividendHistory, loading } = useUser();
    const { forexRate } = useSettings();

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [activeFilter, setActiveFilter] = useState<'All' | 'Capital' | 'Dividends'>('All');
    const [expandedId, setExpandedId] = useState<string | null>(null);
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
        const formatDual = (usd: number) => `$ ${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (RM ${(usd * forexRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;

        const summaryBody = [
            ['Opening Balance', formatUSD(openingBalanceUSD)],
            ['Total Net Deposits', formatUSD(totalDepositsUSD)],
            ['Total Monthly Dividends (Final Received)', formatUSD(periodProfitUSD)],
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
            const rm = usd * forexRate;
            let typeDesc = tx.metadata?.description || tx.type;
            const isDiv = tx.metadata?.adjustment_category === 'Dividend' || tx.type === 'Dividend';
            
            if (isDiv && (!tx.metadata?.description || tx.metadata?.description === 'Dividend')) {
                typeDesc = "Final Received";
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
                    <span className={`text-sm font-black tabular-nums ${filteredTotalUSD >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {filteredTotalUSD >= 0 ? '+' : '-'}$ {Math.abs(filteredTotalUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </span>
                </div>

                <div className="border border-gray-200 rounded-[32px] overflow-hidden bg-white backdrop-blur-md shadow-2xl">
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
                                            <td className="px-6 py-4 text-gray-500 font-mono text-xs">{formatDate(tx.created_at || tx.transfer_date)}</td>
                                            <td className="px-6 py-4 text-gray-400 font-mono text-[11px] opacity-70">{tx.ref_id || "-"}</td>
                                            <td className="px-6 py-4 uppercase tracking-widest text-[10px] font-bold text-gray-900">
                                                <div className="flex items-center gap-2">
                                                    {(tx.type === 'Dividend' || tx.metadata?.adjustment_category === 'Dividend') && (!tx.metadata?.description || tx.metadata?.description === 'Dividend') 
                                                        ? "Final Received" 
                                                        : (tx.metadata?.description || tx.type)}
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
                                                const amountUSD = Number(tx.original_currency_amount || (Number(tx.amount) / forexRate));
                                                const displayAmount = isWithdrawal ? -Math.abs(amountUSD) : amountUSD;
                                                
                                                return (
                                                    <td className={`px-6 py-4 text-right font-black tabular-nums ${displayAmount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        {displayAmount >= 0 ? '+' : '-'}{Math.abs(displayAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                                                <div className="flex justify-between text-xs font-bold gap-4">
                                                                    <span className="text-gray-400 uppercase whitespace-nowrap">Gross Amount</span>
                                                                    <span className="text-gray-900 tabular-nums whitespace-nowrap">$ {Number(tx.original_currency_amount || (Number(tx.amount) / forexRate)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                </div>
                                                                {tx.metadata?.penalty_applied && (
                                                                    <div className="flex justify-between text-xs font-bold gap-4">
                                                                        <span className="text-red-500 uppercase italic whitespace-nowrap">Penalty (40%)</span>
                                                                        <span className="text-red-500 tabular-nums whitespace-nowrap">-$ {(Number(tx.metadata?.original_usd_penalty || (Number(tx.metadata?.finalized_penalty) / forexRate))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between text-xs font-black border-t border-gray-200 pt-2 gap-4">
                                                                    <span className="text-emerald-500 uppercase whitespace-nowrap">{tx.type === 'Deposit' ? 'Final Deposit (Net)' : (tx.type === 'Dividend' ? 'Final Received (Net)' : 'Final Payout (Net)')}</span>
                                                                    <span className="text-emerald-500 underline decoration-gv-gold tabular-nums whitespace-nowrap">$ {(Number(tx.metadata?.original_usd_payout || tx.original_currency_amount || (Number(tx.metadata?.finalized_payout || tx.amount) / forexRate))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                </div>
                                                                {tx.metadata?.remark && (
                                                                    <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">User Remark</p>
                                                                        <p className="text-[11px] font-bold text-gray-600 italic">"{tx.metadata.remark}"</p>
                                                                    </div>
                                                                )}
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
                                                                        <span className="text-[9px] text-gray-500 font-bold">{formatDateTime(tx.created_at)}</span>
                                                                    </div>
                                                                </div>
                                                                {tx.metadata?.approved_at && (
                                                                    <div className="flex items-center gap-3 pl-6 relative">
                                                                        <div className="h-2 w-2 rounded-full bg-blue-500 absolute left-[3.5px] shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[10px] font-black text-blue-400 uppercase">Accepted by {tx.metadata?.processed_by_name || 'Admin'}</span>
                                                                            <span className="text-[9px] text-gray-500 font-bold">{formatDateTime(tx.metadata.approved_at)}</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {['Approved', 'Completed'].includes(tx.status) && (
                                                                    <div className="flex items-center gap-3 pl-6 relative">
                                                                        <div className="h-2 w-2 rounded-full bg-emerald-500 absolute left-[3.5px] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[10px] font-black text-emerald-500 uppercase">Successful</span>
                                                                            <span className="text-[9px] text-gray-500 font-bold">{formatDateTime(tx.metadata?.approved_at || (tx.status === 'Completed' ? tx.updated_at : null))}</span>
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

            {/* Institutional Preview Modal */}
            {isPreviewOpen && previewUrl && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-5xl h-full max-h-[90vh] rounded-[2rem] overflow-hidden flex flex-col shadow-2xl border border-white/20 animate-in zoom-in-95 duration-500">
                        {/* Modal Header */}
                        <div className="bg-slate-900 px-8 py-6 flex items-center justify-between border-b border-slate-800">
                            <div className="flex items-center gap-4">
                                <img src="/logo.png" alt="GV Capital" className="h-10 w-auto object-contain" />
                                <div className="h-8 w-px bg-slate-800 mx-2 hidden sm:block"></div>
                                <div>
                                    <h3 className="text-gv-gold font-bold uppercase tracking-widest text-sm">Statement Preview</h3>
                                    <p className="text-slate-400 text-[10px] uppercase font-black tracking-tight">{t.months[selectedMonth]} {selectedYear}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsPreviewOpen(false)}
                                className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-800 text-white hover:bg-slate-700 transition-colors"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Modal Body (PDF Preview) */}
                        <div className="flex-1 bg-slate-100 p-4 md:p-8 overflow-hidden">
                            <iframe 
                                src={previewUrl} 
                                className="w-full h-full rounded-2xl shadow-inner border border-gray-200 bg-white"
                                title="Fiduciary Statement Preview"
                            />
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-white px-8 py-6 flex items-center justify-between border-t border-gray-100">
                            <div className="hidden md:flex items-center gap-3 text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                <svg className="h-4 w-4 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                <span>Fiduciary Hash Verified Statement</span>
                            </div>
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <button 
                                    onClick={() => setIsPreviewOpen(false)}
                                    className="flex-1 md:flex-none px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all duration-300"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={downloadPdf}
                                    className="flex-1 md:flex-none px-10 py-4 bg-gv-gold rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-[0_10px_30px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_40px_rgba(212,175,55,0.4)] transition-all duration-500 transform hover:-translate-y-1"
                                >
                                    Download Final PDF
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
