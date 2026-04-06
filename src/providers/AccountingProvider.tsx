"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

// ─── Chart of Accounts ───────────────────────────────────────────────────────
export interface Account {
    code: string;
    name: string;
    type: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
    normalBalance: "Debit" | "Credit";
}

export const CHART_OF_ACCOUNTS: Account[] = [
    // Assets (1000s)
    { code: "1000", name: "Cash & Bank (USD)", type: "Asset", normalBalance: "Debit" },
    { code: "1010", name: "Cash & Bank (MYR)", type: "Asset", normalBalance: "Debit" },
    { code: "1100", name: "Client Trust Accounts", type: "Asset", normalBalance: "Debit" },
    { code: "1200", name: "Accounts Receivable", type: "Asset", normalBalance: "Debit" },
    { code: "1300", name: "Forex Trading Account", type: "Asset", normalBalance: "Debit" },
    { code: "1310", name: "Stock Trading Account", type: "Asset", normalBalance: "Debit" },
    { code: "1320", name: "Other Investment Accounts", type: "Asset", normalBalance: "Debit" },
    // Liabilities (2000s)
    { code: "2000", name: "Client Deposits Payable", type: "Liability", normalBalance: "Credit" },
    { code: "2100", name: "Dividends Payable", type: "Liability", normalBalance: "Credit" },
    { code: "2200", name: "Withdrawals Payable", type: "Liability", normalBalance: "Credit" },
    { code: "2300", name: "Pending Deposits (Unverified)", type: "Liability", normalBalance: "Credit" },
    // Equity (3000s)
    { code: "3000", name: "Retained Earnings", type: "Equity", normalBalance: "Credit" },
    { code: "3100", name: "Owner's Capital", type: "Equity", normalBalance: "Credit" },
    // Revenue (4000s)
    { code: "4000", name: "Forex Spread Revenue (Deposit)", type: "Revenue", normalBalance: "Credit" },
    { code: "4010", name: "Forex Spread Revenue (Withdrawal)", type: "Revenue", normalBalance: "Credit" },
    { code: "4100", name: "Early Withdrawal Penalty Income", type: "Revenue", normalBalance: "Credit" },
    { code: "4200", name: "Management Fee Income", type: "Revenue", normalBalance: "Credit" },
    { code: "4300", name: "Forex Trading Gains", type: "Revenue", normalBalance: "Credit" },
    { code: "4310", name: "Stock Capital Gains", type: "Revenue", normalBalance: "Credit" },
    { code: "4320", name: "Other Investment Gains", type: "Revenue", normalBalance: "Credit" },
    // Expenses (5000s)
    { code: "5000", name: "Dividend Distributions", type: "Expense", normalBalance: "Debit" },
    { code: "5100", name: "Bonus Distributions", type: "Expense", normalBalance: "Debit" },
    { code: "5200", name: "Operating Expenses", type: "Expense", normalBalance: "Debit" },
    { code: "5300", name: "Forex Trading Losses", type: "Expense", normalBalance: "Debit" },
    { code: "5310", name: "Stock Capital Losses", type: "Expense", normalBalance: "Debit" },
    { code: "5320", name: "Other Investment Losses", type: "Expense", normalBalance: "Debit" },
];

export const getAccount = (code: string): Account =>
    CHART_OF_ACCOUNTS.find(a => a.code === code) || { code, name: "Unknown", type: "Asset", normalBalance: "Debit" };

// ─── Journal Entry Types ─────────────────────────────────────────────────────
export interface JournalLine {
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
}

export interface JournalEntry {
    id: string;
    date: string;
    refId: string;
    description: string;
    type: string;
    userId?: string;
    userName?: string;
    userEmail?: string;
    lines: JournalLine[];
    totalDebit: number;
    totalCredit: number;
    metadata?: any;
}

export interface AccountBalance {
    account: Account;
    totalDebit: number;
    totalCredit: number;
    balance: number;
}

export interface PeriodFilter {
    startDate: Date | null;
    endDate: Date | null;
    label: string;
}

export type FundTransaction = {
    id: string;
    fund_type: "forex" | "stock" | "other";
    transaction_type: "allocation" | "return" | "loss" | "withdrawal" | "reallocation" | "distribution";
    amount_usd: number;
    description?: string;
    target_fund_type?: "forex" | "stock" | "other";
    created_at: string;
    metadata?: any;
};

export interface InvestmentAccountSummary {
    fundType: string;
    label: string;
    accountCode: string;
    totalAllocated: number;
    totalReturns: number;
    totalLosses: number;
    totalWithdrawn: number;
    currentBalance: number;
    roi: number;
    transactions: FundTransaction[];
}

// ─── Context Type ────────────────────────────────────────────────────────────
interface AccountingContextType {
    journalEntries: JournalEntry[];
    chartOfAccounts: Account[];
    trialBalance: AccountBalance[];
    profitAndLoss: { revenue: AccountBalance[]; expenses: AccountBalance[]; netIncome: number };
    balanceSheet: { assets: AccountBalance[]; liabilities: AccountBalance[]; equity: AccountBalance[]; totalAssets: number; totalLiabilitiesEquity: number };
    cashFlowStatement: { operating: number; financing: number; netCashFlow: number; details: { label: string; amount: number }[] };
    users: any[];
    fundAccounts: { name: string; totalAUM: number; userCount: number; users: any[] }[];
    unallocatedUsers: any[];
    investmentSummary: InvestmentAccountSummary[];
    fundTransactions: FundTransaction[];
    loading: boolean;
    forexRate: number;
    period: PeriodFilter;
    setPeriod: (p: PeriodFilter) => void;
    getJournalEntriesForUser: (userId: string) => JournalEntry[];
    getJournalEntriesForAccount: (accountCode: string) => JournalEntry[];
    recordFundTransaction: (tx: Omit<FundTransaction, "id" | "created_at">) => Promise<boolean>;
    updateUserFund: (userId: string, fundName: string | null) => Promise<boolean>;
    distributeFundProfits: (fundType: string, amount: number) => Promise<boolean>;
    refreshData: () => Promise<void>;
}

const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

// ─── Provider Component ──────────────────────────────────────────────────────
export function AccountingProvider({ children }: { children: React.ReactNode }) {
    const [rawTransactions, setRawTransactions] = useState<any[]>([]);
    const [rawProfiles, setRawProfiles] = useState<any[]>([]);
    const [rawFundTransactions, setRawFundTransactions] = useState<FundTransaction[]>([]);
    const [forexRate, setForexRate] = useState(4.0);
    const [depositRate, setDepositRate] = useState(4.2);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<PeriodFilter>({ startDate: null, endDate: null, label: "All Time" });

    // ── Data Fetch ───────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [txRes, profRes, fxRes, fundRes] = await Promise.all([
                supabase.from("transactions").select("*, profiles(*)").order("created_at", { ascending: true }),
                supabase.from("profiles").select("*").order("created_at", { ascending: false }),
                supabase.from("platform_settings").select("value").eq("key", "usd_to_myr_rate").single(),
                supabase.from("fund_transactions").select("*").order("created_at", { ascending: true }),
            ]);
            if (txRes.data) setRawTransactions(txRes.data);
            if (profRes.data) setRawProfiles(profRes.data);
            if (fundRes.data) setRawFundTransactions(fundRes.data as FundTransaction[]);
            if (fundRes.error) console.warn("[ACCOUNTING] fund_transactions table not found — run the SQL migration.");
            if (fxRes.data) {
                const rate = Number(fxRes.data.value || 4.0);
                setForexRate(rate);
                setDepositRate(rate); // depositRate = forexRate (what client pays)
                // Market rate is approx forexRate - 0.20
                // So spread per side = RM 0.20 per USD
            }
        } catch (err) {
            console.error("[ACCOUNTING] Fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Double-Entry Engine: Transform Transactions → Journal Entries ─────
    const journalEntries = useMemo<JournalEntry[]>(() => {
        const entries: JournalEntry[] = [];

        const filteredTx = rawTransactions.filter(tx => {
            if (!period.startDate && !period.endDate) return true;
            const txDate = new Date(tx.created_at);
            if (period.startDate && txDate < period.startDate) return false;
            if (period.endDate && txDate > period.endDate) return false;
            return true;
        });

        filteredTx.forEach(tx => {
            const type = (tx.type || "").toLowerCase();
            const status = tx.status || "";
            const amountUSD = Math.abs(Number(tx.original_currency_amount ?? (Number(tx.amount || 0) / forexRate)));
            const userName = tx.profiles?.full_name || tx.profiles?.username || "Unknown";
            const userEmail = tx.profiles?.email || "";
            const refId = tx.ref_id || tx.id?.substring(0, 8) || "";
            const date = tx.created_at;
            const category = (tx.metadata?.adjustment_category || "").toLowerCase();

            if (amountUSD === 0) return;

            // ── DEPOSIT ──────────────────────────────────────────────────
            if (type === "deposit") {
                if (status === "Pending") {
                    entries.push({
                        id: `${tx.id}-pending`,
                        date,
                        refId,
                        description: `Deposit received (pending verification) — ${userName}`,
                        type: "Deposit (Pending)",
                        userId: tx.user_id,
                        userName,
                        userEmail,
                        lines: [
                            { accountCode: "1200", accountName: "Accounts Receivable", debit: amountUSD, credit: 0 },
                            { accountCode: "2300", accountName: "Pending Deposits (Unverified)", debit: 0, credit: amountUSD },
                        ],
                        totalDebit: amountUSD,
                        totalCredit: amountUSD,
                        metadata: tx.metadata,
                    });
                } else if (["Approved", "Completed"].includes(status)) {
                    // Forex Spread on Deposit: Client pays depositRate (e.g. 4.2), market is ~forexRate-0.2 (e.g. 4.0)
                    // Spread per USD = RM 0.20. In USD terms: 0.20 / depositRate
                    const depositSpreadUSD = amountUSD * 0.20 / depositRate;
                    const netCashUSD = amountUSD + depositSpreadUSD; // Total cash received in USD equivalent

                    entries.push({
                        id: `${tx.id}-approved`,
                        date,
                        refId,
                        description: `Deposit approved and credited — ${userName}`,
                        type: "Deposit (Approved)",
                        userId: tx.user_id,
                        userName,
                        userEmail,
                        lines: [
                            { accountCode: "1000", accountName: "Cash & Bank (USD)", debit: netCashUSD, credit: 0 },
                            { accountCode: "2000", accountName: "Client Deposits Payable", debit: 0, credit: amountUSD },
                            { accountCode: "4000", accountName: "Forex Spread Revenue (Deposit)", debit: 0, credit: depositSpreadUSD },
                        ],
                        totalDebit: netCashUSD,
                        totalCredit: amountUSD + depositSpreadUSD,
                        metadata: tx.metadata,
                    });
                } else if (status === "Rejected") {
                    entries.push({
                        id: `${tx.id}-rejected`,
                        date,
                        refId,
                        description: `Deposit rejected — ${userName}`,
                        type: "Deposit (Rejected)",
                        userId: tx.user_id,
                        userName,
                        userEmail,
                        lines: [
                            { accountCode: "2300", accountName: "Pending Deposits (Unverified)", debit: amountUSD, credit: 0 },
                            { accountCode: "1200", accountName: "Accounts Receivable", debit: 0, credit: amountUSD },
                        ],
                        totalDebit: amountUSD,
                        totalCredit: amountUSD,
                        metadata: tx.metadata,
                    });
                }
            }

            // ── WITHDRAWAL ───────────────────────────────────────────────
            if (type === "withdrawal") {
                const penaltyUSD = Number(tx.metadata?.penalty_amount_usd || 0);
                const payoutUSD = Number(tx.metadata?.final_payout_usd || amountUSD);
                // Withdrawal spread: client gets forexRate-0.4 (e.g. 3.8), market ~forexRate-0.2 (e.g. 4.0)
                // Spread per USD = RM 0.20. In USD terms: 0.20 / forexRate
                const withdrawalSpreadUSD = payoutUSD * 0.20 / forexRate;

                if (status === "Pending") {
                    entries.push({
                        id: `${tx.id}-pending`,
                        date,
                        refId,
                        description: `Withdrawal request submitted — ${userName}`,
                        type: "Withdrawal (Pending)",
                        userId: tx.user_id,
                        userName,
                        userEmail,
                        lines: [
                            { accountCode: "2000", accountName: "Client Deposits Payable", debit: amountUSD, credit: 0 },
                            { accountCode: "2200", accountName: "Withdrawals Payable", debit: 0, credit: amountUSD },
                        ],
                        totalDebit: amountUSD,
                        totalCredit: amountUSD,
                        metadata: tx.metadata,
                    });
                } else if (["Completed", "Pending Release"].includes(status)) {
                    const lines: JournalLine[] = [
                        { accountCode: "2200", accountName: "Withdrawals Payable", debit: amountUSD, credit: 0 },
                        { accountCode: "1000", accountName: "Cash & Bank (USD)", debit: 0, credit: payoutUSD },
                    ];
                    if (penaltyUSD > 0) {
                        lines.push({ accountCode: "4100", accountName: "Early Withdrawal Penalty Income", debit: 0, credit: penaltyUSD });
                    }
                    if (withdrawalSpreadUSD > 0) {
                        lines.push({ accountCode: "4010", accountName: "Forex Spread Revenue (Withdrawal)", debit: 0, credit: withdrawalSpreadUSD });
                    }
                    const totalCr = lines.reduce((s, l) => s + l.credit, 0);
                    // Balance the entry
                    const diff = amountUSD - totalCr;
                    if (Math.abs(diff) > 0.01) {
                        lines[1].credit = amountUSD - penaltyUSD - withdrawalSpreadUSD;
                    }

                    entries.push({
                        id: `${tx.id}-completed`,
                        date,
                        refId,
                        description: `Withdrawal processed${penaltyUSD > 0 ? " (with penalty)" : ""} — ${userName}`,
                        type: status === "Completed" ? "Withdrawal (Completed)" : "Withdrawal (Pending Release)",
                        userId: tx.user_id,
                        userName,
                        userEmail,
                        lines,
                        totalDebit: amountUSD,
                        totalCredit: lines.reduce((s, l) => s + l.credit, 0),
                        metadata: tx.metadata,
                    });
                }
            }

            // ── DIVIDEND ─────────────────────────────────────────────────
            if (type === "dividend" || (type === "adjustment" && category === "dividend")) {
                if (["Approved", "Completed"].includes(status)) {
                    entries.push({
                        id: `${tx.id}-dividend`,
                        date,
                        refId,
                        description: `Dividend distributed — ${userName}`,
                        type: "Dividend",
                        userId: tx.user_id,
                        userName,
                        userEmail,
                        lines: [
                            { accountCode: "5000", accountName: "Dividend Distributions", debit: amountUSD, credit: 0 },
                            { accountCode: "2100", accountName: "Dividends Payable", debit: 0, credit: amountUSD },
                        ],
                        totalDebit: amountUSD,
                        totalCredit: amountUSD,
                        metadata: tx.metadata,
                    });
                }
            }

            // ── BONUS ────────────────────────────────────────────────────
            if (type === "bonus" || (type === "adjustment" && category === "bonus")) {
                if (["Approved", "Completed"].includes(status)) {
                    entries.push({
                        id: `${tx.id}-bonus`,
                        date,
                        refId,
                        description: `Bonus awarded — ${userName}`,
                        type: "Bonus",
                        userId: tx.user_id,
                        userName,
                        userEmail,
                        lines: [
                            { accountCode: "5100", accountName: "Bonus Distributions", debit: amountUSD, credit: 0 },
                            { accountCode: "2100", accountName: "Dividends Payable", debit: 0, credit: amountUSD },
                        ],
                        totalDebit: amountUSD,
                        totalCredit: amountUSD,
                        metadata: tx.metadata,
                    });
                }
            }

            // ── PENALTY (standalone) ─────────────────────────────────────
            if (type === "penalty") {
                if (["Approved", "Completed"].includes(status)) {
                    entries.push({
                        id: `${tx.id}-penalty`,
                        date,
                        refId,
                        description: `Withdrawal penalty applied — ${userName}`,
                        type: "Penalty",
                        userId: tx.user_id,
                        userName,
                        userEmail,
                        lines: [
                            { accountCode: "2000", accountName: "Client Deposits Payable", debit: amountUSD, credit: 0 },
                            { accountCode: "4100", accountName: "Early Withdrawal Penalty Income", debit: 0, credit: amountUSD },
                        ],
                        totalDebit: amountUSD,
                        totalCredit: amountUSD,
                        metadata: tx.metadata,
                    });
                }
            }
        });

        return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [rawTransactions, forexRate, depositRate, period]);

    // ── Fund Transaction Journal Entries ──────────────────────────────────
    const fundJournalEntries = useMemo<JournalEntry[]>(() => {
        const FUND_ACCOUNT_MAP: Record<string, { code: string; name: string; gainCode: string; gainName: string; lossCode: string; lossName: string }> = {
            forex: { code: "1300", name: "Forex Trading Account", gainCode: "4300", gainName: "Forex Trading Gains", lossCode: "5300", lossName: "Forex Trading Losses" },
            stock: { code: "1310", name: "Stock Trading Account", gainCode: "4310", gainName: "Stock Capital Gains", lossCode: "5310", lossName: "Stock Capital Losses" },
            other: { code: "1320", name: "Other Investment Accounts", gainCode: "4320", gainName: "Other Investment Gains", lossCode: "5320", lossName: "Other Investment Losses" },
        };
        const entries: JournalEntry[] = [];
        rawFundTransactions.filter(ft => {
            if (!period.startDate && !period.endDate) return true;
            const d = new Date(ft.created_at);
            if (period.startDate && d < period.startDate) return false;
            if (period.endDate && d > period.endDate) return false;
            return true;
        }).forEach(ft => {
            const acc = FUND_ACCOUNT_MAP[ft.fund_type] || FUND_ACCOUNT_MAP.other;
            const amt = Number(ft.amount_usd);
            const desc = ft.description || `${ft.transaction_type} — ${ft.fund_type}`;
            const refId = ft.id.substring(0, 8);
            if (ft.transaction_type === "allocation") {
                entries.push({ id: `fund-${ft.id}`, date: ft.created_at, refId, description: `Capital allocated to ${acc.name} — ${desc}`, type: "Fund Allocation", lines: [
                    { accountCode: acc.code, accountName: acc.name, debit: amt, credit: 0 },
                    { accountCode: "1000", accountName: "Cash & Bank (USD)", debit: 0, credit: amt },
                ], totalDebit: amt, totalCredit: amt, metadata: ft.metadata });
            } else if (ft.transaction_type === "return") {
                entries.push({ id: `fund-${ft.id}`, date: ft.created_at, refId, description: `Investment return — ${desc}`, type: "Investment Return", lines: [
                    { accountCode: acc.code, accountName: acc.name, debit: amt, credit: 0 },
                    { accountCode: acc.gainCode, accountName: acc.gainName, debit: 0, credit: amt },
                ], totalDebit: amt, totalCredit: amt, metadata: ft.metadata });
            } else if (ft.transaction_type === "loss") {
                entries.push({ id: `fund-${ft.id}`, date: ft.created_at, refId, description: `Investment loss — ${desc}`, type: "Investment Loss", lines: [
                    { accountCode: acc.lossCode, accountName: acc.lossName, debit: amt, credit: 0 },
                    { accountCode: acc.code, accountName: acc.name, debit: 0, credit: amt },
                ], totalDebit: amt, totalCredit: amt, metadata: ft.metadata });
            } else if (ft.transaction_type === "withdrawal" || ft.transaction_type === "distribution") {
                entries.push({ id: `fund-${ft.id}`, date: ft.created_at, refId, description: `${ft.transaction_type === "distribution" ? "Profit distribution withdrawal" : "Capital withdrawal"} from ${acc.name} — ${desc}`, type: "Fund Withdrawal", lines: [
                    { accountCode: "1000", accountName: "Cash & Bank (USD)", debit: amt, credit: 0 },
                    { accountCode: acc.code, accountName: acc.name, debit: 0, credit: amt },
                ], totalDebit: amt, totalCredit: amt, metadata: ft.metadata });
            } else if (ft.transaction_type === "reallocation" && ft.target_fund_type) {
                const tgt = FUND_ACCOUNT_MAP[ft.target_fund_type] || FUND_ACCOUNT_MAP.other;
                entries.push({ id: `fund-${ft.id}`, date: ft.created_at, refId, description: `Reallocation: ${acc.name} → ${tgt.name} — ${desc}`, type: "Fund Reallocation", lines: [
                    { accountCode: tgt.code, accountName: tgt.name, debit: amt, credit: 0 },
                    { accountCode: acc.code, accountName: acc.name, debit: 0, credit: amt },
                ], totalDebit: amt, totalCredit: amt, metadata: ft.metadata });
            }
        });
        return entries;
    }, [rawFundTransactions, period]);

    // ── Merge all journal entries ─────────────────────────────────────────
    const allJournalEntries = useMemo(() => {
        return [...journalEntries, ...fundJournalEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [journalEntries, fundJournalEntries]);

    // ── Trial Balance ────────────────────────────────────────────────────
    const trialBalance = useMemo<AccountBalance[]>(() => {
        const balances: Record<string, { totalDebit: number; totalCredit: number }> = {};
        CHART_OF_ACCOUNTS.forEach(a => { balances[a.code] = { totalDebit: 0, totalCredit: 0 }; });

        allJournalEntries.forEach(entry => {
            entry.lines.forEach(line => {
                if (!balances[line.accountCode]) balances[line.accountCode] = { totalDebit: 0, totalCredit: 0 };
                balances[line.accountCode].totalDebit += line.debit;
                balances[line.accountCode].totalCredit += line.credit;
            });
        });

        return CHART_OF_ACCOUNTS.map(account => {
            const b = balances[account.code];
            const balance = account.normalBalance === "Debit"
                ? b.totalDebit - b.totalCredit
                : b.totalCredit - b.totalDebit;
            return { account, totalDebit: b.totalDebit, totalCredit: b.totalCredit, balance };
        }).filter(ab => ab.totalDebit > 0 || ab.totalCredit > 0 || ab.balance !== 0);
    }, [allJournalEntries]);

    // ── Profit & Loss ────────────────────────────────────────────────────
    const profitAndLoss = useMemo(() => {
        const revenue = trialBalance.filter(ab => ab.account.type === "Revenue");
        const expenses = trialBalance.filter(ab => ab.account.type === "Expense");
        const totalRevenue = revenue.reduce((s, ab) => s + ab.balance, 0);
        const totalExpenses = expenses.reduce((s, ab) => s + ab.balance, 0);
        return { revenue, expenses, netIncome: totalRevenue - totalExpenses };
    }, [trialBalance]);

    // ── Balance Sheet ────────────────────────────────────────────────────
    const balanceSheet = useMemo(() => {
        const assets = trialBalance.filter(ab => ab.account.type === "Asset");
        const liabilities = trialBalance.filter(ab => ab.account.type === "Liability");
        const equity = trialBalance.filter(ab => ab.account.type === "Equity");
        const totalAssets = assets.reduce((s, ab) => s + ab.balance, 0);
        const totalLiabilities = liabilities.reduce((s, ab) => s + ab.balance, 0);
        const totalEquity = equity.reduce((s, ab) => s + ab.balance, 0);
        return {
            assets,
            liabilities,
            equity,
            totalAssets,
            totalLiabilitiesEquity: totalLiabilities + totalEquity + profitAndLoss.netIncome,
        };
    }, [trialBalance, profitAndLoss]);

    // ── Cash Flow Statement ──────────────────────────────────────────────
    const cashFlowStatement = useMemo(() => {
        const details: { label: string; amount: number }[] = [];
        let operating = 0;
        let financing = 0;

        journalEntries.forEach(entry => {
            const t = entry.type.toLowerCase();
            if (t.includes("dividend") || t.includes("bonus")) {
                operating -= entry.totalDebit;
            }
            if (t.includes("penalty")) {
                operating += entry.totalCredit;
            }
            if (t.includes("deposit") && t.includes("approved")) {
                financing += entry.totalDebit;
            }
            if (t.includes("withdrawal") && (t.includes("completed") || t.includes("release"))) {
                financing -= entry.totalDebit;
            }
        });

        details.push({ label: "Dividends & Bonuses Paid", amount: operating });
        details.push({ label: "Client Deposits Received", amount: financing > 0 ? financing : 0 });
        details.push({ label: "Client Withdrawals Paid", amount: financing < 0 ? financing : 0 });

        return { operating, financing, netCashFlow: operating + financing, details };
    }, [journalEntries]);

    // ── Users (enriched with accounting data) ────────────────────────────
    const users = useMemo(() => {
        return rawProfiles.map(p => {
            const userEntries = allJournalEntries.filter(e => e.userId === p.id);
            const totalDeposits = userEntries.filter(e => e.type.includes("Deposit") && e.type.includes("Approved")).reduce((s, e) => s + e.totalDebit, 0);
            const totalWithdrawals = userEntries.filter(e => e.type.includes("Withdrawal")).reduce((s, e) => s + e.totalDebit, 0);
            const totalDividends = userEntries.filter(e => e.type === "Dividend").reduce((s, e) => s + e.totalDebit, 0);
            const totalBonuses = userEntries.filter(e => e.type === "Bonus").reduce((s, e) => s + e.totalDebit, 0);
            return {
                ...p,
                accounting: { totalDeposits, totalWithdrawals, totalDividends, totalBonuses, entryCount: userEntries.length },
            };
        });
    }, [rawProfiles, allJournalEntries]);

    // ── Fund Accounts ────────────────────────────────────────────────────
    const { fundAccounts, unallocatedUsers } = useMemo(() => {
        const fundMap: Record<string, any[]> = {};
        const unalloc: any[] = [];

        users.forEach(u => {
            if (u.portfolio_platform_name) {
                if (!fundMap[u.portfolio_platform_name]) fundMap[u.portfolio_platform_name] = [];
                fundMap[u.portfolio_platform_name].push(u);
            } else if ((u.balance_usd || 0) > 0) {
                unalloc.push(u);
            }
        });

        const funds = Object.entries(fundMap).map(([name, userList]) => ({
            name,
            totalAUM: userList.reduce((s, u) => s + (u.balance_usd || 0), 0),
            userCount: userList.length,
            users: userList,
        }));

        return { fundAccounts: funds, unallocatedUsers: unalloc };
    }, [users]);

    // ── Helpers ──────────────────────────────────────────────────────────
    const getJournalEntriesForUser = useCallback((userId: string) => {
        return allJournalEntries.filter(e => e.userId === userId);
    }, [allJournalEntries]);

    const getJournalEntriesForAccount = useCallback((accountCode: string) => {
        return allJournalEntries.filter(e => e.lines.some(l => l.accountCode === accountCode));
    }, [allJournalEntries]);


    // ── Investment Account Summaries ──────────────────────────────────────
    const investmentSummary = useMemo<InvestmentAccountSummary[]>(() => {
        const types = ["forex", "stock", "other"] as const;
        const labels: Record<string, string> = { forex: "Forex Trading", stock: "Stock Trading", other: "Other Investments" };
        const codes: Record<string, string> = { forex: "1300", stock: "1310", other: "1320" };

        return types.map(t => {
            const txs = rawFundTransactions.filter(ft => ft.fund_type === t);
            const totalAllocated = txs.filter(ft => ft.transaction_type === "allocation").reduce((s, ft) => s + Number(ft.amount_usd), 0);
            const totalReturns = txs.filter(ft => ft.transaction_type === "return").reduce((s, ft) => s + Number(ft.amount_usd), 0);
            const totalLosses = txs.filter(ft => ft.transaction_type === "loss").reduce((s, ft) => s + Number(ft.amount_usd), 0);
            const totalWithdrawn = txs.filter(ft => ft.transaction_type === "withdrawal").reduce((s, ft) => s + Number(ft.amount_usd), 0);
            // Reallocations: subtract from source
            const reallocOut = txs.filter(ft => ft.transaction_type === "reallocation").reduce((s, ft) => s + Number(ft.amount_usd), 0);
            const reallocIn = rawFundTransactions.filter(ft => ft.transaction_type === "reallocation" && ft.target_fund_type === t).reduce((s, ft) => s + Number(ft.amount_usd), 0);
            const currentBalance = totalAllocated + totalReturns - totalLosses - totalWithdrawn - reallocOut + reallocIn;
            const roi = totalAllocated > 0 ? ((totalReturns - totalLosses) / totalAllocated) * 100 : 0;
            return { fundType: t, label: labels[t], accountCode: codes[t], totalAllocated, totalReturns, totalLosses, totalWithdrawn, currentBalance, roi, transactions: txs };
        });
    }, [rawFundTransactions]);

    // ── Record Fund Transaction ───────────────────────────────────────────
    const recordFundTransaction = useCallback(async (tx: Omit<FundTransaction, "id" | "created_at">) => {
        try {
            const { error } = await supabase.from("fund_transactions").insert([tx]);
            if (error) {
                console.error("[ACCOUNTING] Error recording fund transaction:", error);
                return false;
            }
            await fetchData();
            return true;
        } catch (err) {
            console.error("[ACCOUNTING] Fatal error:", err);
            return false;
        }
    }, [fetchData]);

    const updateUserFund = useCallback(async (userId: string, fundName: string | null) => {
        try {
            const { error } = await supabase.from("profiles").update({ portfolio_platform_name: fundName }).eq("id", userId);
            if (error) throw error;
            await fetchData();
            return true;
        } catch (err) {
            console.error("[ACCOUNTING] Error updating user fund:", err);
            return false;
        }
    }, [fetchData]);

    const distributeFundProfits = useCallback(async (fundType: string, totalAmount: number) => {
        try {
            if (totalAmount <= 0) return false;

            // 1. Find users in this fund
            const fundLabels: Record<string, string> = { forex: "Forex Trading", stock: "Stock Trading", other: "Other Investments" };
            const label = fundLabels[fundType] || fundType;
            const targetUsers = users.filter(u => u.portfolio_platform_name === label);
            if (targetUsers.length === 0) return false;

            const totalAUM = targetUsers.reduce((s, u) => s + (u.balance_usd || 0), 0);
            if (totalAUM <= 0) return false;

            // 2. Insert fund withdrawal for distribution
            const { error: fundErr } = await supabase.from("fund_transactions").insert([{
                fund_type: fundType as any,
                transaction_type: "distribution" as any,
                amount_usd: totalAmount,
                description: `Profit distribution to ${targetUsers.length} investors`
            }]);
            if (fundErr) throw fundErr;

            // 3. Batch insert dividends for users
            const dividends = targetUsers.map(u => {
                const share = ((u.balance_usd || 0) / totalAUM) * totalAmount;
                return {
                    user_id: u.id,
                    amount_usd: share,
                    type: "dividend",
                    status: "completed",
                    description: `Profit distribution: ${label}`
                };
            }).filter(d => d.amount_usd > 0.01);

            if (dividends.length > 0) {
                const { error: txErr } = await supabase.from("transactions").insert(dividends);
                if (txErr) throw txErr;
            }

            await fetchData();
            return true;
        } catch (err) {
            console.error("[ACCOUNTING] Error distributing profits:", err);
            return false;
        }
    }, [users, fetchData]);

    return (
        <AccountingContext.Provider value={{
            journalEntries: allJournalEntries,
            chartOfAccounts: CHART_OF_ACCOUNTS,
            trialBalance,
            profitAndLoss,
            balanceSheet,
            cashFlowStatement,
            users,
            fundAccounts,
            unallocatedUsers,
            investmentSummary,
            fundTransactions: rawFundTransactions,
            loading,
            forexRate,
            period,
            setPeriod,
            getJournalEntriesForUser,
            getJournalEntriesForAccount,
            recordFundTransaction,
            updateUserFund,
            distributeFundProfits,
            refreshData: fetchData,
        }}>
            {children}
        </AccountingContext.Provider>
    );
}

export const useAccounting = () => {
    const context = useContext(AccountingContext);
    if (!context) throw new Error("useAccounting must be used within AccountingProvider");
    return context;
};
