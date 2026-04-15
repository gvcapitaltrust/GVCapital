"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/providers/UserProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { ArrowLeft, X, Eye } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate, formatDateTime } from "@/lib/dateUtils";
import { getTierByAmount } from "@/lib/tierUtils";
import TierMedal from "@/components/TierMedal";

export default function TransactionsClient({ lang }: { lang: "en" | "zh" }) {
    const router = useRouter();
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
    const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
    const [isReceiptOpen, setIsReceiptOpen] = useState(false);

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
            title: "Transaction History",
            subtitle: "Track your deposits, withdrawals, and earnings in one place.",
            tableType: "Type",
            tableDate: "Date",
            tableAmount: "Net Amount (USD)",
            tableStatus: "Status",
            tableActions: "Actions",
            details: "Details",
            typeLabel: "Type",
            statusLabel: "Status",
            dateRange: "Date Range",
            paymentInfo: "Payment Information",
            network: "Network",
            sentTo: "Sent To Address",
            viewReceipt: "View Uploaded Receipt",
            remark: "My Remark"
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
            title: "交易历史",
            subtitle: "在一个地方实时跟踪您的存款、提款和收益情况。",
            tableType: "类型",
            tableDate: "执行日期",
            tableAmount: "净额 (USD)",
            tableStatus: "审计状态",
            tableActions: "操作",
            details: "详情",
            typeLabel: "类型",
            statusLabel: "状态",
            dateRange: "日期范围",
            paymentInfo: "支付信息",
            network: "网络",
            sentTo: "发送至地址",
            viewReceipt: "查看已上传凭证",
            remark: "我的备注"
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
    
    const handleViewReceipt = async (tx: any) => {
        if (!tx.receipt_url) return;
        setReceiptUrl(null);
        setIsReceiptOpen(true);
        try {
            const { data, error } = await supabase.storage.from('agreements').createSignedUrl(tx.receipt_url, 3600);
            if (error || !data) throw error;
            setReceiptUrl(data.signedUrl);
        } catch (err) {
            console.error(err);
        }
    };

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
            let typeDesc = tx.metadata?.description || tx.type;
            
            return [
                formatDate(tx.created_at || tx.transfer_date),
                tx.ref_id || "-",
                typeDesc,
                { content: `$ ${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontSize: 8, halign: 'right' } }
            ];
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 15,
            head: [['Date', 'Reference ID', 'Position Description', 'Net Amount (USD)']],
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
            {/* Standard Header */}
            <div className="flex items-center gap-6">
                <button 
                    onClick={() => router.push(`/dashboard?lang=${lang}`)}
                    className="h-12 w-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gv-gold transition-all shadow-sm hover:shadow-md"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{t.title}</h1>
                    <p className="text-slate-400 text-sm font-medium">{t.subtitle}</p>
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
                    <table className="w-full text-left border-collapse hidden md:table">
                        <thead className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10 backdrop-blur-md">
                            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                <th className="px-4 py-3 pl-8 whitespace-nowrap">{t.tableType}</th>
                                <th className="px-4 py-3 whitespace-nowrap">{t.tableDate}</th>
                                <th className="px-4 py-3 whitespace-nowrap">{t.tableAmount}</th>
                                <th className="px-4 py-3 whitespace-nowrap">{t.tableStatus}</th>
                                <th className="px-4 py-3 pr-8 text-right whitespace-nowrap">{t.tableActions}</th>
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
                                        <td className="px-4 py-3 pl-8">
                                            <div className="flex items-center gap-4">
                                                <div className={`h-10 w-10 md:h-12 md:w-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
                                                    isWithdrawal ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 group-hover:scale-110' : 
                                                    tx.type === 'Deposit' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 group-hover:rotate-12' : 
                                                    'bg-gv-gold/10 text-gv-gold border-gv-gold/20 group-hover:-translate-y-1'
                                                }`}>
                                                    {isWithdrawal ? <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg> : 
                                                    tx.type === 'Deposit' ? <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg> :
                                                    <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="font-black text-slate-900 uppercase tracking-tight text-sm group-hover:text-gv-gold transition-colors truncate max-w-[120px]">{tx.type}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-slate-500 font-mono text-[11px] font-bold tabular-nums">{formatDate(tx.created_at || tx.transfer_date)}</span>
                                                <span className="text-[9px] text-slate-300 font-bold tabular-nums uppercase">{new Date(tx.created_at || tx.transfer_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className={`font-black tabular-nums text-base leading-none ${displayAmount < 0 ? 'text-slate-400' : 'text-emerald-500'}`}>
                                                    {displayAmount < 0 ? '-' : '+'} $ {Math.abs(displayAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5 px-1 whitespace-nowrap">
                                                <div className={`h-1.5 w-1.5 rounded-full ${
                                                    ['Approved', 'Completed'].includes(tx.status) ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' :
                                                    tx.status === 'Pending Release' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)] animate-pulse' :
                                                    tx.status === 'Rejected' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' :
                                                    'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)] animate-pulse'
                                                }`} />
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${
                                                    ['Approved', 'Completed'].includes(tx.status) ? 'text-emerald-600' :
                                                    tx.status === 'Pending Release' ? 'text-blue-600' :
                                                    tx.status === 'Rejected' ? 'text-red-500' :
                                                    'text-amber-600'
                                                }`}>
                                                    {tx.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 pr-8 text-right">
                                            <button 
                                                onClick={() => { setSelectedTx(tx); setIsDetailsOpen(true); }} 
                                                className="bg-slate-900 text-white hover:bg-slate-800 text-[9px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                                            >
                                                {t.details}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Mobile View (Cards) */}
                    <div className="md:hidden divide-y divide-slate-50">
                        {filteredTransactions.map((tx, idx) => {
                            const isWithdrawal = tx.type === 'Withdrawal' || tx.metadata?.adjustment_type === 'Decrease' || tx.metadata?.is_penalty;
                            const amountUSD = Number(tx.original_currency_amount || (Number(tx.amount) / forexRate));
                            const displayAmount = isWithdrawal ? -Math.abs(amountUSD) : amountUSD;

                            return (
                                <div key={tx.id || idx} className="p-3 space-y-3 hover:bg-slate-50 transition-all flex flex-col" onClick={() => { setSelectedTx(tx); setIsDetailsOpen(true); }}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${
                                                isWithdrawal ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                                                tx.type === 'Deposit' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                                'bg-gv-gold/10 text-gv-gold border-gv-gold/20'
                                            }`}>
                                                {isWithdrawal ? <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg> : 
                                                tx.type === 'Deposit' ? <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg> :
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-900 uppercase tracking-tight text-xs">{tx.type}</span>
                                                <span className="text-[10px] text-slate-400 font-mono font-bold">{formatDate(tx.created_at || tx.transfer_date)}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`font-black tabular-nums text-sm ${displayAmount < 0 ? 'text-slate-400' : 'text-emerald-500'}`}>
                                                {displayAmount < 0 ? '-' : '+'} $ {Math.abs(displayAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                            <div className="mt-1 flex justify-end">
                                                <div className="flex items-center gap-2 whitespace-nowrap">
                                                    <div className={`h-1 w-1 rounded-full ${
                                                        ['Approved', 'Completed'].includes(tx.status) ? 'bg-emerald-500' :
                                                        tx.status === 'Pending Release' ? 'bg-blue-500 animate-pulse' :
                                                        tx.status === 'Rejected' ? 'bg-red-500' :
                                                        'bg-amber-500 animate-pulse'
                                                    }`} />
                                                    <span className={`text-[8px] font-black uppercase tracking-[0.1em] ${
                                                        ['Approved', 'Completed'].includes(tx.status) ? 'text-emerald-600' :
                                                        tx.status === 'Pending Release' ? 'text-blue-600' :
                                                        tx.status === 'Rejected' ? 'text-red-500' :
                                                        'text-amber-600'
                                                    }`}>
                                                        {tx.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-y-auto max-h-[90vh] scrollbar-thin scrollbar-thumb-slate-200 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-500 p-8 md:p-10">
                        <div className="flex flex-col gap-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Transaction Details</h3>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Reference No: {selectedTx.ref_id || selectedTx.id}</p>
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
                                            Transaction Summary
                                        </h4>
                                        <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl space-y-4">
                                            <div className="flex justify-between text-xs font-bold items-center">
                                                <span className="text-slate-400 uppercase tracking-tighter">Gross Amount</span>
                                                <span className="text-slate-900 tabular-nums font-black">$ {Number(selectedTx.metadata?.original_request_amount_usd || selectedTx.original_currency_amount || (Number(selectedTx.amount) / forexRate)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                            {(selectedTx.metadata?.penalty_applied || selectedTx.metadata?.is_penalty) && (
                                                <div className="flex justify-between text-xs font-bold items-center">
                                                    <span className="text-red-400 uppercase italic tracking-tighter">Penalty (40%)</span>
                                                    <span className="text-red-500 tabular-nums font-black whitespace-nowrap">-$ {Number(selectedTx.metadata?.penalty_amount_usd || selectedTx.metadata?.original_usd_penalty || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                            <div className="pt-4 border-t border-slate-200 flex flex-col items-end gap-1.5 font-black">
                                                <span className="text-[8px] text-emerald-500 uppercase tracking-widest self-start">Total Received</span>
                                                <div className="flex flex-col items-end leading-none">
                                                    <span className="text-3xl text-slate-900 tabular-nums tracking-tighter">$ {Number(selectedTx.metadata?.final_payout_usd || Math.abs(Number(selectedTx.original_currency_amount || (Number(selectedTx.amount) / forexRate)))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {selectedTx.status === 'Rejected' && selectedTx.metadata?.reason && (
                                        <div className="p-6 bg-red-50 border border-red-100 rounded-[2rem] space-y-2 mt-auto">
                                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest px-1">Reject Reason</p>
                                            <p className="text-xs font-bold text-slate-900 leading-relaxed italic">"{selectedTx.metadata.reason}"</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                            <div className="h-1 w-4 bg-emerald-500 rounded-full"></div>
                                            Processing Status
                                    </h4>
                                    <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 px-2 pt-1">
                                        <div className="flex items-start gap-6 pl-8 relative">
                                            <div className="h-4 w-4 rounded-full bg-slate-400 absolute left-[3.5px] border-4 border-white shadow-sm"></div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-2">Submitted</span>
                                                <span className="text-xs font-black text-slate-900 leading-none">{formatDateTime(selectedTx.created_at)}</span>
                                            </div>
                                        </div>

                                        {['Approved', 'Completed', 'Pending Release'].some(s => s.toLowerCase() === selectedTx.status?.toLowerCase()) && (
                                            <div className="flex items-start gap-6 pl-8 relative animate-in slide-in-from-top-4 duration-500">
                                                <div className="h-4 w-4 rounded-full bg-blue-500 absolute left-[3.5px] border-4 border-white shadow-[0_0_12px_rgba(59,130,246,0.3)]"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] leading-none mb-2">Approved</span>
                                                    <span className="text-xs font-black text-slate-900 leading-none">{formatDateTime(selectedTx.updated_at || selectedTx.created_at)}</span>
                                                </div>
                                            </div>
                                        )}

                                        {['Approved', 'Completed'].some(s => s.toLowerCase() === selectedTx.status?.toLowerCase()) && (
                                            <div className="flex items-start gap-6 pl-8 relative animate-in slide-in-from-top-4 duration-700">
                                                <div className="h-4 w-4 rounded-full bg-emerald-500 absolute left-[3.5px] border-4 border-white shadow-[0_0_12px_rgba(16,185,129,0.3)]"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] leading-none mb-2">Fund Released</span>
                                                    <span className="text-xs font-black text-slate-900 leading-none">{formatDateTime(selectedTx.updated_at || selectedTx.created_at)}</span>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {selectedTx.status === 'Rejected' && (
                                            <div className="flex items-start gap-6 pl-8 relative animate-in slide-in-from-top-4 duration-500">
                                                <div className="h-4 w-4 rounded-full bg-red-500 absolute left-[3.5px] border-4 border-white shadow-[0_0_12px_rgba(239,68,68,0.3)]"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] leading-none mb-2">Rejected</span>
                                                    <span className="text-xs font-black text-slate-900 leading-none">{formatDateTime(selectedTx.updated_at || selectedTx.created_at)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {selectedTx.type === 'Deposit' && (
                                        <div className="space-y-4 pt-4 border-t border-slate-100 italic">
                                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 italic">
                                                <div className="h-1 w-4 bg-gv-gold rounded-full italic"></div>
                                                {t.paymentInfo}
                                            </h4>
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{t.network}</span>
                                                    <span className="text-xs font-black text-slate-900 uppercase">
                                                        {selectedTx.metadata?.payment_method?.startsWith('usdt') 
                                                            ? `USDT (${selectedTx.metadata?.payment_method.split('_')[1].toUpperCase()})` 
                                                            : "FPX Online Banking"}
                                                    </span>
                                                </div>
                                                {selectedTx.metadata?.payment_method?.startsWith('usdt') && (
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{t.sentTo}</span>
                                                        <span className="text-[10px] font-mono font-bold text-gv-gold break-all">
                                                            {selectedTx.metadata?.payment_method === 'usdt_sol' ? '5x786gH4cTUzhoSpa8AD5XiWubNu2bfpR5PjHkYjP9i9' :
                                                            selectedTx.metadata?.payment_method === 'usdt_tron' ? 'TErRkQXxTaLBB6VCafeaBjzx9Ji5eUZGgE' : 
                                                            '0x9b891193b672fd4293a775a0c58f402d256ebd79'}
                                                        </span>
                                                    </div>
                                                )}
                                                {selectedTx.metadata?.remark && (
                                                    <div className="flex flex-col bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                        <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">{t.remark}</span>
                                                        <span className="text-[10px] font-bold text-slate-500 whitespace-pre-wrap leading-relaxed">{selectedTx.metadata.remark}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {selectedTx.receipt_url && (
                                                <button 
                                                    onClick={() => handleViewReceipt(selectedTx)}
                                                    className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-900 text-white font-black py-3 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all border border-slate-900"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    {t.viewReceipt}
                                                </button>
                                            )}
                                        </div>
                                    )}
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
                            <iframe src={previewUrl} className="w-full h-full border-none" title="Official Statement Preview" />
                        </div>
                    </div>
                </div>
            )}

            {isReceiptOpen && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-3xl animate-in fade-in duration-300">
                    <div className="absolute inset-0" onClick={() => setIsReceiptOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-500 max-h-[90vh]">
                        <div className="p-6 md:p-8 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                            <div>
                                <h3 className="text-base font-black uppercase text-slate-900 tracking-tight">Receipt Verification</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Uploaded Proof of Payment</p>
                            </div>
                            <button onClick={() => setIsReceiptOpen(false)} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white text-slate-400 border border-slate-200 hover:text-red-500 transition-all">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 min-h-[400px] flex items-center justify-center">
                            {receiptUrl ? (
                                <img src={receiptUrl} alt="Receipt" className="max-w-full h-auto rounded-xl shadow-lg border border-slate-200" />
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 animate-pulse">Retrieving Secure Link...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
