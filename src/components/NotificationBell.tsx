"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Notification {
    id: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

interface NotificationBellProps {
    userId: string;
    lang?: "en" | "zh";
}

export default function NotificationBell({ userId, lang = "en" }: NotificationBellProps) {
    const t = {
        en: {
            notifications: "Notifications",
            new: "New",
            noNotifications: "No notifications yet",
            endOfFeed: "End of feed"
        },
        zh: {
            notifications: "通知中心",
            new: "新",
            noNotifications: "暂无通知",
            endOfFeed: "已加载全部通知"
        }
    }[lang];

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    useEffect(() => {
        fetchNotifications();

        // Real-time listener
        const channel = supabase
            .channel(`public:notifications:user_id=eq.${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 5));
                }
            )
            .subscribe();

        // Close dropdown when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            supabase.removeChannel(channel);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [userId]);

    const fetchNotifications = async () => {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

        if (!error && data) {
            setNotifications(data);
        }
    };

    const handleToggle = async () => {
        const nextState = !isOpen;
        setIsOpen(nextState);

        if (nextState && unreadCount > 0) {
            const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
            if (unreadIds.length > 0) {
                // Update shown to read
                const { error } = await supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .in('id', unreadIds);

                if (!error) {
                    setNotifications(prev =>
                        prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: true } : n)
                    );
                }
            }
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleToggle}
                className="relative p-3 rounded-2xl bg-white border border-gray-200 hover:bg-gray-100 hover:border-gv-gold/30 transition-all group"
            >
                <svg className={`h-6 w-6 transition-all ${unreadCount > 0 ? "text-gv-gold" : "text-gray-400 group-hover:text-gray-900"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] font-black text-gray-900 items-center justify-center">
                            {unreadCount}
                        </span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-4 w-80 bg-gray-50 border border-gray-200 rounded-[32px] shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white0">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">{t.notifications}</h3>
                        {unreadCount > 0 && <span className="text-[10px] bg-gv-gold text-black font-black px-2 py-0.5 rounded-full">{unreadCount} {t.new}</span>}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-100">
                        {notifications.length > 0 ? notifications.map((notification) => (
                            <div key={notification.id} className={`p-6 transition-colors ${notification.is_read ? "opacity-60" : "bg-gv-gold/5"}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight leading-tight">{notification.title}</h4>
                                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">
                                        {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 font-medium leading-relaxed">{notification.message}</p>
                            </div>
                        )) : (
                            <div className="p-10 text-center text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                                {t.noNotifications}
                            </div>
                        )}
                    </div>
                    {notifications.length > 0 && (
                        <div className="p-4 bg-white/30 text-center">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">{t.endOfFeed}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
