"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import GlobalFooter from "@/components/GlobalFooter";
import { supabase } from "@/lib/supabaseClient";
import { useSettings } from "@/providers/SettingsProvider";
import TierMedal from "@/components/TierMedal";
import { getTierByAmount } from "@/lib/tierUtils";

export default function AdminPortal() {
    const router = useRouter();
    interface Profile {
        id: string;
        username: string;
        full_name: string;
        email: string;
        balance: number;
        balance_usd: number;
        total_equity: number;
        total_assets: number;
        is_verified: boolean;
        kyc_status: 'Pending' | 'Verified' | 'Rejected' | 'Draft' | null;
        kyc_step: number;
        kyc_data: any;
        kyc_id_front: string;
        kyc_id_back: string;
        dob: string;
        phone: string;
        tax_id: string;
        address: string;
        account_purpose: string;
        employment_status: string;
        industry: string;
        source_of_wealth: string[];
        annual_income: string;
        total_wealth: string;
        risk_acknowledged: boolean;
        accuracy_confirmed: boolean;
        is_not_pep: boolean;
        referred_by_username: string;
        role: string;
        profit?: number;
        verified_at: string;
        created_at?: string;
        portfolio_platform_name?: string;
        portfolio_account_id?: string;
        portfolio_account_password?: string;
        internal_remarks?: string;
        selected_tier?: string;
        bank_name?: string;
        account_number?: string;
        bank_account_holder?: string;
        bank_statement_url?: string;
    }

    const [activeTab, setActiveTab] = useState("deposits");
    const [lang, setLang] = useState<"en" | "zh">("en");
    const [mounted, setMounted] = useState(false);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [adminProfile, setAdminProfile] = useState<Profile | null>(null);
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const showToast = (msg: string) => {
        setToast({ message: msg, visible: true });
        setTimeout(() => setToast({ message: "", visible: false }), 5000);
    };

    const { forexRate } = useSettings();
    const [newForexRate, setNewForexRate] = useState<string>("");
    const [forexHistory, setForexHistory] = useState<any[]>([]);
    const [isUpdatingRate, setIsUpdatingRate] = useState(false);

    // Supabase Data
    const [kycQueue, setKycQueue] = useState<Profile[]>([]);
    const [deposits, setDeposits] = useState<any[]>([]);
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [users, setUsers] = useState<Profile[]>([]);
    const [salesData, setSalesData] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [userStatusFilter, setUserStatusFilter] = useState("All");
    const [kycSearchQuery, setKycSearchQuery] = useState("");
    const [withdrawalSearchQuery, setWithdrawalSearchQuery] = useState("");
    const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState("All");
    const [depositSearchQuery, setDepositSearchQuery] = useState("");
    const [depositStatusFilter, setDepositStatusFilter] = useState("All");
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
    const [agentReferrals, setAgentReferrals] = useState<Partial<Profile>[]>([]);
    const [isLoadingSales, setIsLoadingSales] = useState(false);
    const [rejectionReasons, setRejectionReasons] = useState<{ [key: string]: string }>({});
    const [verificationLogs, setVerificationLogs] = useState<any[]>([]);
    const [auditSearchQuery, setAuditSearchQuery] = useState("");
    const [auditStatusFilter, setAuditStatusFilter] = useState("All");
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [viewingDoc, setViewingDoc] = useState<string | null>(null);
    const [platformStats, setPlatformStats] = useState({ totalBalance: 0, totalProfit: 0, totalAssets: 0, userCount: 0 });
    const [userKycDocs, setUserKycDocs] = useState<{name: string, url: string}[]>([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectReasonText, setRejectReasonText] = useState("");
    const [depositReceiptUrl, setDepositReceiptUrl] = useState<string | null>(null);
    const [isDepositDrawerOpen, setIsDepositDrawerOpen] = useState(false);
    const [selectedDepositTx, setSelectedDepositTx] = useState<any>(null);
    const [adjustmentAmount, setAdjustmentAmount] = useState<string>("");
    const [adjustmentType, setAdjustmentType] = useState<"balance" | "profit">("balance");
    const [adjustmentReason, setAdjustmentReason] = useState<string>("");
    const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);
    const [combinedAuditLogs, setCombinedAuditLogs] = useState<any[]>([]);
    const [isUpdatingPortfolio, setIsUpdatingPortfolio] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [portfolioData, setPortfolioData] = useState({
        platform: "",
        account_id: "",
        password: "",
        remarks: ""
    });
    const [kycFilter, setKycFilter] = useState<string>("Pending"); // New KYC filter

    const content = {
        en: {
            adminPortal: "Admin Portal",
            tabs: {
                kyc: "KYC",
                deposits: "Deposits",
                withdrawals: "Withdrawals",
                users: "Users",
                sales: "Sales",
                settings: "Settings",
                audit: "Audit Logs"
            },
            status: {
                status: "Status",
                all: "All",
                pending: "Pending",
                approved: "Approved",
                rejected: "Rejected",
                verified: "Verified",
                unverified: "Unverified",
                active: "Active",
                inactive: "Inactive",
                suspended: "Suspended"
            },
            table: {
                user: "User",
                amount: "Amount",
                date: "Date",
                actions: "Actions",
                status: "Status",
                refId: "Ref ID",
                email: "Email",
                totalAssets: "Total Investment",
                totalProfit: "Total Withdrawable Amount",
                tier: "Tier",
                fullName: "Full Name",
                username: "Username",
                balance: "Balance",
                profit: "Profit"
            },
            kyc: {
                queue: "Verification Queue",
                viewDocs: "View Docs",
                approve: "Approve",
                reject: "Reject",
                noDocs: "No verification requests at the moment.",
                viewingDocs: "Viewing Documents"
            },
            users: {
                userDirectory: "User Directory",
                activeInvestors: "Active Investors",
                searchNameEmail: "Search Name or Email...",
                adjust: "Adjust",
                details: "Details",
                manage: "Manage",
                noUsersFound: "No users found",
                internalRemark: "Internal Remark",
                investmentPortfolio: "Investment Portfolio",
                portfolioNote: "Allocation of user's fund",
                platformName: "Platform Name",
                accountId: "Account ID",
                password: "Password",
                financialAdjustments: "Financial Adjustments",
                increase: "Increase",
                decrease: "Decrease",
                dividend: "Dividend",
                wallet: "Wallet",
                reason: "Reason",
                updateBtn: "Update",
                changeTier: "Change Tier",
                currentTier: "Current Tier",
                totalInvestment: "Total Investment",
                dividendEarned: "Withdrawable Amount"
            },
            settings: {
                platformSettings: "Platform Settings",
                forexRate: "Global Forex Rate",
                maintenance: "Maintenance Mode",
                history: "Rate History",
                updateRate: "Update Rate",
                on: "ON",
                off: "OFF"
            },
            sales: {
                performance: "Sales Performance",
                leaderboard: "Global Agent Leaderboard",
                searchAgent: "Search Agent Username...",
                detailProfile: "Agent Detail Profile",
                referredClients: "Referred Clients",
                noReferrals: "No referrals found",
                selectAgent: "Select an agent to view drill-down performance"
            },
            audit: {
                title: "System Audit Log",
                subtitle: "Tracking Administrative Actions",
                dateTime: "Date/Time",
                admin: "Admin",
                targetUser: "Target User",
                action: "Action",
                reason: "Reason"
            }
        },
        zh: {
            adminPortal: "管理后台",
            tabs: {
                kyc: "KYC",
                deposits: "入金管理",
                withdrawals: "提款管理",
                users: "用户列表",
                sales: "销售数据",
                settings: "系统设置",
                audit: "审计日志"
            },
            status: {
                status: "状态",
                all: "全部",
                pending: "待处理",
                approved: "已批准",
                rejected: "已拒绝",
                verified: "已核实",
                unverified: "未核实",
                active: "活跃",
                inactive: "离线",
                suspended: "已停用"
            },
            table: {
                user: "用户",
                amount: "金额",
                date: "日期",
                actions: "操作",
                status: "状态",
                refId: "参考ID",
                email: "邮箱",
                totalAssets: "总投资额",
                totalProfit: "总可提现金额",
                tier: "等级",
                fullName: "全名",
                username: "用户名",
                balance: "余额",
                profit: "利润"
            },
            kyc: {
                queue: "审核队列",
                viewDocs: "查看文档",
                approve: "通过",
                reject: "拒绝",
                noDocs: "目前没有待核实的请求。",
                viewingDocs: "正在查看文档"
            },
            users: {
                userDirectory: "用户目录",
                activeInvestors: "活跃投资者",
                searchNameEmail: "搜索姓名或邮箱...",
                adjust: "调整",
                details: "详情",
                manage: "管理",
                noUsersFound: "未发现用户",
                internalRemark: "内部备注",
                investmentPortfolio: "投资组合",
                portfolioNote: "用户资金分配",
                platformName: "平台名称",
                accountId: "账号 ID",
                password: "密码",
                financialAdjustments: "财务调账",
                increase: "增加",
                decrease: "减少",
                dividend: "分红",
                wallet: "钱包",
                reason: "理由",
                updateBtn: "更新",
                changeTier: "变更等级",
                currentTier: "当前等级",
                totalInvestment: "总投资",
                dividendEarned: "可提现金额"
            },
            settings: {
                platformSettings: "平台设置",
                forexRate: "全局汇率",
                maintenance: "维护模式",
                history: "汇率历史",
                updateRate: "更新汇率",
                on: "开启",
                off: "关闭"
            },
            sales: {
                performance: "销售业绩",
                leaderboard: "全球代理排行榜",
                searchAgent: "搜索代理用户名...",
                detailProfile: "代理详细资料",
                referredClients: "推荐客户",
                noReferrals: "未发现推荐",
                selectAgent: "选择代理以查看详细业绩"
            },
            audit: {
                title: "系统审计日志",
                subtitle: "追踪管理操作",
                dateTime: "日期/时间",
                admin: "管理员",
                targetUser: "目标用户",
                action: "操作",
                reason: "原因"
            }
        }
    };

    const t = content[lang];

    const hasFetchedRef = React.useRef(false);

    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;

        setMounted(true);
        fetchData();
        checkMaintenance();
        fetchSalesData();
        fetchAdminProfile();
        fetchForexHistory();

        // Real-time listener for ALL transactions (New Deposits, etc.)
        const channel = supabase
            .channel('admin-realtime-tx')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
                console.log("[REALTIME] Transaction change detected. Refreshing...");
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                console.log("[REALTIME] User change detected. Refreshing...");
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings' }, () => {
                console.log("[REALTIME] Forex change detected. Refreshing history...");
                fetchForexHistory();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        if (selectedUser && isDetailModalOpen) {
            fetchUserDocs(selectedUser.id);
        } else {
            setUserKycDocs([]);
        }
    }, [selectedUser, isDetailModalOpen]);

    const fetchUserDocs = async (userId: string) => {
        setIsLoadingDocs(true);
        try {
            const { data, error } = await supabase.storage.from('agreements').list(userId);
            if (error) throw error;
            
            if (data && data.length > 0) {
                const validFiles = data.filter((f: { name: string }) => f.name !== '.emptyFolderPlaceholder' && f.name !== '.gitkeep');
                const docs = await Promise.all(
                    validFiles.map(async (file: { name: string }) => {
                        const { data: urlData } = await supabase.storage.from('agreements').createSignedUrl(`${userId}/${file.name}`, 3600);
                        return { name: file.name, url: urlData?.signedUrl || "" };
                    })
                );
                setUserKycDocs(docs.filter((d: { url: string }) => d.url !== ""));
            } else {
                setUserKycDocs([]);
            }
        } catch (error) {
            console.error('Error fetching docs:', error);
            setUserKycDocs([]);
        } finally {
            setIsLoadingDocs(false);
        }
    };

    const fetchAdminProfile = async () => {
        // Use getSession to avoid triggering an infinite auth event loop
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
            
            if (profile) {
                if (session.user.email === "thenja96@gmail.com") {
                    profile.role = "admin";
                }
                setAdminProfile(profile as Profile);
            } else {
                setAdminProfile({ 
                    id: session.user.id, 
                    email: session.user.email || "", 
                    role: "Bypassed",
                    username: session.user.email?.split('@')[0] || "Admin",
                    full_name: "Admin Bypass",
                    balance: 0,
                    balance_usd: 0,
                    total_equity: 0,
                    total_assets: 0,
                    is_verified: true,
                    kyc_status: 'Verified',
                    kyc_step: 3,
                    kyc_data: {},
                    kyc_id_front: "",
                    kyc_id_back: "",
                    dob: "",
                    phone: "",
                    tax_id: "",
                    address: "",
                    account_purpose: "",
                    employment_status: "",
                    industry: "",
                    source_of_wealth: [],
                    annual_income: "",
                    total_wealth: "",
                    risk_acknowledged: true,
                    accuracy_confirmed: true,
                    is_not_pep: true,
                    referred_by_username: "",
                    verified_at: new Date().toISOString()
                } as Profile);
            }
        }
    };

    const fetchData = async () => {
        const { data: profileList, error: profileError } = await supabase.from('profiles').select('*');
        console.log('Fetched Profiles Data:', profileList, 'Error:', profileError);
        
        if (profileList) {
            const sortedUsers = (profileList as Profile[]).sort((a, b) => 
                new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
            );
            setUsers(sortedUsers);
            
            const stats = (profileList as Profile[]).reduce((acc, p) => ({
                totalBalance: acc.totalBalance + Number(p.balance || 0),
                totalProfit: acc.totalProfit + Number(p.profit || 0),
                totalAssets: acc.totalAssets + (Number(p.balance || 0) + Number(p.profit || 0)),
                userCount: acc.userCount + 1
            }), { totalBalance: 0, totalProfit: 0, totalAssets: 0, userCount: 0 });
            setPlatformStats(stats);

            setKycQueue(sortedUsers.filter((p: Profile) => p.kyc_status === 'Pending'));
        }

        console.log('Admin Fetching Transactions from: transactions...');
        const { data: txList, error: txError } = await supabase
            .from('transactions')
            .select('*, profiles(*)')
            .order('created_at', { ascending: false });
            
        console.log('Raw Data from Supabase:', txList);
        if (txError) console.error('Supabase TX Error:', txError);
        
        if (txList) {
            // Case-insensitive filtering for robustness
            setDeposits(txList.filter((t: any) => t.type?.toLowerCase() === 'deposit'));
            setWithdrawals(txList.filter((t: any) => t.type?.toLowerCase() === 'withdrawal'));
        }

        const { data: logs } = await supabase
            .from('verification_logs')
            .select('*')
            .order('created_at', { ascending: false });
        
        // Merge verification logs with ALL financial transactions for a unified platform audit trail
        const financialTxs = txList?.filter((t: any) => 
            t.status === 'Approved'
        ) || [];
        const mergedLogs = [
            ...(logs || []).map(l => ({ ...l, auditType: 'verification' })),
            ...financialTxs.map(t => ({
                id: t.id,
                created_at: t.created_at,
                admin_username: t.metadata?.processed_by_name || 'System',
                user_email: t.profiles?.email || 'Unknown',
                action: t.type === 'Deposit' ? 'Deposit Approved' : 
                        t.type === 'Withdrawal' ? 'Withdrawal Approved' : 'Adjustment',
                processed_by_name: t.metadata?.processed_by_name,
                processed_by_email: t.metadata?.processed_by_email,
                rejection_reason: t.metadata?.reason || t.metadata?.description || `${t.type} processed`,
                auditType: 'transaction',
                amount: t.amount,
                txType: t.type
            }))
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setCombinedAuditLogs(mergedLogs);
        if (logs) setVerificationLogs(logs);
    };

    const fetchForexHistory = async () => {
        const { data: historyData } = await supabase
            .from('forex_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        if (historyData) setForexHistory(historyData);
    };

    const fetchSalesData = async () => {
        setIsLoadingSales(true);
        try {
            const { data, error } = await supabase
                .from('sales_leaderboard')
                .select('*')
                .order('total_referred_capital', { ascending: false });

            if (error) throw error;
            if (data) setSalesData(data);
        } catch (err: any) {
            console.error("Leaderboard error:", err.message);
        } finally {
            setIsLoadingSales(false);
        }
    };

    const fetchAgentReferrals = async (username: string) => {
        setSelectedAgent(username);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, username, balance, balance_usd')
                .eq('referred_by_username', username);
            if (error) throw error;
            if (data) setAgentReferrals(data);
        } catch (err: any) {
            console.error("Referral fetch error:", err.message);
        }
    };

    const checkMaintenance = async () => {
        const { data } = await supabase.from('platform_settings').select('value').eq('key', 'maintenance_mode').single();
        if (data) setMaintenanceMode(data.value === 'true');
    };

    const toggleMaintenance = async () => {
        if (adminProfile?.role !== 'admin' && adminProfile?.email !== 'thenja96@gmail.com') {
            showToast("You do not have permission to change system settings.");
            return;
        }

        const newVal = !maintenanceMode;
        setMaintenanceMode(newVal);
        try {
            console.log('Saving platform_settings with:', { key: 'maintenance_mode', value: String(newVal) });
            const { error } = await supabase.from('platform_settings').upsert({ key: 'maintenance_mode', value: String(newVal) }, { onConflict: 'key' });
            if (error) throw error;
        } catch (err: any) {
            if (err.code === '42501' || err.status === 403) {
                showToast("You do not have permission to change system settings.");
            } else {
                alert(err.message);
            }
            // Revert state if failed
            setMaintenanceMode(!newVal);
        }
    };

    const handleUpdateForexRate = async () => {
        if (adminProfile?.role !== 'admin' && adminProfile?.email !== 'thenja96@gmail.com') {
            showToast("You do not have permission to change system settings.");
            return;
        }

        if (!newForexRate || isNaN(parseFloat(newForexRate))) {
            alert("Please enter a valid rate.");
            return;
        }

        setIsUpdatingRate(true);
        try {
            console.log('Current User Role:', adminProfile?.role);
            console.log('Attempting Session Refresh...');
            await supabase.auth.refreshSession();

            console.log('Saving settings with:', { key: 'usd_to_myr_rate', value: newForexRate });
            const { error: updateError } = await supabase
                .from('platform_settings')
                .upsert({ key: 'usd_to_myr_rate', value: newForexRate }, { onConflict: 'key' });

            if (updateError) {
                console.error('SUPABASE FOREX UPDATE ERROR:', updateError);
                throw updateError;
            }

            const { data: { user } } = await supabase.auth.getUser();
            const { error: historyError } = await supabase
                .from('forex_history')
                .insert([{
                    old_rate: forexRate,
                    new_rate: parseFloat(newForexRate),
                    changed_by: user?.id || null // MUST use ID for UUID fields
                }]);

            if (historyError) {
                console.error('SUPABASE HISTORY INSERT ERROR:', historyError);
                throw historyError;
            }

            alert("Forex rate updated successfully.");
            fetchForexHistory();
        } catch (err: any) {
            if (err.code === '42501' || err.status === 403) {
                showToast("You do not have permission to change system settings.");
            } else {
                alert(err.message);
            }
        } finally {
            setIsUpdatingRate(false);
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const currentPassword = formData.get("currentPassword") as string;
        const newPassword = formData.get("newPassword") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (newPassword !== confirmPassword) {
            alert("New passwords do not match.");
            return;
        }

        setIsUpdatingRate(true); // Reusing for loading state
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            alert("Password updated successfully.");
            (e.target as HTMLFormElement).reset();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsUpdatingRate(false);
        }
    };

    const handleVerifyUser = async (userId: string) => {
        const userToVerify = users.find((u: any) => u.id === userId);
        if (!userToVerify) return;

        setIsVerifying(true);
        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    is_verified: true,
                    kyc_status: 'Verified',
                    verified_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (updateError) throw updateError;

            // Update local state for immediate feedback
            setSelectedUser(prev => prev ? { ...prev, is_verified: true, kyc_status: 'Verified' } : null);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_verified: true, kyc_status: 'Verified' } : u));

            // Log the verification
            await supabase
                .from('verification_logs')
                .insert({
                    admin_id: adminProfile?.id,
                    user_email: userToVerify.email,
                    admin_username: adminProfile?.username || adminProfile?.email?.split('@')[0] || 'Admin',
                    action: 'Verified',
                    created_at: new Date().toISOString()
                });

            showToast(`User ${userToVerify.email} successfully verified.`);
            fetchData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleRejectUser = async (userId: string) => {
        const userToReject = users.find((u: any) => u.id === userId);
        if (!userToReject) return;
        const reason = rejectionReasons[userId] || "";

        if (!reason.trim()) {
            alert("Please provide a rejection reason.");
            return;
        }

        setIsVerifying(true);
        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    kyc_status: 'Rejected',
                    is_verified: false,
                    rejection_reason: reason
                })
                .eq('id', userId);

            if (updateError) throw updateError;

            // Update local state
            setSelectedUser(prev => prev ? { ...prev, is_verified: false, kyc_status: 'Rejected' } : null);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_verified: false, kyc_status: 'Rejected' } : u));

            // Log the rejection
            await supabase
                .from('verification_logs')
                .insert({
                    admin_id: adminProfile?.id,
                    user_email: userToReject.email,
                    admin_username: adminProfile?.username || adminProfile?.email?.split('@')[0] || 'Admin',
                    action: 'Rejected',
                    rejection_reason: reason,
                    created_at: new Date().toISOString()
                });

            // Clear the reason for this user
            setRejectionReasons((prev: any) => {
                const next = { ...prev };
                delete next[userId];
                return next;
            });

            showToast(`User successfully rejected.`);
            fetchData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResetKyc = async (userId: string, reason: string) => {
        const userToReject = users.find((u: any) => u.id === userId);
        if (!userToReject) return;

        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    kyc_step: 0,
                    is_verified: false,
                    kyc_status: 'Rejected',
                    rejection_reason: reason
                })
                .eq('id', userId);

            if (updateError) throw updateError;

            // Log the rejection
            await supabase
                .from('verification_logs')
                .insert({
                    admin_id: adminProfile?.id,
                    user_email: userToReject.email,
                    admin_username: adminProfile?.username || adminProfile?.email?.split('@')[0] || 'Admin',
                    action: 'Rejected',
                    rejection_reason: reason,
                    created_at: new Date().toISOString()
                });

            fetchData();
            showToast(`User KYC has been reset and rejected.`);
        } catch (err: any) {
            alert(err.message);
        }
    };


    const handleAdjustBalance = async () => {
        if (!selectedUser || !adjustmentAmount || !adjustmentReason) return;
        if (adminProfile?.role !== 'admin' && adminProfile?.email !== 'thenja96@gmail.com') {
            showToast("Permission denied.");
            return;
        }

        setIsUpdatingBalance(true);
        try {
            const amount = Number(adjustmentAmount);
            const type = adjustmentType; // 'balance' or 'profit'
            
            // 1. Update Profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ [type]: Number(selectedUser[type] || 0) + amount })
                .eq('id', selectedUser.id);
            
            if (profileError) throw profileError;

            // 2. Log Transaction
            const txType = (type === 'balance' ? 'Bonus' : 'Dividend') + (amount >= 0 ? ' Increase' : ' Decrease');
            const { error: txError } = await supabase
                .from('transactions')
                .insert({
                    user_id: selectedUser.id,
                    type: txType,
                    amount: amount,
                    status: 'Approved',
                    ref_id: `ADJ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                    metadata: { 
                        reason: adjustmentReason,
                        description: adjustmentReason || `${txType} Adjustment`,
                        processed_by_name: adminProfile?.full_name || adminProfile?.username || "Admin",
                        processed_by_id: adminProfile?.id,
                        processed_by_email: adminProfile?.email
                    }
                });
            
            if (txError) throw txError;

            showToast(`Successfully adjusted ${type} by RM ${amount.toFixed(2)}`);
            setAdjustmentAmount("");
            setAdjustmentReason("");
            fetchData();
            // Refresh local state if possible
            setSelectedUser(prev => prev ? { ...prev, [type]: Number(prev[type] || 0) + amount } : null);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsUpdatingBalance(false);
        }
    };

    const handleUpdatePortfolio = async () => {
        if (!selectedUser) return;
        setIsUpdatingPortfolio(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    portfolio_platform_name: portfolioData.platform,
                    portfolio_account_id: portfolioData.account_id,
                    portfolio_account_password: portfolioData.password,
                    internal_remarks: portfolioData.remarks
                })
                .eq('id', selectedUser.id);
            
            if (error) throw error;
            showToast("Portfolio details updated successfully.");
            fetchData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsUpdatingPortfolio(false);
        }
    };

    const handleResetUserPassword = async (email: string) => {
        if (!confirm(`Send password reset email to ${email}?`)) return;
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.host === 'localhost:3000' ? 'http://localhost:3000' : 'https://' + window.location.host}/reset-password`,
            });
            if (error) throw error;
            showToast("Password reset email sent.");
        } catch (err: any) {
            alert(err.message);
        }
    };

    const openDepositReceipt = async (tx: any) => {
        setSelectedDepositTx(tx);
        setDepositReceiptUrl(null);
        setIsDepositDrawerOpen(true);
        try {
            const { data, error } = await supabase.storage.from('agreements').createSignedUrl(tx.receipt_url, 3600);
            if (error || !data) throw error;
            setDepositReceiptUrl(data.signedUrl);
        } catch (err: any) {
            console.error(err);
            showToast("Failed to load secure receipt document.");
        }
    };

    const handleApproveDeposit = async (tx: any) => {
        const displayRm = Number(tx.amount || 0).toFixed(2);
        const creditUsd = (Number(tx.amount || 0) / forexRate).toFixed(2);
        if (!confirm(`Confirming deposit of RM ${displayRm} (Credit: $${creditUsd} USD) for ${tx.profiles?.full_name || 'Client'}?`)) return;
        try {
            // Use RPC for atomic update of transaction and profile balance
            // Pass raw RM amount to RPC; database handles logic
            const { error: rpcError } = await supabase.rpc('approve_deposit', {
                p_tx_id: tx.id,
                p_user_id: tx.user_id,
                p_amount: Number(tx.amount || 0)
            });
            
            if (rpcError) throw rpcError;

            // Update metadata with processor info
            await supabase.from('transactions').update({
                metadata: {
                    ...tx.metadata,
                    processed_by_name: adminProfile?.full_name || adminProfile?.username || "Admin",
                    processed_by_id: adminProfile?.id,
                    processed_by_email: adminProfile?.email
                }
            }).eq('id', tx.id);
            
            showToast("Deposit approved successfully.");
            setIsDepositDrawerOpen(false);
            fetchData();
            router.refresh(); // Optimistic server refresh
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleRejectDeposit = async (tx: any) => {
        const amountRm = Number(tx.amount || 0);
        const amountUsd = amountRm / forexRate;
        if (!confirm(`Reject deposit: Client sent RM ${amountRm.toFixed(2)}. This will void the $${amountUsd.toFixed(2)} USD credit for ${tx.profiles?.full_name || 'Client'}?`)) return;
        try {
            const { error: txError } = await supabase
                .from('transactions')
                .update({ 
                    status: 'Rejected',
                    metadata: {
                        ...tx.metadata,
                        processed_by_name: adminProfile?.full_name || adminProfile?.username || "Admin",
                        processed_by_id: adminProfile?.id,
                        processed_by_email: adminProfile?.email,
                        reason: "Policy violation or invalid receipt"
                    }
                })
                .eq('id', tx.id);
            if (txError) throw txError;
            showToast("Deposit rejected.");
            setIsDepositDrawerOpen(false);
            fetchData();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleApproveWithdrawal = async (tx: any) => {
        const amountRm = Math.abs(Number(tx.amount || 0));
        const amountUsd = amountRm / forexRate;
        if (!confirm(`Approve withdrawal of RM ${amountRm.toFixed(2)} ($${amountUsd.toFixed(2)} USD) for ${tx.profiles?.full_name || 'Client'}?`)) return;
        try {
            // DATABASE TRIGGER HANDLES BALANCE UPDATES
            // We only need to set the status to Approved
            const { error: txError } = await supabase
                .from('transactions')
                .update({ 
                    status: 'Approved',
                    metadata: {
                        ...tx.metadata,
                        processed_by_name: adminProfile?.full_name || adminProfile?.username || "Admin",
                        processed_by_id: adminProfile?.id,
                        processed_by_email: adminProfile?.email
                    }
                })
                .eq('id', tx.id);
            
            if (txError) throw txError;
            
            showToast("Withdrawal approved. Trigger processing balances...");
            fetchData();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleRejectWithdrawal = async (tx: any) => {
        const amountRm = Math.abs(Number(tx.amount || 0));
        const amountUsd = amountRm / forexRate;
        if (!confirm(`Reject withdrawal: Client requested RM ${amountRm.toFixed(2)} ($${amountUsd.toFixed(2)} USD) for ${tx.profiles?.full_name || 'Client'}?`)) return;
        try {
            const { error: txError } = await supabase
                .from('transactions')
                .update({ 
                    status: 'Rejected',
                    metadata: {
                        ...tx.metadata,
                        processed_by_name: adminProfile?.full_name || adminProfile?.username || "Admin",
                        processed_by_id: adminProfile?.id,
                        processed_by_email: adminProfile?.email
                    }
                })
                .eq('id', tx.id);
            
            if (txError) throw txError;
            
            showToast("Withdrawal rejected.");
            fetchData();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const totalCapital = users.reduce((sum, u) => sum + (Number(u.balance) || 0), 0);
    const pendingDeposits = deposits.filter(d => d.status === 'Pending').length;
    const pendingWithdrawals = withdrawals.filter(w => w.status === 'Pending').length;
    const pendingKyc = users.filter(u => u.kyc_status === 'Pending').length;

    return (
        <AuthGuard requireAdmin={true}>
            <div className="min-h-screen bg-[#121212] text-white flex font-sans overflow-hidden">
                <title>{`${t.adminPortal} | GV Capital Trust`}</title>

                {/* Sidebar (Desktop) */}
                <aside className={`border-r border-white/10 flex flex-col justify-between hidden lg:flex bg-[#0a0a0a] transition-all duration-500 ease-in-out relative group/sidebar ${isSidebarCollapsed ? "w-[84px] p-4" : "w-64 p-6"}`}>
                    {/* Collapse Toggle */}
                    <button 
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="absolute -right-3 top-24 z-10 h-6 w-6 bg-white/10 border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-gv-gold hover:text-black transition-all shadow-xl opacity-0 group-hover/sidebar:opacity-100"
                    >
                        <svg className={`h-3 w-3 transition-transform duration-500 ${isSidebarCollapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M15 19l-7-7 7-7" /></svg>
                    </button>

                    <div className="space-y-12">
                        <div className={`flex items-center transition-all duration-500 ${isSidebarCollapsed ? "justify-center" : "gap-2"}`}>
                            <img src="/logo.png" alt="GV Capital" className={`transition-all duration-500 object-contain mix-blend-screen ${isSidebarCollapsed ? "h-8" : "h-[60px]"}`} />
                        </div>

                        <nav className="space-y-2">
                            {["deposits", "kyc", "withdrawals", "users", "sales", "forex", "audit", "security"].map(tab => {
                                let label = tab;
                                if (tab === "deposits") label = t.tabs.deposits;
                                if (tab === "kyc") label = t.tabs.kyc;
                                if (tab === "withdrawals") label = t.tabs.withdrawals;
                                if (tab === "users") label = t.tabs.users;
                                if (tab === "sales") label = t.tabs.sales;
                                if (tab === "audit") label = t.tabs.audit;
                                if (tab === "forex") label = t.settings.forexRate;
                                if (tab === "security") label = "Account";

                                const icons = {
                                    deposits: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>,
                                    kyc: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
                                    withdrawals: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M8 7l4-4m0 0l4 4m-4-4v18"/></svg>,
                                    users: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>,
                                    sales: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>,
                                    forex: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12 7v5l3 3"/></svg>,
                                    audit: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>,
                                    security: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
                                };

                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`w-full flex items-center transition-all duration-300 relative group/item ${
                                            isSidebarCollapsed ? "justify-center p-3 rounded-xl" : "gap-4 px-4 py-2.5 rounded-2xl"
                                        } ${activeTab === tab ? "bg-gv-gold text-black shadow-lg shadow-gv-gold/20" : "text-zinc-500 hover:text-white"}`}
                                        title={isSidebarCollapsed ? label : ""}
                                    >
                                        {icons[tab as keyof typeof icons]}
                                        {!isSidebarCollapsed && (
                                            <span className="text-[10px] font-black uppercase tracking-widest truncate">{label}</span>
                                        )}
                                        {isSidebarCollapsed && (
                                            <div className="absolute left-full ml-4 px-3 py-1.5 bg-gv-gold text-black text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover/item:opacity-100 transition-all z-[100] shadow-2xl whitespace-nowrap">
                                                {label}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t border-white/5 overflow-hidden">
                        <div className={`flex items-center px-4 pb-2 transition-all duration-500 ${isSidebarCollapsed ? "justify-center" : "justify-between"}`}>
                            {!isSidebarCollapsed && <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t.settings.maintenance}</span>}
                            <button onClick={toggleMaintenance} className={`h-5 rounded-full relative transition-all ${isSidebarCollapsed ? "w-8" : "w-10"} ${maintenanceMode ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-white/10"}`}>
                                <div className={`h-3.5 w-3.5 bg-white rounded-full absolute top-0.75 transition-all ${maintenanceMode ? (isSidebarCollapsed ? "right-0.5" : "right-0.75") : (isSidebarCollapsed ? "left-0.5" : "left-0.75")}`}></div>
                            </button>
                        </div>
                        <button onClick={() => { supabase.auth.signOut(); router.push("/login"); }} className={`w-full text-zinc-500 hover:text-red-400 transition-colors text-sm font-medium flex items-center transition-all ${isSidebarCollapsed ? "justify-center p-3" : "gap-3 px-4 py-2"}`}>
                            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
                            {!isSidebarCollapsed && <span>Logout</span>}
                        </button>
                    </div>
                </aside>

                {/* Mobile Sidebar (Slide-in) */}
                <div
                    className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
                        isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
                    }`}
                    onClick={() => setIsSidebarOpen(false)}
                />
                <aside
                    className={`fixed inset-y-0 left-0 z-[60] w-72 bg-[#0a0a0a] border-r border-white/10 p-6 flex flex-col justify-between transition-transform duration-500 ease-out lg:hidden ${
                        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                >
                    <div className="space-y-12">
                        <div className="flex items-center justify-between">
                            <img src="/logo.png" alt="GV Capital" className="h-[50px] w-auto object-contain mix-blend-screen" />
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className="p-2 rounded-full border border-white/10 text-white"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <nav className="space-y-2">
                            {["deposits", "kyc", "withdrawals", "users", "sales", "forex", "audit", "security"].map(tab => {
                                let label = tab;
                                if (tab === "deposits") label = t.tabs.deposits;
                                if (tab === "kyc") label = t.tabs.kyc;
                                if (tab === "withdrawals") label = t.tabs.withdrawals;
                                if (tab === "users") label = t.tabs.users;
                                if (tab === "sales") label = t.tabs.sales;
                                if (tab === "audit") label = t.tabs.audit;
                                if (tab === "forex") label = t.settings.forexRate;
                                if (tab === "security") label = "Admin Account";

                                const icons = {
                                    deposits: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>,
                                    kyc: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
                                    withdrawals: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M8 7l4-4m0 0l4 4m-4-4v18"/></svg>,
                                    users: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>,
                                    sales: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>,
                                    forex: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12 7v5l3 3"/></svg>,
                                    audit: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>,
                                    security: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
                                };

                                return (
                                    <button
                                        key={tab}
                                        onClick={() => { setActiveTab(tab); setIsSidebarOpen(false); }}
                                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? "bg-gv-gold text-black shadow-lg shadow-gv-gold/20" : "text-zinc-500 hover:text-white"}`}
                                    >
                                        {icons[tab as keyof typeof icons]}
                                        <span>{label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </aside>

                <main className="flex-1 overflow-y-auto bg-[#121212] flex flex-col relative">
                    {/* Header with hamburger */}
                    <header className="border-b border-white/5 bg-[#0a0a0a] px-4 md:px-8 py-3 md:py-4 flex items-center justify-between sticky top-0 z-50 lg:hidden">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="p-2 rounded-xl bg-white/5 border border-white/10 text-white lg:hidden active:scale-95 transition-all"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                            </button>
                            <img src="/logo.png" className="h-7 md:h-8 w-auto mix-blend-screen" />
                        </div>
                        <div className="flex items-center p-1 bg-white/5 rounded-xl border border-white/10">
                            <button onClick={() => setLang("en")} className={`px-3 py-1.5 rounded-lg text-[9px] font-black ${lang === "en" ? "bg-gv-gold text-black shadow-lg shadow-gv-gold/10" : "text-zinc-500 hover:text-white"}`}>EN</button>
                            <button onClick={() => setLang("zh")} className={`px-3 py-1.5 rounded-lg text-[9px] font-black ${lang === "zh" ? "bg-gv-gold text-black shadow-lg shadow-gv-gold/10" : "text-zinc-500 hover:text-white"}`}>ZH</button>
                        </div>
                    </header>

                    {/* Desktop Utility Header (No nav here anymore) */}
                    <header className="px-8 py-6 hidden lg:flex items-center justify-between bg-[#121212]">
                        <div>
                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-1">{t.adminPortal}</p>
                            <h1 className="text-3xl font-black uppercase tracking-tighter">
                                {t.tabs[activeTab as keyof typeof t.tabs] || activeTab}
                            </h1>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center p-1 bg-white/5 rounded-xl border border-white/10">
                                <button onClick={() => setLang("en")} className={`px-3 py-1.5 rounded-lg text-[10px] font-black ${lang === "en" ? "bg-gv-gold text-black shadow-lg shadow-gv-gold/20" : "text-zinc-500 hover:text-white"}`}>EN</button>
                                <button onClick={() => setLang("zh")} className={`px-3 py-1.5 rounded-lg text-[10px] font-black ${lang === "zh" ? "bg-gv-gold text-black shadow-lg shadow-gv-gold/20" : "text-zinc-500 hover:text-white"}`}>ZH</button>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded border border-red-500/20 font-mono mb-1 uppercase font-black tracking-widest">System Core</span>
                                <span className="text-[10px] text-white/50 font-mono">{adminProfile?.email}</span>
                            </div>
                        </div>
                    </header>
                        <div className="p-4 md:p-8 space-y-8 md:space-y-12">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 md:p-8 shadow-xl">
                                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">Total Capital</p>
                                    <div className="text-2xl md:text-3xl font-black text-white tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">RM {totalCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                    <p className="text-[10px] text-zinc-600 font-bold mt-1 tracking-widest">≈ ${(totalCapital / forexRate).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</p>
                                </div>
                                <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 md:p-8 shadow-xl">
                                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">Pending Deposits</p>
                                    <div className={`text-2xl md:text-3xl font-black tracking-tighter ${pendingDeposits > 0 ? "text-gv-gold drop-shadow-[0_0_15px_rgba(238,206,128,0.3)]" : "text-white/20"}`}>{pendingDeposits}</div>
                                    <p className="text-[10px] text-zinc-600 font-bold mt-1 tracking-widest uppercase">Action Required</p>
                                </div>
                                <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 md:p-8 shadow-xl">
                                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">Pending KYC</p>
                                    <div className={`text-2xl md:text-3xl font-black tracking-tighter ${pendingKyc > 0 ? "text-gv-gold drop-shadow-[0_0_15px_rgba(238,206,128,0.3)]" : "text-white/20"}`}>{pendingKyc}</div>
                                    <p className="text-[10px] text-zinc-600 font-bold mt-1 tracking-widest uppercase">Action Required</p>
                                </div>
                                <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 md:p-8 shadow-xl">
                                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">Pending Withdrawals</p>
                                    <div className={`text-3xl font-black tracking-tighter ${pendingWithdrawals > 0 ? "text-red-500" : "text-white/20"}`}>{pendingWithdrawals}</div>
                                    <p className="text-[10px] text-zinc-600 font-bold mt-1 tracking-widest uppercase">Action Required</p>
                                </div>
                            </div>


                        {/* Content Area */}
                        <div className="bg-[#121212] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
                            {activeTab === "kyc" && (
                                <div className="animate-in fade-in duration-500">
                                    <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tighter text-white">{t.kyc.queue}</h3>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Verify Client Identity</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4">
                                            <select 
                                                value={kycFilter}
                                                onChange={(e) => setKycFilter(e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 focus:outline-none focus:border-gv-gold/50 transition-all"
                                            >
                                                <option value="All">{t.status.all} {t.status.status}</option>
                                                <option value="Pending">{t.status.pending}</option>
                                                <option value="Verified">{t.status.verified}</option>
                                                <option value="Rejected">{t.status.rejected}</option>
                                                <option value="Draft">Draft</option>
                                            </select>
                                            <div className="relative group w-full md:w-64">
                                                <input 
                                                    type="text"
                                                    placeholder={t.users.searchNameEmail}
                                                    value={kycSearchQuery}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKycSearchQuery(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-2.5 text-xs focus:outline-none focus:border-gv-gold/50 transition-all text-white"
                                                />
                                                <svg className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-gv-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto border border-white/5 mx-0 md:mx-8 mb-8 rounded-2xl md:rounded-3xl">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                <tr>
                                                    <th className="px-8 py-6">{t.table.user}</th>
                                                    <th className="px-8 py-6">{t.table.date}</th>
                                                    <th className="px-8 py-6">Country</th>
                                                    <th className="px-6 py-4">{t.table.user}</th>
                                                    <th className="px-6 py-4">{t.table.date}</th>
                                                    <th className="px-6 py-4">Country</th>
                                                    <th className="px-6 py-4 text-center">{t.table.status}</th>
                                                    <th className="px-6 py-4 text-right min-w-[150px]">{t.table.actions}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.02]">
                                                {users.filter((u: any) => {
                                                    const query = kycSearchQuery.toLowerCase();
                                                    const matchesSearch = (u.full_name || "").toLowerCase().includes(query) || (u.email || "").toLowerCase().includes(query);
                                                    const matchesStatus = kycFilter === "All" || u.kyc_status === kycFilter;
                                                    return matchesSearch && matchesStatus;
                                                }).map((u: any, i: number) => (
                                                    <tr 
                                                        key={i} 
                                                        className="text-xs font-bold group hover:bg-white/[0.01] cursor-pointer"
                                                        onClick={() => { 
                                                            setSelectedUser(u); 
                                                            setPortfolioData({
                                                                platform: u.portfolio_platform_name || "",
                                                                account_id: u.portfolio_account_id || "",
                                                                password: u.portfolio_account_password || "",
                                                                remarks: u.internal_remarks || ""
                                                            });
                                                            setIsDetailModalOpen(true); 
                                                        }}
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-white font-black">{u.full_name || "New Client"}</span>
                                                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{u.email}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-zinc-400 font-mono text-[10px]">
                                                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : "N/A"}
                                                        </td>
                                                        <td className="px-6 py-4 text-zinc-400 text-xs">{u.country || u.kyc_data?.country || "N/A"}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[8px] uppercase font-black border border-amber-500/20">
                                                                {u.kyc_status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button className="text-[9px] font-black uppercase text-gv-gold hover:underline">Review Profile</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {kycQueue.filter((u: any) => {
                                                    const query = kycSearchQuery.toLowerCase();
                                                    return (u.full_name || "").toLowerCase().includes(query) || (u.email || "").toLowerCase().includes(query);
                                                }).length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="px-8 py-20 text-center text-zinc-600 font-bold uppercase tracking-widest">
                                                            {kycQueue.length === 0 ? "No pending KYC applications" : "No matching KYC applications"}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === "withdrawals" && (
                                <div className="animate-in fade-in duration-500">
                                    <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tighter text-white">{t.tabs.withdrawals}</h3>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t.status.all} {t.tabs.withdrawals}</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4">
                                            <div className="relative group w-full md:w-64">
                                                <input 
                                                    type="text"
                                                    placeholder={t.users.searchNameEmail}
                                                    value={withdrawalSearchQuery}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWithdrawalSearchQuery(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-2.5 text-xs focus:outline-none focus:border-gv-gold/50 transition-all text-white"
                                                />
                                                <svg className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-gv-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                            </div>
                                            <select 
                                                value={withdrawalStatusFilter}
                                                onChange={(e) => setWithdrawalStatusFilter(e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 focus:outline-none focus:border-gv-gold/50 transition-all cursor-pointer"
                                            >
                                                <option value="All">{t.status.all} {t.status.status}</option>
                                                <option value="Pending">{t.status.pending}</option>
                                                <option value="Approved">{t.status.approved}</option>
                                                <option value="Rejected">{t.status.rejected}</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto border border-white/5 mx-0 md:mx-8 mb-8 rounded-2xl md:rounded-3xl">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                <tr><th className="px-6 py-4">{t.table.user}</th><th className="px-6 py-4">Bank Details</th><th className="px-6 py-4">{t.table.refId}</th><th className="px-6 py-4">{t.table.amount} (RM)</th><th className="px-6 py-4">Processed By</th><th className="px-6 py-4 text-right min-w-[150px]">{t.table.actions}</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.02]">
                                                {withdrawals.filter((w: any) => {
                                                    const query = withdrawalSearchQuery.toLowerCase();
                                                    const matchesSearch = (w.profiles?.full_name || "").toLowerCase().includes(query) || (w.profiles?.email || "").toLowerCase().includes(query);
                                                    const matchesStatus = withdrawalStatusFilter === "All" || w.status === withdrawalStatusFilter;
                                                    return matchesSearch && matchesStatus;
                                                }).map((w: any, i: number) => (
                                                    <tr key={i} className="text-xs font-bold group hover:bg-white/[0.01]">
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-white font-black uppercase tracking-tight">{w.profiles?.full_name || "Client"}</span>
                                                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{w.profiles?.email}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-white text-[10px] uppercase font-black">{w.profiles?.bank_name || 'N/A'}</div>
                                                            <div className="font-mono text-[9px] text-zinc-500">{w.profiles?.account_number || 'N/A'}</div>
                                                        </td>
                                                        <td className="px-6 py-3 font-mono text-[10px] opacity-50">{w.ref_id}</td>
                                                        <td className="px-6 py-4 text-red-400">
                                                            <div className="flex flex-col">
                                                                <span className="font-black">RM {Math.abs(Number(w.amount || 0)).toFixed(2)}</span>
                                                                <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">(${(Math.abs(Number(w.amount || 0)) / forexRate).toFixed(2)})</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-white font-black uppercase tracking-tight text-[10px]">{w.metadata?.processed_by_name || '-'}</span>
                                                                {w.metadata?.processed_by_email && <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-tighter">{w.metadata.processed_by_email}</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2 h-full pt-4">
                                                            {w.status === 'Pending' && (
                                                                <>
                                                                    <button onClick={() => handleRejectWithdrawal(w)} className="text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all hidden md:block">Reject</button>
                                                                    <button onClick={() => handleApproveWithdrawal(w)} className="bg-emerald-500 text-black px-4 py-1.5 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-emerald-500/10 hover:-translate-y-0.5 transition-all">Approve</button>
                                                                </>
                                                            )}
                                                            {w.status !== 'Pending' && (
                                                                <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${w.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                                    {w.status === 'Approved' ? t.status.approved : w.status === 'Rejected' ? t.status.rejected : w.status}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {withdrawals.filter((w: any) => {
                                                    const query = withdrawalSearchQuery.toLowerCase();
                                                    const matchesSearch = (w.profiles?.full_name || "").toLowerCase().includes(query) || (w.profiles?.email || "").toLowerCase().includes(query);
                                                    const matchesStatus = withdrawalStatusFilter === "All" || w.status === withdrawalStatusFilter;
                                                    return matchesSearch && matchesStatus;
                                                }).length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="px-8 py-20 text-center">
                                                            <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">{withdrawals.length === 0 ? "No withdrawals found" : "No matching withdrawals"}</p>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            {activeTab === "sales" && (
                                <div className="p-8 space-y-8">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tighter text-white">{t.sales.performance}</h3>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t.sales.leaderboard}</p>
                                        </div>
                                        <div className="relative w-full md:w-72">
                                            <input
                                                type="text"
                                                placeholder={t.sales.searchAgent}
                                                value={searchQuery}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-gv-gold transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-2 overflow-hidden border border-white/5 rounded-3xl">
                                            <table className="w-full text-left">
                                                <thead className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                    <tr>
                                                        <th className="px-4 py-4">Rank</th>
                                                        <th className="px-4 py-4">{t.table.user}</th>
                                                        <th className="px-4 py-4">Total Ref</th>
                                                        <th className="px-4 py-4">Total Capital</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/[0.02]">
                                                    {salesData
                                                        .filter((agent: any) => agent.agent_username.toLowerCase().includes(searchQuery.toLowerCase()))
                                                        .map((agent: any, index: number) => (
                                                            <tr
                                                                key={agent.agent_username}
                                                                className={`text-xs group hover:bg-white/[0.02] transition-colors cursor-pointer ${selectedAgent === agent.agent_username ? "bg-gv-gold/5 border-gv-gold/20" : ""}`}
                                                                onClick={() => fetchAgentReferrals(agent.agent_username)}
                                                            >
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-mono text-zinc-500 text-[10px]">#{(index + 1).toString().padStart(2, '0')}</span>
                                                                        {index === 0 && <span className="text-lg">🥇</span>}
                                                                        {index === 1 && <span className="text-lg">🥈</span>}
                                                                        {index === 2 && <span className="text-lg">🥉</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="font-black text-white group-hover:text-gv-gold transition-colors uppercase tracking-tight">{agent.agent_username}</div>
                                                                </td>
                                                                <td className="px-4 py-3 font-bold text-zinc-400">{agent.total_referrals}</td>
                                                                <td className="px-4 py-3 font-black text-emerald-400">
                                                                    <div className="flex flex-col">
                                                                        <span>RM {Number(agent.total_referred_capital || 0).toFixed(2)}</span>
                                                                        <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">(${(Number(agent.total_referred_capital || 0) / forexRate).toFixed(2)})</span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    }
                                                    {salesData.length === 0 && !isLoadingSales && (
                                                        <tr>
                                                            <td colSpan={4} className="px-8 py-20 text-center text-zinc-600 font-bold uppercase tracking-widest">No sales data recorded</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 h-fit min-h-[400px]">
                                            {selectedAgent ? (
                                                <div className="space-y-6 animate-in fade-in duration-300">
                                                    <div>
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gv-gold mb-1">{t.sales.detailProfile}</h4>
                                                        <div className="text-2xl font-black text-white uppercase tracking-tighter">{selectedAgent}</div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t.sales.referredClients} ({agentReferrals.length})</h5>
                                                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                            {agentReferrals.map((ref: any, i: number) => (
                                                                <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center justify-between group">
                                                                    <div>
                                                                        <div className="text-xs font-black text-white">{ref.full_name || ref.username}</div>
                                                                        <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">@{ref.username}</div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xs font-black text-emerald-400">RM {Number(ref.balance || 0).toFixed(2)}</span>
                                                                            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">(${(Number(ref.balance || 0) / forexRate).toFixed(2)})</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {agentReferrals.length === 0 && (
                                                                <div className="text-center py-10 text-zinc-600 text-[10px] font-black uppercase">{t.sales.noReferrals}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-center p-10">
                                                    <div className="text-4xl mb-4 opacity-20">📊</div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Select an agent to view drill-down performance</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "forex" && (
                                adminProfile?.role !== 'admin' && adminProfile?.email !== 'thenja96@gmail.com' ? (
                                    <div className="min-h-[400px] flex items-center justify-center text-center p-12">
                                        <div className="space-y-4">
                                            <div className="text-4xl">🔒</div>
                                            <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Access Restricted</h3>
                                            <p className="text-zinc-500 text-sm max-w-xs">You do not have the necessary permissions to access global pricing controls.</p>
                                        </div>
                                    </div>
                                ) : (
                                <div className="p-10 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="max-w-md space-y-6">
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-white">Global Pricing Control</h3>
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Current Platform Rate</label>
                                                <div className="text-4xl font-black text-gv-gold tracking-tighter">1 USD = RM {forexRate.toFixed(4)}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">New Target Rate (MYR)</label>
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    value={newForexRate}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewForexRate(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-2xl font-black focus:outline-none focus:border-gv-gold transition-all text-white"
                                                    placeholder="4.000"
                                                />
                                            </div>
                                            <button
                                                onClick={handleUpdateForexRate}
                                                disabled={isUpdatingRate}
                                                className="w-full bg-gv-gold text-black font-black py-5 rounded-2xl uppercase tracking-widest shadow-xl hover:-translate-y-1 hover:shadow-gv-gold/20 transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                {isUpdatingRate ? "Propagating Rate..." : "Update Global Rate"}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xl font-black uppercase tracking-tighter text-white">Rate Audit History</h3>
                                            <div className="h-[1px] flex-1 bg-white/5 mx-8"></div>
                                        </div>
                                        <div className="overflow-hidden border border-white/5 rounded-3xl">
                                            <table className="w-full text-left">
                                                <thead className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                    <tr>
                                                        <th className="px-6 py-4">Date</th>
                                                        <th className="px-6 py-4">Old Rate</th>
                                                        <th className="px-6 py-4">New Rate</th>
                                                        <th className="px-6 py-4">Change %</th>
                                                        <th className="px-6 py-4">Admin</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/[0.02]">
                                                    {forexHistory.map((h: any, i: number) => {
                                                        const change = ((h.new_rate - h.old_rate) / h.old_rate) * 100;
                                                        return (
                                                            <tr key={i} className="text-xs font-bold hover:bg-white/[0.01] transition-colors">
                                                                <td className="px-6 py-4 text-zinc-400 font-mono">{new Date(h.created_at).toLocaleString()}</td>
                                                                <td className="px-6 py-4 text-zinc-500">RM {h.old_rate.toFixed(3)}</td>
                                                                <td className="px-6 py-4 text-white">RM {h.new_rate.toFixed(3)}</td>
                                                                <td className={`px-6 py-4 ${change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                                                    {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                                                                </td>
                                                                <td className="px-6 py-4 text-zinc-500">{h.changed_by}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {forexHistory.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="px-8 py-12 text-center text-zinc-600 uppercase font-black tracking-widest">Initial global rate configured</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                )
                            )}

                            {activeTab === "users" && (
                                <div className="p-8 space-y-6 animate-in fade-in duration-500">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tighter text-white">{t.users.userDirectory}</h3>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t.users.activeInvestors}</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4">
                                            {/* Search Bar */}
                                            <div className="relative group w-full md:w-64">
                                                <input 
                                                    type="text"
                                                    placeholder={t.users.searchNameEmail}
                                                    value={userSearchQuery}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserSearchQuery(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-2.5 text-xs focus:outline-none focus:border-gv-gold/50 transition-all text-white"
                                                />
                                                <svg className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-gv-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                            </div>
                                            {/* Status Filter */}
                                            <select 
                                                value={userStatusFilter}
                                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUserStatusFilter(e.target.value)}
                                                className="bg-[#121212] border border-white/10 rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-400 focus:outline-none focus:border-gv-gold/50 cursor-pointer transition-all"
                                            >
                                                <option value="All">{t.status.all} {t.tabs.users}</option>
                                                <option value="Verified">{t.status.verified}</option>
                                                <option value="Unverified">{t.status.unverified}</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto border border-white/5 rounded-3xl">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                <tr>
                                                    <th className="px-6 py-4">{t.table.user}</th>
                                                    <th className="px-6 py-4">{t.users.totalInvestment || "Total Investment"}</th>
                                                    <th className="px-6 py-4">{t.users.dividendEarned || "Dividend Earned"}</th>
                                                    <th className="px-6 py-4 text-center">{t.table.tier}</th>
                                                    <th className="px-6 py-4 text-center">{t.table.status}</th>
                                                    <th className="px-6 py-4 text-right min-w-[150px]">{t.table.actions}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.02]">
                                                {users.filter((u: any) => {
                                                    const query = userSearchQuery.toLowerCase();
                                                    const matchesSearch = (u.full_name || "").toLowerCase().includes(query) || (u.email || "").toLowerCase().includes(query);
                                                    let matchesFilter = true;
                                                    if (userStatusFilter === "Verified") {
                                                        matchesFilter = u.is_verified === true;
                                                    } else if (userStatusFilter === "Unverified") {
                                                        matchesFilter = u.is_verified === false;
                                                    }
                                                    return matchesSearch && matchesFilter;
                                                }).map((u: any, i: number) => (
                                                    <tr 
                                                        key={i} 
                                                        className="text-xs font-bold group hover:bg-white/[0.01] cursor-pointer"
                                                        onClick={() => { setSelectedUser(u); setIsDetailModalOpen(true); }}
                                                    >
                                                        <td className="px-3 py-3">
                                                            <div className="flex flex-col">
                                                                <span className="text-white font-black text-[11px] leading-tight">{u.full_name || "New Client"}</span>
                                                                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">{u.email}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3 whitespace-nowrap">
                                                            <div className="flex flex-col">
                                                                <span className="text-emerald-400 font-black text-[11px]">RM {Number(u.balance || 0).toFixed(2)}</span>
                                                                <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-tighter">(${(Number(u.balance || 0) / forexRate).toFixed(2)} USD)</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3 text-gv-gold font-mono text-[9px] whitespace-nowrap">RM {Number(u.profit || 0).toFixed(2)}</td>
                                                        <td className="px-3 py-3 text-center">
                                                            {(() => {
                                                                const userTier = getTierByAmount(Number(u.balance || 0) / forexRate);
                                                                return (
                                                                    <div className="flex flex-col items-center">
                                                                         <TierMedal tierId={userTier.id} size="sm" />
                                                                        <span className="px-1.5 py-0 rounded-full bg-gv-gold/10 text-gv-gold text-[7px] uppercase font-black border border-gv-gold/20">
                                                                            {userTier.name}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="px-3 py-3 text-center">
                                                            {u.is_verified ? (
                                                                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Verified</span>
                                                            ) : (
                                                                <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Pending</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right space-x-2" onClick={(e: React.MouseEvent<HTMLTableCellElement>) => {
                                                            e.stopPropagation();
                                                            setSelectedUser(u);
                                                            setPortfolioData({
                                                                platform: u.portfolio_platform_name || "",
                                                                account_id: u.portfolio_account_id || "",
                                                                password: u.portfolio_account_password || "",
                                                                remarks: u.internal_remarks || ""
                                                            });
                                                            setIsDetailModalOpen(true);
                                                        }}>
                                                            <button 
                                                                className="bg-gv-gold/10 text-gv-gold text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl hover:bg-gv-gold hover:text-black transition-all"
                                                            >
                                                                {t.users.adjust}
                                                            </button>
                                                            <button 
                                                                className="text-white text-[9px] font-black uppercase tracking-widest hover:underline"
                                                            >
                                                                {t.users.details}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {users.filter((u: any) => {
                                                    const query = userSearchQuery.toLowerCase();
                                                    const matchesSearch = (u.full_name || "").toLowerCase().includes(query) || (u.email || "").toLowerCase().includes(query);
                                                    let matchesFilter = true;
                                                    if (userStatusFilter === "Verified") matchesFilter = u.is_verified === true;
                                                    else if (userStatusFilter === "KYC Pending") matchesFilter = !u.is_verified && u.kyc_step === 3;
                                                    else if (userStatusFilter === "Unverified") matchesFilter = !u.is_verified && (u.kyc_step || 0) < 3;
                                                    return matchesSearch && matchesFilter;
                                                }).length === 0 && (
                                                    <tr>
                                                        <td colSpan={7} className="px-8 py-20 text-center text-zinc-600 font-bold uppercase tracking-widest">
                                                            {users.length === 0 ? "No users found" : "No matching users"}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === "deposits" && (
                                <div className="animate-in fade-in duration-500">
                                    <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tighter text-white">{t.tabs.deposits} Review</h3>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t.status.all} {t.tabs.deposits}</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4">
                                            <div className="relative group w-full md:w-64">
                                                <input 
                                                    type="text"
                                                    placeholder={t.users.searchNameEmail}
                                                    value={depositSearchQuery}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepositSearchQuery(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-2.5 text-xs focus:outline-none focus:border-gv-gold/50 transition-all text-white"
                                                />
                                                <svg className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-gv-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                            </div>
                                            <select 
                                                value={depositStatusFilter}
                                                onChange={(e) => setDepositStatusFilter(e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 focus:outline-none focus:border-gv-gold/50 transition-all cursor-pointer"
                                            >
                                                <option value="All">{t.status.all} {t.status.status}</option>
                                                <option value="Pending">{t.status.pending}</option>
                                                <option value="Approved">{t.status.approved}</option>
                                                <option value="Rejected">{t.status.rejected}</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto border border-white/5 mx-0 md:mx-8 mb-8 rounded-2xl md:rounded-3xl">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                <tr>
                                                    <th className="px-6 py-4">{t.table.user}</th>
                                                    <th className="px-6 py-4">{t.table.refId}</th>
                                                    <th className="px-6 py-4">{t.table.amount} (RM)</th>
                                                    <th className="px-6 py-4">{t.table.status}</th>
                                                    <th className="px-6 py-4">Processed By</th>
                                                    <th className="px-6 py-4">{t.table.date}</th>
                                                    <th className="px-6 py-4 text-right min-w-[150px]">{t.table.actions}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.02]">
                                                {deposits.filter((d: any) => {
                                                    const query = depositSearchQuery.toLowerCase();
                                                    const matchesSearch = (d.profiles?.full_name || "").toLowerCase().includes(query) || (d.profiles?.email || "").toLowerCase().includes(query);
                                                    const matchesStatus = depositStatusFilter === "All" || d.status === depositStatusFilter;
                                                    return matchesSearch && matchesStatus;
                                                }).map((d: any) => (
                                                    <tr key={d.id} className="text-xs font-bold group hover:bg-white/[0.01]">
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-white font-black uppercase tracking-tight">{d.profiles?.full_name || d.profiles?.email || 'N/A'}</span>
                                                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{d.profiles?.email}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3 font-mono text-[10px] opacity-50">{d.ref_id}</td>
                                                        <td className="px-6 py-4 font-bold text-emerald-400">
                                                            RM {Number(d.amount || 0).toFixed(2)}
                                                            <span className="text-[10px] text-zinc-500 ml-1.5 font-medium">(${(Number(d.amount || 0) / forexRate).toFixed(2)})</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                                                d.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-500' :
                                                                d.status === 'Rejected' ? 'bg-red-500/20 text-red-500' :
                                                                'bg-amber-500/20 text-amber-500'
                                                            }`}>
                                                                {d.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-white font-black uppercase tracking-tight text-[10px]">{d.metadata?.processed_by_name || '-'}</span>
                                                                {d.metadata?.processed_by_email && <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-tighter">{d.metadata.processed_by_email}</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-zinc-400 font-mono text-[10px] whitespace-nowrap">
                                                            {d.created_at ? new Date(d.created_at).toLocaleString() : "N/A"}
                                                        </td>
                                                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                            {d.status === 'Pending' && (
                                                                <>
                                                                    <button 
                                                                        onClick={() => handleRejectDeposit(d)}
                                                                        className="text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleApproveDeposit(d)}
                                                                        className="bg-emerald-500 text-black px-4 py-1.5 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-emerald-500/10 hover:-translate-y-0.5 transition-all"
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                </>
                                                            )}
                                                            <button 
                                                                onClick={() => { setSelectedDepositTx(d); setIsDepositDrawerOpen(true); }}
                                                                className="text-[9px] font-black uppercase text-gv-gold hover:underline"
                                                            >
                                                                Details
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {deposits.filter((d: any) => {
                                                    const query = depositSearchQuery.toLowerCase();
                                                    const matchesSearch = (d.profiles?.full_name || "").toLowerCase().includes(query) || (d.profiles?.email || "").toLowerCase().includes(query);
                                                    const matchesStatus = depositStatusFilter === "All" || d.status === depositStatusFilter;
                                                    return matchesSearch && matchesStatus;
                                                }).length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="px-8 py-20 text-center text-zinc-600 font-bold uppercase tracking-widest">
                                                            {deposits.length === 0 ? "No deposits recorded" : "No matching deposits"}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === "audit" && (
                                <div className="p-8 animate-in fade-in duration-500">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tighter text-white">{t.tabs.audit}</h3>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Platform Integrity & Aggregate Audit</p>
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center gap-4">
                                            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
                                                <div className="h-10 w-10 rounded-xl bg-gv-gold/10 flex items-center justify-center">
                                                    <svg className="h-5 w-5 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Total Platform Assets</p>
                                                    <p className="text-lg font-black text-white tracking-tighter">RM {platformStats.totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
                                                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                                    <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Aggregate Wallet</p>
                                                    <p className="text-lg font-black text-white tracking-tighter">RM {platformStats.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
                                                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                                    <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Total Withdrawable Amount</p>
                                                    <p className="text-lg font-black text-white tracking-tighter">RM {platformStats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                        <div>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Detailed Administrative & Financial Ledger</p>
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center gap-4">
                                            {/* Search Bar */}
                                            <div className="relative group">
                                                <input 
                                                    type="text"
                                                    placeholder={t.users.searchNameEmail}
                                                    value={auditSearchQuery}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAuditSearchQuery(e.target.value)}
                                                    className="bg-white/5 border border-white/10 rounded-xl px-10 py-2.5 text-xs focus:outline-none focus:border-gv-gold/50 transition-all w-full md:w-64"
                                                />
                                                <svg className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-gv-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                            </div>

                                            {/* Status Filter */}
                                            <select 
                                                value={auditStatusFilter}
                                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAuditStatusFilter(e.target.value)}
                                                className="bg-[#121212] border border-white/10 rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-400 focus:outline-none focus:border-gv-gold/50 cursor-pointer transition-all"
                                            >
                                                <option value="All">All Actions</option>
                                                <option value="Verified">Verified Only</option>
                                                <option value="Rejected">Rejected Only</option>
                                                <option value="Adjustment">Adjustments Only</option>
                                            </select>

                                            <button onClick={fetchData} className="text-zinc-500 hover:text-gv-gold transition-colors p-2">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="overflow-hidden border border-white/5 rounded-3xl">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5 border-b border-white/10 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                                <tr>
                                                    <th className="px-6 py-4">{t.audit.dateTime}</th>
                                                    <th className="px-6 py-4">{t.audit.admin}</th>
                                                    <th className="px-6 py-4">{t.audit.targetUser}</th>
                                                    <th className="px-6 py-4">{t.audit.action}</th>
                                                    <th className="px-6 py-4">Admin ID (KYC) / Processed By (TX)</th>
                                                    <th className="px-6 py-4">{t.audit.reason}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.02]">
                                                {combinedAuditLogs
                                                    .filter(log => {
                                                        const query = auditSearchQuery.toLowerCase();
                                                        const matchesSearch = log.user_email?.toLowerCase().includes(query) || 
                                                                            log.admin_username?.toLowerCase().includes(query) ||
                                                                            (log.processed_by_name || "").toLowerCase().includes(query);
                                                        const matchesFilter = auditStatusFilter === "All" || 
                                                                             (auditStatusFilter === "Verified" && log.action === "Verified") ||
                                                                             (auditStatusFilter === "Rejected" && log.action === "Rejected") ||
                                                                             (auditStatusFilter === "Adjustment" && log.action === "Adjustment");
                                                        return matchesSearch && matchesFilter;
                                                    })
                                                    .map((log: any, i: number) => {
                                                        const targetUser = users.find(u => u.email === log.user_email);
                                                        return (
                                                            <tr key={i} className="text-xs font-bold hover:bg-white/[0.01] transition-colors">
                                                                <td className="px-6 py-3 text-zinc-400 font-mono text-[10px]">{new Date(log.created_at).toLocaleString()}</td>
                                                                <td className="px-6 py-3 text-white">
                                                                    <div className="flex flex-col">
                                                                        <span className="uppercase tracking-tight">{log.admin_username}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-3">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-white font-black uppercase tracking-tight">{targetUser?.full_name || "Client"}</span>
                                                                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{log.user_email}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-3">
                                                                    <span className={`px-2 py-0.5 rounded-md text-[8px] uppercase font-black ${
                                                                        log.action === 'Verified' ? "bg-emerald-500/10 text-emerald-500" : 
                                                                        log.action === 'Adjustment' ? "bg-gv-gold/10 text-gv-gold" :
                                                                        "bg-red-500/10 text-red-500"
                                                                    }`}>
                                                                        {log.action}
                                                                        {log.txType ? ` - ${log.txType}` : ""}
                                                                        {log.amount && ` (RM ${Number(log.amount).toFixed(2)})`}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-3">
                                                                    <div className="flex flex-col">
                                                                        {log.admin_id ? (
                                                                            <>
                                                                                <span className="text-white font-black uppercase tracking-tight text-[10px]">{log.admin_username}</span>
                                                                                <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-tighter">
                                                                                    {users.find(u => u.id === log.admin_id)?.email || log.admin_id.slice(0, 8)}
                                                                                </span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <span className="text-white font-black uppercase tracking-tight text-[10px]">{log.processed_by_name || '-'}</span>
                                                                                {log.processed_by_email && <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-tighter">{log.processed_by_email}</span>}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-3 text-zinc-500 italic max-w-xs truncate overflow-hidden text-[10px]" title={log.rejection_reason || log.reason}>
                                                                    {log.rejection_reason || log.reason || "-"}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                {combinedAuditLogs.filter(log => {
                                                    const query = auditSearchQuery.toLowerCase();
                                                    const matchesSearch = log.user_email?.toLowerCase().includes(query) || 
                                                                        log.admin_username?.toLowerCase().includes(query);
                                                    const matchesFilter = auditStatusFilter === "All" || log.action === auditStatusFilter;
                                                    return matchesSearch && matchesFilter;
                                                }).length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="px-8 py-20 text-center text-zinc-600 font-bold uppercase tracking-widest">
                                                            {combinedAuditLogs.length === 0 ? "No audit logs found" : "No logs found for this search"}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === "security" && (
                                <div className="p-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                                    <div className="max-w-xl text-center mx-auto space-y-10">
                                        <div>
                                            <h2 className="text-3xl font-black uppercase tracking-tighter mb-2 text-white">Security Settings</h2>
                                            <p className="text-zinc-500 font-medium">Update your admin account password to ensure the platform remains protected.</p>
                                        </div>

                                        <form onSubmit={handlePasswordUpdate} className="space-y-6 text-left">
                                            <div className="space-y-2">
                                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Current Password</label>
                                                <input
                                                    name="currentPassword"
                                                    type="password"
                                                    required
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xl font-bold focus:outline-none focus:border-gv-gold transition-all"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">New Password</label>
                                                <input
                                                    name="newPassword"
                                                    type="password"
                                                    required
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xl font-bold focus:outline-none focus:border-gv-gold transition-all"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Confirm New Password</label>
                                                <input
                                                    name="confirmPassword"
                                                    type="password"
                                                    required
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xl font-bold focus:outline-none focus:border-gv-gold transition-all"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={isUpdatingRate}
                                                className="w-full bg-gv-gold text-black font-black py-6 rounded-2xl uppercase tracking-widest shadow-xl hover:shadow-gv-gold/20 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-4 mt-10"
                                            >
                                                {isUpdatingRate ? "Updating..." : "Update Password"}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                {toast.visible && (
                    <div className="fixed bottom-8 right-8 bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl z-[1000] animate-in slide-in-from-bottom-10 duration-500 font-bold border border-white/20 flex items-center gap-3">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        {toast.message}
                    </div>
                )}

                {/* User Detail Slide-over */}
                {isDetailModalOpen && selectedUser && (
                    <>
                        {/* Backdrop */}
                        <div 
                            className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
                            onClick={() => setIsDetailModalOpen(false)}
                        ></div>
                        
                        {/* Drawer */}
                        <div className="fixed inset-y-0 right-0 z-[600] w-full max-w-md bg-[#121212] border-l border-white/10 shadow-2xl p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
                            <button 
                                onClick={() => setIsDetailModalOpen(false)}
                                className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            
                            <div className="mt-8 space-y-10">
                                <header className="space-y-2">
                                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{selectedUser.full_name || t.users.details}</h2>
                                    <p className="text-zinc-400 text-sm font-medium">{selectedUser.email}</p>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pt-2">
                                        Account Created: {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : 'N/A'}
                                    </p>
                                    <div className="mt-8 grid grid-cols-2 gap-4">
                                        <div className="bg-gv-gold/10 border border-gv-gold/30 p-5 rounded-2xl shadow-[0_0_15px_rgba(238,206,128,0.1)]">
                                            <p className="text-[10px] font-black text-gv-gold uppercase tracking-widest mb-1">Total Assets</p>
                                            <p className="text-xl font-black text-white">RM {(Number(selectedUser.balance || 0) + Number(selectedUser.profit || 0)).toFixed(2)}</p>
                                            <p className="text-[10px] font-bold text-zinc-500">(${( (Number(selectedUser.balance || 0) + Number(selectedUser.profit || 0)) / forexRate).toFixed(2)} USD)</p>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between gap-3">
                                            <div>
                                                {(() => {
                                                    const userTier = getTierByAmount(Number(selectedUser.balance || 0) / forexRate);
                                                    return (
                                                        <>
                                                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{t.users.currentTier || "Current Tier"}</p>
                                                            <p className="text-xl font-black text-gv-gold uppercase tracking-tighter">{userTier.name}</p>
                                                            <p className="text-[10px] font-bold text-zinc-500">{t.table.status}: {selectedUser.is_verified ? t.status.verified : t.status.unverified}</p>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            {(() => {
                                                const userTier = getTierByAmount(Number(selectedUser.balance || 0) / forexRate);
                                                return <TierMedal tierId={userTier.id} size="md" className="shrink-0" />;
                                            })()}
                                        </div>
                                    </div>
                                </header>

                                {/* Conditional KYC Actions (Only visible in KYC tab) */}
                                {activeTab === "kyc" && (
                                    <section className="space-y-4 pt-6 border-t border-white/10">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gv-gold">Verification Controls</h3>
                                        <div className="flex gap-4">
                                            {selectedUser.kyc_status !== 'Verified' ? (
                                                <>
                                                    <button 
                                                        onClick={() => handleVerifyUser(selectedUser.id)}
                                                        disabled={isVerifying}
                                                        className="flex-1 bg-emerald-500 text-black py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                                    >
                                                        {isVerifying ? "Processing..." : "Approve KYC"}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRejectUser(selectedUser.id)}
                                                        disabled={isVerifying}
                                                        className="flex-1 bg-red-500 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 disabled:opacity-50"
                                                    >
                                                        {isVerifying ? "Processing..." : "Reject"}
                                                    </button>
                                                </>
                                            ) : (
                                                <button 
                                                    onClick={() => handleResetKyc(selectedUser.id, "Admin decided to reset KYC status.")}
                                                    className="flex-1 bg-white/5 text-zinc-400 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10"
                                                >
                                                    Reset to Pending
                                                </button>
                                            )}
                                        </div>
                                    </section>
                                )}

                                {/* Section: Financial Adjustments */}
                                <section className="space-y-4 pt-6 border-t border-white/10">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gv-gold flex items-center gap-2">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        {t.users.financialAdjustments}
                                    </h3>
                                    <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] space-y-4">
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setAdjustmentType("balance")}
                                                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${adjustmentType === "balance" ? "bg-gv-gold text-black" : "bg-white/5 text-zinc-500"}`}
                                            >
                                                {t.table.balance}
                                            </button>
                                            <button 
                                                onClick={() => setAdjustmentType("profit")}
                                                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${adjustmentType === "profit" ? "bg-gv-gold text-black" : "bg-white/5 text-zinc-500"}`}
                                            >
                                                {t.table.profit}
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <input 
                                                    type="number"
                                                    placeholder="Adjustment Amount (e.g. 500 or -500)"
                                                    value={adjustmentAmount}
                                                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-xs text-white focus:border-gv-gold/50 outline-none transition-all"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gv-gold/40 tracking-widest">RM</span>
                                            </div>
                                            <input 
                                                type="text"
                                                placeholder="Reason for adjustment..."
                                                value={adjustmentReason}
                                                onChange={(e) => setAdjustmentReason(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-gv-gold/50 outline-none transition-all"
                                            />
                                            <button 
                                                onClick={handleAdjustBalance}
                                                disabled={isUpdatingBalance || !adjustmentAmount || !adjustmentReason}
                                                className="w-full bg-white text-black font-black py-3 rounded-xl text-[10px] uppercase tracking-widest hover:bg-gv-gold transition-all disabled:opacity-50"
                                            >
                                                {isUpdatingBalance ? "Processing..." : "Apply Adjustment"}
                                            </button>
                                        </div>
                                    </div>
                                </section>

                                {/* Section: Investment Portfolio */}
                                <section className="space-y-4 pt-6 border-t border-white/10">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gv-gold flex items-center gap-2">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                        {t.users.investmentPortfolio}
                                    </h3>
                                    <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] space-y-4">
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1 mb-1 block">Platform Name</label>
                                                <input 
                                                    type="text"
                                                    value={portfolioData.platform}
                                                    onChange={(e) => setPortfolioData({...portfolioData, platform: e.target.value})}
                                                    placeholder="MetaTrader 5 / IC Markets / etc."
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-gv-gold/50 transition-all font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1 mb-1 block">Account ID</label>
                                                <input 
                                                    type="text"
                                                    value={portfolioData.account_id}
                                                    onChange={(e) => setPortfolioData({...portfolioData, account_id: e.target.value})}
                                                    placeholder="Login ID"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-gv-gold/50 transition-all font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1 mb-1 block">Investor Password</label>
                                                <div className="relative">
                                                    <input 
                                                        type="text"
                                                        value={portfolioData.password}
                                                        onChange={(e) => setPortfolioData({...portfolioData, password: e.target.value})}
                                                        placeholder="Portfolio Password"
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-gv-gold/50 transition-all font-mono"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1 mb-1 block">Internal Remarks</label>
                                                <textarea 
                                                    value={portfolioData.remarks}
                                                    onChange={(e) => setPortfolioData({...portfolioData, remarks: e.target.value})}
                                                    placeholder="Internal notes about this user..."
                                                    rows={3}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-gv-gold/50 transition-all resize-none"
                                                />
                                            </div>
                                            <button 
                                                onClick={handleUpdatePortfolio}
                                                disabled={isUpdatingPortfolio}
                                                className="w-full bg-gv-gold text-black font-black py-3 rounded-xl text-[10px] uppercase tracking-widest hover:shadow-lg hover:shadow-gv-gold/20 transition-all disabled:opacity-50"
                                            >
                                                {isUpdatingPortfolio ? "Saving..." : "Update Portfolio Details"}
                                            </button>
                                        </div>
                                    </div>
                                </section>

                                {/* Section: Banking Information */}
                                <section className="space-y-4 pt-6 border-t border-white/10">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gv-gold flex items-center gap-2">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                        Banking Information
                                    </h3>
                                    <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Bank Name</p>
                                                <p className="text-sm font-bold text-white">{selectedUser.bank_name || "N/A"}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Account Number</p>
                                                <p className="text-sm font-bold text-white font-mono">{selectedUser.account_number || "N/A"}</p>
                                            </div>
                                            <div className="col-span-2 pt-2 border-t border-white/5">
                                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Account Holder</p>
                                                <p className="text-sm font-bold text-white">{selectedUser.bank_account_holder || "N/A"}</p>
                                            </div>
                                            {selectedUser.bank_statement_url && (
                                                <div className="col-span-2 pt-2">
                                                    <button 
                                                        onClick={async () => {
                                                            const { data, error } = await supabase.storage.from('agreements').createSignedUrl(selectedUser.bank_statement_url!, 3600);
                                                            if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                                                            else alert("Could not generate secure link for the statement.");
                                                        }}
                                                        className="inline-flex items-center gap-2 bg-white/10 hover:bg-gv-gold hover:text-black px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                        View Bank Statement
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                {/* Section: Compliance Documents */}
                                <section className="space-y-4 pt-6 border-t border-white/10">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gv-gold">Compliance & KYC</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                          <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">KYC Status</span>
                                            <span className={`text-xs font-black uppercase mt-1 ${selectedUser.kyc_status === 'Verified' ? "text-emerald-500" : "text-amber-500"}`}>
                                                {selectedUser.kyc_status || "Pending"}
                                            </span>
                                          </div>
                                          {!selectedUser.is_verified && (
                                            <button 
                                                onClick={() => handleVerifyUser(selectedUser.id)}
                                                className="bg-emerald-500 text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase shadow-lg shadow-emerald-500/20"
                                            >
                                                Verify Now
                                            </button>
                                          )}
                                        </div>
                                        {userKycDocs.length > 0 ? (
                                            userKycDocs.map((doc, idx) => (
                                                <div key={idx} className="flex flex-col gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-gv-gold/30 transition-all group">
                                                    <div className="flex items-center justify-between font-mono">
                                                        <span className="text-[10px] font-bold text-white truncate pr-4">{doc.name}</span>
                                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-white/10 hover:bg-gv-gold hover:text-black rounded-lg transition-all">Open</a>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-center text-[10px] font-bold text-zinc-600 uppercase">No documents uploaded.</div>
                                        )}
                                    </div>
                                </section>

                                {/* Section: Security & DANGER ZONE */}
                                <section className="space-y-4 pt-6 border-t border-white/10 pb-10">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-red-500">Security Actions</h3>
                                    <div className="space-y-3">
                                        <button 
                                            onClick={() => handleResetUserPassword(selectedUser.email)}
                                            className="w-full bg-white/5 border border-white/10 text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                                        >
                                            Reset Account Password
                                        </button>
                                        <button 
                                            onClick={() => { setRejectReasonText(""); setIsRejectModalOpen(true); }}
                                            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/10 font-black py-4 rounded-xl text-[10px] uppercase tracking-widest transition-all"
                                        >
                                            Reset KYC / Reject Submission
                                        </button>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </>
                )}

                {/* Lightbox / Document Viewer */}
                {viewingDoc && (
                    <div className="fixed inset-0 z-[700] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 md:p-16 animate-in fade-in zoom-in-95 duration-300" onClick={() => setViewingDoc(null)}>
                        <div className="relative max-w-6xl w-full h-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
                            <button 
                                onClick={() => setViewingDoc(null)}
                                className="absolute -top-12 right-0 text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:text-gv-gold transition-all"
                            >
                                Close Viewer <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <div className="w-full h-full flex items-center justify-center bg-white/5 rounded-[40px] overflow-hidden border border-white/10">
                                <img 
                                    src={viewingDoc} 
                                    className="w-full h-full object-contain"
                                    alt="Identity Document High-Res"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Deposit Receipt Drawer / Modal */}
                {isDepositDrawerOpen && selectedDepositTx && (
                    <div className="fixed inset-0 z-[750] bg-black/80 backdrop-blur-md flex justify-end animate-in fade-in duration-300">
                        <div className="w-full max-w-xl bg-[#121212] border-l border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] h-full overflow-y-auto animate-in slide-in-from-right-full duration-500 flex flex-col">
                            <div className="p-8 border-b border-white/10 shrink-0 flex items-center justify-between bg-black/40 sticky top-0 z-10 backdrop-blur-xl">
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">{t.tabs.deposits} Review</h2>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{t.table.refId}: {selectedDepositTx.ref_id}</p>
                                </div>
                                <button 
                                    onClick={() => setIsDepositDrawerOpen(false)}
                                    className="h-10 w-10 bg-white/5 hover:bg-white/10 hover:text-white text-zinc-500 rounded-full flex items-center justify-center transition-all"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            
                            <div className="p-8 flex-1 flex flex-col">
                                <div className="space-y-8 flex-1 flex flex-col">
                                    {/* Image Viewer */}
                                    <div className="relative group w-full bg-[#0a0a0a] border border-white/10 rounded-3xl flex-1 min-h-[400px] overflow-hidden flex items-center justify-center p-2 shadow-inner">
                                        {depositReceiptUrl ? (
                                            <>
                                                {selectedDepositTx.receipt_url && selectedDepositTx.receipt_url.toLowerCase().endsWith('.pdf') ? (
                                                    <iframe src={depositReceiptUrl} className="w-full h-full rounded-2xl bg-white"/>
                                                ) : (
                                                    <img 
                                                        src={depositReceiptUrl} 
                                                        alt="Deposit Receipt" 
                                                        className="w-full h-full object-contain rounded-2xl group-hover:scale-[1.02] transition-transform duration-700"
                                                    />
                                                )}
                                                <a 
                                                    href={depositReceiptUrl}
                                                    download={`Receipt_${selectedDepositTx.ref_id}`}
                                                    target="_blank" 
                                                    className="absolute bottom-6 right-6 bg-black/80 hover:bg-gv-gold hover:text-black hover:shadow-[0_0_20px_rgba(238,206,128,0.4)] backdrop-blur-lg border border-white/10 p-4 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all hidden md:flex"
                                                    title="Download Original"
                                                >
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                </a>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center animate-pulse">
                                                <div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full mb-6 shadow-[0_0_15px_rgba(238,206,128,0.5)]"></div>
                                                <p className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">Initiating Secure Connection...</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Transaction Quick Details */}
                                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center shrink-0">
                                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-3">Request Amount</div>
                                        <h3 className="text-5xl font-black text-emerald-400 tracking-tighter drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                                            RM {Number(selectedDepositTx.amount || 0).toFixed(2)}
                                        </h3>
                                        <div className="text-sm text-zinc-500 font-bold uppercase tracking-widest mt-2">
                                            (${(Number(selectedDepositTx.amount || 0) / forexRate).toFixed(2)} USD)
                                        </div>
                                        <div className="mt-4 flex flex-col items-center gap-1 text-center">
                                            <div className="text-white text-sm font-bold uppercase tracking-widest">{selectedDepositTx.profiles?.full_name || 'Client'}</div>
                                            <div className="text-zinc-500 text-[10px] uppercase font-black">
                                                {selectedDepositTx.transfer_date ? new Date(selectedDepositTx.transfer_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "Unknown Date"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Area */}
                            <div className="p-8 border-t border-white/10 bg-black/40 backdrop-blur-xl shrink-0">
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => handleRejectDeposit(selectedDepositTx)}
                                        className="w-1/3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 px-6 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-center hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] active:scale-95"
                                    >
                                        Reject
                                    </button>
                                    <button 
                                        onClick={() => handleApproveDeposit(selectedDepositTx)}
                                        className="w-2/3 bg-emerald-500 hover:bg-emerald-600 text-black px-6 py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all text-center shadow-[0_0_20px_rgba(52,211,153,0.3)] active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Approve & Credit
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reject Confirmation Modal */}
                {isRejectModalOpen && selectedUser && (
                    <div className="fixed inset-0 z-[800] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setIsRejectModalOpen(false)}>
                        <div className="bg-[#121212] border border-white/10 shadow-2xl rounded-3xl p-8 max-w-md w-full animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Reject KYC Submission</h2>
                            <p className="text-zinc-400 text-sm mb-6">Please provide a reason for rejecting <span className="text-white font-bold">{selectedUser.email}</span>'s KYC application.</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Reason for Rejection</label>
                                    <textarea
                                        value={rejectReasonText}
                                        onChange={(e) => setRejectReasonText(e.target.value)}
                                        placeholder="e.g., ID document is blurred, or details do not match..."
                                        rows={4}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all resize-none"
                                    />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button 
                                        onClick={() => setIsRejectModalOpen(false)}
                                        className="flex-1 bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (!rejectReasonText.trim()) {
                                                alert("Please enter a rejection reason.");
                                                return;
                                            }
                                            handleResetKyc(selectedUser.id, rejectReasonText);
                                            setIsRejectModalOpen(false);
                                            setIsDetailModalOpen(false);
                                        }}
                                        className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                                    >
                                        Confirm Rejection
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthGuard>
    );
}
